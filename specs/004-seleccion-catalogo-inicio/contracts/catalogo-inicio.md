# Contratos previstos: catálogo de Inicio

Rutas Express bajo `/api`. El navegador administrativo utiliza el proxy Next `/api/admin/[...ruta]`, que ya reenvía rutas `catalogo-inicio` y mantiene el token entre servidores.

## Lectura pública

- `GET /catalogo-inicio`: `200` con arreglo ordenado de selecciones activas cuyos productos cumplen `activo=true && web=true`. Mantiene los campos que usa Inicio: `id`, `orden` y `producto` con nombre, precio, descripción, imagen y talles. Vacío: `[]`.
- `GET /catalogo-inicio/:id`: solo entrada activa de producto público; si no existe o no es visible, `404`.

## Lectura administrativa nueva

`GET /catalogo-inicio/seleccion`: exige administrador. `200` con arreglo de entradas activas ordenadas: `id`, `orden`, `productoId`, producto (`id`, `nombre`, `activo`, `web`, `coleccionId`) y `motivosOcultamiento` (`inactivo`, `no_publicado`, ambos o `[]`). Vacío: `[]`. Registrar la ruta antes de `/:id`.

## Reemplazo ordenado nuevo

`PUT /catalogo-inicio/seleccion`: exige administrador. Cuerpo `{ "productoIds": [12, 7, 25] }`: de cero a cinco enteros positivos distintos en el orden deseado. `[]` desactiva toda la selección. El backend verifica existencia y guarda de forma atómica. `200` devuelve la lista administrativa confirmada. La misma lista repetida no cambia el resultado.

Se admite un producto que ya esté inactivo o no publicado: queda en la selección administrativa, ocupa cupo y no se incluye en la lectura pública. Volver a elegir un producto quitado reactiva su entrada anterior una sola vez.

- `400`: cuerpo, ID u orden inválidos, o más de cinco IDs.
- `404`: producto inexistente.
- `409`: producto duplicado; conservar la selección previa.
- `401/403`: falta de sesión o de rol administrativo.

## Escrituras individuales existentes

`POST /catalogo-inicio`, `PUT /catalogo-inicio/:id` y `DELETE /catalogo-inicio/:id` mantienen autorización administrativa, pero pasan por las mismas reglas de cupo, unicidad, orden y exclusión. `DELETE` desactiva la fila; `PUT` no puede dejar posiciones ambiguas. `404` indica entrada inexistente. La pantalla nueva usa la operación de lista completa.

## Presentación

Inicio muestra hasta cinco entradas públicas. La primera es tarjeta grande y las siguientes pequeñas. Una lista vacía mantiene el mensaje actual. El drop no participa en la selección.
