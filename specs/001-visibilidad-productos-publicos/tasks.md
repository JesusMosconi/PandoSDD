---
description: "Tareas para visibilidad consistente de productos públicos"
---

# Tasks: Visibilidad consistente de productos públicos

**Input**: `specs/001-visibilidad-productos-publicos/spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/catalogo-carrito.md` y `quickstart.md`.

**Tests**: no existen infraestructura ni scripts `test` en `backend/package.json` o `frontend/package.json`. Las comprobaciones de esta lista son manuales y deben ejecutarse solo en una base descartable preparada por una persona; el agente no lee ni escribe `.env`.

## Phase 1: Setup

**Purpose**: aislar los dos repositorios antes de editar código y preparar la verificación.

- [X] T001 Verificar `git status` y la rama en `backend/`, `frontend/` y la raíz; crear y confirmar una rama de feature en `backend/` y otra en `frontend/`, preservando cualquier cambio previo (referencia: `AGENTS.md` y `specs/001-visibilidad-productos-publicos/plan.md`).
- [X] T002 Confirmar con la persona responsable que preparó una base descartable y los fixtures de `specs/001-visibilidad-productos-publicos/quickstart.md`, incluidos un cliente sin carrito y un `ProductoImprovisado` sin variante en otro carrito; registrar el host/destino verificados sin leer ni escribir archivos `.env` ni tocar producción. La persona confirmó que el endpoint pertenece a la rama de prueba; se verificaron el host, la coincidencia entre API y SQL mediante un fixture temporal, el cliente sin carrito y un `ProductoImprovisado` temporal. La asociación con la rama se basa en la confirmación de la persona, sin acceso independiente a la consola de Neon.

**Checkpoint**: ramas separadas y entorno descartable identificado; ningún cambio en esquema, migraciones, auth o precios.

## Phase 2: Foundational

**Purpose**: una sola regla reutilizable, previa a todas las historias.

- [X] T003 Crear `backend/src/utils/visibilidad-producto.js` con la regla única `Producto.activo=true && Producto.web=true`, disponible como predicado `where` de Prisma y como comprobación de un `Producto` cargado; no duplicar literales de visibilidad en las rutas.

**Checkpoint**: las rutas pueden aplicar la misma regla a consultas y validaciones puntuales.

## Phase 3: User Story 1 — Detalle público coherente (P1) 🎯 MVP

**Goal**: listado y detalle públicos muestran solo productos activos y publicados; el detalle oculta variantes sin stock.

**Independent Test**: caso 1 y la parte de producto vigente del caso 4 de `specs/001-visibilidad-productos-publicos/quickstart.md`.

- [X] T004 [US1] Aplicar el predicado de `backend/src/utils/visibilidad-producto.js` al `GET /productos` público en `backend/src/routes/productos.routes.js`, preservando filtros existentes y la rama `admin=true` sin filtro público.
- [X] T005 [US1] Aplicar el mismo predicado a `GET /productos/:id` en `backend/src/routes/productos.routes.js`; devolver 404 `Producto no encontrado` para inactivo, `web=false` o inexistente y excluir del detalle `TalleProducto` con `stock <= 0`, sin tocar PUT/DELETE.
- [X] T006 [US1] Verificar manualmente `backend/src/routes/productos.routes.js` con los casos 1 y 4 de `specs/001-visibilidad-productos-publicos/quickstart.md`: 404 equivalentes, 200 visible y variantes sin stock ocultas; registrar resultado sin ejecutar contra producción.

**Checkpoint**: historia 1 comprobable sin modificar destacados ni carrito.

## Phase 4: User Story 2 — Destacados públicos coherentes (P1)

**Goal**: destacados públicos excluyen productos no visibles y conservan el orden de los restantes.

**Independent Test**: caso 2 de `specs/001-visibilidad-productos-publicos/quickstart.md`.

- [X] T007 [US2] Filtrar `GET /catalogo-inicio` por la relación `producto` con la regla de `backend/src/utils/visibilidad-producto.js` en `backend/src/routes/catalogo-inicio.routes.js`, sin borrar filas ni alterar `orden`.
- [X] T008 [US2] Filtrar `GET /catalogo-inicio/:id` en `backend/src/routes/catalogo-inicio.routes.js` mediante `findFirst` con `id` y condición relacional, o comprobar el producto cargado y responder 404 `Elemento de catálogo no encontrado`; no intentar poner el filtro relacional en `findUnique`.
- [X] T009 [US2] Verificar manualmente `backend/src/routes/catalogo-inicio.routes.js` con el caso 2 de `specs/001-visibilidad-productos-publicos/quickstart.md`: exclusión de `activo=false` y `web=false`, 404 en detalle y orden relativo preservado.

**Checkpoint**: historia 2 comprobable con selecciones destacadas existentes.

## Phase 5: User Story 3 — Carrito respeta disponibilidad (P1)

**Goal**: impedir nuevos ítems de productos no visibles sin crear ni alterar carrito al rechazar.

**Independent Test**: caso 3 y agregado positivo del caso 4 de `specs/001-visibilidad-productos-publicos/quickstart.md`.

- [X] T010 [US3] Reordenar `POST /carrito/items` en `backend/src/routes/carrito.routes.js`: validar `TalleProducto` y producto, consultar el carrito existente sin crearlo, calcular `cantidadFinal` con el ítem existente y comprobar stock antes de crear carrito o escribir ítem; conservar rechazo de `estado="inactivo"`, mensaje 400 en español y cálculo actual de `precioUnitario`.
- [X] T011 [US3] Verificar manualmente `backend/src/routes/carrito.routes.js` con casos 3 y 4 de `specs/001-visibilidad-productos-publicos/quickstart.md`: para cliente sin carrito, comprobar por consulta de solo lectura que los POST rechazados por `activo=false`, `web=false`, variante inactiva y stock insuficiente no crean fila `Carrito`, sin ejecutar antes GET `/carrito`; para carrito existente, comprobar ítems y subtotal antes/después; verificar además un agregado válido sin cambio de precio o subtotal.

**Checkpoint**: historia 3 comprobable aunque la presentación de ítems antiguos se complete después.

## Phase 6: User Story 4 — Ítem retirado en carrito existente (P1)

**Goal**: conservar y marcar ítems antiguos; permitir reducción y eliminación sin permitir aumento de producto no visible.

**Independent Test**: caso 6 de `specs/001-visibilidad-productos-publicos/quickstart.md` más el contrato de todas las respuestas de carrito.

- [X] T012 [US4] Crear en `backend/src/routes/carrito.routes.js` una única función de presentación que añada `disponible` a los ítems de `GET /carrito` y `devolverCarritoActualizado`: para variante, exigir producto visible, `estado` distinto de `"inactivo"` y `stock >= cantidad`; para `ProductoImprovisado` sin variante, devolver `true`; conservar ítems, `precioUnitario` y subtotal, incluidos los no disponibles.
- [X] T013 [US4] En `PUT /carrito/items/:id` de `backend/src/routes/carrito.routes.js`, comparar cantidad solicitada con `item.cantidad` y rechazar por producto no visible solo si aumenta; permitir reducción por visibilidad, conservar la validación previa de variante inactiva y stock insuficiente incluso al reducir, y mantener DELETE de ítem y DELETE `/carrito` con el formato compartido de T012.
- [X] T014 [US4] Añadir `disponible: boolean` a `ItemCarrito` en `frontend/src/types/carrito.ts` según `specs/001-visibilidad-productos-publicos/contracts/catalogo-carrito.md`, sin recalcular disponibilidad en frontend.
- [X] T015 [US4] Mostrar “No disponible” y deshabilitar el botón de aumento solo cuando `disponible=false` en `frontend/src/components/CarritoPanel.tsx`; conservar la visualización del ítem, el botón de reducción sujeto a la respuesta del servidor y la opción de eliminarlo.
- [X] T016 [US4] Verificar manualmente `backend/src/routes/carrito.routes.js` y `frontend/src/components/CarritoPanel.tsx` con el caso 6 de `specs/001-visibilidad-productos-publicos/quickstart.md`: GET/POST/PUT/DELETE de ítems y DELETE `/carrito` incluyen `disponible`, aumento rechazado, reducción admitida cuando pasa validaciones existentes, `ProductoImprovisado` sin variante en `true`, UI marcada y subtotal sin recálculo.

**Checkpoint**: historia 4 completa con contrato y presentación, sin cambio de esquema.

## Phase 7: User Story 5 — Administración sin regresiones (P2)

**Goal**: conservar visibilidad y edición de inactivos/no publicados en el panel.

**Independent Test**: caso 5 de `specs/001-visibilidad-productos-publicos/quickstart.md`.

- [X] T017 [US5] Verificar manualmente `GET /productos?admin=true` y la edición de un fixture en `backend/src/routes/productos.routes.js` y `frontend/src/components/AdminProductos.tsx` según el caso 5 de `specs/001-visibilidad-productos-publicos/quickstart.md`; confirmar que PUT/DELETE de productos no cambiaron y que el listado admin conserva inactivos y `web=false`.

**Checkpoint**: historia 5 comprobada sin editar el panel administrativo.

## Final Phase: Polish & Cross-Cutting Concerns

- [X] T018 Actualizar `docs/estado-actual/03-api-backend.md` y `docs/estado-actual/06-flujos-de-negocio.md` con las rutas y flujos realmente implementados; mantener documentado que el subtotal incluye ítems no disponibles para la futura spec de checkout.
- [X] T019 Marcar como resueltos en `docs/estado-actual/08-deuda-y-riesgos.md` solo los subítems de visibilidad verificados; conservar el riesgo residual de `GET /talle-producto` y `GET /img-producto/:productoId` y la deuda de atomicidad de stock.
- [X] T020 Ejecutar `npm run lint` y `npm run build` en `frontend/`, registrar que `backend/package.json` no ofrece scripts equivalentes, revisar `git diff --check` en `backend/`, `frontend/` y raíz, y dejar los resultados y casos manuales en `specs/001-visibilidad-productos-publicos/verificacion.md` sin incluir secretos.

## Dependencies & Execution Order

### Phase Dependencies

- Setup (T001-T002) precede a toda edición y verificación. La persona prepara la base descartable; ningún agente lee o escribe `.env`.
- Foundational (T003) precede a US1-US4 porque todas comparten la regla.
- US1 y US2 pueden desarrollarse por separado tras T003; se ejecutan una tarea por vez conforme a `AGENTS.md`.
- US3 precede a US4 porque ambas modifican `backend/src/routes/carrito.routes.js` y la respuesta compartida se integra después del rechazo de agregado.
- US5 se verifica después de US1 para asegurar que el filtro público no afecta `admin=true`.
- Polish sigue a todas las historias y solo marca riesgos resueltos después de verificar resultados.

### User Story Dependencies

| Historia | Prerrequisito | Criterio de prueba independiente |
|---|---|---|
| US1 (P1) | T003 | Detalle 404 para inactivo/no publicado/inexistente; producto visible y variantes con stock siguen visibles. |
| US2 (P1) | T003 | Destacados ocultos ausentes; los visibles mantienen orden; detalle oculto 404. |
| US3 (P1) | T003 | Agregado rechazado no crea ni altera carrito; agregado válido funciona. |
| US4 (P1) | T003 y US3 por archivo compartido | Ítem conservado con `disponible=false`; aumento rechazado, reducción validada, borrado permitido y UI marcada. |
| US5 (P2) | US1 | Lista y edición admin conservan productos inactivos y `web=false`. |

### Parallel Opportunities

No se marcan tareas `[P]`: `AGENTS.md` exige trabajar una tarea por vez, las rutas comparten el helper y US3/US4 editan el mismo archivo. US1 y US2 son historias separables para revisiones independientes, pero se ejecutan secuencialmente en este workspace.

## Implementation Strategy

### MVP First

Completar Setup, Foundational y US1 (T001-T006); validar el detalle público de forma independiente antes de continuar.

### Incremental Delivery

Después del MVP, completar US2, US3, US4 y US5 en ese orden, con su checkpoint manual en base descartable tras cada historia. Finalizar documentación y comprobaciones antes de considerar un despliegue. No hacer commit, push ni deploy sin pedido explícito.

## Notes

- Los estados de T001-T020 reflejan la implementación y las verificaciones registradas en verificacion.md.
- `specs/001-visibilidad-productos-publicos/quickstart.md` conserva como puerta previa a un despliegue el conteo de productos `web=false` en la base real por una persona autorizada; estas tareas no despliegan ni consultan esa base.
- `backend/prisma/schema.prisma`, migraciones, `backend/src/routes/usuarios.routes.js`, auth, precios, `GET /talle-producto` y `GET /img-producto/:productoId` permanecen fuera de alcance.
