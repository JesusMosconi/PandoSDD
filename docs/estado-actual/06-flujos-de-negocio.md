# Flujos de negocio

## Catálogo y variantes

El inicio lee `Coleccion`, `ContenidoInicio` y `CatalogoInicio`; categorías/colecciones muestran productos filtrados. El listado público `/productos` excluye `Producto.activo=false` y variantes sin stock en la inclusión; permite filtros por categoría, colección, talle con stock y precio. El detalle `/productos/:id` incluye categoría, colección, imágenes y variantes de talle/color sin ese filtro. Fuentes: `frontend/src/app/page.tsx`, `frontend/src/app/categorias/[id]/page.tsx`, `frontend/src/app/colecciones/[id]/page.tsx`, `backend/src/routes/productos.routes.js`.

Cada variante es `TalleProducto` con `productoId`, `talleId`, `colorId`, `stock` y `estado`; el esquema impide repetir la combinación producto/talle/color. El componente `ProductVariants` permite seleccionar variante y agregar al carrito. Fuentes: `backend/prisma/schema.prisma`, `frontend/src/components/ProductVariants.tsx`, `backend/src/routes/talle-producto.routes.js`.

## Carrito

`GET /carrito` busca el último carrito `estado="activo"` del usuario o crea uno con `canal="web"`. `POST /carrito/items` exige `talleProductoId` y `cantidad` enteros positivos, rechaza variante `estado="inactivo"`, suma la cantidad previa y compara contra `stock`; guarda `precioUnitario` con el precio actual de `Producto`. `PUT` vuelve a comprobar cantidad y stock; DELETE de ítem verifica dueño y DELETE del carrito vacía sus ítems. El subtotal se suma como `cantidad * Number(precioUnitario)`; la ruta no descuenta inventario. Fuentes: `backend/src/routes/carrito.routes.js`, `backend/prisma/schema.prisma`.

## Administración e imágenes

El panel permite gestionar productos, variantes, talles, colores, imágenes y clientes; las pantallas de imágenes gestionan imágenes de categorías, colecciones, contenido inicial y nosotros. La API también expone catálogo inicial y suscripciones, aunque no se identificó pantalla administrativa dedicada a estos dos recursos entre las páginas de `frontend/src/app/admin/`. Fuentes: `frontend/src/app/admin/page.tsx`, `frontend/src/components/AdminProductos.tsx`, `frontend/src/components/AdminImagenes.tsx`, `frontend/src/components/AdminClientes.tsx`, `backend/src/routes/catalogo-inicio.routes.js`, `backend/src/routes/suscripcion.routes.js`.

Las cargas pasan por Multer/Cloudinary: JPEG, PNG, WebP y AVIF, máximo 5 MB por imagen; la carga de productos admite hasta diez archivos. Para categoría, colección, inicio y nosotros, reemplazar/quitar una imagen intenta eliminar la anterior de Cloudinary. Fuentes: `backend/src/utils/upload.js`, `backend/src/routes/img-producto.routes.js`, `backend/src/routes/categorias.routes.js`, `backend/src/routes/colecciones.routes.js`, `backend/src/routes/contenido-inicio.routes.js`, `backend/src/routes/imagenes-nosotros.routes.js`, `backend/src/utils/imagen-local.js`.

`Orden`, `DatosEnvio`, `Venta`, `Favorito`, `ActividadAdmin` y `ProductoImprovisado` están en el esquema pero no tienen routers propios ni páginas para gestionarlos; `Usuario` sí consulta el recuento de `ordenes` y `favoritos`, y `Carrito` puede incluir la relación `productoImprovisado`. No hay endpoint de checkout en los routers montados. Fuentes: `backend/prisma/schema.prisma`, `backend/src/index.js`, `backend/src/routes/usuarios.routes.js`, `backend/src/routes/carrito.routes.js`, `frontend/src/app/admin/clientes/page.tsx`.
