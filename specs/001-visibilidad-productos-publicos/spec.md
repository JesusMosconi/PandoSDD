# Feature Specification: Visibilidad consistente de productos públicos

**Feature Branch**: `001-visibilidad-productos-publicos`
**Created**: 2026-10-09
**Status**: Aprobada por el usuario el 2026-10-09 para avanzar con la implementación planificada
**Input**: Visibilidad consistente de productos en el catálogo público y el carrito.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Detalle público coherente (Priority: P1)

Como cliente, quiero que un enlace directo respete la misma disponibilidad que el catálogo para no ver productos retirados.

**Why this priority**: Impide que un producto dado de baja siga expuesto por una URL guardada o compartida.

**Independent Test**: Abrir el detalle de un producto inactivo, otro con `web=false` y uno inexistente; los tres deben dar el mismo resultado de no encontrado. Abrir uno activo y publicado, y confirmar que conserva su detalle.

**Acceptance Scenarios**:

1. **Given** un producto con `activo=false`, **When** un visitante abre su enlace de detalle, **Then** recibe el mismo estado y vista de no encontrado que para un ID inexistente.
2. **Given** un producto con `activo=true` y `web=false`, **When** un visitante abre su detalle, **Then** recibe el mismo resultado de no encontrado que para un ID inexistente.
3. **Given** un producto con `activo=true` y `web=true`, **When** un visitante abre su detalle, **Then** ve sus datos y puede seleccionar sus variantes con stock; las variantes sin stock no aparecen.

---

### User Story 2 - Destacados públicos coherentes (Priority: P1)

Como cliente, quiero que la portada muestre solo productos disponibles para la tienda sin perder los demás destacados.

**Why this priority**: La portada es otra entrada al producto y debe respetar la misma decisión comercial.

**Independent Test**: Seleccionar productos inactivos y no publicados junto a otros activos y publicados como destacados; cargar el inicio y comprobar que desaparecen solo los no visibles, conservando el orden relativo de los demás.

**Acceptance Scenarios**:

1. **Given** un producto inactivo seleccionado entre destacados, **When** un visitante carga el inicio, **Then** ese producto no aparece y los restantes destacados se muestran normalmente.
2. **Given** un producto con `web=false` seleccionado entre destacados, **When** un visitante carga el inicio, **Then** ese producto no aparece y los demás se muestran normalmente.
3. **Given** productos activos y publicados seleccionados como destacados, **When** un visitante carga el inicio, **Then** siguen apareciendo como hoy.

---

### User Story 3 - Carrito respeta disponibilidad (Priority: P1)

Como cliente con sesión, quiero que el carrito rechace una variante de un producto retirado y explique por qué no se agregó.

**Why this priority**: Evita iniciar una intención de compra que el negocio ya no ofrece.

**Independent Test**: Intentar agregar variantes con stock de productos inactivos o no publicados y comparar el carrito antes y después; luego agregar una variante válida de un producto activo y publicado.

**Acceptance Scenarios**:

1. **Given** una variante de un producto con `activo=false`, **When** un cliente con sesión intenta agregarla, **Then** recibe un mensaje claro en español de que no está disponible y el carrito no cambia.
2. **Given** una variante `estado="inactivo"`, **When** un cliente intenta agregarla, **Then** sigue siendo rechazada.
3. **Given** una variante de un producto con `web=false`, **When** un cliente intenta agregarla, **Then** recibe el rechazo de variante no disponible y el carrito no cambia.
4. **Given** una variante disponible de un producto activo y publicado, **When** un cliente la agrega, **Then** el carrito se actualiza como hoy.

---

### User Story 4 - Ítem retirado en carrito existente (Priority: P1)

Como cliente con sesión, quiero reconocer un producto retirado que ya tenía en el carrito sin perder el registro de lo que seleccioné.

**Why this priority**: Un producto puede cambiar de estado entre la selección y la próxima consulta del carrito.

**Independent Test**: Agregar un producto visible, desactivarlo, consultar el carrito y verificar que el ítem permanece señalado como no disponible, sin alterar cantidades ni subtotal guardados.

**Acceptance Scenarios**:

1. **Given** un ítem cuyo producto se desactiva tras agregarse, **When** el cliente consulta el carrito, **Then** ve el ítem marcado como no disponible; el ítem no se oculta ni se borra automáticamente.
2. **Given** ese ítem no disponible, **When** el cliente intenta aumentar su cantidad, **Then** la operación se rechaza sin alterar el carrito; el cliente puede quitar el ítem.
3. **Given** ese ítem no disponible cuyo producto fue retirado pero cuya variante sigue activa, **When** el cliente reduce la cantidad, **Then** la reducción se permite si supera las validaciones de stock existentes.

---

### User Story 5 - Administración sin regresiones (Priority: P2)

Como administrador, quiero seguir viendo y editando productos inactivos para poder gestionarlos desde el panel.

**Why this priority**: La regla pública no debe ocultar herramientas de gestión.

**Independent Test**: Con acceso administrativo, listar un producto inactivo y abrir su edición; comprobar que las acciones existentes siguen disponibles.

**Acceptance Scenarios**:

1. **Given** un producto inactivo, **When** un administrador lo lista o edita desde el panel, **Then** lo sigue viendo y puede gestionarlo con el acceso actual.

### Edge Cases

- Un producto seleccionado como destacado cambia a inactivo después de la selección: no debe aparecer en la próxima carga pública del inicio.
- Una variante existe y tiene stock, pero su producto deja de ser visible: agregarla debe fallar sin alterar cantidad ni subtotal.
- Un producto se desactiva después de haber sido añadido al carrito: el ítem permanece y se marca como no disponible, sin eliminación automática.
- Un producto activo tiene `web=false`: se trata como no visible en listado, detalle, destacados y agregado al carrito.
- Un producto activo tiene variantes sin stock: el detalle las oculta, como hace hoy el listado público.
- Un producto del carrito pasa a `web=false`: se conserva y se marca como no disponible igual que uno desactivado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El listado y el detalle públicos DEBEN exigir `Producto.activo=true` y `Producto.web=true`; un producto que no cumpla cualquiera de ambas condiciones DEBE producir en el detalle la misma respuesta de no encontrado que un producto inexistente.
- **FR-002**: El catálogo destacado público DEBE excluir los productos que no cumplan esa regla, sin eliminar ni reordenar los demás seleccionados.
- **FR-003**: El carrito DEBE rechazar la incorporación de variantes cuyo producto no cumpla esa regla, además de las variantes inactivas por sí mismas; el rechazo NO DEBE modificar ítems ni subtotal.
- **FR-004**: Las respuestas de producto o variante no disponible DEBEN tener mensaje en español y estado coherente con los casos existentes: no encontrado para el detalle público y solicitud inválida para agregar una variante no disponible.
- **FR-005**: El listado y la edición administrativos DEBEN conservar su acceso actual a productos inactivos.
- **FR-006**: La política de visibilidad pública de producto DEBE tener una sola definición identificable que utilicen los puntos públicos relevantes; el panel administrativo DEBE conservar su excepción explícita.
- **FR-007**: La regla de FR-001 DEBE aplicarse también a destacados y al agregado al carrito cuando `web=false`.
- **FR-008**: El detalle público DEBE ocultar las variantes sin stock, igual que el listado público actual.
- **FR-009**: La consulta del carrito DEBE conservar los ítems previamente agregados cuyo producto ya no sea visible y señalarlos como no disponibles; NO DEBE ocultarlos ni eliminarlos automáticamente.
- **FR-010**: El cliente NO DEBE poder aumentar la cantidad de un ítem cuyo producto ya no sea visible; DEBE poder reducirla si la variante supera las validaciones preexistentes de estado y stock, y DEBE poder quitar el ítem.

### Key Entities *(include if feature involves data)*

- **Producto**: artículo del catálogo con estado `activo` y marca de publicación `web`.
- **TalleProducto**: variante de producto con estado y stock propios.
- **CatalogoInicio**: selección ordenada de productos destacados.
- **Carrito / ItemCarrito**: selección existente del cliente; conserva variante, cantidad y precio unitario guardado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el 100 % de los escenarios de listado, detalle y destacados con productos inactivos o no publicados, el visitante no ve el producto retirado.
- **SC-002**: En el 100 % de los intentos de agregar una variante de un producto inactivo o no publicado, el cliente recibe un rechazo comprensible en español y conserva exactamente los mismos ítems, cantidades y subtotal.
- **SC-003**: En el 100 % de los escenarios con productos activos, publicados y variantes disponibles, listado, detalle, destacados y agregado al carrito conservan su resultado actual.
- **SC-004**: En el 100 % de los escenarios administrativos de listado y edición con productos inactivos, el administrador mantiene el acceso actual.
- **SC-005**: Una revisión de los cuatro puntos públicos identifica una sola política de visibilidad y ninguna regla divergente.
- **SC-006**: En el 100 % de las consultas de carritos con productos que se desactivaron o dejaron de publicarse, el cliente ve los ítems marcados como no disponibles, sin pérdida automática de ítems, cantidades ni subtotal.

## Fuera de alcance

- La visibilidad pública de variantes con `TalleProducto.estado="inactivo"` y stock positivo conserva el comportamiento previo en listado y detalle; el carrito sigue rechazando su agregado. Su exposición residual se registra en `docs/estado-actual/08-deuda-y-riesgos.md`.
- `GET /talle-producto` y `GET /img-producto/:productoId` no se modifican ni reciben el filtro de visibilidad en esta feature; el riesgo residual se registra en `docs/estado-actual/08-deuda-y-riesgos.md`.
- Checkout, órdenes, descuento o reserva de stock, atomicidad del stock, cambios de esquema, autenticación, cálculo de precios y cambios en la gestión administrativa.

## Assumptions

- Se reutilizan las páginas públicas, el estado de no encontrado y los mensajes de error ya existentes; el único cambio visual previsto es la indicación de no disponible en un ítem conservado del carrito.
- El alcance afecta `backend/` y `frontend/`. Archivos previstos para planificar: `backend/src/routes/productos.routes.js`, `backend/src/routes/catalogo-inicio.routes.js`, `backend/src/routes/carrito.routes.js`, `frontend/src/components/CarritoPanel.tsx`, `frontend/src/types/carrito.ts` y, solo si la revisión lo exige, `frontend/src/app/productos/[id]/page.tsx` o `frontend/src/components/ProductVariants.tsx`.
- La semántica de `ProductoImprovisado` sin variante se conserva: `disponible=true` en la respuesta del carrito.
- La regla pública aprobada en esta aclaración exige `activo=true` y `web=true`; ítems antiguos no disponibles permanecen visibles en el carrito y las variantes sin stock se ocultan en el detalle.
