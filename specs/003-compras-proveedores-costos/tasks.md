---
description: "Tareas de implementación para compras, proveedores e historial de costos y precios"
---

# Tasks: Compras, proveedores e historial de costos y precios

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/compras-historial.md](contracts/compras-historial.md) y [quickstart.md](quickstart.md).

**Tests**: El backend ya usa `node:test`; la constitution exige acompañar lógica de negocio nueva con pruebas. Los tests de integración y concurrencia requieren una base descartable cuyo host/base/esquema y autorización se hayan verificado. No ejecutar migraciones, seeds, corte ni escrituras externas durante la generación de estas tareas.

**Organization**: Cinco historias en el orden de la spec. Cada tarea indica repo y ruta prevista; nombres de migraciones se asignan al crear una migración nueva, sin tocar las ya aplicadas. El archivo de destino de las migraciones nuevas está bajo `backend/prisma/migrations/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: solo tareas sobre archivos distintos y sin dependencia de otra tarea incompleta.
- **[USn]**: historia de usuario de la spec; fases Setup, Foundational y Polish no llevan etiqueta.
- **Estado**: todas las casillas empiezan sin marcar; documentar evidencia real al completarlas.

## Phase 1: Setup (alcance y aislamiento)

**Purpose**: Preparar trabajo local seguro y revisiones normativas antes de cambios de esquema/precios.

- [X] T001 Registrar `git status`, rama y cambios ajenos por separado en `specs/003-compras-proveedores-costos/verificacion.md` para raíz, `backend/` y `frontend/`; aislar 003 en ramas o worktrees de feature sin mover ni descartar los cambios de 002.
- [X] T002 Revisar `AGENTS.md`, `backend/AGENTS.md` y `backend/CLAUDE.md` si existen, `frontend/AGENTS.md`, `frontend/CLAUDE.md` y `.specify/memory/constitution.md`; documentar en `specs/003-compras-proveedores-costos/verificacion.md` los límites aplicables sin leer `.env`.
- [X] T003 Registrar revisión explícita de [spec.md](spec.md) y [plan.md](plan.md) para esquema, `Producto.precio`, checkout y cancelación pagada en `specs/003-compras-proveedores-costos/verificacion.md` antes de editar esas zonas.
- [X] T004 Verificar entorno aislado autorizado, host, base, esquema, estado de migraciones y copia de recuperación antes de cualquier escritura; anotar solo metadatos no secretos en `specs/003-compras-proveedores-costos/verificacion.md`. Si no se verifica, continuar solo con trabajo local sin migrar ni ejecutar tests que escriban.

**Checkpoint**: El trabajo de 003 está aislado y los cambios sensibles tienen revisión documentada. Ninguna tarea de base se ejecuta por inferencia.

---

## Phase 2: Foundational (base compartida)

**Purpose**: Preparar invariantes comunes para movimientos, importes, autorización y cortes sin activar todavía el inventario nuevo sobre saldos heredados.

- [X] T005 Consolidar en `backend/src/services/inventario.js` el bloqueo ordenado de variantes y la lectura de stock físico/reservas que ya existen; documentar el contrato que usarán partidas y movimientos en `specs/003-compras-proveedores-costos/verificacion.md`, sin consultar entidades aún no migradas.
- [X] T006 [P] Definir en `backend/src/services/importes.js` cálculo decimal exacto, costo desconocido distinto de costo conocido `0`, y atribución de centavos por mayor fracción descartada con desempate FIFO estable según FR-022.
- [X] T007 [P] Ampliar `frontend/src/app/api/admin/[...ruta]/route.ts` para reenviar los nuevos prefijos administrativos a Express `/api/admin/...`, preservando cookie `httpOnly`, método, cuerpo, estado y errores; comprobar que `ordenes` conserve su mapeo actual.
- [X] T008 Crear validadores reutilizables de identificadores, fechas, cantidades, importes y motivos en `backend/src/utils/validate-compras.js`, para que las rutas nuevas enumeren campos permitidos y devuelvan errores en español.
- [X] T009 Inventariar todas las escrituras actuales de stock, reservas, pago y cancelación en `backend/src/services/inventario.js`, `backend/src/services/ordenes.js`, `backend/src/services/checkout.js` y `backend/src/routes/talle-producto.routes.js`; registrar en `specs/003-compras-proveedores-costos/verificacion.md` los puntos que la barrera del corte deberá proteger, sin cambiar todavía el flujo heredado.
- [X] T010 [P] Añadir a `backend/test/importes.test.js` casos unitarios de costo desconocido frente a cero y redondeo exacto, sin base de datos ni servicios externos; dejar la conciliación y concurrencia de partidas para T038, después de crear el esquema y el corte.

**Checkpoint**: Las reglas comunes están disponibles, pero no se declara completado el corte ni se habilita el inventario nuevo para variantes heredadas.

---

## Phase 3: User Story 1 - Registrar mercadería recibida (Priority: P1) 🎯 MVP

**Goal**: Proveedores y entregas recibidas con revisión, confirmación única, partidas de costo y stock físico aumentado una vez.

**Independent Test**: En una base aislada con variantes nuevas en cero, crear proveedor e ingreso de dos variantes con gasto, revisar, confirmar dos veces y obtener un solo aumento por variante; una ficha creada desde el ingreso permanece no publicada hasta recepción confirmada.

### Implementation for User Story 1

- [X] T011 [US1] Agregar `Proveedor`, eventos de actividad, `Ingreso`, gastos adicionales, `PartidaInventario`, `MovimientoInventario` y `Producto.creadoDesdeCompras` booleano falso por defecto en `backend/prisma/schema.prisma` y una migración nueva en `backend/prisma/migrations/`; exigir nombre/proveedor/fechas, cantidad entera positiva, costo unitario no negativo, proveedor activo y entrega completa, con bajas lógicas e historia conservada. Aplicar solo a base aislada tras T004 y autorización específica.
- [X] T012 [US1] Implementar creación, edición, desactivación/reactivación con motivo e historial en `backend/src/services/proveedores.js`, manteniendo una sola identidad y sin alterar ingresos previos.
- [X] T013 [US1] Exponer listados/ficha/escrituras administrativas de proveedores de [contracts/compras-historial.md](contracts/compras-historial.md) en `backend/src/routes/admin-proveedores.routes.js`; validar rol vigente, campos permitidos y errores en español.
- [X] T014 [US1] Implementar borrador, cálculo de mercadería/gastos separados y resumen autoritativo en `backend/src/services/compras.js`; rechazar fecha de recepción anterior a compra, variante repetida, cantidad no positiva, costos/gastos negativos y proveedor inactivo.
- [X] T015 [US1] Implementar en `backend/src/services/compras.js` confirmación transaccional con bloqueo ordenado, conciliación de partidas/movimientos frente al stock físico, clave de reintento y resultado anterior para intención idéntica. Antes del corte global, verificar bajo ese bloqueo que cada variante sea nueva, haya nacido con stock físico cero y no tenga reservas previas; rechazar cualquier variante heredada sin modificar stock. Después del corte, admitir solo variantes incorporadas. Una clave reutilizada con contenido distinto o ingreso ya confirmado responde conflicto sin sumar stock.
- [X] T016 [US1] Exponer borrador, edición, resumen, confirmación y consulta de ingresos en `backend/src/routes/admin-compras.routes.js` y montar routers de compras/proveedores en `backend/src/index.js` según contrato, con `verificarToken`, `esAdmin`, `asyncHandler` y campos permitidos, sin aceptar importes del cliente como autoridad.
- [X] T017 [US1] Crear `POST /api/admin/compras/productos` en `backend/src/routes/admin-compras.routes.js` para altas iniciadas desde Compras y ajustar `backend/src/routes/productos.routes.js` y `backend/src/routes/talle-producto.routes.js`: fijar desde el backend `creadoDesdeCompras=true` solo en esa acción, `web=false` y stock inicial `0`; impedir que el cliente edite la marca. Aplicar la barrera de publicación solo a fichas marcadas hasta que un ingreso de alguna variante esté confirmado, sin alterar productos preexistentes ni usar ingresos anulados para habilitarla.
- [X] T018 [P] [US1] Declarar contratos de proveedor, borrador, resumen e ingreso confirmado en `frontend/src/types/proveedor.ts` y `frontend/src/types/compra.ts`, con importes decimales como cadenas y errores tipados.
- [X] T019 [US1] Crear páginas y componentes administrativos de proveedores/ingresos en `frontend/src/app/admin/proveedores/page.tsx`, `frontend/src/app/admin/compras/page.tsx`, `frontend/src/components/AdminProveedores.tsx` y `frontend/src/components/AdminCompras.tsx`; usar `frontend/src/lib/api.ts`, mostrar revisión antes de confirmar y distinguir carga, error, reintento y vacío.
- [X] T020 [US1] Conectar la acción de creación de ficha desde ingreso con `POST /api/admin/compras/productos` y la entrada Compras en `frontend/src/components/AdminProductos.tsx` y `frontend/src/app/admin/page.tsx`, sin aumento inicial de stock ni publicación automática.
- [X] T021 [US1] Probar proveedor inactivo/reactivado, entrega de varias líneas, fechas/costos inválidos, idempotencia, dos confirmaciones concurrentes, rechazo sin efecto de variante heredada antes del corte y publicación bloqueada/habilitada de ficha marcada frente a ficha preexistente en `backend/test/compras.test.js` sobre base aislada verificada; registrar resultado en `specs/003-compras-proveedores-costos/verificacion.md`.
- [X] T022 [US1] Actualizar comportamiento implementado de proveedores/ingresos en `docs/estado-actual/02-modelo-de-datos.md`, `docs/estado-actual/03-api-backend.md`, `docs/estado-actual/04-frontend.md` y `docs/estado-actual/06-flujos-de-negocio.md`.

**Checkpoint**: US1 entrega recepción auditable de stock nuevo; no supone que saldos heredados ya estén cortados.

---

## Phase 4: User Story 2 - Conocer costo y margen de ventas (Priority: P1)

**Goal**: Asignar lotes FIFO al reservar y reconocer venta/costo una sola vez al confirmar pago, con descuento e importe efectivo por origen.

**Independent Test**: Con dos ingresos confirmados de la misma variante (2 unidades a 100, 2 a 150), reservar tres; antes del pago no hay venta, al pago costo 350 y reparto 2+1, y el consumo físico posterior no repite el resultado.

### Implementation for User Story 2

- [X] T023 [US2] Agregar `AsignacionPartida` y sus vínculos con `DetalleOrden`, `ReservaStock` y `PartidaInventario` en `backend/prisma/schema.prisma` y una migración nueva en `backend/prisma/migrations/`; cantidad entera positiva, estados reservada/vendida/liberada/revertida e índices por variante/partida/orden. Aplicar solo a base aislada tras T004 y autorización específica.
- [X] T024 [US2] Implementar selección FIFO en `backend/src/services/partidas.js`: existencias iniciales primero, luego fecha de recepción y orden estable; asignar solo unidades libres confirmadas, sin reasignar ventas por carga tardía.
- [X] T025 [US2] Integrar asignaciones por línea en la transacción de confirmación de orden de `backend/src/services/checkout.js`, manteniendo una `ReservaStock` por variante, igualdad entre cantidad reservada y suma asignada, y protección contra última unidad concurrente. Bajo el mismo bloqueo, aplicar FIFO solo a variantes nuevas verificadas con stock inicial cero y sin reservas previas mientras el corte esté pendiente; para variantes heredadas conservar íntegro el checkout previo sin crear `AsignacionPartida` parcial ni margen nuevo. Tras completar y activar el corte global, exigir asignación completa para toda reserva nueva.
- [X] T026 [US2] Integrar liberación de asignaciones al vencer/cancelar antes del pago, reconocimiento único al confirmar pago y consumo físico posterior sin nueva venta en `backend/src/services/inventario.js` y `backend/src/services/ordenes.js`.
- [X] T027 [US2] Calcular importe efectivo de mercadería, descuentos y margen con costo conocido/desconocido y atribución exacta por proveedor en `backend/src/services/costos.js`, reutilizando `backend/src/services/importes.js`; separar envío cobrado y gastos de compra.
- [X] T028 [US2] Exponer detalle administrativo de costo/origen de la venta en `backend/src/routes/admin-ordenes.routes.js` y tiparlo en `frontend/src/types/orden.ts`, sin exponer costo a rutas públicas de cliente.
- [X] T029 [US2] Añadir desglose de costo y margen/advertencia de costo desconocido a `frontend/src/components/AdminOrdenes.tsx` mediante `frontend/src/lib/api.ts`.
- [X] T030 [US2] Probar FIFO de varias partidas/proveedores, reserva sin venta, pago repetido, liberación/vencimiento, última unidad concurrente, carga tardía, descuento/redondeo y consumo posterior en `backend/test/inventario-fifo.test.js` y `backend/test/ordenes-admin.test.js` sobre base aislada verificada; comprobar además que el checkout heredado previo al corte no crea asignaciones parciales ni margen nuevo y que toda reserva bajo FIFO coincide con la suma de sus asignaciones.
- [X] T031 [US2] Actualizar flujo de reserva/pago/costo implementado en `docs/estado-actual/02-modelo-de-datos.md` y `docs/estado-actual/06-flujos-de-negocio.md`; registrar evidencia y límites en `specs/003-compras-proveedores-costos/verificacion.md`.

**Checkpoint**: US2 se valida con partidas recibidas por US1; el corte de saldos heredados sigue siendo US3.

---

## Phase 5: User Story 3 - Incorporar y ajustar existencias (Priority: P1)

**Goal**: Incorporar saldos heredados sin duplicar stock, enlazar reservas vigentes y exigir movimientos trazables para ajustes posteriores.

**Independent Test**: Variante heredada con diez unidades físicas y dos reservadas: corte deja diez físicas, dos comprometidas y ocho libres; interrupción/reanudación no duplica, costo desconocido impide margen completo y una merma que invade reservas se rechaza.

### Implementation for User Story 3

- [X] T032 [US3] Agregar `ExistenciaInicial`, estado de corte por variante y estado global `pendiente`/`conciliado`/`activo` con constancia de verificación de rutas (`rutasVerificadasEn` y actor) en `backend/prisma/schema.prisma` y una migración nueva en `backend/prisma/migrations/`, vinculados a `MovimientoInventario` creado en US1; costo conocido `0` distinto de desconocido, motivo obligatorio de ajuste e historial sin borrado. Aplicar solo a base aislada tras T004 y autorización específica.
- [X] T033 [US3] Implementar corte por variante con suspensión de escrituras de stock/reserva, transacción indivisible, enlace de reservas vigentes (incluidas pagadas sin consumo) y marca idempotente en `backend/src/services/corte-inventario.js`; omitir sin duplicar las variantes nuevas que ya tengan partidas conciliadas. Detener ante saldo inconciliable y mantener la política global desactivada; distinguir estados `pendiente`, `conciliado` y `activo` sin inferir activación del estado de tareas.
- [X] T034 [US3] Implementar reanudación de pendientes y registro de conciliación/recuperación en `backend/src/jobs/incorporar-existencias.js`; la reanudación solo llega a `conciliado`. Implementar una transición de activación operativa explícita que, bajo suspensión de escrituras, compruebe nuevamente que todas las variantes están conciliadas y que `rutasVerificadasEn` y actor constan en el estado global tras revisar evidencia de T038; nunca activar automáticamente por finalizar el job ni por marcar una tarea. No ejecutarlo hasta verificar base aislada, migración, respaldo y autorización específica.
- [X] T035 [US3] Implementar ajustes positivos/negativos con motivo, origen/costo conocido o desconocido y límites de reservas en `backend/src/services/inventario.js` y `backend/src/routes/admin-inventario.routes.js`; montar el router administrativo en `backend/src/index.js`.
- [X] T036 [US3] Sustituir escrituras directas de `stock` al crear, editar o desactivar variantes en `backend/src/routes/talle-producto.routes.js` y `frontend/src/components/AdminProductos.tsx`: las altas comienzan en cero y todo cambio posterior usa ajuste trazable con motivo, sin invadir reservas ni duplicar una recepción. Probar explícitamente las tres operaciones.
- [X] T037 [US3] Exponer historial de una variante, saldo físico/libre/comprometido y costo desconocido en `backend/src/routes/admin-inventario.routes.js`, `frontend/src/types/inventario.ts` y `frontend/src/components/AdminProductos.tsx`.
- [X] T038 [US3] Probar corte con reservas pendientes y pagadas, interrupción, reanudación, discrepancia, costo desconocido vs cero, ajuste que invade reservas, bloqueo concurrente y reconciliación de partidas/movimientos en `backend/test/corte-inventario.test.js` y `backend/test/ajustes.test.js` sobre base aislada verificada; incluir variante nueva ya recibida sin doble incorporación, rechazo de activación antes de conciliar todas y transición explícita a `activo` solo con rutas verificadas, sin activación automática al finalizar el job.
- [X] T039 [US3] Registrar en `specs/003-compras-proveedores-costos/verificacion.md` el resultado de T038 y la decisión operativa separada de activar o mantener el corte `conciliado`; solo tras revisar esa evidencia en el entorno de activación autorizado registrar `rutasVerificadasEn` y actor en el estado global. Documentar corte/ajustes efectivamente implementados y excepciones observadas en `docs/estado-actual/02-modelo-de-datos.md`, `docs/estado-actual/06-flujos-de-negocio.md` y `docs/estado-actual/08-deuda-y-riesgos.md`. No atribuir activación real a una prueba aislada.

**Checkpoint**: Solo después de conciliación completa y evidencia de recuperación queda habilitada la política nueva sobre saldos heredados.

---

## Phase 6: User Story 4 - Corregir y devolver sin perder historia (Priority: P2)

**Goal**: Conservar originales y efectos auditables de correcciones, anulaciones y devoluciones parciales de clientes/proveedores.

**Independent Test**: Corregir costo ya usado en venta, aceptar devolución parcial con dos reintegros y dos recepciones (apta/dañada), devolver a proveedor y comprobar historia, saldo, margen y ausencia de duplicación.

### Implementation for User Story 4

- [X] T040 [US4] Agregar `CorreccionIngreso`, `DevolucionProveedor`, `DevolucionCliente`, pagos de reintegro y `RecepcionDevolucion` en `backend/prisma/schema.prisma` y una migración nueva en `backend/prisma/migrations/`; actor/fecha/motivo, valor anterior/nuevo y referencias originales obligatorios, sin borrado físico. Aplicar solo a base aislada tras T004 y autorización específica.
- [X] T041 [US4] Implementar corrección/anulación de ingreso con evento antes/después y rechazo de unidades vendidas/reservadas o stock negativo en `backend/src/services/compras.js`; registrar la diferencia de costo en la fecha de corrección y recalcular vista de margen sin cambiar origen FIFO en `backend/src/services/costos.js`. Si una unidad corregida ya fue devuelta, revisar también su reversión para evitar un nuevo costo neto de esa unidad.
- [X] T042 [US4] Implementar devolución parcial a proveedor desde unidades libres de su partida, importe de compra revertido e ingreso original preservado en `backend/src/services/devoluciones.js`.
- [X] T043 [US4] Implementar aceptación de devolución de cliente con límite de unidades acumuladas, reversión única de costo FIFO e importe debido calculado por backend a partir del importe efectivo atribuido a cada unidad vendida, incluidos descuentos y centavos residuales por orden FIFO estable, en `backend/src/services/devoluciones.js`; no aceptar un total enviado por cliente ni sumar stock hasta recepción apta.
- [X] T044 [US4] Implementar reintegros efectivos parciales idempotentes hasta importe debido, cierre motivado del saldo sin reintegro y recepciones parciales aptas/dañadas sin doble clasificación en `backend/src/services/devoluciones.js`; vincular cada partida apta con su recepción y asignación FIFO de origen mediante migración aditiva nueva en `backend/prisma/schema.prisma` y `backend/prisma/migrations/`, aplicable solo a base aislada con autorización específica.
- [X] T045 [US4] Integrar cancelación pagada anterior a salida física con esa reversión única; liberar reserva si se restituye o registrar salida no vendible si no, y responder `409 DEVOLUCION_REQUERIDA` tras salida física en `backend/src/services/ordenes.js` y `backend/src/routes/admin-ordenes.routes.js`.
- [X] T046 [US4] Exponer correcciones, anulaciones y devolución a proveedor en `backend/src/routes/admin-compras.routes.js`; exponer devolución de cliente, reintegros y recepciones en `backend/src/routes/admin-ordenes.routes.js` según contrato y autorización admin.
- [X] T047 [P] [US4] Declarar estados, saldos parciales, eventos y errores de devoluciones/correcciones en `frontend/src/types/compra.ts` y `frontend/src/types/orden.ts`.
- [X] T048 [US4] Añadir revisión, motivos, estados y reintentos de corrección/devolución en `frontend/src/components/AdminCompras.tsx` y `frontend/src/components/AdminOrdenes.tsx`; no ofrecer restitución vendible antes de recepción apta.
- [X] T049 [US4] Probar corrección tras venta y tras devolución con costo revertido, cálculo de reintegro por unidad con descuentos/centavos y rechazo de importe cliente, anulación incompatible, devolución parcial a proveedor, límites de pagos/recepciones, reintentos, cancelación pagada antes/después de salida y conservación de originales en `backend/test/devoluciones.test.js` y `backend/test/correcciones.test.js` sobre base aislada verificada.
- [X] T050 [US4] Actualizar modelos, rutas y flujos verificados de corrección/cancelación/devolución en `docs/estado-actual/02-modelo-de-datos.md`, `docs/estado-actual/03-api-backend.md`, `docs/estado-actual/04-frontend.md`, `docs/estado-actual/06-flujos-de-negocio.md` y `specs/003-compras-proveedores-costos/verificacion.md`.

**Checkpoint**: US4 conserva costo, dinero y recepción física como hechos distintos con referencias y límites acumulados.

---

## Phase 7: User Story 5 - Consultar y comparar historia (Priority: P2)

**Goal**: Consultar desde Productos y Compras la evolución nominal de ingresos, costos, precios, ventas, devoluciones y márgenes por filtros y períodos.

**Independent Test**: Comparar meses diferentes con varias partidas/precios, filtrar por proveedor cuando una venta usa dos orígenes y comprobar importes atribuidos que suman la venta, margen indeterminado si falta costo y estados vacíos/error separados.

### Implementation for User Story 5

- [X] T051 [US5] Agregar `VigenciaPrecio` regular/promocional con intervalos no solapados desde activación en `backend/prisma/schema.prisma` y una migración nueva en `backend/prisma/migrations/`; no reconstruir precios anteriores ni crear motor de promociones. Aplicar solo a base aislada tras T004 y autorización específica.
- [X] T052 [US5] Capturar precio regular inicial observado y cada cambio posterior de `Producto.precio` en `backend/src/services/precios.js` y `backend/src/routes/productos.routes.js`; registrar promocional solo si se verifica un publicador existente y su contrato, sin alterar cobros pasados.
- [X] T053 [US5] Agregar consultas de historial de producto/precios y resumen por recepción/pago/fecha propia de correcciones/reintegros en `backend/src/services/informes.js`; distinguir compras, ventas, stock remanente y margen, y no calcular margen completo con costo desconocido.
- [X] T054 [US5] Implementar filtro por proveedor a partir de asignaciones FIFO, importes descontados atribuidos y origen desconocido separado, más resumen global de todos los registros filtrados, `totalResultados`, primera página de detalle y paginación a pedido en `backend/src/services/informes.js`; fechar ventas por pago, reversión de costo por aceptación, reintegros por pago efectivo y diferencias de corrección por su evento, sin reescribir períodos anteriores.
- [X] T055 [US5] Exponer historial de producto, precios y comparaciones por producto/variante/proveedor en `backend/src/routes/admin-informes.routes.js` y montarlo en `backend/src/index.js` con contratos de vacío legítimo, 401/403, error recuperable y filtros conservables.
- [X] T056 [P] [US5] Declarar tipos de historial, comparación, cobertura de costo y estados de consulta en `frontend/src/types/informe.ts` y `frontend/src/types/producto.ts`.
- [X] T057 [US5] Crear consulta administrativa y enlace desde producto en `frontend/src/app/admin/compras/page.tsx`, `frontend/src/app/admin/productos/page.tsx`, `frontend/src/components/AdminCompras.tsx` y `frontend/src/components/AdminProductos.tsx`; mostrar carga, vacío, fallo/reintento con filtros, acceso denegado y precios publicados frente a importes vendidos.
- [X] T058 [US5] Probar agrupación por fecha de recepción/pago, venta en enero y reintegro/reversión en febrero con margen mensual y acumulado de la spec, filtro por proveedor con descuento y centavos, costo parcial desconocido, resumen global independiente de paginación, precio regular/promocional condicional y correcciones/devoluciones en `backend/test/informes.test.js` y `backend/test/precios.test.js` sobre base aislada verificada.
- [X] T059 [US5] Actualizar consultas/precios realmente implementados en `docs/estado-actual/03-api-backend.md`, `docs/estado-actual/04-frontend.md`, `docs/estado-actual/06-flujos-de-negocio.md` y `specs/003-compras-proveedores-costos/verificacion.md`.

**Checkpoint**: US5 permite comparar datos realizados sin proyecciones, ajuste por inflación ni confundir margen bruto con ganancia neta.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verificación integrada y cierre documental sin afirmar métricas no medidas.

- [X] T060 Ejecutar recorridos de [quickstart.md](quickstart.md) sobre entorno aislado autorizado, incluidas carreras de última unidad, corte reanudado, corrección posterior y devolución parcial; registrar entradas, salidas y limitaciones en `specs/003-compras-proveedores-costos/verificacion.md`.
- [ ] T061 Preparar en un entorno aislado autorizado y verificar un conjunto reproducible para SC-006 de 1.000 productos y 10.000 movimientos distribuidos en un año, documentando su generación, volumen, distribución y entorno sin ejecutar escrituras externas no autorizadas. Medir SC-005/006/008 con las muestras, tiempos y hojas de respuesta definidos en [spec.md](spec.md); para cada consulta SC-006 registrar desde aplicar filtros hasta que sean visibles el resumen global y la primera página, parámetros, `totalResultados`, tamaño de página y tiempo, sin incluir páginas posteriores. Registrar resultados reales en `specs/003-compras-proveedores-costos/verificacion.md`; no marcar cumplimiento por inspección estática.
- [X] T062 Ejecutar `npm.cmd test` desde `backend/` solo con base aislada verificada, y `npm.cmd run lint` + `npm.cmd run build` desde `frontend/` al cerrar código; registrar resultados en `specs/003-compras-proveedores-costos/verificacion.md` y declarar ausencia de scripts lint/build backend.
- [X] T063 Revisar `git diff --check` y `git status` por separado en raíz, `backend/` y `frontend/`; comprobar que los cambios de `docs/estado-actual/` describen solo comportamiento verificado y que los cambios ajenos de 002 siguen intactos; registrar en `specs/003-compras-proveedores-costos/verificacion.md`.
- [X] T064 Revisar la versión final de `specs/003-compras-proveedores-costos/spec.md`, `specs/003-compras-proveedores-costos/plan.md`, `backend/prisma/schema.prisma` y `backend/prisma/migrations/` antes de cualquier aplicación fuera de la base aislada; separar aprobación de migración, despliegue y publicación del cierre local de código.

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Setup (T001–T004)
  └─ Foundational (T005–T010)
       └─ US1 recepción/proveedores (T011–T022) ── MVP en variantes nuevas
            ├─ US2 FIFO/venta (T023–T031) ── necesita partidas de US1
            └─ US3 corte/ajustes (T032–T039) ── necesita partidas y base de reservas
                 └─ US4 correcciones/devoluciones (T040–T050) ── necesita US2 y US3
                      └─ US5 historial/comparaciones (T051–T059) ── integra hechos anteriores
                           └─ Polish (T060–T064)
```

- La implementación sigue US1 → US2 → US3. Antes de US3, US1 y el FIFO de US2 solo se activan para variantes nuevas verificadas con stock inicial cero y sin reservas previas; las variantes heredadas conservan el checkout anterior y no generan asignaciones parciales ni margen nuevo. US3 incorpora saldos heredados y omite variantes nuevas ya conciliadas. El job solo alcanza `conciliado`; la política global requiere después de T035–T038 una activación operativa explícita, con todas las rutas de stock/reserva protegidas, prueba aislada registrada y variantes aún conciliadas bajo suspensión de escrituras. Los archivos compartidos `backend/prisma/schema.prisma`, `backend/src/services/inventario.js` y las migraciones se modifican en secuencia.
- US4 requiere asignaciones de venta (US2) y conciliación del stock inicial/ajustes (US3). US5 puede comenzar el historial regular de precios antes de US4, pero el informe completo depende de hechos de devolución/corrección de US4.
- El MVP es US1 sobre variantes nuevas de stock cero y sin reservas previas. No confirmar ingresos sobre variantes heredadas antes del corte ni declarar margen confiable para ellas hasta US3.

### Within Each User Story

- Revisar reglas y contrato del story; crear migración nueva si cambia esquema; implementar servicios antes de rutas y UI; añadir pruebas significativas y actualizar `docs/estado-actual/` solo cuando el comportamiento exista.
- `[P]` señala archivos distintos y trabajo independiente; no ejecutar en paralelo dos tareas que editen el mismo archivo o dependan de una migración sin aplicar en la base aislada.
- Cada checkpoint requiere resultados observados, no solo archivos compilados. Si falta base aislada autorizada, seguir con tareas locales independientes y dejar pruebas con escritura pendientes, sin atribuirlas como aprobadas.
- Antes de cerrar cada tarea que cambie `frontend/`, ejecutar su lint y build; para `backend/`, registrar que no hay scripts de lint/build y ejecutar los tests significativos que correspondan en base aislada autorizada. Revisar `git diff --check` en el repo afectado y actualizar `docs/estado-actual/` en la misma tarea si cambió un flujo ya documentado.

## Parallel Examples

| Story | Tareas independientes tras sus prerrequisitos | Condición |
|---|---|---|
| US1 | T018 tipos frontend y T014 servicio backend | T011 define nombres/contrato; archivos distintos. |
| US2 | T027 cálculo de importes y T028 contrato/tipos de orden | T023–T026 fijan asignaciones; no compartir archivo. |
| US3 | T034 job de reanudación y T035 ajustes backend | T033 define el corte; sus archivos no se superponen. |
| US4 | T047 tipos frontend y T041 corrección backend | T040 define entidades; archivos distintos. |
| US5 | T056 tipos frontend y T053 consultas backend | T051 define vigencias; archivos distintos. |

## Implementation Strategy

1. Completar aislamiento/revisión y base compartida; implementar US1 y comprobar su recorrido de ingreso único sobre variantes nuevas.
2. Agregar US2 para venta/costo FIFO y US3 para adoptar saldos heredados de forma segura; sus pruebas son obligatorias antes de activar el corte.
3. Agregar US4 y US5; cerrar con recorridos completos y métricas. Trabajar una tarea por vez y registrar validación por repo. No instalar dependencias, hacer commit/push, aplicar migraciones ni escribir en servicios externos sin la autorización y verificación correspondientes.
