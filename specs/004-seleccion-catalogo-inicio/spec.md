# Especificación: selección administrativa del catálogo de Inicio

**Estado**: Aprobada por la persona responsable el 2026-10-23  
**Fecha**: 2026-10-23  
**Alcance**: sección «CATÁLOGO» de Inicio y su gestión administrativa.

## Situación actual y alcance

`CatalogoInicio` ya relaciona un producto con un `orden`. La consulta pública `/catalogo-inicio` devuelve las selecciones visibles ordenadas; omite productos con `activo=false` o `web=false` sin borrar su selección. `frontend/src/app/page.tsx` muestra hasta cinco resultados: el primero en tarjeta grande y los restantes en tarjetas pequeñas. El drop destacado se obtiene por separado de las colecciones. Existen operaciones administrativas de escritura para `/catalogo-inicio`, pero no una vista de gestión en el panel ni garantías de máximo cinco, orden único o producto único. La consulta pública tampoco permite ver las selecciones ocultas desde administración.

Esta funcionalidad permite al administrador gestionar una selección editorial explícita, independiente de la colección y del drop destacado. No cambia las reglas de visibilidad pública de los productos ni la gestión general de drops.

## Historias y escenarios de aceptación

### P1 — Elegir y ordenar

1. Dada una selección vacía, cuando el administrador agrega productos existentes de distintas colecciones y establece su orden, entonces la selección queda guardada y Inicio muestra solo los públicamente visibles en ese orden.
2. Dadas entre una y cinco selecciones, cuando el administrador las reordena, entonces el orden guardado se refleja en Inicio: el primer producto público ocupa la tarjeta grande y los siguientes ocupan tarjetas pequeñas.
3. Dada una selección, cuando el administrador quita un producto, entonces deja de estar seleccionado y no aparece en Inicio por esa selección.
4. Dadas cinco selecciones, cuando intenta agregar una sexta, entonces se rechaza la acción, se explica el límite y se conserva la selección anterior.
5. Dado un producto ya seleccionado, cuando intenta seleccionarlo de nuevo, entonces se rechaza el duplicado sin cambiar el orden existente.
6. Dado un producto quitado anteriormente, cuando el administrador lo vuelve a elegir, entonces regresa a la selección activa una sola vez y en la posición que el administrador indica.

### P2 — Conservar selecciones no visibles

1. Dado un producto seleccionado, cuando deja de cumplir la visibilidad pública (`activo=false` o `web=false`), entonces permanece en la lista administrativa con un aviso que indica el motivo y desaparece de Inicio.
2. Dado que el primer seleccionado no es visible, cuando un visitante abre Inicio, entonces el primer producto visible según el orden guardado ocupa la tarjeta grande; no queda un hueco reservado.
3. Dado que el producto vuelve a ser visible, cuando se consulta Inicio, entonces vuelve a aparecer en la posición relativa guardada, sin tener que seleccionarlo otra vez.
4. Dadas cinco selecciones, incluida una oculta, cuando se intenta agregar otra, entonces se aplica el límite de cinco a todas las selecciones conservadas.
5. Dado un producto que ya está inactivo o no publicado, cuando el administrador lo selecciona, entonces queda en la selección con el motivo visible en administración, ocupa un cupo y no aparece en Inicio hasta que vuelva a ser público.

### Errores y estados vacíos

- Una selección vacía o con todos sus productos ocultos muestra el estado vacío existente de la sección, sin inventar productos de una colección.
- Un producto inexistente, un orden inválido o una actualización que produciría duplicados debe rechazarse con un mensaje comprensible, sin dejar una selección parcial.
- Si falla la carga o el guardado, administración muestra el error y permite reintentar; no debe presentar como guardado un cambio fallido.
- Una persona sin permisos de administración no puede consultar la selección administrativa ni modificarla.

## Requisitos funcionales

- **RF-001**: Solo el administrador puede ver y modificar la selección completa, incluidas las entradas no visibles públicamente.
- **RF-002**: El administrador puede agregar, quitar y reordenar productos existentes de cualquier colección, sin vínculo obligatorio con el drop destacado.
- **RF-003**: La selección contiene de cero a cinco productos distintos; toda operación debe preservar ese límite y la unicidad.
- **RF-004**: El orden es inequívoco y estable. Inicio muestra hasta cinco productos visibles, respetando el orden relativo de la selección guardada.
- **RF-005**: La primera entrada visible en Inicio usa la tarjeta grande; las demás usan tarjetas pequeñas.
- **RF-006**: Al perder visibilidad pública, una selección permanece en administración con aviso y motivo (`inactivo`, `no publicado` o ambos), pero no aparece en Inicio. Al recuperar visibilidad, reaparece según el orden guardado.
- **RF-007**: La vista administrativa distingue una selección vacía, un producto oculto, un error de carga y un error de guardado.
- **RF-008**: Las operaciones inválidas se rechazan sin alterar la selección confirmada y explican el problema al administrador.

## Entidades de negocio

- **Selección de Inicio**: conjunto ordenado de hasta cinco referencias únicas a productos. Una entrada oculta sigue contando para el límite.
- **Producto**: ficha existente cuya visibilidad pública depende de `activo` y `web`; su colección no restringe la selección.

## Criterios de éxito

- **CE-001**: En las pruebas de aceptación, los casos de cero a cinco selecciones muestran exactamente los productos visibles, en el orden esperado y sin repeticiones.
- **CE-002**: En las pruebas de límite y duplicado, el 100 % de los intentos inválidos se rechaza sin modificar la selección confirmada.
- **CE-003**: En las pruebas de cambio de visibilidad, el 100 % de las selecciones ocultas permanece identificable en administración con el motivo correcto y no aparece en Inicio.
- **CE-004**: Un administrador puede completar los recorridos de agregar, quitar y reordenar desde el panel, y reconocer si cada cambio quedó guardado.

## Decisiones confirmadas, supuestos y puntos pendientes

- **Confirmado**: máximo cinco selecciones, producto único, orden manual, cualquier colección, independencia del drop y conservación administrativa de productos no visibles.
- **Confirmado al aprobar la spec**: las entradas ocultas cuentan para el límite de cinco; Inicio compacta las visibles para que la primera tarjeta mostrada sea grande.
- **Confirmado antes de tasks**: quitar una selección la desactiva y volver a elegir el producto reactiva esa selección; también se puede agregar un producto que ya está oculto, con aviso en administración y sin publicarlo en Inicio.
- **Pendiente**: ninguno de negocio para esta fase.

## Repositorios y áreas previstas

- **Raíz**: esta spec en `specs/004-seleccion-catalogo-inicio/spec.md`; si una implementación futura cambia flujos documentados, actualizar `docs/estado-actual/`.
- **`backend/`**: gestión y lectura de `CatalogoInicio` en `src/routes/catalogo-inicio.routes.js` y reglas de visibilidad relacionadas. El plan evaluará si hacen falta cambios de modelo; no se decide aquí.
- **`frontend/`**: Inicio (`src/app/page.tsx`), panel administrativo (`src/app/admin/` y componentes relacionados), BFF administrativo y contrato `src/types/catalogo-inicio.ts`, según el plan.
