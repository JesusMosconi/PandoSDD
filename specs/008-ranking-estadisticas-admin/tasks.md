# Tasks: Ranking de productos, trazabilidad y panel de inicio del administrador

**Input**: [spec.md](spec.md), [plan.md](plan.md), [contracts/estadisticas-api.md](contracts/estadisticas-api.md) y [quickstart.md](quickstart.md).

**Organización**: los prefijos `backend/` (PandoCbaV2), `frontend/` (PandoCbaFrontend) y `specs/`/`docs/` (PandoSDD) indican repositorios distintos. Se completa una tarea por vez.

**Límites**:
- No leer `.env`.
- No escribir en bases fuera de la descartable de pruebas.
- No hacer commit, push ni despliegue salvo pedido explícito.

## Phase 1: Setup

- [X] T001 Crear la rama `008-ranking-estadisticas-admin` desde `main`/`master` en los tres repositorios.
- [X] T002 Revisar y aprobar la spec, el plan y las tareas (constitution VII).

## Phase 2: Backend

- [X] T003 Crear `backend/src/services/estadisticas.js` con:
  - `periodo`;
  - la CTE de ventas netas;
  - `rankingProductos`, `resumenInicio` y `estadisticasProducto`, según el contrato.
- [X] T004 Extraer en `backend/src/services/informes.js` la consulta de vigencias de `historialProducto` a una función exportada y reutilizarla.
- [X] T005 Crear `backend/src/routes/admin-estadisticas.routes.js` con la validación de filtros y `ErrorEstadistica`, y montarlo en `backend/src/index.js`.
- [X] T006 Crear `backend/test/estadisticas.test.js`, con:
  - validación de filtros sin base de datos;
  - un escenario con base descartable que cubra orden por unidades e importe, mínimos, exclusión de órdenes sin pago y de venta rápida, resta de devoluciones, filtro por canal, serie diaria, período anterior, trazabilidad y 404. *(2026-11-06: las 7 pasan contra `ep-fancy-queen-acudbg1e`.)*

## Phase 3: Frontend

- [X] T007 Instalar `recharts` en `frontend/`, agregar el prefijo `estadisticas` al BFF y crear `frontend/src/types/estadisticas.ts`.
- [X] T008 [US2] Crear `frontend/src/app/admin/ranking/page.tsx` y `frontend/src/components/AdminRanking.tsx`, con filtros, tabla, top 10 en barras y paginación.
- [X] T009 [US1] Reemplazar las tarjetas fijas de `frontend/src/app/admin/page.tsx` por `frontend/src/components/AdminInicio.tsx`, con período, métricas con variación, serie diaria y top 5. Agregar el módulo «Ranking».
- [X] T010 [US3] Crear `frontend/src/app/admin/productos/[id]/page.tsx` y `frontend/src/components/AdminTrazabilidadProducto.tsx`, con `AdminInformes` debajo. Agregar el enlace «Estadísticas» en `frontend/src/components/AdminProductos.tsx`.
- [X] T011 Ejecutar `npm run lint` y `npm run build` en `frontend/`.

## Phase 4: Cierre

- [X] T012 Actualizar `docs/estado-actual/03-api-backend.md`, `04-frontend.md` y `08-deuda-y-riesgos.md`.
- [X] T014 [US4] Crear `frontend/src/app/admin/layout.tsx`, `frontend/src/components/AdminSidebar.tsx` y `frontend/src/lib/admin-modulos.ts` (lista única de módulos, también usada por `/admin`).
- [X] T015 [US1] Rediseñar el Inicio: endpoint `GET /admin/estadisticas/pendientes`, unidades y devoluciones en `inicio`, `AdminPendientes.tsx`, barras apiladas en el gráfico diario, filtro inicial por estado en Órdenes y panel a ancho completo (`ContenedorPrincipal.tsx`). Se quitan las tarjetas de módulos.
- [X] T016 Usabilidad de Órdenes y Cuenta (pedido del 2026-11-06): en `AdminOrdenes.tsx`, el detalle se despliega debajo de la orden elegida con desplazamiento y foco automáticos, empieza por un bloque «Próximo paso» con la acción principal, muestra los estados con nombre y color, tiene atajos por estado, aplica los filtros al instante y deja plegados el historial y la cancelación. Los cambios de estado piden confirmación. En `CuentaPanel.tsx`, los campos de contraseña tienen el botón del ojo para mostrarla u ocultarla.
- [ ] T013 Registrar en `specs/008-ranking-estadisticas-admin/verificacion.md` los resultados de los tests, el lint, el build y el recorrido de [quickstart.md](quickstart.md). *(Lint, build y tests registrados; falta el recorrido visual.)*
