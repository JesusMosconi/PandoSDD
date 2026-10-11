# Modelo de datos afectado

No se cambia `backend/prisma/schema.prisma` ni se crean migraciones. Referencia: `backend/prisma/schema.prisma`.

| Entidad existente | Campos relevantes | Uso en la regla |
|---|---|---|
| `Producto` | `id`, `activo`, `web`, `precio` | Visible al público solo cuando `activo=true` y `web=true`; `precio` no se modifica. |
| `TalleProducto` | `id`, `productoId`, `estado`, `stock` | El agregado exige producto visible, variante activa y stock suficiente; detalle oculta variantes sin stock. |
| `CatalogoInicio` | `id`, `productoId`, `orden` | La selección se conserva; la lectura pública omite filas cuyo producto no es visible. |
| `Carrito` | `id`, `usuarioId`, `estado`, `items` | Conserva ítems anteriores aunque el producto deje de ser visible. |
| `ItemCarrito` | `id`, `talleProductoId`, `cantidad`, `precioUnitario` | Conserva cantidad y precio; `disponible` será un dato derivado en todas las respuestas de carrito, no un campo persistido. Para ítems `ProductoImprovisado` sin variante será `true`. |

Transiciones relevantes: `Producto.activo` o `Producto.web` pasa de `true` a `false` después del agregado; el ítem permanece, pasa a presentarse como no disponible y no admite aumento de cantidad. Si ambas marcas vuelven a `true` y la variante mantiene estado y stock adecuados, la disponibilidad vuelve a evaluarse en la próxima consulta. La definición exacta del indicador de respuesta está en `contracts/catalogo-carrito.md`.
