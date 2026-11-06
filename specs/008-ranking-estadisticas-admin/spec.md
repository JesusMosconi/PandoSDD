# Feature Specification: Ranking de productos, trazabilidad y panel de inicio del administrador

**Feature Branch**: `008-ranking-estadisticas-admin`
**Created**: 2026-11-06
**Status**: Aprobada en conversación el 2026-11-06
**Input**: Ranking de productos (más vendido) con filtros por cantidad e importe; trazabilidad del producto con precios y estadísticas; panel «Inicio» del administrador que muestre primero las métricas y estadísticas generales.

## Clarifications

### Session 2026-11-06

- Q: ¿Qué importe usa el ranking? → A: El **neto de devoluciones de clientes**: lo vendido menos lo devuelto en el período, con el mismo criterio de fechas que los informes existentes.
- Q: ¿Se agrega una librería de gráficos? → A: Sí, Recharts en el frontend. Es la única dependencia nueva.
- Q: ¿Qué muestra primero el panel de inicio? → A: Las ventas del período (total, cantidad y ticket promedio, separadas por web y local y comparadas con el período anterior), la evolución diaria y el top 5 de productos. Las alertas operativas (stock bajo, órdenes pendientes, estado de la caja) quedan para una iteración siguiente.
- Q: ¿Qué cuenta como venta? → A: Lo mismo que en la 003 (FR-012) y la 007 (FR-028): una orden con pago confirmado, en la fecha y hora de la confirmación (días de Buenos Aires), de la web o del local.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver el panel de inicio con métricas (Priority: P1)

Como administrador, quiero que al entrar a la administración se muestren las métricas principales del negocio para saber de un vistazo cómo vienen las ventas.

**Why this priority**: Es la primera pantalla que ve el administrador y hoy no muestra datos.

**Independent Test**: Con ventas web y del local pagadas en los últimos 30 días y en los 30 anteriores, el administrador entra a `/admin`. Ve el total vendido, la cantidad de ventas y el ticket promedio, cada uno con su variación respecto del período anterior y separado por canal. Ve también un gráfico diario y el top 5 de productos.

**Acceptance Scenarios**:

1. **Given** ventas pagadas en el período, **When** el administrador abre el panel, **Then** ve el total, la cantidad de ventas y el ticket promedio del período (por defecto, los últimos 30 días), en total y por canal.
2. **Given** ventas en el período anterior de igual duración, **When** se muestra el panel, **Then** cada métrica indica la variación porcentual. Si el período anterior no tuvo ventas, la variación se muestra como «sin datos previos».
3. **Given** el panel, **When** el administrador elige otro período (hoy, 7 días, 30 días o mes actual), **Then** todas las métricas, el gráfico y el top se recalculan para ese período.
4. **Given** días sin ventas dentro del período, **When** se dibuja el gráfico diario, **Then** esos días aparecen con importe cero.
5. **Given** el top 5, **When** el administrador hace clic en un producto, **Then** abre su página de trazabilidad. Un enlace lleva al ranking completo.
6. **Given** órdenes reservadas sin pago, **When** se calculan las métricas, **Then** no se cuentan.

---

### User Story 2 - Consultar el ranking de productos (Priority: P1)

Como administrador, quiero ver qué productos se venden más, ordenados por unidades o por importe y filtrados por período, canal, categoría y mínimos, para decidir reposiciones y precios.

**Why this priority**: Es el pedido central de la feature.

**Independent Test**: El producto A vende 10 unidades a $1.000 y el B vende 3 unidades a $10.000 en el período. Ordenando por cantidad, A queda primero; ordenando por importe, B queda primero. Si se devuelven 2 unidades de A, el ranking muestra 8 unidades netas y $8.000.

**Acceptance Scenarios**:

1. **Given** ventas pagadas en el período, **When** el administrador consulta el ranking, **Then** ve cada producto vendido con su posición, unidades netas, unidades devueltas, importe neto, precio promedio cobrado y cantidad de órdenes.
2. **Given** el ranking, **When** se elige «ordenar por importe», **Then** el orden y las posiciones se recalculan por importe neto. Con «cantidad», por unidades netas. Los empates se resuelven por el otro criterio y después por nombre.
3. **Given** un mínimo de unidades o de importe, **When** se aplica, **Then** solo aparecen los productos que lo alcanzan.
4. **Given** un filtro de canal (web o local) o de categoría, **When** se aplica, **Then** solo se cuentan las ventas y devoluciones que corresponden.
5. **Given** líneas de venta rápida del local, **When** se arma el ranking, **Then** no aparecen, porque no son productos del catálogo.
6. **Given** más de 20 productos, **When** se consulta, **Then** el resultado está paginado. Las posiciones siguen la numeración global, no reinician por página.
7. **Given** un período sin ventas, **When** se consulta, **Then** se informa que no hay ventas para esos filtros.

---

### User Story 3 - Ver la trazabilidad de un producto (Priority: P2)

Como administrador, quiero abrir un producto y ver cómo evolucionaron su precio publicado y sus ventas, con el detalle por variante y canal, para entender su desempeño.

**Why this priority**: Los datos ya existen (feature 003), pero hoy solo se ven como texto dentro de Compras.

**Independent Test**: Un producto cambia de precio de $20.000 a $25.000 a mitad de mes y vende en ambos precios. Su página muestra el precio publicado en escalón, el precio promedio cobrado por día, las unidades por talle y color, la separación web/local, su posición en el ranking y el stock actual.

**Acceptance Scenarios**:

1. **Given** un producto con vigencias de precio, **When** el administrador abre su trazabilidad, **Then** ve cada precio publicado con su inicio y fin, en un gráfico y en una lista.
2. **Given** ventas del producto, **When** se muestra la página, **Then** ve las unidades e importe netos, la posición en el ranking por unidades, la serie diaria y el desglose por variante y por canal.
3. **Given** la página, **When** se baja al detalle, **Then** se muestra el informe existente del producto, con costo, margen y hechos (feature 003).
4. **Given** un producto anterior al historial de precios, **When** no hay vigencias para el período, **Then** se indica que no hay precios registrados para esas fechas.
5. **Given** un identificador de producto inexistente, **When** se abre la página, **Then** se informa que el producto no existe.
6. **Given** la gestión de productos o el ranking, **When** el administrador elige «Estadísticas» en un producto, **Then** abre su trazabilidad.


### User Story 4 - Navegar el panel con un menú lateral (Priority: P2)

*(Agregada el 2026-11-06 a pedido del usuario.)* Como administrador quiero un menú lateral fijo en todas las pantallas de `/admin`, con las opciones agrupadas, para pasar de un módulo a otro sin volver al Inicio.

**Acceptance Scenarios**:

1. **Given** un administrador en cualquier página de `/admin`, **When** mira la pantalla en escritorio, **Then** ve a la izquierda el menú con Inicio, los módulos agrupados (Ventas, Catálogo, Inventario y Usuarios) y el acceso al punto de venta, con la opción actual resaltada.
2. **Given** una pantalla angosta, **When** toca «Menú del panel», **Then** el menú se despliega, y se cierra al elegir una opción.
3. **Given** un usuario que no es administrador, **When** entra a `/admin/...`, **Then** se lo redirige como antes y no ve el menú.

---
---

### Edge Cases

- Una devolución aceptada en el período de una venta de un período anterior: resta en el período de la devolución, igual que en los informes existentes. Por eso un producto puede tener unidades netas negativas; se muestra igual y queda al final del orden.
- Una orden pagada y después cancelada por el administrador conserva su fecha de pago y cuenta como venta, como en los informes existentes. La reversión se refleja con la devolución.
- Un producto eliminado lógicamente con ventas en el período: aparece en el ranking con su nombre y se marca como inactivo.
- Una línea cuyo producto fue borrado físicamente (`productoId` nulo por `SetNull`): no aparece en el ranking.
- El precio promedio con cero unidades netas se muestra como «—».
- Un período invertido (desde posterior a hasta), fechas mal formadas o un rango mayor a 366 días: se rechazan con un mensaje claro.
- Los precios promocionales todavía no se registran; la trazabilidad muestra los que existan.

## Requirements *(mandatory)*

### Functional Requirements

**Criterio común**

- **FR-001**: Toda estadística de ventas DEBE contar solo las órdenes con pago confirmado dentro del período, en días de Buenos Aires con fecha final inclusive, para ambos canales salvo que se filtre uno.
- **FR-002**: Las devoluciones de clientes DEBEN restar unidades e importe en la fecha en que se aceptaron, con el importe debido de cada devolución.
- **FR-003**: Los importes DEBEN calcularse en el backend con decimales exactos y expresarse con dos decimales.
- **FR-004**: Solo un administrador activo DEBE poder consultar estas estadísticas. El vendedor y el cliente NO DEBEN acceder.

**Panel de inicio**

- **FR-005**: El panel DEBE mostrar, para el período elegido, el total vendido, la cantidad de ventas, el ticket promedio (total ÷ cantidad) y las unidades netas del catálogo, en total y, salvo las unidades, por canal. También DEBE mostrar el importe y las unidades devueltas en el período.
- **FR-006**: Cada métrica DEBE compararse con el período anterior inmediato de igual duración, con su variación porcentual. Sin ventas previas, la variación es nula.
- **FR-007**: El panel DEBE mostrar la serie diaria del importe por canal, con los días sin ventas en cero.
- **FR-008**: El panel DEBE mostrar los 5 productos con más unidades netas del período, con enlace al ranking y a cada trazabilidad.
- **FR-009**: *(Revisado el 2026-11-06.)* El Inicio ya no muestra tarjetas de módulos: el acceso a los módulos, incluido el ranking, lo da el menú lateral (FR-018).
- **FR-009a**: Antes de las ventas, el Inicio DEBE mostrar los pendientes del momento, sin depender del período: pagos por confirmar (sin vencer), órdenes por preparar, en preparación, esperando retiro y en camino, reintegros pendientes, incidencias de pago abiertas, compras en borrador, el estado de la caja del local (marcando si quedó abierta de una jornada anterior) y las variantes activas con stock disponible de 2 unidades o menos. Cada pendiente DEBE llevar a la pantalla donde se resuelve y DEBE indicar «Al día» cuando no hay nada. Se actualiza cada 60 segundos y a pedido.

**Ranking**

- **FR-010**: El ranking DEBE agrupar por producto las líneas de órdenes pagadas con producto del catálogo y excluir las de venta rápida.
- **FR-011**: Por producto DEBE informar: posición, nombre, categoría, imagen principal, estado activo, precio actual, unidades vendidas, unidades devueltas, unidades netas, importe vendido, importe devuelto, importe neto, precio promedio cobrado (importe neto ÷ unidades netas) y cantidad de órdenes.
- **FR-012**: DEBE poder ordenarse por unidades netas (por defecto) o por importe neto, de mayor a menor, y filtrarse por período, canal, categoría, mínimo de unidades netas y mínimo de importe neto.
- **FR-013**: El resultado DEBE paginarse (20 por defecto, hasta 100) con posiciones globales.

**Trazabilidad**

- **FR-014**: La trazabilidad de un producto DEBE mostrar sus totales netos, su posición en el ranking por unidades del período, la serie diaria de unidades e importe, el desglose por variante (talle y color) y por canal, y el stock físico actual por variante.
- **FR-015**: DEBE mostrar las vigencias de precio publicadas que se superponen con el período, junto al precio promedio cobrado por día.
- **FR-016**: DEBE incluir el informe existente del producto (costo, margen y hechos) sin duplicar su cálculo.
- **FR-017**: La gestión de productos y el ranking DEBEN enlazar a la trazabilidad de cada producto.

**Navegación**

- **FR-018**: Todas las páginas de `/admin` DEBEN mostrar un menú lateral con todos los módulos, tomados de una lista única. DEBE resaltar la opción activa, incluidas las subrutas, y en pantallas angostas DEBE plegarse detrás de un botón.

### Key Entities *(include if feature involves data)*

No se agregan entidades ni campos. Se leen:

- **Orden** y **DetalleOrden**: ventas pagadas, con su canal y la instantánea de producto, variante, cantidad e importe por línea.
- **DevolucionCliente**: unidades e importe devueltos por línea, con su fecha de aceptación.
- **VigenciaPrecio**: precios publicados por producto, con su intervalo.
- **Producto**, **Categoria**, **ImgProducto** y **TalleProducto**: datos descriptivos y stock actual.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El panel de inicio carga sus métricas de 30 días en menos de 2 segundos con el volumen actual.
- **SC-002**: Para cualquier período, el total del panel coincide al centavo con el total de `GET /admin/ventas/resumen` del mismo período.
- **SC-003**: La suma de los importes vendidos del ranking más las líneas de venta rápida coincide al centavo con el total del período.
- **SC-004**: El 100 % de las consultas de vendedores o clientes a estas estadísticas son rechazadas.
- **SC-005**: El administrador identifica el producto más vendido de un período en menos de 3 clics desde que entra a la administración.

## Assumptions

- No hay descuentos por orden: el subtotal de cada orden es la suma de sus líneas (lo verifica el checkout), así que el importe de línea es el importe vendido.
- El costo de envío no forma parte de las ventas de mercadería, igual que en `GET /admin/ventas/resumen`.
- Las órdenes de demostración del pago de prueba (006) cuentan igual que en los informes existentes.
- No hay precios anteriores a la migración `20261019_vigencias_precio`, y los promocionales todavía no se registran.
- Quedan fuera de alcance: exportar a CSV, ventas por vendedor (prohibido por la 007, FR-030) y registrar precios promocionales.

## Dependencias y coordinación

- Se apoya en la 003 (informes, vigencias de precio) y en la 007 (canal local, venta rápida), ambas integradas en `main`/`master`.
- **Constitution VII**: no cambia esquema, autenticación ni cálculo de precios de venta. Agrega una dependencia de frontend (Recharts), declarada aquí.

## Repositorios y archivos previstos

- **backend/**: `src/services/estadisticas.js` (nuevo); `src/routes/admin-estadisticas.routes.js` (nuevo); `src/index.js`; `test/estadisticas.test.js` (nuevo).
- **frontend/**: `package.json` (Recharts); `src/app/api/admin/[...ruta]/route.ts` (prefijo `estadisticas`); `src/types/estadisticas.ts` (nuevo); `src/app/admin/page.tsx`; `src/app/admin/ranking/page.tsx` (nuevo); `src/app/admin/productos/[id]/page.tsx` (nuevo); `src/components/AdminInicio.tsx`, `AdminRanking.tsx` y `AdminTrazabilidadProducto.tsx` (nuevos); `src/components/AdminProductos.tsx` (enlace).
- **PandoSDD/**: `specs/008-ranking-estadisticas-admin/` y `docs/estado-actual/` (API, frontend, deuda y riesgos).
