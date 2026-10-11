# Investigación y decisiones técnicas

## Regla pública única

- **Decisión:** un helper puro en `backend/src/utils/` expondrá la condición de visibilidad de `Producto` (`activo=true` y `web=true`) en forma apta para `where` de Prisma y para evaluar un objeto `Producto` ya cargado. Las rutas públicas usarán ese helper; `admin=true` conservará su rama sin filtro público.
- **Motivo:** la spec exige una única definición para consultas y comprobaciones puntuales. Hoy `GET /productos` filtra solo `activo`, el detalle no filtra y el destacado no filtra ninguno (`backend/src/routes/productos.routes.js`, `backend/src/routes/catalogo-inicio.routes.js`).
- **Alternativas descartadas:** copiar dos booleanos en cada ruta permitiría otra divergencia; filtrar respuestas después de consultar ocultaría datos más tarde de lo necesario.

## Detalle y destacado

- **Decisión:** el detalle público buscará por ID junto con el predicado de visibilidad y conservará el 404 `Producto no encontrado`. Las consultas de destacados filtrarán por la relación `producto`, preservando `orden` y las demás selecciones. El detalle de un destacado usará `findFirst` con filtro relacional o verificará el producto tras cargarlo, porque `findUnique` no admite ese filtro. El detalle de producto solo incluirá variantes con stock positivo, como el listado público actual.
- **Motivo:** evita exponer un producto no visible sin cambiar la semántica de no encontrado ni el panel admin (`backend/src/routes/productos.routes.js`, `backend/src/routes/catalogo-inicio.routes.js`).
- **Alternativas descartadas:** responder 403 o borrar una selección destacada revelaría estado o modificaría contenido administrativo.

## Carrito existente

- **Decisión:** una función compartida de presentación añadirá `disponible` tanto a `GET /carrito` como a `devolverCarritoActualizado` y conservará los ítems y su `precioUnitario`/subtotal. `POST /carrito/items` y el aumento por `PUT` comprobarán la visibilidad del producto con el mismo helper; el aumento se identifica con `cantidadSolicitada > item.cantidad`. Las reducciones de un producto no visible se permiten, siempre sujetas a las validaciones previas de variante inactiva y stock. DELETE de ítem seguirá permitido. Un ítem de `ProductoImprovisado` sin variante tendrá `disponible: true`.
- **Motivo:** cumple la conservación elegida sin migración, baja automática ni recálculo de precios (`backend/src/routes/carrito.routes.js`).
- **Alternativas descartadas:** borrar u ocultar ítems incumple la respuesta del usuario; recalcular precio o descontar stock queda fuera de alcance.
- **Decisión de alcance:** se autorizó el ajuste mínimo de `frontend/src/components/CarritoPanel.tsx` y `frontend/src/types/carrito.ts` para que el cliente vea la marca de no disponible. La lógica de disponibilidad sigue en backend; el frontend solo muestra el dato y deshabilita el aumento de cantidad.

## Verificación

- **Decisión:** usar casos manuales reproducibles con `curl.exe` sobre un entorno aislado y fixtures conocidos. No se utilizará `backend/scripts/bulk-upload-imagenes.js`, porque su función es subir imágenes y no verificar el catálogo.
- **Motivo:** `backend/package.json` no define `test`, lint ni build; no se identificó infraestructura de pruebas del proyecto. No se requiere instalar dependencias.
- **Alternativas descartadas:** añadir una suite o dependencia de tests excede el alcance especificado.
