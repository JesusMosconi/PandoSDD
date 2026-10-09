# API Express

Todas las rutas siguientes llevan prefijo `/api` por `backend/src/index.js`. En la columna acceso, `A` significa `verificarToken` + `esAdmin`, `U` significa `verificarToken` y `P` pública. `V` indica `validateBody`; las demás validaciones se describen en texto. La fuente de cada grupo es el archivo indicado. Fuentes de middleware: `backend/src/middleware/auth.js`, `backend/src/middleware/es-admin.js`, `backend/src/utils/validate.js`.

| Archivo de `backend/src/routes/` | Método y ruta | Acceso | Validación/efecto principal |
|---|---|---|---|
| `color.routes.js` | GET `/colors`, GET `/colors/:id` | P | Busca todos o por id; 404 si falta |
| | POST `/colors`, PUT `/colors/:id` | A | V: `nombre`, `hex` String |
| | DELETE `/colors/:id` | A | 409 si Prisma informa dependencia |
| `talle.routes.js` | GET `/talles`, GET `/talles/:id` | P | 404 si falta |
| | POST `/talles`, PUT `/talles/:id` | A | V: `valor` String; `orden` Number opcional |
| | DELETE `/talles/:id` | A | 409 si está en uso |
| `categorias.routes.js` | GET `/categorias`, GET `/categorias/:id` | P | 404 si falta id |
| | POST `/categorias`, PUT `/categorias/:id`, DELETE `/categorias/:id` | A | Usa `nombre`, `imagenUrl`; DELETE físico; sin `validateBody` |
| | POST/DELETE `/categorias/:id/imagen` | A | POST requiere archivo `imagen`; 404/400; guarda/quita URL |
| `colecciones.routes.js` | GET `/colecciones`, GET `/colecciones/:id` | P | 404 si falta id |
| | POST `/colecciones`, PUT `/colecciones/:id`, DELETE `/colecciones/:id` | A | Usa `nombre`, `imagenUrl`, `fechaLanzamiento`, `numeroDrop`, `contadorActivo`; sin `validateBody` |
| | POST/DELETE `/colecciones/:id/imagen` | A | POST requiere archivo `imagen`; 404/400 |
| `productos.routes.js` | GET `/productos` | P; A si `admin=true` | Filtra `categoriaId`, `coleccionId`, `web=true`, `talle` con stock y `orden`; sin admin excluye inactivos |
| | GET `/productos/:id` | P | Busca por id; 404 si falta |
| | POST `/productos`, PUT `/productos/:id` | A | V: `nombre`, `precio`, `categoriaId`; opcionales `descripcion`, `activo`, `web`, `coleccionId` |
| | DELETE `/productos/:id` | A | Actualiza `activo=false` |
| `talle-producto.routes.js` | GET `/talle-producto` | P | Filtro opcional `productoId` |
| | POST `/talle-producto`, PUT `/talle-producto/:id` | A | V: `stock`, `estado`, `productoId`, `talleId`, `colorId` |
| | DELETE `/talle-producto/:id` | A | Actualiza `stock=0`, `estado="inactivo"` |
| `img-producto.routes.js` | GET `/img-producto/:productoId` | P | Imágenes por orden |
| | POST `/img-producto/upload` | A | Hasta 10 archivos `imagenes`; exige `productoId`, archivos y producto existente |
| | POST `/img-producto` | A | V: `url`, `orden`, `productoId` |
| | PUT `/img-producto/:id` | A | V: `url`, `orden` |
| | DELETE `/img-producto/:id` | A | Borrado de fila |
| `catalogo-inicio.routes.js` | GET `/catalogo-inicio`, GET `/catalogo-inicio/:id` | P | Incluye producto, imagen y talles con stock; 404 por id ausente |
| | POST `/catalogo-inicio`, PUT `/catalogo-inicio/:id` | A | V: `orden`, `productoId` Number |
| | DELETE `/catalogo-inicio/:id` | A | Borrado de fila |
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
| `carrito.routes.js` | GET `/carrito`, DELETE `/carrito` | U | Obtiene/crea carrito activo; DELETE vacía ítems |
| | POST `/carrito/items` | U | V: `talleProductoId`, `cantidad`; enteros positivos, variante disponible y stock |
| | PUT `/carrito/items/:id` | U | V: `cantidad`; dueño del ítem, entero positivo y stock |
| | DELETE `/carrito/items/:id` | U | Exige pertenencia del ítem al usuario |

`asyncHandler` entrega rechazos al middleware de error. El manejador global responde 400 para errores Multer/formato y JSON inválido, y 500 genérico para el resto; varios handlers de `usuarios.routes.js` capturan sus errores localmente. Fuentes: `backend/src/utils/async-handler.js`, `backend/src/index.js`, `backend/src/routes/usuarios.routes.js`.
