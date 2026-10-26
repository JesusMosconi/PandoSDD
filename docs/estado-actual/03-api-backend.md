# API Express

## Extensión 004 en la rama de trabajo: notificaciones por correo

Cambios locales en la rama `004-notificaciones-email`. Se probaron con tests unitarios y con solicitudes HTTP en los caminos que responden antes de consultar la base; la reactivación y la baja contra la base de prueba quedan pendientes (ver `specs/004-notificaciones-email/verificacion.md`).

| Archivo | Método y ruta | Cambio |
|---|---|---|
| `usuarios.routes.js` | POST `/usuarios/registro` | `asyncHandler`; tipos validados con `validateBody` (una contraseña numérica ahora da 400); correo normalizado a minúsculas con formato validado (400 «Ingresá un correo electrónico válido»); duplicado buscado sin distinguir mayúsculas y carrera `P2002` → 409. Tras el 201 dispara el correo de bienvenida sin esperarlo. |
| `usuarios.routes.js` | POST `/usuarios/login` | Busca primero el correo normalizado y después el valor recibido, para mantener el acceso de cuentas anteriores guardadas con mayúsculas. Sin cambios de contrato. |
| `usuarios.routes.js` | PUT `/usuarios/cambiar-password` | `asyncHandler`; mismos mensajes. Tras el 200 dispara el aviso de contraseña cambiada sin esperarlo. Un error inesperado responde el 500 genérico del manejador global. |
| `suscripcion.routes.js` | POST `/suscripciones` | Correo normalizado y validado; si existe inactivo, se reactiva con nueva `fechaSuscripcion` (200); si está activo, 409 como antes. Tras el 200 dispara el agradecimiento con enlace de baja. Lógica en `services/suscripciones.js`. |
| `suscripcion.routes.js` | POST `/suscripciones/baja` (nueva, pública) | Body `{ token }`. Token HMAC firmado con `EMAIL_TOKEN_SECRET` (`utils/token-baja.js`); válido → baja lógica idempotente, 200 «Tu suscripción fue dada de baja»; inválido → 400 «El enlace de baja no es válido»; sin secreto → 503. Excepción justificada a `verificarToken` (ver `08-deuda-y-riesgos.md`). |

El envío lo hace `services/email.js` con la API HTTP de Resend y el `fetch` nativo, sin dependencias nuevas. Nunca rechaza ni altera la respuesta de la ruta; sin `RESEND_API_KEY` solo registra en consola. Las plantillas están en `services/plantillas-email.js` y las tres notificaciones en `services/notificaciones.js`. Fuentes: archivos citados.

## Extensión 003 en la rama de trabajo

Las rutas siguientes están montadas localmente y requieren `verificarToken` y `esAdmin`. Todavía no cuentan con prueba HTTP de integración contra `Prueba`.

| Archivo | Método y ruta | Efecto |
|---|---|---|
| `admin-proveedores.routes.js` | GET/POST `/admin/proveedores`, GET/PUT `/admin/proveedores/:id`, POST `/admin/proveedores/:id/desactivacion` y `/reactivacion` | Lista paginada con filtros, alta, detalle con eventos, edición y baja/reactivación lógica con motivo. |
| `admin-compras.routes.js` | GET/POST `/admin/compras`, GET/PUT `/admin/compras/:id` | Lista con filtros y paginación; alta y edición de borradores con líneas y gastos. |
| `admin-compras.routes.js` | POST `/admin/compras/productos` | Crea ficha marcada desde Compras, `web=false` y sin stock inicial. |
| `admin-compras.routes.js` | POST `/admin/compras/:id/resumen`, POST `/admin/compras/:id/confirmacion` | Recalcula importes en servidor y confirma una recepción idempotente mediante clave y huella aceptada. |
| `admin-inventario.routes.js` | POST `/admin/inventario/ajustes` | Registra aumento o merma con motivo y actor; la merma no invade reservas y el costo de una entrada puede ser conocido o desconocido. |
| `admin-inventario.routes.js` | GET `/admin/inventario/variantes/:id` | Devuelve saldo físico, comprometido y libre, cobertura de costo, partidas y movimientos paginados. |

El detalle administrativo de orden añade origen de partidas, cobertura de costo y margen de mercadería cuando corresponde. La cancelación pagada antes de la salida física registra la reversión FIFO y el reintegro pendiente; después de la salida responde `DEVOLUCION_REQUERIDA`.

Las rutas administrativas de compras incluyen `POST /admin/compras/:id/correcciones`, `/anulacion` y `/devoluciones-proveedor`. Las de órdenes incluyen `POST /admin/ordenes/:id/devoluciones`, `/devoluciones/:devolucionId/reintegros`, `/cierre-sin-reintegro` y `/recepciones`. Exigen autorización de administrador y claves de operación para evitar duplicaciones. Estas rutas están implementadas localmente; su comportamiento HTTP aún no fue probado.

El código local añade `GET /admin/informes/compras-ventas` y `GET /admin/productos/:id/historial`, ambos exclusivos de administración y con filtros `desde`, `hasta`, producto, variante, proveedor y paginación. Responden resumen de todos los hechos filtrados, `totalResultados` y la página solicitada; el historial de producto agrega precios publicados por intervalo y stock físico actual. El informe fecha compras por recepción, ventas por pago, aceptación de devoluciones, reintegros efectivos y correcciones por sus fechas propias. Los cobros de envío no se mezclan con mercadería. La consulta usa atribuciones FIFO y expresa el margen como indeterminado si falta costo. No se ha verificado aún mediante solicitudes HTTP ni pruebas de integración.
La creación de variantes comienza en stock cero. La edición y la desactivación ya no modifican stock directamente; para cambiarlo se usa el ajuste trazable. Las escrituras de checkout, compras, órdenes y variantes consultan el estado global y se bloquean durante una suspensión del corte. Estas rutas nuevas todavía no tienen una prueba HTTP de integración en esta sesión.

Todas las rutas siguientes llevan prefijo `/api` por `backend/src/index.js`. En la columna acceso, `A` significa `verificarToken` + `esAdmin`, `C` significa `verificarToken` + `esCliente`, `U` significa `verificarToken` y `P` pública. `V` indica `validateBody`; las demás validaciones se describen en texto. Los controles de checkout y órdenes se limitan a sus propios prefijos para no interceptar otros routers de `/api`. La fuente de cada grupo es el archivo indicado. Fuentes de middleware: `backend/src/middleware/auth.js`, `backend/src/middleware/es-admin.js`, `backend/src/middleware/es-cliente.js`, `backend/src/utils/validate.js`.

El proxy Next `/api/admin/[...ruta]` reenvía `ordenes`, `proveedores`, `compras`, `inventario` e `informes` a los mismos prefijos de Express; las demás rutas mantienen su mapeo anterior. Devuelve JSON 401/403 según sesión/rol en el BFF, y conserva cuerpo, método, estado y `Content-Type` del backend.

| Archivo de `backend/src/routes/` | Método y ruta | Acceso | Validación/efecto principal |
|---|---|---|---|
| `checkout.routes.js` | POST `/checkout/resumen` | C | V: `tipoEntrega`; valida envío y devuelve precio vigente, bloqueos, subtotal y huella sin reservar stock; `no-store` |
| | POST `/checkout/confirmacion` | C | V: entrega, huella, clave y aceptación; crea una orden transaccional o devuelve la misma por reintento. Errores 400/409/503 con códigos y detalles recuperables; `no-store` |
| `ordenes.routes.js` | GET `/ordenes`, GET `/ordenes/:id` | C | Lista y detalle histórico solo del dueño; 404 indistinguible para ajena/inexistente; `no-store` |
| | POST `/ordenes/:id/cancelacion` | C | Solo pendiente antes de vencer; libera reservas una vez. Si venció, materializa vencimiento y devuelve 409 con estado; `no-store` |
| `admin-ordenes.routes.js` | GET `/admin/ordenes`, GET `/admin/ordenes/:id` | A | Listado filtrable/paginado y detalle con cliente/eventos; el detalle resuelve el nombre actual del actor de cada evento cuando existe; `no-store` |
| | POST `/admin/ordenes/:id/pago` | A | Pago manual antes de vencer; actor/fecha y subtotal acreditado; 409 al límite |
| | PATCH `/admin/ordenes/:id/estado` | A | V: `estado` y `envioCoordinado` opcional; matriz de estados, constancia de envío y consumo de stock |
| | POST `/admin/ordenes/:id/cancelacion` | A | V: `motivo`, `restituirStock` opcional; decisión obligatoria si pagada, efecto de stock único |

| `color.routes.js` | GET `/colors`, GET `/colors/:id` | P | Busca todos o por id; 404 si falta |
| | POST `/colors`, PUT `/colors/:id` | A | V: `nombre`, `hex` String |
| | DELETE `/colors/:id` | A | 409 si Prisma informa dependencia |
| `talle.routes.js` | GET `/talles`, GET `/talles/:id` | P | 404 si falta |
| | POST `/talles`, PUT `/talles/:id` | A | V: `valor` String; `orden` Number opcional |
| | DELETE `/talles/:id` | A | 409 si está en uso |
| `categorias.routes.js` | GET `/categorias`, GET `/categorias/:id` | P | 404 si falta id |
| | POST `/categorias`, PUT `/categorias/:id`, DELETE `/categorias/:id` | A | Usa `nombre`, `imagenUrl`; DELETE físico; sin `validateBody` |
| | POST/DELETE `/categorias/:id/imagen` | A | POST requiere archivo `imagen`; 404/400; guarda/quita URL |
| `colecciones.routes.js` | GET `/colecciones`, GET `/colecciones/:id` | P | El detalle devuelve 404 si no existe o no tiene activación registrada |
| | POST `/colecciones`, PUT `/colecciones/:id`, DELETE `/colecciones/:id` | A | Usa `nombre`, `imagenUrl`, `fechaLanzamiento`, `numeroDrop`, `contadorActivo`; sin `validateBody` |
| | POST/DELETE `/colecciones/:id/imagen` | A | POST requiere archivo `imagen`; 404/400 |
| `productos.routes.js` | GET `/productos` | P; A si `admin=true` | Filtra `categoriaId`, `coleccionId`, `talle` por disponibilidad efectiva y `orden`; sin admin exige `activo=true` y `web=true` y solo expone variantes activas con `stockDisponible>0`; administración conserva stock físico y disponible |
| | GET `/productos/:id` | P | Exige `activo=true` y `web=true`, incluye variantes con disponibilidad efectiva positiva; 404 `Producto no encontrado` si falta o no es visible |
| | POST `/productos`, PUT `/productos/:id` | A | V: `nombre`, `precio`, `categoriaId`; opcionales `descripcion`, `activo`, `web`, `coleccionId`; escribe solo estos campos permitidos |
| | DELETE `/productos/:id` | A | Actualiza `activo=false` |
| `talle-producto.routes.js` | GET `/talle-producto` | P | Filtro opcional `productoId`; responde `stock` físico y `stockDisponible` derivado |
| | POST `/talle-producto`, PUT `/talle-producto/:id` | A | V: `stock`, `estado`, `productoId`, `talleId`, `colorId`; solo esos campos se escriben. PUT impide stock físico menor a reservas efectivas bajo bloqueo |
| | DELETE `/talle-producto/:id` | A | Actualiza `stock=0`, `estado="inactivo"` solo si no hay reservas efectivas; de lo contrario 409 |
| `img-producto.routes.js` | GET `/img-producto/:productoId` | P | Imágenes por orden |
| | POST `/img-producto/upload` | A | Hasta 10 archivos `imagenes`; exige `productoId`, archivos y producto existente |
| | POST `/img-producto` | A | V: `url`, `orden`, `productoId` |
| | PUT `/img-producto/:id` | A | V: `url`, `orden` |
| | DELETE `/img-producto/:id` | A | Borrado de fila |
| `catalogo-inicio.routes.js` | GET `/catalogo-inicio`, GET `/catalogo-inicio/:id` | P | Incluye solo selecciones activas de productos con `activo=true` y `web=true`, imagen y variantes activas con `stockDisponible>0`; orden estable; 404 por id ausente o no visible |
| | GET `/catalogo-inicio/seleccion` | A | Devuelve todas las selecciones activas, incluidas las de productos no públicos, con motivos de ocultamiento |
| | PUT `/catalogo-inicio/seleccion` | A | Recibe de cero a cinco `productoIds` distintos en orden; reemplaza atómicamente la selección, con bajas lógicas y reactivaciones |
| | POST `/catalogo-inicio`, PUT `/catalogo-inicio/:id` | A | V: `orden`, `productoId` Number entero positivo; aplican cupo, unicidad y orden |
| | DELETE `/catalogo-inicio/:id` | A | Desactiva la selección y compacta el orden de las restantes |
| `contenido-inicio.routes.js` | GET `/contenido-inicio`, GET `/contenido-inicio/:id` | P | 404 por id ausente |
| | POST `/contenido-inicio`, PUT `/contenido-inicio/:id` | A | V: `seccionNombre`; campos de texto/imagen opcionales |
| | DELETE `/contenido-inicio/:id` | A | Borrado de fila |
| | POST/DELETE `/contenido-inicio/:id/imagen` | A | POST requiere `imagen`; actualiza/quita URL |
| `imagenes-nosotros.routes.js` | GET `/imagenes-nosotros` | P | Ordena por `orden` |
| | POST/DELETE `/imagenes-nosotros/:id/imagen` | A | POST requiere `imagen`; actualiza/quita URL |
| `suscripcion.routes.js` | GET `/suscripciones` | A | Lista |
| | POST `/suscripciones` | P | V: `email` String; 409 si duplicado |
| | DELETE `/suscripciones/:id` | A | Actualiza `activo=false` |
| `usuarios.routes.js` | POST `/usuarios/registro`, POST `/usuarios/login` | P | Campos requeridos, password mínimo 6 en registro, credenciales y `activo` en login |
| | GET/PUT `/usuarios/perfil`, PUT `/usuarios/cambiar-password` | U | Perfil y cambio de contraseña; validaciones manuales |
| | GET `/admin/usuarios`, GET `/admin/usuarios/:id` | A | Filtros/paginación; valida `rol` e id en detalle |
| | PATCH `/admin/usuarios/:id/estado`, PUT `/admin/usuarios/:id/rol` | A | Valida id, estado/rol; impide autodesactivación/quitarse admin |
| `carrito.routes.js` | GET `/carrito`, DELETE `/carrito` | U | Obtiene/crea carrito activo; DELETE vacía ítems; ambas respuestas incluyen `disponible` por ítem |
| | POST `/carrito/items` | U | V: `talleProductoId`, `cantidad`; enteros positivos, variante activa, producto visible y disponibilidad efectiva agrupada por variante; serializa edición frente a conversión y responde `disponible` |
| | PUT `/carrito/items/:id` | U | V: `cantidad`; dueño del ítem y carrito activo; aumento sujeto a visibilidad y disponibilidad efectiva, reducción permitida para corregir; edición bajo bloqueo |
| | DELETE `/carrito/items/:id` | U | Exige pertenencia del ítem al usuario; respuesta incluye `disponible` por ítem restante |

`asyncHandler` entrega rechazos al middleware de error. El manejador global responde 400 para errores Multer/formato y JSON inválido, y 500 genérico para el resto; varios handlers de `usuarios.routes.js` capturan sus errores localmente. Fuentes: `backend/src/utils/async-handler.js`, `backend/src/index.js`, `backend/src/routes/usuarios.routes.js`.

## Drops 005 (rama de implementación)

`GET /api/drops/inicio` responde `activo`, `futuro` o `marca`; `GET /api/drops/categorias` devuelve destacado y hasta tres colecciones lanzadas. Las lecturas no escriben. `backend/src/jobs/activar-drops.js` evalúa al arranque y cada 30 segundos con bloqueo transaccional para activar lanzamientos elegibles y cerrar el reemplazado. `GET/POST/PUT/DELETE /api/admin/drops`, la finalización, las imágenes y la configuración de marca exigen token y rol administrador. La disponibilidad descuenta reservas efectivas. Las mutaciones heredadas de `/colecciones` comparten validaciones y hacen baja lógica. El listado de colecciones sigue disponible para administración; el detalle público devuelve 404 hasta que el drop tenga `fechaActivacion`. La misma condición oculta sus productos en lecturas públicas de catálogo, variantes e imágenes, y bloquea su agregado al carrito y la confirmación de checkout. La disponibilidad interna conserva los productos preparados para decidir la activación. La ruta pública de marca responde 503 mientras falte imagen. Los resultados de las verificaciones aisladas están en `specs/005-gestionar-drops/verificacion.md`.
