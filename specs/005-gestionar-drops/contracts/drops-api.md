# Contratos propuestos para drops

Base de Express: `/api`. Las escrituras y lecturas administrativas del navegador pasan por `/api/admin/...` del BFF y requieren rol administrador también en Express. El BFF debe reconocer `drops` como prefijo administrativo para reenviar `/api/admin/drops/...` a Express sin quitar `/admin`.

## Lectura pública

### `GET /api/drops/inicio`

Respuesta 200 discriminada por `tipo`:

- `activo`: `{ tipo, drop: { id, nombre, numeroDrop, imagenUrl, tituloInicio, textoBotonInicio, fechaLanzamiento }, urlColeccion }`.
- `futuro`: `{ tipo, drop: { id, nombre, numeroDrop, imagenUrl, tituloInicio, fechaLanzamiento } }`. Sin URL de colección ni texto de botón accionable; cliente calcula cuenta regresiva.
- `marca`: `{ tipo, marca: { imagenUrl } }`. Sin título visual, URL de colección ni cuenta regresiva.

Las lecturas públicas no escriben. Muestran el activo registrado por el trabajo interno (activación en hasta 60 segundos con proceso en ejecución), el futuro o la marca; aplican el fin por fecha y disponibilidad actual. No exponen drops retirados ni datos administrativos. Antes de habilitar esta lectura en producción, la pieza de marca debe estar completa. Si falta durante preparación, responder 503 con `codigo=CONFIGURACION_INCOMPLETA`; Inicio muestra su error de carga existente, sin inventar imagen o título comercial.

### `GET /api/drops/categorias`

Respuesta 200: `{ destacado: null | { id, nombre, imagenUrl, urlColeccion, agotado }, colecciones: Array<{ id, nombre, fechaLanzamiento, urlColeccion }> }`.

`destacado` usa el activo; si falta, último lanzado disponible; si ninguno disponible, último lanzado con `agotado=true`. `colecciones` tiene hasta tres lanzados recientes, sin futuros, borradores ni retirados. Desempate por id descendente.

### Compatibilidad de colección

`GET /api/colecciones` conserva el listado que usa la gestión administrativa. `GET /api/colecciones/:id` devuelve 404 mientras el drop no tenga `fechaActivacion`; una colección activada anteriormente conserva su detalle aun tras finalizar. Las lecturas públicas de productos, variantes, imágenes y catálogo destacado omiten productos asociados a drops sin activación. Carrito y checkout impiden agregarlos o confirmar su compra. La disponibilidad interna de Drops cuenta productos preparados antes del lanzamiento.

## Administración

### `GET /api/admin/drops`

Listado completo con `id`, nombre, número, imagen, textos, fechas, estado calculado, cantidad de productos públicos disponibles y `motivoEstado`. Incluye borradores, futuros, pendientes, activos, finalizados y retirados. Orden estable por fecha de lanzamiento y id.

### `POST /api/admin/drops` y `PUT /api/admin/drops/:id`

Campos permitidos: `nombre`, `numeroDrop`, `fechaLanzamiento`, `fechaFinalizacion`, `tituloInicio`, `textoBotonInicio`. La portada se sube por ruta de imagen específica. Se aceptan borradores sin fecha; para programar, exigir portada, título y texto de botón. Validar fecha final posterior a inicio y campos desconocidos. Respuesta 201/200 con drop actualizado. Errores 400 de validación, 401/403 de acceso, 404 de id y 409 de transición conflictiva. No aceptar estado calculado, `fechaCierre` ni `activo` arbitrarios desde el cliente. La asignación de productos sigue en el panel Productos existente.

Secuencia de creación: `POST` crea borrador sin fecha; se carga su imagen con el id devuelto; `PUT` guarda textos y fecha para programarlo. Un `POST` con fecha solo se admite si la portada llega en la misma operación, por lo que el panel usa el flujo de borrador. La programación no exige stock anticipado, pero el panel avisa si aún no hay producto público disponible.

### `POST /api/admin/drops/:id/finalizar`

Finaliza un drop cuyo lanzamiento ya ocurrió de forma irreversible para activación automática; idempotente ante repetición. Respuesta 200 con estado final. Para un borrador o futuro que se desea cancelar, usar retiro en lugar de finalización.

### `DELETE /api/admin/drops/:id`

Baja lógica con `activo=false`, sin borrar productos ni historia. Confirmación explícita en panel; respuesta 200 con estado retirado. Repetición idempotente.

### Imagen de drop

`POST /api/admin/drops/:id/imagen` y `DELETE /api/admin/drops/:id/imagen` usan el mecanismo de imágenes actual y validación de tamaño/formato; la carga no modifica otros campos. No duplicar la edición en el panel Imágenes.

### `GET/PUT /api/admin/drops/marca` e imagen

La lectura devuelve `{ titulo, imagenUrl, completo }`; `titulo` es un campo heredado opcional que no se muestra. `PUT` conserva compatibilidad para `titulo`; `POST/DELETE /api/admin/drops/marca/imagen` gestiona la imagen. Al configurar la imagen por primera vez se fija `fechaCompletada` y `completo=true`. Desde ese momento, rechazar su eliminación sin reemplazo con 409. Vista previa en el panel antes de confirmar. Antes del despliegue, verificar que `completo=true` y que la imagen sea accesible.

## Errores y consistencia

- Mensajes en español: `message` y, cuando corresponda, `codigo` estable (`FECHA_INVALIDA`, `DROP_FINALIZADO`, `CONFIGURACION_INCOMPLETA`, `SIN_PRODUCTOS_DISPONIBLES`).
- El backend decide prioridad y disponibilidad; Inicio y Categorías no repiten algoritmos de selección.
- Al guardar o cambiar disponibilidad, una respuesta fallida no deja un drop medio publicado. El trabajo interno registra activación y cierre en una sola transacción idempotente; ninguna ruta GET pública escribe.
- Las imágenes siguen el comportamiento de carga/reemplazo vigente; comprobar limpieza del archivo previo al plan de despliegue.
