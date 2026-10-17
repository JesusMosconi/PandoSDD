# Verificación de implementación: Checkout y órdenes

## T001 — ramas y estado inicial

- Fecha: 2026-10-11.
- Repositorio raíz: rama `002-checkout-ordenes`; conserva `specs/002-checkout-ordenes/` sin seguimiento previo y sin commit. La creación de la rama requirió acceso de escritura a `.git` y se completó sin alterar el árbol de trabajo.
- `backend/`: rama `002-checkout-ordenes`, árbol limpio al iniciar.
- `frontend/`: rama `002-checkout-ordenes`, árbol limpio al iniciar.
- No se ejecutó commit, push, migración ni escritura sobre servicios externos.
- Verificación de cierre T001: `git diff --check` en raíz sin errores; como `specs/002-checkout-ordenes/` aún no está bajo seguimiento, también se revisaron sus archivos directamente y no tienen espacios finales.

## T002 — instrucciones y límites

- Revisados `AGENTS.md`, ausencia de `backend/AGENTS.md` y `backend/CLAUDE.md`, `frontend/AGENTS.md`, `frontend/CLAUDE.md`, `.specify/memory/constitution.md` y `docs/estado-actual/08-deuda-y-riesgos.md`.
- Código nuevo: separar lógica en backend, mantener BFF para operaciones autenticadas, validar y normalizar entradas, usar `asyncHandler`, enumerar campos permitidos al escribir con Prisma y proteger rutas con rol vigente.
- No leer archivos `.env`, no instalar dependencias, no editar migraciones aplicadas, no ejecutar migraciones/seeds ni escribir a servicios externos sin destino aislado verificado y autorización específica.
- Actualizar `docs/estado-actual/` en la misma tarea que cambie modelos, rutas o flujos. En `frontend/`, lint y build antes de cerrar cada tarea; `backend/` no tiene scripts de lint/build.
- Verificación de cierre T002: `git diff --check` en raíz sin errores y revisión directa de espacios finales en los documentos de la feature. Esta tarea no modificó `backend/` ni `frontend/`.

## T003 — verificación parcial del entorno

- Node local: `v24.18.0`, compatible con `node:test`.
- `backend/.env.example` documenta `DATABASE_URL` con marcador genérico. No hay una URL de prueba en las variables de proceso inspeccionadas. No se abrió ningún archivo `.env`.
- `specs/001-visibilidad-productos-publicos/verificacion.md` registra un host Neon de prueba usado anteriormente, pero no verifica por sí solo que la rama y el destino actuales sigan siendo descartables.
- La persona responsable volvió a indicar el host `ep-floral-dust-acglee71-pooler.sa-east-1.aws.neon.tech` para esta implementación e informó que la rama descartable se llama `Prueba`. La respuesta inicial incluyó una credencial que no se copió a archivos ni se usó en comandos; se recomendó rotarla. La correspondencia host-rama proviene de la persona responsable y aún no se comprobó de forma independiente en Neon.
- Hay cinco migraciones versionadas en `backend/prisma/migrations/`. La persona responsable confirmó que las cinco figuran aplicadas en la rama `Prueba` y que hay cero órdenes; no se verificó de forma independiente en Neon.
- La persona responsable indicó que el backend corre en localhost:3000 y en Render. No se encontró una configuración de programador en el repositorio; su servicio, ruta y permisos concretos se determinarán en T041.
- T003 se cierra con estas verificaciones y límites documentados. No se conectó a una base ni se ejecutó Prisma; la confirmación del destino y una autorización específica siguen siendo obligatorias antes de aplicar una migración.
- Cierre T003: `git diff --check` en raíz sin errores; revisión directa de los documentos de la feature sin espacios finales. Esta tarea no modificó `backend/` ni `frontend/`.

## T004 — revisión de diseño

- La persona responsable invocó `$speckit-implement` después de las revisiones y correcciones de spec, plan, contrato y tareas, lo que se toma como aprobación explícita para implementar el diseño revisado de esquema, precios, reservas y autorización. Esta aprobación no incluye aplicar migraciones ni escribir datos en servicios externos.
- Se revisaron `spec.md`, `plan.md`, `data-model.md`, `contracts/checkout-ordenes.md` y la constitution: importes calculados por backend, envío sin total final, detalle histórico, una reserva por variante, vencimiento por reloj de base y roles vigentes.
- T004 se cierra para cambios de código locales; cualquier ejecución de migración en la rama `Prueba` requiere revisión del SQL concreto y autorización específica adicional.
- Cierre T004: `git diff --check` en raíz sin errores y documentos de la feature sin espacios finales.

## Preparación de archivos ignorados

- Se comprobó que raíz, backend y frontend son repositorios Git separados. `frontend/.gitignore` ya cubre `.env*`, dependencias y artefactos de Next; `frontend/eslint.config.mjs` tiene exclusiones de Next y build.
- Se añadieron a `.gitignore` de raíz y backend patrones para `.env*`, logs y artefactos Node, conservando `!.env.example`. `git check-ignore -v` confirmó los patrones para nombres de prueba sin abrir esos archivos.
- `git diff --check` terminó sin errores en raíz y backend. Git avisó que normalizará LF a CRLF al tocar los `.gitignore`; no se detectaron errores de contenido. Esta preparación no modifica datos ni servicios externos.

## Revisión preliminar de esquema para T005

- `Orden.subtotal` ya existe como `Decimal` obligatorio: T006 debe conservarlo, no agregarlo de nuevo. `Orden.total` es obligatorio y `costoEnvio` tiene default cero; la migración nueva debe hacerlos nullable, retirar ese default y preservar los valores de filas heredadas sin reinterpretarlos.
- `Orden.carritoId` tiene índice único y claves foráneas a `Usuario` y `Carrito`; se preservan. `fechaCreado` también se conserva. Las nuevas fechas autoritativas `creadaEn` y `venceEn` deben ser opcionales para filas previas.
- `DatosEnvio.codPostal`, `telefono` y `email` son nullable; el servicio nuevo impondrá los cinco campos para envío sin convertir retrospectivamente filas heredadas.
- La compatibilidad de datos reales y el estado aplicado de migraciones en la rama `Prueba` siguen pendientes de verificación autorizada. No se modificó `backend/prisma/schema.prisma` ni se creó/aplicó migración.

## T005 — propuesta exacta de esquema y migración

- La persona responsable informó cinco migraciones aplicadas y cero órdenes en `Prueba`. El diseño conserva igualmente compatibilidad con filas heredadas porque esa constatación no cubre otros entornos.
- `Orden`: conservar `subtotal Decimal`, `fechaCreado`, `usuarioId` y `carritoId @unique`; convertir `costoEnvio` y `total` a `Decimal?`, quitar el default cero de `costoEnvio`; añadir `creadaEn DateTime?`, `venceEn DateTime?`, `claveConfirmacion String?`, `huellaSolicitud String?`, `pagoConfirmadoEn DateTime?`, `pagoConfirmadoPorId Int?`, `envioCoordinadoEn DateTime?`, `envioCoordinadoPorId Int?`, `canceladaEn DateTime?`, `motivoCancelacion String?` y `restituirStock Boolean?`. Añadir índice único `(usuarioId, claveConfirmacion)` e índices `(usuarioId, creadaEn)` y `(estado, venceEn)`. No poner default de `pendiente_pago` en filas antiguas; el servicio asigna ese estado solo a nuevas órdenes.
- `DetalleOrden`: `id`, `ordenId`, `posicion`, `productoId?`, `talleProductoId?`, `nombreProducto`, `talle`, `color`, `cantidad Int`, `precioUnitario Decimal`, `importeLinea Decimal`; FK a orden, referencias opcionales a catálogo con `ON DELETE SET NULL`, índice `(ordenId, posicion)` y control SQL de cantidad positiva. El servicio asegura importe de línea y subtotal.
- `ReservaStock`: `id`, `ordenId`, `talleProductoId`, `cantidad Int`, `estado String`, `reservadaEn DateTime`, `liberadaEn DateTime?`, `consumidaEn DateTime?`; FK a orden/variante, único `(ordenId, talleProductoId)`, índice `(talleProductoId, estado)` y control SQL de cantidad positiva.
- `EventoOrden`: `id`, `ordenId`, `fecha`, `origen`, `actorUsuarioId?`, `estadoAnterior?`, `estadoNuevo`, `motivo?`, `restituirStock?`; FK a orden e índice `(ordenId, fecha)`. Los IDs de actor se conservan como escalares históricos.
- La migración nueva solo agrega columnas nullable, altera nulabilidad/default de importes sin reemplazar valores existentes y crea tablas/índices/constraints nuevos. El estado aplicado de las migraciones antiguas proviene de la persona responsable; antes de aplicar el SQL se requiere volver a confirmar el destino y recibir autorización específica. T005 no ejecutó ninguna operación sobre la base.
- Cierre T005: `git diff --check` en raíz sin errores y revisión directa de espacios finales. No se modificó `backend/` ni `frontend/`.

## T006 — esquema y migración local

- Se actualizaron `backend/prisma/schema.prisma`, la nueva `backend/prisma/migrations/20261011_checkout_ordenes/migration.sql` y `docs/estado-actual/02-modelo-de-datos.md`. La migración conserva las órdenes antiguas, deja sus campos nuevos nullable y no modifica migraciones ya aplicadas.
- `prisma validate --config prisma.validate.config.ts` terminó con código 0 y «The schema ... is valid». La configuración temporal no importó `dotenv/config` ni leyó `.env`; se eliminó tras validar.
- El SQL quedó preparado para revisión; **no se aplicó** en Neon ni se escribió dato externo. La información sobre las cinco migraciones y cero órdenes proviene del usuario y no de una conexión de esta sesión.
- `backend/` no define scripts de lint ni build. `frontend/` no fue modificado en T006.
- Cierre T006: `git diff --check` sin errores en raíz y backend (solo avisos LF/CRLF de Git).

## T007 — disponibilidad y vencimiento compartidos

- `backend/src/services/inventario.js`: reloj de BD, bloqueo estable de variantes, suma de reservas efectivas, disponibilidad derivada y transiciones únicas de reservas activas con descuento físico solo al consumir.
- `backend/src/services/ordenes.js`: estado visible y cancelabilidad derivados, bloqueo de orden y vencimiento compartido atómico; la fecha de vencimiento original permanece intacta y la cancelación toma la hora real de BD.
- `docs/estado-actual/06-flujos-de-negocio.md` distingue estos servicios preparados de las rutas heredadas aún sin integrar.
- `node --check` pasó en ambos servicios. `git diff --check` pasó en raíz y backend; solo avisos de normalización LF/CRLF. No se ejecutaron consultas de BD ni migraciones. `backend/` no define scripts de lint/build; `frontend/` no se modificó.

## T008 — catálogo y edición de stock

- Las rutas de productos, catálogo inicial y variantes consultan `stockDisponible`; las vistas públicas filtran variantes inactivas o sin disponibilidad. Las respuestas administrativas mantienen `stock` físico y agregan disponibilidad.
- PUT/DELETE de variante bloquean la fila y rechazan stock físico inferior a las reservas efectivas. Los POST/PUT de las tres rutas escriben una lista explícita de campos permitidos tras `validateBody`.
- Se actualizaron `docs/estado-actual/03-api-backend.md` y `06-flujos-de-negocio.md`. `node --check` pasó en las tres rutas y `git diff --check` en ambos repos no reportó errores. `backend/` carece de scripts de lint/build. No se ejecutó integración con BD porque la migración está pendiente.

## T009 — carrito frente a reservas y conversión

- POST, PUT y DELETE de carrito bloquean el carrito, exigen `estado=activo` dentro de la transacción y revalidan sus líneas; POST y aumentos bloquean la variante y usan stock disponible agrupado por variante.
- Las reducciones y eliminaciones conservan la posibilidad de corregir ítems no disponibles; las respuestas derivan `disponible` del inventario efectivo sin borrar líneas. Se actualizaron `docs/estado-actual/03-api-backend.md` y `06-flujos-de-negocio.md`.
- `node --check src/routes/carrito.routes.js` y `git diff --check` en backend/raíz pasaron, con avisos de normalización de línea de Git. `backend/` no tiene scripts de lint/build; no hubo modificación de `frontend/` ni prueba contra BD.

## T010 — contratos de frontend y disponibilidad visible

- Se agregó `frontend/src/types/orden.ts` con estados, importes decimales en cadenas, `estadoCostoEnvio`, `estadoVisible`, detalles, eventos y errores. `TalleProducto` agrega `stockDisponible`; `ProductCard` y `ProductVariants` usan ese campo y el estado de variante. El carrito ahora incluye `stockDisponible` en cada variante anidada.
- Se actualizó `docs/estado-actual/04-frontend.md`. `npm.cmd run lint` pasó con 9 avisos preexistentes de `<img>`; `tsc --noEmit` pasó. `npm.cmd run build` se ejecutó pero no pudo descargar las fuentes Google Epilogue/Manrope por falta de conexión; no reportó error de TypeScript.
- `git diff --check` pasó en raíz, backend y frontend, con avisos LF/CRLF. La integración de UI con una base migrada sigue sin probarse.

## T011 — normalización de entrega

- `backend/src/services/checkout.js` valida retiro/envío, normaliza cinco campos de envío y devuelve errores por campo con código `DATOS_ENVIO_INVALIDOS`; retiro produce `datosEnvio=null`.
- `node --check` y una comprobación local de normalización/cinco campos faltantes pasaron. `git diff --check` pasó en raíz y backend, con avisos LF/CRLF. Se actualizó `docs/estado-actual/06-flujos-de-negocio.md`; no se consultó la BD. Backend no tiene scripts lint/build.

## T012 — resumen de checkout en servicio

- `resumenCheckout` lee el carrito activo, informa todos los ítems bloqueados sin borrarlos, agrupa cantidades por variante para evaluar disponibilidad, compara precio guardado/vigente y calcula importes con `Prisma.Decimal`. Para envío representa costo y total desconocidos con `null`; para retiro iguala total y subtotal. La huella incluye carrito, líneas, precios y entrega normalizada.
- `node --check` pasó; una comprobación local de `Prisma.Decimal` pasó. `git diff --check` pasó en raíz y backend con avisos LF/CRLF. Se actualizó `docs/estado-actual/06-flujos-de-negocio.md`. Aún falta probar con una base aislada; no se ejecutó conexión ni migración. Backend no tiene scripts de lint/build.

## T013 — confirmación transaccional en servicio

- `confirmarCheckout` busca primero una orden por usuario/clave y compara huella de intención. Para orden nueva exige aceptación y resumen vigente; bloquea carrito y variantes, revalida todos los ítems y precios, calcula importes en el servidor y crea orden, datos de envío si corresponde, detalle histórico, una reserva por variante, evento y carrito convertido en una transacción. La hora de creación proviene de la BD y el vencimiento suma 120 horas. Hay reintento acotado para conflictos de unicidad/transacción.
- Se generó Prisma Client local con `prisma generate --config prisma.validate.config.ts` usando una configuración temporal sin `dotenv/config`, luego eliminada. No hubo conexión ni escritura a BD. `node --check` y carga local del módulo con URL ficticia pasaron; `git diff --check` pasó en backend y raíz con avisos LF/CRLF. `docs/estado-actual/06-flujos-de-negocio.md` actualizado. Backend no tiene scripts lint/build.
- La conducta concurrente y persistencia siguen pendientes de prueba contra la rama aislada tras aplicar la migración autorizada; esta tarea marca código preparado, no integración comprobada.

## T014 — rutas y rol de cliente

- Se añadió `esCliente` con consulta del rol vigente y activo, y se montaron `POST /api/checkout/resumen` y `/api/checkout/confirmacion` con `verificarToken`, `asyncHandler`, `validateBody`, errores estructurados y `Cache-Control: no-store`.
- Se actualizaron `docs/estado-actual/03-api-backend.md`, `05-autenticacion-y-autorizacion.md` y `06-flujos-de-negocio.md`. `node --check` pasó en middleware, rutas e index; `git diff --check` pasó en raíz/backend con avisos LF/CRLF. Backend no tiene scripts lint/build; endpoints no se probaron contra BD.

## T015 — reenvío BFF y errores ricos

- `frontend/src/lib/api.ts` agrega reenvío de servidor a Express con URL absoluta, Bearer solo entre servidores, `no-store` y respuesta cruda. `ApiError` conserva código, ítems, campos y resumen actualizado. Se documentó en `docs/estado-actual/04-frontend.md`.
- `npm.cmd run lint` pasó con 9 avisos de `<img>`; `tsc --noEmit` pasó. `npm.cmd run build` volvió a fallar únicamente por descarga imposible de Epilogue y Manrope desde Google Fonts. `git diff --check` pasó en frontend/raíz con avisos LF/CRLF.

## T016 — BFF de resumen

- `frontend/src/app/api/checkout/resumen/route.ts` lee la cookie httpOnly en servidor, reenvía a Express con Bearer y `no-store`, y preserva cuerpo, estado y `Content-Type`; ante ausencia de sesión responde JSON 401 y ante fallo de red JSON 503. No expone el token.
- Se consultó la documentación local de Next 16 sobre Route Handlers. Lint pasó con 9 avisos de `<img>` y `tsc --noEmit` pasó; build se ejecutó y falló otra vez por descarga de fuentes Google. `git diff --check` pasó en frontend/raíz con avisos LF/CRLF.

## T017 — BFF de confirmación

- `frontend/src/app/api/checkout/confirmacion/route.ts` reenvía el cuerpo completo, incluida la clave estable enviada por el cliente, con cookie/Bearer solo entre servidores; conserva 201/200/409/503, cuerpo, tipo de contenido y `no-store`. La ruta no calcula importes.
- Lint pasó con 9 avisos de `<img>`, `tsc --noEmit` pasó y build volvió a fallar por falta de conexión a Google Fonts. `git diff --check` pasó en frontend/raíz con avisos LF/CRLF.

## T018 — interfaz de revisión de checkout

- `CheckoutPanel` permite retiro/envío y cinco campos, muestra errores por campo, líneas con precio guardado/vigente, ítems bloqueados, aceptación explícita y subtotal. Envío muestra «costo a coordinar» y total pendiente; retiro muestra total igual al subtotal. Un ítem bloqueado impide confirmar y conserva el enlace al carrito.
- Lint pasó con 9 avisos de `<img>` tras corregir una regla de efectos de React; `tsc --noEmit` pasó. Build se ejecutó y falló por descarga de fuentes Google. `git diff --check` pasó en frontend/raíz con avisos LF/CRLF. La clave estable y recuperación de errores se completan en T019.

## T019 — reintentos y accesibilidad de checkout

- `CheckoutPanel` conserva una clave UUID durante los reintentos de una confirmación, bloquea doble envío y la renueva cuando cambia la intención o el resumen. `RESUMEN_CAMBIO` y `ITEMS_NO_DISPONIBLES` limpian la aceptación. Resumen y confirmación tienen límite de espera de 10 segundos; ante fallo se informa el error y se puede reintentar conservando entrega. Los errores se anuncian y reciben foco; campos y controles tienen etiquetas.
- Lint pasó con 9 avisos de `<img>` y `tsc --noEmit` pasó. Build se ejecutó y falló por descarga de fuentes Google. `git diff --check` pasó en frontend/raíz con avisos LF/CRLF.

## T020 — página protegida de checkout

- `/checkout` consulta la sesión vigente en servidor; redirige a login sin sesión y al carrito si el rol no es cliente. Renderiza `CheckoutPanel`, que incluye regreso al carrito y confirmación con número, estado y vencimiento.
- Lint pasó con 9 avisos de `<img>`; `tsc --noEmit` pasó; build se ejecutó y falló por descarga de fuentes Google. `git diff --check` pasó en frontend/raíz con avisos LF/CRLF.

## T021 — enlace desde carrito

- `/carrito` consulta el rol vigente en servidor y `CarritoPanel` ofrece `/checkout` solo a cliente con ítems. El carrito vacío no presenta avance; las líneas bloqueadas siguen editables. Se actualizaron `docs/estado-actual/04-frontend.md` y `06-flujos-de-negocio.md`.
- Lint pasó con 9 avisos de `<img>`, `tsc --noEmit` pasó y build falló por descarga de fuentes Google. `git diff --check` pasó en frontend/raíz con avisos LF/CRLF.

## T022 — integración y medición completas

- Estado inicial: faltaban la migración y la medición. La ejecución posterior en `Prueba` y el recorrido de la orden #8 se registran al final de este documento; T022 quedó completa.

## T023 — lectura de órdenes propias en servicio

- `ordenes.js` lista por dueño de reciente a antigua y obtiene detalle solo por dueño, con instantáneas históricas, importes conocidos, constancia de coordinación, vencimiento y `estadoVisible` derivados de la hora de BD. Órdenes sin fechas nuevas se identifican como heredadas y no reciben acciones nuevas.
- `node --check` y una comprobación local del estado al instante exacto de vencimiento pasaron. `git diff --check` pasó en backend/raíz con avisos LF/CRLF. Se actualizó `docs/estado-actual/06-flujos-de-negocio.md`. Backend no tiene scripts lint/build; no hubo consulta de BD.

## T024 — cancelación del cliente en servicio

- La cancelación comprueba dueño, bloquea la orden, usa hora de BD y solo cambia `pendiente_pago` antes de vencer. Libera reservas y crea evento en la misma transacción; reintentos no duplican movimiento. En el límite materializa vencimiento y devuelve 409 con estado actual. Se documentó en `docs/estado-actual/06-flujos-de-negocio.md`.
- `node --check` y `git diff --check` pasaron en backend/raíz (avisos LF/CRLF). Backend no tiene scripts lint/build. Falta validación de carreras contra BD aislada.

## T025 — rutas de órdenes del cliente

- Se montaron GET `/api/ordenes`, GET `/api/ordenes/:id` y POST `/api/ordenes/:id/cancelacion`, con token, rol cliente vigente, IDs positivos, 404 igual para orden ajena/inexistente y respuestas privadas `no-store`. Los conflictos de cancelación incluyen estado actual.
- Se actualizaron `docs/estado-actual/03-api-backend.md`, `05-autenticacion-y-autorizacion.md` y `06-flujos-de-negocio.md`. `node --check` y `git diff --check` pasaron en backend/raíz con avisos LF/CRLF. Backend no tiene scripts lint/build; sin prueba contra BD.

## T026 — BFF de listado y detalle propio

- Se agregaron GET `/api/ordenes` y `/api/ordenes/[id]` en Next con cookie httpOnly, Bearer al backend, validación de ID, `no-store` y respuesta HTTP preservada. Se revisó la documentación local de Next 16 para `params` asíncronos.
- Lint pasó con 9 avisos de `<img>`; `tsc --noEmit` pasó; build volvió a fallar por Google Fonts. `git diff --check` pasó en frontend/raíz con avisos LF/CRLF.

## T027 — BFF de cancelación propia

- POST `/api/ordenes/[id]/cancelacion` reenvía sin reintentar la mutación por su cuenta, conserva 409 y cuerpo de estado final, y responde JSON 401/503 recuperable sin exponer Bearer.
- Lint pasó con 9 avisos de `<img>`, `tsc --noEmit` pasó y build falló por descarga de Google Fonts. `git diff --check` pasó en frontend/raíz con avisos LF/CRLF.

## T028 — historial de cliente en `/cuenta`

- `CuentaPanel` muestra `MisOrdenes` solo para rol cliente. Lista y detalle exhiben instantáneas, importes conocidos, reserva, estado visible, coordinación externa sin monto y devolución pendiente si corresponde. La cancelación pide confirmación nativa, actualiza estado y permite reintento. Carga/error se separan de lista vacía; hay límite de 10 segundos y refresco cada 60 segundos si hay pendientes y conexión.
- Se actualizó `docs/estado-actual/04-frontend.md`. Lint pasó con 9 avisos de `<img>`, `tsc --noEmit` pasó; build falló por descarga de Google Fonts. `git diff --check` pasó en frontend/raíz con avisos LF/CRLF. Falta prueba real de accesibilidad y navegación.

## T029 — integración y recorrido de cliente

- `node --test test/ordenes-cliente.test.js`: 4/4 pruebas aprobadas en `Prueba`. Cubren historial propio/ajeno/inexistente, rol vigente, instantánea histórica tras modificar el producto, cancelación y reintento sin duplicados, y dos cancelaciones simultáneas de una orden vencida.
- En `/cuenta`, el primer listado mostró el error recuperable «La consulta tardó demasiado o falló. Reintentá»; al activar «Reintentar» aparecieron las órdenes #6–#8. El detalle de #8 mostró $120,50 y vencimiento 17/10/2026. Se canceló la #6 mediante el diálogo de confirmación y lista/detalle pasaron a `cancelada_cliente` con fecha. El árbol de accesibilidad expuso los controles con nombre y el estado por texto; falta un recorrido formal con lector de pantalla y solo teclado.

## T030 — consulta administrativa en servicio

- `ordenes.js` lista con filtros/paginación y ofrece detalle con cliente, eventos, importes y constancia de coordinación. Envío sin cotizar mantiene costo y total `null`. Se actualizó `docs/estado-actual/06-flujos-de-negocio.md`.
- `node --check` y `git diff --check` pasaron en backend/raíz con avisos LF/CRLF. Backend no tiene scripts lint/build y no se consultó la BD.

## T031 — pago manual en servicio

- `confirmarPagoAdmin` bloquea la orden y exige hora BD estrictamente anterior a `venceEn`; al límite exacto registra vencimiento y responde 409. Pago válido guarda estado, actor, hora y evento en la misma transacción, con importe acreditado igual al subtotal; la reserva permanece activa. Reintentos no duplican evento.
- `node --check` y `git diff --check` pasaron en backend/raíz con avisos LF/CRLF. Se actualizó `docs/estado-actual/06-flujos-de-negocio.md`. Backend no tiene scripts lint/build; falta prueba con BD.

## T032 — estados de preparación y entrega

- `cambiarEstadoAdmin` implementa las ramas de retiro y envío, exige constancia de coordinación para `enviada`, guarda actor/fecha, consume reservas y reduce stock físico una sola vez en envío o entrega de retiro. Repetir un estado no crea evento ni movimiento; saltos y modalidades incompatibles responden conflicto.
- `node --check` y `git diff --check` pasaron en backend/raíz con avisos LF/CRLF. Se actualizó `docs/estado-actual/06-flujos-de-negocio.md`. Backend no tiene scripts lint/build; falta prueba de concurrencia contra BD.

## T033 — cancelación administrativa en servicio

- La cancelación exige motivo y, si hubo pago, decisión booleana de restitución. Pendiente antes de vencer libera; pagada antes de consumo libera o consume según decisión; después de consumo aumenta stock físico solo si restituye. La orden, el evento y el movimiento se guardan juntos; reiteraciones no duplican stock/evento. El envío pagado cancelado queda con devolución pendiente de gestionar.
- `node --check` y `git diff --check` pasaron en backend/raíz con avisos LF/CRLF. Se actualizó `docs/estado-actual/06-flujos-de-negocio.md`. Backend no tiene scripts lint/build; falta prueba contra BD.

## T034 — rutas de administración de órdenes

- Se montaron listado, detalle, pago manual, avance y cancelación en `/api/admin/ordenes`, con token y rol admin vigente, validación de ID/filtros/cuerpo, errores JSON y `no-store`. Se actualizaron `docs/estado-actual/03-api-backend.md`, `05-autenticacion-y-autorizacion.md` y `06-flujos-de-negocio.md`.
- `node --check` y `git diff --check` pasaron en backend/raíz con avisos LF/CRLF. Backend no tiene scripts lint/build; no se probó contra BD.

## T035 — proxy administrativo Next

- El proxy conserva el mapeo anterior para módulos distintos de órdenes y antepone `admin/` solo cuando el primer segmento es `ordenes`; se inspeccionó esa rama de mapeo en el código. Consulta sesión/rol vigente sin redirigir y responde JSON 401/403/503; reenvía por la función común con cuerpo, método, query, estado, tipo de contenido y `no-store`.
- Se actualizaron `docs/estado-actual/03-api-backend.md`, `04-frontend.md` y `05-autenticacion-y-autorizacion.md`. Lint pasó con 9 avisos de `<img>`, `tsc --noEmit` pasó; build falló por descarga de fuentes Google. `git diff --check` pasó en frontend/raíz con avisos LF/CRLF. No se hizo prueba HTTP contra backend.

## T036 — interfaz de administración

- `/admin/ordenes` se enlaza desde el panel y muestra filtros, paginación, detalle histórico y eventos. Permite pago manual, avance, constancia externa de envío y cancelación con motivo/restitución, con errores recuperables; no muestra envío como gratuito ni reembolso automático. Acciones vencidas no se ofrecen.
- Se actualizó `docs/estado-actual/04-frontend.md`. Lint pasó con 9 avisos de `<img>`, `tsc --noEmit` pasó; build falló por descarga de Google Fonts. `git diff --check` pasó en frontend/raíz con avisos LF/CRLF. Falta recorrido visual real.

## T037 — integración y recorrido administrativo

- `node --test test/ordenes-admin.test.js`: 6/6 pruebas aprobadas en `Prueba`. Cubren rol admin vigente, pago antes y al vencer, subtotal acreditable con envío sin cotizar, reintentos, constancia de envío, saltos inválidos y cancelaciones pagadas antes/después de consumir reservas con y sin restitución.
- El primer acceso a `/admin/ordenes` reveló que los `router.use` de checkout y órdenes cliente se aplicaban a todo `/api`; un admin recibía «Esta acción requiere una cuenta de cliente». Se limitaron los middleware a `/checkout`, `/ordenes` y `/admin/ordenes` respectivamente. Tras reiniciar la API, el listado cargó #6–#8; en #7 se confirmó pago manual, se pasó a preparación y se canceló con motivo y restitución. La interfaz mostró `cancelada_admin`, el evento y «Devolución pendiente de gestionar; no se registró reembolso».
- `npm.cmd test` completo: 19/19 pruebas aprobadas. Dos fallos iniciales de aserción en el nuevo test administrativo se corrigieron al usar los nombres reales `totalFinal` y `pendiente_de_gestionar`; no hubo cambio de lógica por ellos.

## T038 — barrido por lotes en servicio

- `barrerOrdenesVencidas` toma hora de BD, selecciona pendientes vencidas en lotes y usa `vencerOrden` compartido bajo bloqueo. Registra procesadas, omitidas por carrera y fallidas, admitiendo reintento sin duplicar evento/reserva.
- `node --check` y `git diff --check` pasaron en backend/raíz con avisos LF/CRLF. Se actualizó `docs/estado-actual/06-flujos-de-negocio.md`. Backend no tiene scripts lint/build ni se consultó BD.

## T039 — comando finito de vencimiento

- `backend/src/jobs/vencer-ordenes.js` ejecuta lotes hasta agotar pendientes vencidas, separa procesadas/omitidas/fallidas, informa duración en JSON, evita repetir una falla dentro de la misma corrida y termina con error observable para reintento. No hay endpoint público ni registro de credenciales.
- `node --check` y `git diff --check` pasaron en backend/raíz con avisos LF/CRLF. Se actualizó `docs/estado-actual/06-flujos-de-negocio.md`. El comando no se ejecutó por faltar migración/base autorizada; backend no tiene scripts lint/build.

## T040 — comando y operación manual documentada

- `backend/package.json` incluye `vencer-ordenes`. `docs/estado-actual/08-deuda-y-riesgos.md` describe invocación manual desde backend, salida JSON, error observable, reintento, condición de base migrada y configuración externa aún pendiente.
- La sintaxis de `package.json` y `git diff --check` pasaron en backend/raíz con avisos LF/CRLF. No se ejecutó el comando ni se configuró un programador externo. Backend no tiene scripts lint/build.

## T041 — programador externo pendiente

- El usuario indicó que el backend corre en localhost:3000 y Render. No se encontró `render.yaml`, `Procfile`, cron ni configuración de programador versionada; no se conocen servicio, operador, ubicación de configuración ni permisos. Sin programador verificable y autorización para escribir en él, T041 permanece sin marcar y US4 no es operativa.

## T042 — refresco administrativo de pendientes

- `AdminOrdenes` consulta lista y detalle pendientes cada 60 segundos con conexión; muestra la reserva vencida en proceso y, tras transición, la cancelación y su fecha real. El BFF mantiene `no-store`. Se actualizó `docs/estado-actual/04-frontend.md`.
- Lint pasó con 9 avisos de `<img>`, `tsc --noEmit` pasó; build falló por descarga de Google Fonts. `git diff --check` pasó en frontend/raíz con avisos LF/CRLF. Falta prueba temporal en navegador con orden real.

## T043 — pendiente de integración

- Pruebas de límite T−ε/T, barrido tardío/repetido, carreras y alerta requieren base aislada migrada y programador verificable; permanece sin marcar.

## T044 — revisión cruzada de requisitos y código

- Se repasaron FR-001–FR-024 y SC-001–SC-012 contra `spec.md`, `plan.md`, `data-model.md`, `contracts/checkout-ordenes.md` y ambas checklists (32/32 y 16/16 marcadas como calidad de requisitos, no como implementación).
- FR-001–FR-021: los flujos locales de backend/BFF/UI están preparados, con reserva, detalle, idempotencia, importe de envío desconocido, autorización y transiciones. En la revisión se corrigió una carrera entre pago/cancelación y checkout: pago y cancelaciones ahora bloquean variantes **antes** de obtener la hora de decisión de BD. También se hizo que conflictos administrativos incluyan el estado final, y el resumen muestra el subtotal anterior y todos los motivos de bloqueo.
- FR-022–FR-024: existe carga/error/reintento, errores asociados, estado efectivo y refresco de 60 segundos en vistas abiertas. Se estabilizó el intervalo de refresco ante ediciones de formulario y se conservan los errores de acciones tras actualizar el detalle.
- Desvíos o decisiones pendientes: T022/T029/T037/T043 carecen de pruebas con base y recorridos reales; SC-006 carece de medición cronometrada; T041 carece de programador verificado en Render; la migración T006 está versionada pero no aplicada. El build de Next se resolvió después, según T045. No se declara cumplido ningún SC sin esas pruebas.
- Esta revisión no modifica los marcadores de los checklists. `git diff --check` pasa en los tres repositorios con avisos de normalización de línea; no se ejecutó BD ni servicio externo.

## T045 — comprobaciones finales por repositorio

- `frontend/`: `npm.cmd run lint` pasó con 9 avisos de `<img>` y ningún error. `npm.cmd run build` falló inicialmente en sandbox por descarga de Google Fonts; la repetición con acceso de red aprobado compiló, pasó TypeScript y generó todas las rutas, incluidas `/checkout`, `/admin/ordenes` y los BFF nuevos (código 0).
- Raíz, `backend/` y `frontend/`: `git diff --check` pasó por separado, sin errores de contenido; Git avisó de normalización LF/CRLF. Los tres repositorios siguen en rama `002-checkout-ordenes`, sin commit ni push.
- `backend/package.json` no ofrece scripts de lint ni build. No se ejecutaron migraciones, seeds, consultas ni escrituras de base en estas comprobaciones.

## T046 — documentación de estado actual

- Se revisaron `02-modelo-de-datos.md`, `03-api-backend.md`, `04-frontend.md`, `05-autenticacion-y-autorizacion.md`, `06-flujos-de-negocio.md` y `08-deuda-y-riesgos.md` contra los archivos modificados. Se corrigieron afirmaciones heredadas sobre ausencia de checkout, rutas de órdenes, variantes públicas, carrito sin bloqueo y pruebas.
- Los documentos describen código preparado localmente. La migración sigue sin aplicarse, las pruebas de integración y el recorrido visual/cronometrado siguen pendientes, y falta un programador externo de vencimiento en Render/local. No se atribuye a esos flujos funcionamiento verificado en base o despliegue.
- `git diff --check` pasó en la raíz, con avisos LF/CRLF de Git.

## Reanudación 2026-10-12 — T022 en curso

- Las ramas de raíz, backend y frontend siguen en `002-checkout-ordenes`. No se tocó ningún archivo `.env`, base de datos ni servicio externo.
- Se agregó el script `npm.cmd test` con `node --test test/*.test.js` y `backend/test/checkout.test.js`. Tres pruebas locales cubren normalización/errores de los cinco datos de envío, el agregado de cantidades de dos líneas de una variante antes de comparar stock, y el cambio de huella ante precio o reservas diferentes.
- `npm.cmd test`: 3 pruebas aprobadas, 0 fallidas. `node --check test/checkout.test.js` y `git diff --check` de backend pasaron (avisos LF/CRLF de Git). Backend sigue sin scripts lint/build.
- T022 permanece pendiente: faltan carreras de última unidad, doble confirmación/reintento, intención distinta, rol no cliente y revalidación final en base aislada migrada; también faltan recorridos y medición SC-006. La migración nueva sigue sin aplicarse.

## Preparación local de T041 (sin activación)

- La persona responsable confirmó que la rama aislada de Neon `Prueba` corresponde al host documentado y autorizó la migración y escrituras de prueba, condicionadas a facilitar un acceso seguro. No se recibió todavía ese acceso ni se hizo conexión.
- A pedido de la persona responsable se preparó `backend/render.yaml` con un Cron Job cada minuto, rama de código `002-checkout-ordenes`, `autoDeployTrigger: off`, `npm ci`, `npm run vencer-ordenes` y `DATABASE_URL` con `sync: false`. No contiene credenciales.
- El Blueprint es solo local; no se creó servicio en Render ni se verificó operador, alerta, destino efectivo o corrida. T041 permanece sin marcar hasta comprobar esos puntos en un entorno autorizado.

## Reanudación 2026-10-12 — migración en Prueba y T022

- Se verificó en Neon el proyecto `PandoCba`, rama aislada `Prueba` (`br-snowy-glitter-acxy36q0`), base `neondb`, esquema `public` y host `ep-floral-dust-acglee71-pooler.sa-east-1.aws.neon.tech`. Las cinco migraciones anteriores figuraban aplicadas, la del checkout no, y había cero órdenes. La conexión se pasó temporalmente al proceso sin guardarla en archivos ni imprimir la contraseña.
- `npx.cmd prisma migrate status` confirmó seis migraciones versionadas y solo `20261011_checkout_ordenes` pendiente. `npx.cmd prisma migrate deploy` aplicó esa migración y terminó con “All migrations have been successfully applied” exclusivamente en `Prueba`. No se ejecutó seed ni se tocó producción.
- Se añadió un escenario de integración con usuarios, producto, variante y carrito descartables; cada prueba elimina sus registros al terminar. `node --test test/checkout.test.js` pasó 9/9 en `Prueba`: última unidad concurrente, suma de dos líneas de una variante, reintentos e intención distinta, revalidación de precio/variante, rol no cliente, y envío con subtotal conocido, total/costo sin cotizar, datos normalizados y vencimiento exacto de 120 horas. `node --check` y `git diff --check` pasaron; backend sigue sin scripts lint/build. El runner emitió una advertencia deprecada de `pg` durante concurrencia, sin fallas de prueba.
- Se crearon dos usuarios y un carrito descartables para recorrer la interfaz local. El cliente inició sesión y vio el carrito con un producto; el historial mostró inicialmente un error recuperable y, al reintentar, el estado vacío correcto. La medición SC-006 y los restantes recorridos visuales/de accesibilidad están pendientes de evidencia. T022 sigue sin marcar hasta completar esa medición.
- En el primer recorrido manual se creó la orden de prueba #6. En el segundo se creó la #7; el usuario entendió $120,50 de productos y vio después de confirmar el vencimiento del 17/10/2026, pero no registró un tiempo completo desde `/carrito` y observó un aviso rojo de tiempo agotado. No se da por cumplido SC-006 con esa evidencia.
- Al revisar la interfaz local se observó un resumen válido junto a un aviso de error anterior. `CheckoutPanel.tsx` ahora descarta respuestas de consultas de resumen obsoletas, limpia el aviso al obtener el resumen y explica antes de confirmar que la reserva dura 120 horas; `docs/estado-actual/04-frontend.md` se actualizó. La primera compilación de frontend falló por acceso restringido a Google Fonts; al repetirla con acceso de red, lint terminó con 0 errores/9 advertencias heredadas y build/TypeScript pasaron. El resumen corregido se observó sin aviso viejo y se preparó un tercer carrito para repetir la medición.

## Reanudación 2026-10-12 — tercer recorrido, integración y limpieza

- El usuario creó la orden descartable #8 sin asistencia ni errores, entendió $120,50 de productos y vio antes de confirmar que la reserva dura cinco días. Aclaró que a los 24 segundos estaba listo para confirmar y que el tiempo total hasta ver «Orden creada» fue **1 minuto 21 segundos**, incluida su revisión adicional. Se cumple el umbral de SC-006 (<3 minutos) y T022 queda completa. La medición fue informada por el usuario; no se registró automáticamente en la aplicación.
- Se recorrieron historial y administración según T029/T037. Se apagaron backend/frontend locales y se eliminaron de `Prueba` únicamente los usuarios descartables #18/#19, las órdenes #6/#7/#8, sus cinco carritos, eventos, reservas, detalles y el producto/variante/categoría/talle/color de prueba. La migración aplicada permanece.
## Ajustes de presentación de órdenes — 2026-10-12

- `GET /admin/ordenes/:id` resuelve el nombre actual de los actores de eventos con una consulta de usuarios por IDs; entrega `actorNombre` o `null` si el usuario no está disponible. La vista administrativa muestra el nombre y vuelve a obtener el detalle después de cada acción.
- La carga inicial de `MisOrdenes` ignora la respuesta de una solicitud cancelada por desmontaje; mantiene el error y reintento para un fallo o vencimiento real de 10 segundos. La causa observada por el usuario no se pudo confirmar en navegador porque no había servidores locales escuchando en 3000/3001.
- Checkout conserva visible el último detalle de productos cuando cambia retiro/envío, consulta automáticamente al completar los datos y bloquea aceptación/confirmación hasta recibir un resumen vigente. La confirmación usa texto de éxito, número de pedido, título legible de estado y solo la fecha de reserva; el vencimiento exacto no cambió en backend.
- Frontend: `npm.cmd run lint` pasó con 9 avisos heredados de `<img>` y 0 errores; `npm.cmd run build` pasó con acceso de red para descargar Google Fonts. Backend: `node --check src/services/ordenes.js` pasó; no hay scripts de lint/build. `git diff --check` pasó en los tres repositorios. `npm.cmd test` sin conexión segura a Neon pasó las 3 pruebas locales y las 16 de integración fallaron en el guard de host esperado; no se ejecutaron consultas ni escrituras de base en esta verificación.
- No hubo prueba visual/navegación local porque no había servicios en ejecución, ni commit, push o despliegue.

## Reanudación 2026-10-12 — T041/T043

- Se eligió GitHub Actions con ejecución horaria para la rama aislada `Prueba`. El workflow `backend/.github/workflows/vencer-ordenes-prueba.yml` valida el host y la base antes de ejecutar el comando, admite ejecución manual y evita corridas simultáneas. La publicación en la rama predeterminada, el secreto `PRUEBA_DATABASE_URL`, una corrida efectiva y el aviso ante fallos siguen pendientes; T041 permanece abierta.
- `backend/test/vencimiento.test.js` agregó cinco pruebas de integración para antes y en el instante de vencimiento, barrido tardío/repetido, pago previo y carreras con pago/cancelación. Las cinco pasaron en la base aislada `Prueba`; los registros descartables se limpiaron. El script de pruebas ejecuta los archivos en serie para que el barrido global de vencidas no interfiera con otros escenarios. Falta volver a correr la suite completa y comprobar en la interfaz abierta el refresco de 60 segundos y la alerta del programador; T043 permanece abierta.
- La conexión de `Prueba` se expuso accidentalmente en la salida de una herramienta de navegador durante la preparación del secreto. No se envió a GitHub ni se guardó en archivos del repositorio. Se solicitó a la persona responsable restablecer la contraseña del rol `neondb_owner` en Neon antes de continuar con la publicación y las pruebas. No registrar aquí la contraseña ni la URL de conexión.
- La persona responsable confirmó el restablecimiento. El backend de checkout se publicó en `002-checkout-ordenes` (`c9ea891`, luego `240932a` para sincronizar el workflow). Las PR [#5](https://github.com/JesusMosconi/PandoCbaV2/pull/5) y [#6](https://github.com/JesusMosconi/PandoCbaV2/pull/6) integraron únicamente el workflow en `main`; no integraron el código de checkout.
- La primera corrida manual [#1](https://github.com/JesusMosconi/PandoCbaV2/actions/runs/38299690094) falló en `npm ci` porque el `postinstall` de Prisma necesitaba `DATABASE_URL`. Se corrigió el workflow para validar el destino antes de instalar, y pasar el secreto solo a instalación y barrido. La segunda corrida manual [#2](https://github.com/JesusMosconi/PandoCbaV2/actions/runs/38299916513) pasó la validación e instalación, pero el barrido devolvió Prisma `P2010` al consultar la base. Se detectó que el cuadro de conexión de Neon permanecía abierto desde antes del restablecimiento; se solicitó reemplazar en GitHub el secreto con la conexión obtenida tras refrescar Neon. T041 sigue abierta hasta una corrida exitosa y la verificación de la programación horaria.
- La persona responsable actualizó `PRUEBA_DATABASE_URL` en GitHub con la conexión nueva. La corrida manual [#3](https://github.com/JesusMosconi/PandoCbaV2/actions/runs/38300634201) terminó correctamente en 22 segundos; el comando informó `lotes: 0`, `procesadas: 0`, `omitidas: 0`, `fallidas: []`. La configuración de notificaciones de la cuenta `JesusMosconi` indica correo solo para workflows fallidos; no se comprobó la entrega del correo. T041 espera la primera corrida disparada por `schedule`.
- Con la conexión nueva aportada por la persona responsable en un formulario **local** temporal, `npm.cmd test` ejecutó los archivos en serie: **24 aprobadas, 0 fallidas** en `Prueba` (159,7 segundos). Incluye las cinco de T043, disponibilidad y carreras. El puente local se eliminó tras la ejecución y no guardó la conexión en archivos. La primera repetición local y un intento posterior con la cadena vieja de un cuadro de Neon abierto antes del cambio de contraseña fallaron por acceso/credenciales, sin modificar la base; no se atribuyen a fallas de la aplicación.
- Prueba visual de T043 en `http://localhost:3001/admin/ordenes` con backend local y base aislada `Prueba`: se creó la orden descartable #61 y un administrador descartable; el detalle abierto mostraba `pendiente pago` y reserva hasta el 17/10/2026. Al adelantar el vencimiento en la base, el refresco automático de la vista abierta mostró `reserva vencida en proceso` y el aviso «Reserva vencida; cancelación en proceso» sin acción manual. Un barrido procesó solo la #61 (`fallidas: []`) y el siguiente refresco mostró `cancelada vencimiento`, fecha real de cancelación e historial «Cancelada por vencimiento». El formulario local informó «Limpieza terminada»; se cerraron los servicios locales y se eliminó el puente temporal. Con esto T043 queda verificada. La entrega efectiva de correos de GitHub no se comprobó.
- Revisión final del frontend: `npm.cmd run lint` terminó con 0 errores y 9 avisos de `<img>`; `npm.cmd run build` compiló y pasó TypeScript con acceso de red para Google Fonts. El primer intento de build sin salida de red falló solo al descargar esas fuentes. `git diff --check` pasó en los tres repositorios.
- Observación del primer horario tras publicar el workflow: a las 20:30 UTC del 2026-10-12, trece minutos después del disparo configurado para las 20:17 UTC, GitHub Actions seguía mostrando solo las tres ejecuciones manuales. No se presume que el cron haya corrido; T041 continúa pendiente de una ejecución con evento `schedule` y resultado comprobable.

## Migración de la base definitiva — 2026-10-12

- La persona responsable autorizó ejecutar la migración después de verificar el destino. En Neon se identificó el proyecto `PandoCba`, rama predeterminada `production` (`br-bitter-firefly-acgi1ey3`), base `neondb`, esquema `public` y compute `ep-raspy-breeze-aclw045d`. Antes de escribir, una consulta de solo lectura confirmó cero órdenes, cinco migraciones anteriores aplicadas y cero registros de `20261011_checkout_ordenes`.
- Se creó la rama de recuperación `backup-precheckout-20261012` (`br-misty-scene-acvxsdz9`) desde `production`, con datos y esquema, antes de aplicar la migración. Neon confirmó su creación; se eliminará automáticamente el 19/10/2026 a las 17:37 (hora argentina). No se restauró ni alteró el respaldo.
- Un formulario local temporal aceptó únicamente la conexión al host de `production` y a `neondb`; `prisma migrate status` detectó la migración del checkout pendiente. `prisma migrate deploy` terminó con “All migrations have been successfully applied”. La URL se mantuvo solo en memoria del proceso, sin guardarla en archivos ni mostrar credenciales. El formulario se cerró y su archivo temporal se eliminó.
- Una consulta independiente en el SQL Editor de `production` confirmó `finished_at` presente y `rolled_back_at` ausente para `20261011_checkout_ordenes`, así como la existencia de `DetalleOrden`, `ReservaStock` y `EventoOrden`. `Orden` continuó con cero filas. No se ejecutó seed ni prueba que cree órdenes en producción. La migración amplía el esquema con tablas y columnas nuevas, pero el backend/frontend de checkout aún requieren PR, merge y despliegue; el cron actual sigue apuntando solo a `Prueba` y T041 conserva su limitación.

## Cambio 2026-10-17 — 24 horas y destino de producción

- Se consultó el historial de GitHub Actions: las 19 corridas disparadas por `schedule` del workflow de `Prueba` entre el 13 y el 16 de octubre terminaron correctamente. Sus logs informan `lotes: 0`, `procesadas: 0` y `fallidas: []`. La [corrida #22](https://github.com/JesusMosconi/PandoCbaV2/actions/runs/38968178522) confirma la ejecución del comando; no demuestra una cancelación real. La frecuencia observada fue irregular pese al cron horario.
- Se cambió el cálculo de nuevas órdenes a `creadaEn + 24 horas` en `backend/src/services/checkout.js`, la aserción de integración correspondiente y el texto visible de checkout. Las órdenes ya creadas conservan su `venceEn` persistido. No se modificó el esquema ni se ejecutó una migración.
- Se preparó localmente un workflow para `production` que toma el código de `main`, usa el secreto `PRODUCTION_DATABASE_URL` y comprueba host y base antes de ejecutar el barrido. Está en la [PR #9](https://github.com/JesusMosconi/PandoCbaV2/pull/9), sin publicar en `main` ni activar. La persona responsable pensaba que el secreto estaba configurado, pero la página de secretos de Actions mostró que aún no existe en ese repositorio.
- La [PR #8](https://github.com/JesusMosconi/PandoCbaV2/pull/8) agregó un workflow **manual de solo lectura** para comprobar la migración y contar órdenes pendientes/vencidas en producción. Tras autorización explícita se fusionó en `main`. La [primera corrida](https://github.com/JesusMosconi/PandoCbaV2/actions/runs/38999799668) falló en «Validar destino» porque `PRODUCTION_DATABASE_URL` llegó vacío; instalación y consulta se omitieron, sin acceso ni cambios a la base. En los secretos de Actions del repositorio solo se observó `PRUEBA_DATABASE_URL`; falta configurar el secreto de producción con ese nombre exacto y repetir la verificación.
- `node --check src/services/checkout.js` pasó. Frontend: `npm.cmd run lint` terminó con 0 errores y 9 avisos heredados de `<img>`; `npm.cmd run build` pasó tras habilitar la descarga de Google Fonts. El primer build falló únicamente por la descarga bloqueada de esas fuentes. `git diff --check` pasó en los tres repositorios. La prueba de integración actualizada requiere la base aislada y aún no se ejecutó. T041/T048/T049 siguen pendientes de activación y evidencia de producción.
