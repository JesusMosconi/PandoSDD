# Investigación y decisiones: gestión de drops

## Estado y transición

- **Decisión**: Usar `Coleccion` como drop y separar datos persistidos (fecha de activación, cierre manual/reemplazo, retiro) del estado calculado (`borrador`, `futuro`, `pendiente`, `activo`, `finalizado`). Un trabajo interno de backend evalúa al arrancar y al menos cada 60 segundos; las rutas públicas solo leen estado confirmado y calculan fin por fecha.
- **Motivo**: `contadorActivo` actual es un booleano heredado con valor por defecto `true`; no permite distinguir estados. Un GET público que escribiera el cierre violaría la constitution. El trabajo interno registra el reemplazo aunque no haya visitas.
- **Alternativas**: escritura en GET (viola la constitution), cálculo en frontend (Inicio/Categorías divergen), varios booleanos editables (estados contradictorios), cron externo exclusivo (requiere configuración de despliegue y también puede retrasarse).
- **Persistencia de reemplazo**: el trabajo registra activación del nuevo y cierre del anterior en una transacción idempotente con bloqueo de concurrencia entre instancias. Si no hubo evaluación mientras el nuevo tenía disponibilidad, no se infiere una activación histórica. Al reiniciar, evaluar pendientes. Probar concurrencia y reinicio; antes de desplegar, verificar que el backend permanece en ejecución o proveer un programador equivalente.

## Elegibilidad y prioridad

- **Decisión**: Reutilizar `whereProductoVisible` y `presentarVariantesConDisponibilidad`; elegible implica al menos un producto `activo=true`, `web=true` con variante activa y `stockDisponible > 0` después de reservas. Entre lanzamientos elegibles y no finalizados, prevalece el más reciente por fecha de lanzamiento, con identificador como desempate estable.
- **Motivo**: evita divergir del inventario usado por productos y checkout. Un lanzamiento pendiente por falta de productos puede comenzar cuando recupera disponibilidad dentro de su período.
- **Alternativas**: contar productos asociados o stock bruto (puede anunciar artículos no comprables).
- **Límite**: un drop manualmente finalizado o retirado nunca vuelve a ser candidato; al pasar su fecha de fin deja de serlo. Para Inicio futuro, escoger fecha más cercana aún posterior al instante actual, sin exigir stock anticipado; la falta de stock se avisará en administración.

## Contenido editorial

- **Decisión**: Título y texto del botón pertenecen a cada drop. La etiqueta `NEW DROP` y número siguen derivados; la cuenta regresiva deriva de la fecha. La pieza de marca usa la imagen provista con mensaje incorporado, sin título superpuesto. El panel Drops gestiona las imágenes y los textos de cada drop.
- **Motivo**: cada lanzamiento conserva su identidad y el estado sin drop puede cambiar sin alterar históricos. El panel Imágenes deja de exponer las portadas y la imagen de marca.
- **Alternativas**: `ContenidoInicio.hero` global para todos los drops (perdería textos propios), valores de código como configuración final (no administrables).
- **Migración heredada**: conservar el contenido `hero` actual como fuente de inicialización del contenido de marca o de textos del drop vigente según inventario real y decisión de cutover. Evitar sobrescribirlo sin conocer datos.

## Compatibilidad y despliegue

- **Decisión actualizada el 2026-10-26**: añadir endpoints específicos de selección pública y administración; conservar el listado `/colecciones` para la edición administrativa, pero bloquear el detalle de un drop sin activación y sus productos en lecturas públicas, carrito y checkout. La escritura del navegador conserva el proxy `/api/admin/[...ruta]` y la autorización final sigue en Express. Asignar productos desde el panel Productos existente; Drops muestra la disponibilidad y enlaza a esa gestión.
- **Motivo**: Inicio, Categorías, productos y el panel actual usan `/colecciones`; un cambio indiscriminado puede filtrar futuros o romper formularios.
- **Alternativas**: filtrar solo en la página de Next (dejaría accesible la API y el checkout) o filtrar también la disponibilidad interna (impediría activar nuevos drops). La persona responsable eligió bloquear página y productos antes de la activación.
- **Secuencia**: coordinar migración backend, publicación de API compatible y despliegue frontend. No aplicar migraciones ni tocar servicios externos durante el plan. Verificar ramas, base, credenciales y conjunto completo de migraciones pendientes antes del paso futuro autorizado.

## Verificación técnica localizada

- `backend/src/routes/productos.routes.js` filtra `activo/web` y usa `presentarVariantesConDisponibilidad` para variantes; `backend/src/services/inventario.js` considera reservas.
- `frontend/src/app/page.tsx` y `frontend/src/app/categorias/page.tsx` eligen por separado la colección más nueva con `contadorActivo=true`; Categorías ordena las tres últimas por fecha de creación.
- `frontend/src/components/AdminImagenes.tsx` ofrece imágenes de colecciones y `ContenidoInicio`; `ContenidoInicio` guarda `titulo` y `textBoton`, pero Inicio usa la imagen de la colección.
- `backend/package.json` dispone de `npm test`; `frontend/package.json` dispone de lint/build.
