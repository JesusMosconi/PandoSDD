# Implementation Plan: Compras, proveedores e historial de costos y precios

**Branch prevista**: `003-compras-proveedores-costos` (pendiente de aislar en los tres repositorios; checkout Git actual: `002-checkout-ordenes`) | **Date**: 2026-10-17 | **Spec**: [spec.md](spec.md)

**Input**: Spec con cinco aclaraciones. Este plan diseña cambios locales; no ejecuta migraciones, corte de inventario, escrituras externas, commit ni despliegue.

## Summary

Agregar proveedores, recepciones confirmables y partidas de costo por variante, manteniendo `TalleProducto.stock` como saldo físico. Vincular las reservas de checkout a partidas FIFO, reconocer la venta y su costo al confirmar pago y consumir stock físico después sin duplicar la venta. Registrar existencias iniciales sin sumar stock, ajustes y eventos compensatorios de corrección/devolución. Capturar vigencias de precio regular y de promociones solo si un mecanismo vigente las publica. Exponer historial e informes administrativos con importes efectivos, costos conocidos/desconocidos y márgenes por período, producto, variante y proveedor.

## Technical Context

**Language/Version**: Backend JavaScript ESM y Node.js (versión exacta de despliegue por verificar); frontend TypeScript strict, Next.js 16.2.10 y React 19.2.4.

**Primary Dependencies**: Express 5.2.1, Prisma 7.8, `@prisma/adapter-pg`, PostgreSQL y `pg`; BFF Next. Sin dependencias nuevas previstas.

**Storage**: PostgreSQL mediante Prisma. Migración nueva aditiva para proveedores, ingresos/partidas, procedencia inicial, asignaciones, movimientos, correcciones, devoluciones y vigencias; nunca modificar migraciones aplicadas. `TalleProducto.stock` sigue siendo saldo físico.

**Testing**: `backend/test/` con `node:test` y base descartable autorizada para integración/concurrencia; `npm.cmd test` solo después de verificar destino. Frontend: `npm.cmd run lint` y `npm.cmd run build` al modificarlo. Backend carece de scripts de lint/build. Recorridos manuales admin y medición de criterios de éxito.

**Target Platform**: API Express y web Next. No se agrega tarea programada ni integración de pagos.

**Project Type**: E-commerce web con repositorios separados `backend/`, `frontend/` y raíz para docs/specs.

**Performance Goals**: Entrega de diez líneas revisada en menos de cinco minutos (SC-005); consulta anual de 1.000 productos y 10.000 movimientos en cinco segundos o menos (SC-006), medida con datos representativos. Listados paginados e índices de filtros.

**Constraints**: Importes decimales exactos; sin doble stock/venta/costo ni stock negativo; FIFO por variante; reservas antes de venta; costo desconocido distinto de cero; compras por recepción y ventas por pago; descuentos repartidos sin perder centavos; historial desde activación; autorización admin y BFF.

**Scale/Scope**: Una entrega completa por ingreso con varias líneas; las cifras de SC-005/006 son escenarios de prueba, no límites funcionales. Excluye pedidos pendientes, cuentas corrientes, motor de promociones y reconstrucción histórica.

## Constitution Check

*GATE: evaluado antes de investigación y después del diseño.*

| Principio | Decisión y verificación | Estado |
|---|---|---|
| I. Separación | Reglas FIFO, importes y datos en backend; navegador autenticado por BFF | Cumple |
| II. Datos | Migración nueva para Prisma 7, nombres de dominio en español, bajas lógicas y eventos sin borrar historia | Cumple; esquema/migración exigen revisión explícita |
| III. API | `asyncHandler`, validación y campos permitidos; `verificarToken` + `esAdmin` | Cumple |
| IV. Seguridad y cálculo | Cookie httpOnly, importes verificados por backend, sin costos inferidos ni secretos en código | Cumple; precios exigen revisión explícita |
| V. Frontend | Server Components por defecto, BFF, `src/lib/api.ts`, contratos en `src/types/`, TS strict | Cumple |
| VI. Calidad | UTF-8, pruebas backend de concurrencia/corte, lint/build frontend; declarar ausencia de scripts backend | Cumple |
| VII. SDD | Spec y plan antes de tasks/código, lista de repos/archivos y revisión explícita de esquema/precios | Cumple |

**Gate previo**: No se propone violación. La invocación de `$speckit-plan` aprueba la spec para esta fase de diseño, sin autorizar implementación o migración. Los cambios de esquema y precios deben recibir revisión explícita de spec y plan antes de implementarse. No se cambia de rama ahora porque los tres repositorios contienen cambios previos sin guardar de 002; antes de implementar, aislar 003 en ramas propias sin arrastrar ni perder esos cambios.

**Gate posterior**: [research.md](research.md), [data-model.md](data-model.md) y [contracts/compras-historial.md](contracts/compras-historial.md) preservan separación, autorización, baja lógica, importes autoritativos y trazabilidad. No hay excepción nueva propuesta. Corte inicial, aplicación de migración y pruebas que escriban a una base requieren verificar y autorizar el destino exacto.

## Phase 0: Research decisions

Ver [research.md](research.md): D1 inventario/FIFO; D2 recepción idempotente; D3 corte inicial; D4 precios/descuentos; D5 correcciones/devoluciones; D6 BFF/autorización; D7 validación. No quedan `NEEDS CLARIFICATION` técnicos para diseñar. La versión exacta de Node, el destino de base aislada, el estado real de migraciones y la existencia de promociones publicadas son verificaciones operativas posteriores.

## Phase 1: Design

- [data-model.md](data-model.md): entidades, cantidades, vínculos, estados, transiciones e invariantes.
- [contracts/compras-historial.md](contracts/compras-historial.md): API administrativa, BFF, consultas, errores y reintentos.
- [quickstart.md](quickstart.md): preparación aislada, recorridos de validación y resultados esperados.

### Boundaries and sequence

1. **Base y barrera de activación**: crear las migraciones nuevas en base aislada y un estado verificable de corte. Mientras el corte esté pendiente, solo variantes nuevas creadas con stock físico cero y sin reservas previas pueden confirmar ingresos o entrar a asignación FIFO. Comprobarlo bajo el mismo bloqueo que modifica stock o reservas; rechazar las variantes heredadas en estos flujos y mantener para ellas el comportamiento anterior hasta el corte. La migración por sí sola no activa la política nueva.
2. **Ingresos**: proveedor, borrador y resumen; confirmar con bloqueo de variantes, validaciones y clave de reintento. Aumentar stock y crear partidas/movimientos en una transacción para variantes admitidas por la barrera. Persistir en `Producto` la marca `creadoDesdeCompras` (falsa para fichas preexistentes); las fichas nuevas de ese flujo nacen con stock cero y sin publicación. Solo esa marca activa la barrera de publicación hasta confirmar un ingreso de alguna de sus variantes.
3. **Reservas y venta**: extender checkout para elegir partidas libres FIFO solo en variantes admitidas, bajo los mismos bloqueos. Guardar asignaciones por línea aunque `ReservaStock` siga agrupada por variante; la suma asignada debe igualar la cantidad reservada. Reintentos y cancelaciones previas al pago liberan exactamente esas unidades. Al confirmar pago, convertir asignaciones reservadas en costo reconocido, con importe descontado repartido; el consumo físico posterior no duplica venta ni costo.
4. **Corte de saldos heredados**: completar antes las rutas de ajuste y toda ruta que escriba stock o reservas, incluidas creación y desactivación de variantes. Suspender escrituras durante la conciliación; incorporar existencia inicial y enlazar reservas vigentes sin sumar stock. Cada variante se incorpora en transacción indivisible con marca de completada. Si una falla, conservar completadas, registrar pendientes y diferencia, conciliar y reanudar solo pendientes. Repetir una completada es inocuo. El job deja el corte en estado `conciliado`, sin activar la política. Tras probar en base aislada rutas protegidas, ajustes, reservas y reanudación, una activación operativa explícita pasa a `activo` solo si todas las variantes siguen conciliadas bajo suspensión de escrituras; entonces se reabren escrituras con la política nueva. Si no es posible terminar, restaurar la copia de recuperación verificada antes de reabrir escrituras.
5. **Precios y movimientos posteriores**: capturar precio regular al cambiar y promoción solo si existe un publicador verificado; no alterar ventas pasadas. Registrar ajuste con motivo, corrección de costo con evento y recálculo auditable, anulación elegible, devolución a proveedor desde partida disponible y devolución a cliente con aceptación, reintegros y recepción física separados. La cancelación pagada anterior a salida física reutiliza la reversión de costo/dinero; después de la salida física exige devolución, sin sumar stock antes de recepción apta.
6. **Consultas**: sección Compras/Proveedores y enlace desde Productos. Filtros y comparaciones con compras por recepción, ventas por pago, reintegros/correcciones identificados, cobertura de costo y desglose por proveedor. Paginación y medición SC-006.

### Transaction and reporting rules

- Toda mutación de una variante bloquea variante y partidas en orden estable, relee reservas y verifica saldo físico, disponible y asignado. Recepción/devolución y sus movimientos cambian juntos. Restricciones únicas respaldan idempotencia; una colisión lee el resultado ganador o devuelve conflicto sin repetir efectos.
- `pagoConfirmadoEn` determina período de venta. El costo queda vinculado a la venta; una corrección posterior crea versión/evento y registra su diferencia en la fecha de corrección sin reescribir origen ni cifras cerradas de períodos anteriores. Si el costo de una unidad ya devuelta cambia, se revisan tanto su costo asignado como la reversión asociada, con efecto neto cero en el acumulado de esa unidad. Una carga retroactiva no reabre ventas.
- Aceptar devolución revierte costo; el backend calcula el importe debido con el importe efectivo atribuido a sus unidades originales, sin confiar en un total del cliente. Distribuye centavos residuales por orden FIFO estable y limita todas las devoluciones de una línea a su importe efectivo original. El reintegro efectivo reduce ingreso neto; la recepción física apta incrementa stock vendible. Cada hecho tiene fecha propia y vínculo con origen. En un período, venta e importe de pago se registran en la fecha de pago, reversión de costo en aceptación y reintegro como importe negativo en su fecha efectiva; el margen suma esos movimientos fechados. El acumulado reconcilia ingreso efectivo neto menos costo vendido aún reconocido; si alguna unidad carece de costo, el margen total es indeterminado.
- El importe descontado se reparte entre unidades asignadas según precio vendido. Se calcula la cuota exacta de cada asignación, se toman sus centavos enteros inferiores y se distribuyen los centavos restantes de mayor a menor fracción descartada, con empate resuelto por orden FIFO estable. La suma por proveedores y origen desconocido coincide exactamente con la venta. Envío cobrado y gastos de compra se muestran aparte.
- Las consultas distinguen `cargando`, vacío legítimo, error recuperable y acceso denegado; conservan filtros al reintentar. El resumen global se calcula para todos los registros filtrados y se entrega junto con la primera página de detalle; páginas posteriores se solicitan por separado. SC-006 mide hasta que resumen y primera página son visibles, con total de resultados y tamaño de página registrados. Los criterios SC-005/006/008 se miden con los protocolos definidos en la spec, sin declarar éxito a partir de inspección de código.

### Review points before implementation

- Revisar explícitamente `backend/prisma/schema.prisma`, migración nueva, `Producto.precio`, checkout y cancelación pagada antes de implementar.
- Aislar 003 en ramas propias de raíz/backend/frontend conservando los cambios sucios de 002. No usar `002-checkout-ordenes` como rama final de implementación.
- En entorno aislado autorizado, verificar stock, reservas, órdenes pagadas previas, migraciones, host/base/esquema y respaldo antes del corte. No inferir datos desde `.env`.
- Si no existe mecanismo de promociones, dejar historial promocional vacío y no alterar precio público ni checkout para inventarlo. Si aparece uno, registrar su contrato real y revisar el plan antes de conectarlo.

## Project Structure

### Documentation (repositorio raíz)

```text
specs/003-compras-proveedores-costos/
├── spec.md
├── checklists/requirements.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/compras-historial.md
└── quickstart.md
docs/estado-actual/
├── 02-modelo-de-datos.md
├── 03-api-backend.md
├── 04-frontend.md
├── 06-flujos-de-negocio.md
└── 08-deuda-y-riesgos.md
```

### Source Code (archivos previstos; ajustar en tasks tras inspección)

```text
backend/
├── prisma/schema.prisma
├── prisma/migrations/<nueva_migracion>/migration.sql
├── src/index.js
├── src/routes/{admin-proveedores,admin-compras,admin-inventario,admin-informes,admin-ordenes}.routes.js
├── src/routes/{productos,talle-producto}.routes.js
├── src/services/{inventario,checkout,ordenes}.js
├── src/services/{compras,partidas,costos,devoluciones,precios,informes,importes,corte-inventario,proveedores}.js
├── src/jobs/incorporar-existencias.js
├── src/utils/validate-compras.js
└── test/{importes,compras,inventario-fifo,ordenes-admin,corte-inventario,ajustes,devoluciones,correcciones,informes,precios}.test.js
frontend/
├── src/app/admin/page.tsx
├── src/app/admin/{compras,proveedores}/page.tsx
├── src/app/admin/productos/page.tsx
├── src/app/api/admin/[...ruta]/route.ts
├── src/components/{AdminCompras,AdminProveedores,AdminProductos,AdminOrdenes}.tsx
├── src/lib/api.ts
└── src/types/{compra,proveedor,inventario,informe,orden,producto}.ts
```

**Structure Decision**: Los tres repositorios mantienen sus límites actuales. Rutas y nombres de archivos son previstos; `tasks.md` deberá indicar repo y archivos por tarea y actualizar esta lista si encuentra dependencias.

## Complexity Tracking

No se propone violación de la constitution que requiera excepción.
