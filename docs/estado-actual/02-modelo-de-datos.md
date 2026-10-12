# Modelo de datos

Fuente de todos los campos, tipos, relaciones y restricciones de la tabla: `backend/prisma/schema.prisma`. `?` significa opcional; `[]`, relación múltiple; `id` es `Int @id @default(autoincrement())` en los 23 modelos. Las relaciones indicadas usan las claves foráneas con `@relation(fields, references)` del esquema. Los modelos de checkout descritos abajo están preparados en una migración nueva, aún no aplicada por este trabajo.

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

Según informó el usuario, las cinco migraciones anteriores figuran aplicadas en la rama de prueba `Prueba` de Neon y allí hay cero órdenes. Este trabajo no comprobó ese estado mediante conexión ni aplicó la migración nueva. Fuente de archivos versionados: `backend/prisma/migrations/`.
