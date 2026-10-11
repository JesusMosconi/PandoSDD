# Contratos de catálogo y carrito

Prefijo Express: `/api`. Los errores conservan `{ "message": string }`. Las rutas protegidas conservan `Authorization: Bearer <token>`. Fuentes actuales: `backend/src/index.js`, `backend/src/routes/productos.routes.js`, `backend/src/routes/catalogo-inicio.routes.js`, `backend/src/routes/carrito.routes.js`.

| Operación | Resultado previsto |
|---|---|
| `GET /productos` | Lista solo productos `activo=true` y `web=true`. Filtros existentes y rama `admin=true` siguen funcionando; esta última sigue exigiendo administrador y mostrando inactivos/no publicados. |
| `GET /productos/:id` | 200 para producto visible; 404 `{ "message": "Producto no encontrado" }` tanto para inexistente como para inactivo o no publicado. Las variantes sin stock no se incluyen. |
| `GET /catalogo-inicio` | Solo selecciones cuyo producto sea visible, con orden relativo conservado. |
| `GET /catalogo-inicio/:id` | 200 para selección con producto visible; 404 `{ "message": "Elemento de catálogo no encontrado" }` para selección inexistente o con producto no visible. |
| `POST /carrito/items` | Conserva entrada `{ "talleProductoId": number, "cantidad": number }`. Si la variante o su producto no están disponibles, 400 `{ "message": "La variante no está disponible" }`; sin cambios de carrito. |
| `GET /carrito` y respuestas exitosas de POST/PUT/DELETE de ítems y DELETE `/carrito` | Conservan ítems, cantidades, `precioUnitario` y subtotal. Una única función compartida añade `disponible: boolean` a cada ítem: para `TalleProducto` es verdadero solo si el producto es visible, la variante no está inactiva y `stock >= cantidad`; para `ProductoImprovisado` sin variante es `true`. Un ítem no disponible no se borra. |
| `PUT /carrito/items/:id` | Si `cantidadSolicitada > item.cantidad`, rechaza el aumento de un ítem cuyo producto no es visible con 400 y mensaje en español. Si es menor, permite la reducción por visibilidad; siguen vigentes las comprobaciones previas de variante `inactivo` y stock insuficiente, por lo que pueden rechazarla. Conserva DELETE de ítem. |

El indicador `disponible` es adicional y no cambia el esquema persistido. Una sola función del backend lo calcula para `GET /carrito` y `devolverCarritoActualizado`; para `ProductoImprovisado` sin variante devuelve `true`. El frontend solo mostrará la marca cuando el valor sea `false`, sin recalcular la regla. El subtotal incluye todos los ítems, incluso los no disponibles; su tratamiento futuro corresponde a la spec de checkout.
