# Contracts: Checkout y órdenes

Diseño de API Express (prefijo `/api`). Toda operación autenticada del navegador pasa por rutas BFF de Next, que leen cookie httpOnly y reenvían Bearer. El backend vuelve a aplicar permisos. Importes decimales viajan como cadenas JSON; fechas como ISO 8601 UTC. `costoEnvio` y `totalFinal` son `null` para envío, con `estadoCostoEnvio="sin_cotizar"`; para retiro se informa `no_aplica` y `totalFinal=subtotalProductos`. Ninguna constancia externa inventa un importe.

Errores JSON: `{ "message": "...", "codigo": "...", "itemsAfectados": [{ "itemCarritoId": 1, "motivo": "stock_insuficiente" }] }`. `message` en español, `codigo` estable; todos los ítems bloqueados se informan juntos. Las respuestas privadas no admiten caché compartida.

Los datos de envío siguen FR-002: dirección de 5–160 caracteres visibles, ciudad de 2–80, código postal alfanumérico de 4–10 caracteres tras quitar espacios y con al menos un dígito, teléfono normalizado a 8–15 dígitos con `+` inicial opcional y correo electrónico de hasta 254 caracteres con un solo `@`, dominio con punto y sin espacios. Las cadenas se recortan y normalizan como indica la spec; `400 DATOS_ENVIO_INVALIDOS` incluye `camposInvalidos` con nombre y mensaje por campo. El mismo control se aplica al resumen y a la confirmación.

## Cliente: checkout

### `POST /checkout/resumen`

Requiere sesión y rol vigente `cliente` verificado por el backend. Entrada: `{ "tipoEntrega": "retiro" | "envio", "datosEnvio": { "direccion": "...", "ciudad": "...", "codPostal": "...", "telefono": "...", "email": "..." } | null }`. Para retiro, `datosEnvio=null`; para envío, cinco campos obligatorios y normalizados.

**200**: líneas con `itemCarritoId`, nombre/variante, cantidad, `precioCarrito`, `precioVigente`, `importeLinea`, `cambioPrecio`, `disponible`, `motivoBloqueo`; además `subtotalCarrito`, `subtotalProductos`, `estadoCostoEnvio`, `costoEnvio`, `totalFinal`, `huellaResumen`, `puedeConfirmar`. La huella cubre cliente, carrito, ítems/cantidades/precios, entrega y datos normalizados. Para stock, el servidor suma cantidades por variante antes de comparar disponibilidad; si la suma excede lo disponible, marca todas las líneas de esa variante con motivo. Un resumen bloqueado es legible con `puedeConfirmar=false`. No reserva stock.

**400** entrada inválida; **401** sin sesión; **403** rol distinto de `cliente`. El servidor ignora cualquier precio recibido.

### `POST /checkout/confirmacion`

Misma entrada de entrega más `huellaResumen`, `aceptaPrecioVigente: true` y `claveConfirmacion` opaca y estable para el intento. No admite importes del cliente.

**201** primera creación; **200** reintento idéntico: misma orden, ID y reserva, incluso si después cambiaron precio, stock o estado del carrito. Primero buscar orden por usuario/clave y comparar los datos normalizados de la solicitud con su `huellaSolicitud` original; si coinciden, devolver esa orden sin revalidar el carrito convertido ni el catálogo actual. Si difieren, responder 409. Solo cuando no exista una orden para la clave, recalcular y validar todo transaccionalmente, incluidas la huella del resumen y la aceptación explícita. Si la clave colisiona durante la transacción, hacer rollback y consultar la ganadora; devolverla solo si la solicitud coincide.

**400** carrito vacío, datos inválidos o aceptación ausente. **401/403** sin sesión/rol cliente. **409 `RESUMEN_CAMBIO`** con resumen actualizado; limpia aceptación. **409 `ITEMS_NO_DISPONIBLES`** con todos los ítems/motivos tras la revalidación transaccional de cantidad, producto, variante, stock agrupado por variante y `ProductoImprovisado`; si la suma de líneas de una variante excede el disponible, se identifican todas esas líneas. El carrito permanece editable. **409 `INTENCION_EN_CONFLICTO`** para clave con otros datos o carrito ya convertido con clave distinta. **503** recuperable tras agotar reintentos de conflicto transaccional. No hay orden parcial.

## Cliente: órdenes

| Express | Respuesta |
|---|---|
| `GET /ordenes` | Órdenes solo del dueño, más recientes primero. |
| `GET /ordenes/:id` | Detalle histórico propio; ajena o inexistente: 404 indistinguible. |
| `POST /ordenes/:id/cancelacion` | Solo dueño y `pendiente_pago` con hora BD `< venceEn`; cambia a `cancelada_cliente` y libera. Reintento no mueve inventario. Si ya venció, materializa vencimiento y devuelve 409 con estado actual. |

Las tres rutas exigen rol vigente `cliente`; un administrador recibe 403. `puedeCancelar` es orientación para UI; POST vuelve a validar. Listado y detalle muestran `envioCoordinado` y su fecha si corresponde, sin inventar importe. La respuesta muestra `devolucion="pendiente_de_gestionar"` tras cancelación administrativa de una pagada.

Listado y detalle incluyen `estado` persistido, `estadoVisible` y `venceEn`. Si `estado="pendiente_pago"` y el reloj de la base indica `ahora >= venceEn`, `estadoVisible="reserva_vencida_en_proceso"`, `puedeCancelar=false` y no se ofrece pago; el estado definitivo `cancelada_vencimiento` aparece tras el barrido, con `canceladaEn` real. El BFF no almacena una respuesta privada para reutilizarla después del vencimiento.

## Administración

El navegador usa `/api/admin/ordenes` y subrutas; el proxy Next mapea ese prefijo a Express `/api/admin/ordenes`, mientras conserva el mapeo previo de los demás módulos. Express exige `verificarToken` y `esAdmin` con rol vigente.

| Express | Entrada y efecto |
|---|---|
| `GET /admin/ordenes` | Lista filtrable por estado/entrega y paginada, con importes conocidos y cliente. |
| `GET /admin/ordenes/:id` | Detalle y eventos; cada evento incluye `actorNombre` actual cuando el usuario existe, o `null` si no está disponible. |
| `POST /admin/ordenes/:id/pago` | Solo pendiente antes de vencer; acredita subtotal de productos, actor y fecha. Envío sigue sin cotizar/cobrar. |
| `PATCH /admin/ordenes/:id/estado` | `{ "estado": "en_preparacion" | "lista_para_retiro" | "enviada" | "entregada", "envioCoordinado": true? }`; `enviada` exige constancia externa y guarda actor/fecha. |
| `POST /admin/ordenes/:id/cancelacion` | `motivo` obligatorio tanto para pendiente como para pagada. `restituirStock: true | false` es obligatorio solo si ya se confirmó pago; una pendiente exige hora `< venceEn`, cancela y libera la reserva una vez, sin devolución. |

401 sin sesión, 403 sin admin, 404 inexistente, 409 estado/tiempo incompatible, tanto en el BFF administrativo como en Express. El BFF devuelve JSON 401/403 para estas rutas API, sin redirigir a páginas; las páginas pueden seguir usando su guardia de navegación. Reintentos de acciones ya resueltas no crean evento ni movimiento extra. El actor y la hora se obtienen del servidor. `envioCoordinado=true` acredita coordinación externa, no un monto ni reembolso.

## BFF y experiencia

Rutas Next previstas: `/api/checkout/resumen`, `/api/checkout/confirmacion`, `/api/ordenes`, `/api/ordenes/[id]` y cancelación. El navegador usa `apiFetchInterna` para llamar a esas rutas BFF; esta función debe conservar en sus errores `codigo`, `itemsAfectados` y `camposInvalidos`. Cada ruta BFF usa `obtenerTokenSesion` y una función de `frontend/src/lib/api.ts` para reenviar a la URL absoluta de Express con Bearer y `cache: "no-store"`; devuelve el cuerpo, estado HTTP y `Content-Type` sin pérdida, tanto en éxito (incluido 201/200) como en error (incluido 409/503). La cookie y el Bearer no se incluyen en la respuesta al navegador. `apiFetchInterna` actual no sirve para ese tramo servidor → Express porque usa una ruta relativa y reduce la respuesta. El proxy administrativo se adapta al mapeo y a las respuestas 401/403 descritas arriba, reutiliza la función de reenvío de `frontend/src/lib/api.ts` y conserva cuerpos, métodos y estado; la clave de idempotencia de checkout viaja en el cuerpo de su BFF propio.

`/carrito` enlaza a `/checkout` solo para rol cliente; la revisión muestra cambios de precio y exige checkbox de aceptación. `RESUMEN_CAMBIO` limpia la aceptación; `ITEMS_NO_DISPONIBLES` permite volver al carrito. Durante el envío se deshabilita el botón, pero la idempotencia reside en backend. `/cuenta` agrega historial/detalle propios y constancia de coordinación externa si existe; `/admin` enlaza a órdenes. Envío muestra total pendiente aun tras constancia externa; cancelada pagada no se presenta como dinero devuelto.

Resumen e historial presentan carga desde el inicio. Tras 10 segundos sin respuesta o ante error, muestran error y acción de reintento; nunca interpretan el fallo como carrito u órdenes vacíos. Conservan datos de entrega, pero una consulta recuperada exige revisar/aceptar el nuevo resumen antes de confirmar. Una vista abierta de orden pendiente refresca su estado efectivo al menos cada 60 segundos mientras tiene conexión y puede actualizarlo al instante cuando vence. Campos, checkbox, errores por ítem y confirmación de cancelación deben tener nombre accesible, foco visible y anuncios para lector de pantalla según FR-023.

## Vencimiento

No hay endpoint público. `backend/src/jobs/vencer-ordenes.js` ejecuta un barrido y termina. Selecciona lotes con `pendiente_pago` y `venceEn <= reloj BD`, bloquea y transiciona usando el mismo servicio que las acciones de usuario. Registra procesadas, omitidas por carrera, fallidas y duración. GitHub Actions lo invoca con programación horaria en producción; fallas/retrasos se alertan y el siguiente barrido recupera pendientes. Disponibilidad y elegibilidad de pago respetan el vencimiento incluso con tarea retrasada.
