# Modelo de datos

## Extensión 003 en la rama de trabajo

El esquema de esta rama incorpora `Proveedor` (baja lógica) y `EventoProveedor`; `Ingreso` conserva un borrador o una recepción confirmada con `LineaIngreso` y `GastoAdicionalCompra`. `PartidaInventario` identifica unidades por variante, ingreso y costo unitario conocido o desconocido; `MovimientoInventario` registra entradas y salidas físicas. `Producto.creadoDesdeCompras` y `TalleProducto.inicioInventarioCero` distinguen fichas y variantes nuevas del catálogo heredado. La migración `20261018_compras_proveedores_base` se aplicó a Neon `PandoCba`/`Prueba`/`neondb`/`public`, según la verificación registrada en `specs/003-compras-proveedores-costos/verificacion.md`.

`AsignacionPartida` vincula una partida, variante, línea de orden y reserva, con cantidad positiva y estado `reservada`, `vendida`, `liberada` o `revertida`. Al pago guarda costo unitario de ese momento, importe efectivo y descuento atribuido. La migración `20261018_asignacion_partida_fifo` está aplicada en `Prueba/neondb` y la suite backend se ejecutó allí. Las variantes heredadas no recibían asignaciones antes del corte de inventario. `EstadoCorteInventario`, `EstadoCorteVariante` y `ExistenciaInicial` están en el esquema; el corte operativo de `Prueba/neondb` se activó el 2026-10-19 con 32 variantes conciliadas, 30 existencias iniciales, 466 unidades y costos ficticios conocidos para las 30. Esta verificación es de base de datos; el código 003 aún no se desplegó.

| Modelo 003 | Campos y relaciones principales | Restricciones relevantes |
|---|---|---|
| `Proveedor` | Nombre, contacto, observaciones, `activo`, fechas; eventos e ingresos | La desactivación es lógica. |
| `EventoProveedor` | Proveedor, tipo, motivo, valores anteriores/nuevos, actor y fecha | Índice por proveedor y fecha. |
| `Ingreso` | Proveedor, fechas de compra y recepción, estado, comprobante, clave y huella de confirmación; líneas, gastos y partidas | `claveOperacion` única; índices por proveedor y estado. |
| `GastoAdicionalCompra` | Ingreso, concepto, importe y `activo` | Importe no negativo en SQL. |
| `LineaIngreso` | Ingreso, variante, cantidad, costo unitario y `activo` | Variante única por ingreso; cantidad positiva. |
| `PartidaInventario` | Variante, ingreso opcional, origen, cantidad original, costo unitario opcional, fecha de recepción y confirmación | Orden FIFO indexado; costo `null` significa desconocido. |
| `MovimientoInventario` | Variante, partida e ingreso opcionales, tipo, cantidad firmada, motivo, actor y fecha | Índices por variante, partida e ingreso. |
| `AsignacionPartida` | Partida, variante, detalle de orden, reserva, cantidad, estado, costo e importes al pago, fechas | Cantidad positiva, estados permitidos e índices por variante, partida, reserva y detalle. |
| `EstadoCorteInventario` | Estado global, suspensión, fechas y actores de verificación/activación | Una sola fila; `activo` exige rutas verificadas y suspensión levantada. |
| `EstadoCorteVariante` | Variante, estado, origen, saldo físico y comprometido capturados, conciliación | Una marca por variante; distingue pendiente, conciliada y bloqueada. |
| `ExistenciaInicial` | Variante, partida y movimiento inicial, saldo, costo opcional, actor y fecha | Una por variante con saldo positivo; costo `null` significa desconocido y `0` es costo conocido. |
La tabla siguiente conserva el inventario de los 23 modelos de la base 002; los modelos 003 se resumen en la tabla superior. Fuente de los campos, tipos, relaciones y restricciones de la tabla: `backend/prisma/schema.prisma`. `?` significa opcional; `[]`, relación múltiple; `id` es `Int @id @default(autoincrement())` en los 23 modelos. Las relaciones indicadas usan las claves foráneas con `@relation(fields, references)` del esquema. Los modelos de checkout descritos abajo provienen de la migración 002.

| Modelo | Campos escalares además de `id` | Relaciones y restricciones |
|---|---|---|
| `Usuario` | `nombre String`, `apellido String`, `email String`, `password String`, `telefono String?`, `fechaCreado DateTime @default(now())`, `rol String @default("cliente")`, `activo Boolean @default(true)` | `carrito Carrito[]`, `favoritos Favorito[]`, `suscripcion Suscripcion?`, `ordenes Orden[]`; `email @unique` |
| `Suscripcion` | `email String`, `activo Boolean @default(true)`, `fechaSuscripcion DateTime @default(now())`, `usuarioId Int?` | `usuario Usuario?`; `email @unique`, `usuarioId @unique` |
| `Categoria` | `nombre String`, `imagenUrl String?` | `productos Producto[]` |
| `Coleccion` | `nombre String`, `imagenUrl String?`, `fechaLanzamiento DateTime?`, `numeroDrop Int?`, `contadorActivo Boolean @default(true)`, `fechaCreado DateTime @default(now())` | `productos Producto[]` |
| `Producto` | `nombre String`, `descripcion String?`, `precio Decimal`, `activo Boolean @default(true)`, `CreatedAt DateTime @default(now())`, `UpdatedAt DateTime @updatedAt`, `web Boolean @default(true)`, `categoriaId Int`, `coleccionId Int?` | `categoria Categoria`, `coleccion Coleccion?`, `talles TalleProducto[]`, `imagenes ImgProducto[]`, `favoritos Favorito[]`, `catalogos CatalogoInicio[]`, `detallesOrden DetalleOrden[]` |
| `Talle` | `valor String`, `orden Int?` | `tallesProducto TalleProducto[]` |
| `Color` | `nombre String`, `hex String` | `tallesProducto TalleProducto[]` |
| `TalleProducto` | `stock Int`, `estado String`, `productoId Int`, `talleId Int`, `colorId Int` | `producto Producto`, `talle Talle`, `color Color`, `itemsCarrito ItemCarrito[]`, `detallesOrden DetalleOrden[]`, `reservasStock ReservaStock[]`; `@@unique([productoId, talleId, colorId])` |
| `ImgProducto` | `url String`, `orden Int`, `productoId Int` | `producto Producto`; `url @unique` |
| `CatalogoInicio` | `orden Int`, `productoId Int` | `producto Producto` |
| `Carrito` | `estado String @default("activo")`, `actualizado DateTime @updatedAt`, `canal String`, `usuarioId Int` | `usuario Usuario`, `items ItemCarrito[]`, `orden Orden?`, `ventas Venta[]` |
| `ItemCarrito` | `cantidad Int`, `precioUnitario Decimal`, `talleProductoId Int?`, `carritoId Int`, `productoImprovisadoId Int?` | `talleProducto TalleProducto?`, `carrito Carrito`, `productoImprovisado ProductoImprovisado?` |
| `ProductoImprovisado` | `nombre String`, `talle String?`, `categoria String?`, `color String?`, `precio Decimal` | `items ItemCarrito[]` |
| `Orden` | `tipoEntrega String`, `estado String @default("pendiente")`, `subtotal Decimal`, `costoEnvio Decimal?`, `total Decimal?`, `metodoPago String`, `fechaCreado DateTime @default(now())`, `creadaEn DateTime?`, `venceEn DateTime?`, `claveConfirmacion String?`, `huellaSolicitud String?`, `pagoConfirmadoEn DateTime?`, `pagoConfirmadoPorId Int?`, `envioCoordinadoEn DateTime?`, `envioCoordinadoPorId Int?`, `canceladaEn DateTime?`, `motivoCancelacion String?`, `restituirStock Boolean?`, `usuarioId Int`, `carritoId Int` | `usuario Usuario`, `carrito Carrito`, `datosEnvio DatosEnvio?`, `actividades ActividadAdmin[]`, `detalles DetalleOrden[]`, `reservas ReservaStock[]`, `eventos EventoOrden[]`; `carritoId @unique`, `@@unique([usuarioId, claveConfirmacion])`, índices por usuario/creación y estado/vencimiento |
| `DetalleOrden` | `ordenId Int`, `posicion Int`, `productoId Int?`, `talleProductoId Int?`, `nombreProducto String`, `talle String`, `color String`, `cantidad Int`, `precioUnitario Decimal`, `importeLinea Decimal` | `orden Orden`, `producto Producto?`, `talleProducto TalleProducto?`; `@@unique([ordenId, posicion])`. Conserva la descripción e importes históricos aunque desaparezcan referencias opcionales. |
| `ReservaStock` | `ordenId Int`, `talleProductoId Int`, `cantidad Int`, `estado String`, `reservadaEn DateTime`, `liberadaEn DateTime?`, `consumidaEn DateTime?` | `orden Orden`, `talleProducto TalleProducto`; `@@unique([ordenId, talleProductoId])`, índice por variante/estado; SQL exige cantidad positiva y estado válido. |
| `EventoOrden` | `ordenId Int`, `fecha DateTime`, `origen String`, `actorUsuarioId Int?`, `estadoAnterior String?`, `estadoNuevo String`, `motivo String?`, `restituirStock Boolean?` | `orden Orden`; índice por orden/fecha. |
| `DatosEnvio` | `direccion String`, `ciudad String`, `codPostal String?`, `telefono String?`, `email String?`, `ordenId Int` | `orden Orden`; `ordenId @unique` |
| `Venta` | `canal String`, `idTransaccion String?`, `monto Decimal`, `estado String`, `clienteNombre String?`, `clienteMail String?`, `fecha DateTime @default(now())`, `carritoId Int` | `carrito Carrito` |
| `Favorito` | `fechaCreado DateTime @default(now())`, `productoId Int`, `usuarioId Int` | `producto Producto`, `usuario Usuario`; `@@unique([productoId, usuarioId])` |
| `ActividadAdmin` | `tipoEvento String`, `fecha DateTime @default(now())`, `ordenId Int` | `orden Orden` |
| `ContenidoInicio` | `seccionNombre String`, `imagenUrl String?`, `titulo String?`, `textoPrincipal String?`, `textBoton String?`, `alineacionTexto String?` | Sin relaciones declaradas |
| `ImagenNosotros` | `clave String`, `nombre String`, `orden Int`, `imagenUrl String?` | `clave @unique` |

## Migraciones versionadas

| Archivo | Cambio leído |
|---|---|
| `backend/prisma/migrations/20260629151650_init/migration.sql` | Crea tablas base, índices únicos y claves foráneas del esquema inicial. |
| `backend/prisma/migrations/20260728120000_add_categoria_coleccion_imagen_url/migration.sql` | Agrega `imagenUrl` a `Categoria` y `Coleccion`. |
| `backend/prisma/migrations/20260728203102_add_numero_drop_fecha_lanzamiento/migration.sql` | Agrega `numeroDrop` a `Coleccion`; `fechaLanzamiento` ya aparece en la migración inicial. |
| `backend/prisma/migrations/20260729190000_add_imagen_nosotros/migration.sql` | Crea `ImagenNosotros`, índice único de `clave` e inserta cuatro filas iniciales. |
| `backend/prisma/migrations/20260827120000_add_usuario_activo/migration.sql` | Agrega `Usuario.activo` con valor inicial `true`. |
| `backend/prisma/migrations/20261011_checkout_ordenes/migration.sql` | Preparada, no aplicada aquí: permite costo y total desconocidos, agrega metadatos de la orden y las tablas históricas, de reserva y de eventos. Conserva filas heredadas. |

Convenciones observadas: nombres de dominio mayormente en español, con excepciones `CreatedAt`, `UpdatedAt`, `web`, `ItemCarrito`; `activo` existe en `Usuario`, `Suscripcion` y `Producto`, pero solo la baja de `Producto` actualiza `activo` en su ruta DELETE. La baja de `TalleProducto` usa `estado="inactivo"` y `stock=0`. Fuentes: `backend/prisma/schema.prisma`, `backend/src/routes/productos.routes.js`, `backend/src/routes/talle-producto.routes.js`, `backend/src/routes/suscripcion.routes.js`.

La frase anterior sobre las cinco migraciones corresponde a la revisión inicial. En el trabajo local de la funcionalidad 003 se verificaron y aplicaron las migraciones nuevas de corte, compras, asignación FIFO, correcciones/devoluciones y origen de recepción en `Prueba`/`neondb`/`public`; el último `prisma migrate status` informó el esquema al día. El corte se ejecutó y activó en esa rama de prueba el 2026-10-19; no se ejecutó en `production`.

El esquema actual añade `Ingreso`, `PartidaInventario`, `MovimientoInventario`, `AsignacionPartida`, `CorreccionIngreso`, `DevolucionProveedor`, `DevolucionCliente`, `DevolucionClienteAsignacion`, `PagoReintegro` y `RecepcionDevolucion`. La asignación de devolución conserva unidades, importe efectivo y costo revertido por origen FIFO. Cada partida creada por recepción apta referencia su recepción y asignación original; las dañadas no crean stock. Las migraciones aplicadas quedan inmutables. Fuente: `backend/prisma/schema.prisma` y `backend/prisma/migrations/20261019_origen_recepcion_devolucion/migration.sql`.

`VigenciaPrecio` registra por producto precio regular o promocional, importe, origen e intervalo `[inicio, fin)`. La migración `20261019_vigencias_precio` observó los precios regulares de productos activos y publicados al aplicarse, sin reconstruir precios anteriores. Un constraint excluye intervalos solapados de igual producto y clase. Prisma informó el esquema al día tras aplicarla en `Prueba`.
