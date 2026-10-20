# Feature Specification: Compras, proveedores e historial de costos y precios

**Feature Branch (prevista)**: `003-compras-proveedores-costos` (pendiente de aislar en los tres repositorios; la rama actual es `002-checkout-ordenes`)
**Created**: 2026-10-17
**Status**: Aprobada para planificación por invocación de `$speckit-plan` el 2026-10-17; implementación pendiente de revisión explícita de spec y plan
**Input**: Descripción de la feature adjunta por el usuario el 2026-10-17.

## Clarifications

### Session 2026-10-17

- Q: Si se registra hoy una recepción con fecha anterior a ventas ya pagadas, ¿debe cambiar el costo FIFO de esas ventas? → A: Mantener los costos ya asignados; la recepción tardía entra al FIFO disponible para operaciones futuras.
- Q: Cuando una venta con descuento usa unidades de varios ingresos o proveedores, ¿cómo se reparte su importe efectivo entre esas unidades? → A: Proporcional al precio vendido por unidad; la suma atribuida debe coincidir con el importe efectivo de la venta.
- Q: Para registrar precios promocionales con vigencia, ¿esta feature también debe permitir crear y activar promociones de venta? → A: No; registrar el historial promocional solo si ya existe una promoción publicada por un mecanismo vigente, sin crear gestión de promociones en esta feature.
- Q: Si al incorporar el stock actual ya hay órdenes con reservas o pagos confirmados, ¿cómo deben tratarse esas unidades? → A: Incorporar el saldo físico una sola vez y vincular las reservas vigentes a unidades de existencia inicial, sin duplicarlas.
- Q: En una devolución de cliente con reintegro pendiente, ¿cuándo debe revertirse el costo FIFO de las unidades vendidas? → A: Al aceptar la devolución, aunque el reintegro aún esté pendiente; la recepción física determina por separado si vuelven a stock vendible.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar mercadería recibida (Priority: P1)

El administrador registra un proveedor y una entrega completa con productos, variantes, cantidades, costos unitarios, fechas y gastos adicionales. Revisa los importes y confirma una sola vez; entonces el stock aumenta y queda la historia de la recepción.

**Why this priority**: Establece el origen comprobable de las existencias y evita aumentos manuales duplicados.

**Independent Test**: Crear una entrega con dos variantes y un gasto de envío, confirmar dos veces y comprobar un único aumento de stock y el mismo historial.

**Acceptance Scenarios**:

1. **Given** un proveedor activo y variantes existentes, **When** el administrador registra fecha de compra y recepción, cantidades positivas y costos no negativos, **Then** ve unidades, importe de mercadería y gastos separados antes de confirmar.
2. **Given** un ingreso sin confirmar, **When** lo confirma, **Then** cada variante aumenta exactamente en las unidades recibidas y se conserva la fecha, proveedor y costo de cada partida.
3. **Given** un ingreso ya confirmado, **When** se reintenta su confirmación, **Then** se muestra el resultado anterior sin sumar stock nuevamente.
4. **Given** una variante nueva creada desde el ingreso, **When** se guarda la ficha antes de confirmar, **Then** su stock sigue en cero y el producto no se publica automáticamente.
5. **Given** una ficha nueva marcada como creada desde Compras y un ingreso aún no confirmado, **When** se intenta publicarla, **Then** permanece no publicada; una vez confirmada una recepción de cualquiera de sus variantes, el administrador puede publicarla desde Productos si cumple las condiciones habituales del catálogo. Una ficha preexistente no adquiere esta restricción.

---

### User Story 2 - Conocer costo y margen de ventas (Priority: P1)

El administrador consulta ventas pagadas con importe efectivo y costo histórico de las unidades entregadas por FIFO de cada variante, incluso si una venta usa varios ingresos o proveedores.

**Why this priority**: Permite medir el margen bruto de mercadería sin confundirlo con compras del período ni ganancia neta.

**Independent Test**: Vender una variante recibida en dos partidas de distinto costo, confirmar el pago y verificar el desglose FIFO y el margen de la venta.

**Acceptance Scenarios**:

1. **Given** dos partidas disponibles de una variante, la antigua a 100 y la nueva a 150, **When** se confirma el pago de tres unidades de una venta que consume dos unidades antiguas y una nueva, **Then** el costo asignado es 350 y cada unidad conserva su ingreso de origen.
2. **Given** una orden pendiente con reserva, **When** se consulta ventas, **Then** no figura como venta ni genera margen; la reserva impide asignar esas mismas unidades a otra orden.
3. **Given** una venta pagada con descuento, **When** se calcula su margen, **Then** se usa el importe efectivamente vendido de la mercadería después del descuento y el costo asignado, sin incluir envío ni gastos de compra.
4. **Given** una venta anterior, **When** se confirma una compra más reciente o cambia el precio publicado, **Then** su importe efectivo y origen de costos históricos permanecen identificables.

---

### User Story 3 - Incorporar y ajustar existencias (Priority: P1)

El administrador incorpora el inventario ya presente y registra pérdidas, daños, diferencias o correcciones con motivo, sin inventar una compra previa.

**Why this priority**: La adopción no debe duplicar stock ni producir márgenes engañosos.

**Independent Test**: Incorporar una variante con stock existente y costo desconocido, vender parte, registrar una merma y verificar las cantidades y la advertencia del margen.

**Acceptance Scenarios**:

1. **Given** una variante con diez unidades físicas antes de activar la función, **When** se incorporan como existencia inicial, **Then** el stock físico sigue en diez y se crea una sola procedencia inicial de diez unidades.
2. **Given** una variante con diez unidades físicas y dos reservadas al activar la función, **When** se incorpora el saldo, **Then** las diez pertenecen a la existencia inicial, dos quedan vinculadas a las reservas vigentes y solo ocho permanecen disponibles para nuevas asignaciones.
3. **Given** existencia inicial sin costo conocido, **When** se vende parte, **Then** se informa qué unidades carecen de costo y el margen total se muestra como incompleto, nunca como si el costo fuera cero.
4. **Given** una merma de una variante con reservas vigentes, **When** el ajuste haría insuficiente el stock físico comprometido, **Then** se rechaza sin modificar cantidades ni trazabilidad.
5. **Given** un corte inicial interrumpido después de incorporar algunas variantes, **When** se reanuda, **Then** las variantes completadas no se duplican, las pendientes se concilian antes de incorporarse y la nueva política de stock no se activa hasta completar el corte.

---

### User Story 4 - Corregir y devolver sin perder historia (Priority: P2)

El administrador corrige errores de un ingreso, anula lo que aún puede anularse y registra devoluciones parciales de clientes o a proveedores con motivo y efectos visibles sobre cantidades, importes y costos.

**Why this priority**: La información histórica debe seguir siendo auditable cuando cambian hechos posteriores.

**Independent Test**: Corregir el costo de una partida ya vendida, devolver una unidad de cliente dañada y otra a proveedor, y comprobar el historial y los recálculos correspondientes.

**Acceptance Scenarios**:

1. **Given** una partida con costo erróneo que ya financió ventas, **When** se corrige con motivo, **Then** se conservan valor anterior y nuevo, las ventas afectadas muestran el margen corregido y la corrección queda fechada.
2. **Given** un ingreso con unidades vendidas o reservadas, **When** se intenta anular de modo que falten unidades o se pierdan vínculos de ventas, **Then** se rechaza y se explica el impedimento.
3. **Given** una devolución parcial de cliente, **When** se acepta, **Then** se revierte una sola vez el costo FIFO de sus unidades y se vincula el estado de reintegro a la venta original; al recibir las unidades, solo las aptas regresan al stock vendible y las dañadas quedan separadas.
4. **Given** una devolución parcial a proveedor, **When** se confirma, **Then** salen únicamente unidades disponibles del ingreso identificado, se ajusta el importe de compras y permanece visible la recepción original.
5. **Given** una devolución aceptada de dos unidades, **When** se registra un reintegro parcial y dos recepciones físicas clasificadas, **Then** cada importe y unidad se acumula sin exceder lo aceptado y solo las unidades aptas vuelven a stock vendible.
6. **Given** una orden pagada cuya mercadería ya salió, **When** se solicita la cancelación administrativa anterior, **Then** se indica usar el flujo de devolución y no se restituye stock por anticipado.
7. **Given** una venta de dos unidades a distinto costo, una ya devuelta con costo revertido, **When** se corrige el costo de la partida de ambas, **Then** la revisión actualiza el costo de la unidad aún vendida y la reversión de la devuelta sin reconocer nuevamente su costo ni cambiar sus partidas de origen.

---

### User Story 5 - Consultar y comparar historia (Priority: P2)

El administrador consulta desde un producto y desde la nueva sección la evolución nominal de ingresos, costos, precios publicados, ventas efectivas, devoluciones y margen por períodos, variantes y proveedores.

**Why this priority**: Apoya la preparación de una temporada con datos realizados y sus limitaciones visibles.

**Independent Test**: Comparar dos períodos con varias partidas y precios, filtrar por proveedor y verificar que una venta compartida se atribuya según el origen de cada unidad.

**Acceptance Scenarios**:

1. **Given** ingresos y ventas en meses distintos, **When** se consulta febrero, **Then** las compras se agrupan por recepción y las ventas por confirmación de pago, mostrando también fecha de compra.
2. **Given** una venta que consume unidades de dos proveedores, **When** se filtra por uno, **Then** aparecen únicamente unidades, costo e importe de venta atribuibles a sus unidades, sin duplicar la venta completa.
3. **Given** una venta con descuento que consume unidades de dos proveedores, **When** se filtra por cada proveedor, **Then** el importe efectivo se distribuye proporcionalmente al precio vendido por unidad y la suma de ambos filtros coincide con el importe efectivo de la venta.
4. **Given** varios costos o precios en el período, **When** se consulta el resumen, **Then** se muestran los valores y vigencias o una medida expresamente identificada; ningún valor aislado se presenta como representativo de todo el período.
5. **Given** un precio regular y uno promocional con vigencias distintas, **When** se consulta una fecha pasada, **Then** se identifica cuál estaba publicado y si había promoción vigente, sin cambiar el importe cobrado en ventas pasadas.
6. **Given** una devolución aceptada con reintegro pendiente, **When** se consulta el período, **Then** se muestran por separado el costo FIFO ya revertido, la obligación pendiente y el importe aún cobrado; al registrar el reintegro efectivo se actualizan el importe neto y el margen una sola vez por ese reintegro.
7. **Given** una consulta sin movimientos, **When** termina de cargar, **Then** se informa que no hay resultados para esos filtros; un error de consulta se informa por separado y permite reintentar sin perder el período ni los filtros.
8. **Given** una venta cobrada en enero por 100 con costo 60 y una devolución aceptada en febrero con reintegro efectivo de 100 en febrero, **When** se comparan ambos meses, **Then** enero conserva venta 100, costo 60 y margen 40; febrero muestra por separado reintegro -100 y reversión de costo +60, con efecto de margen -40; el acumulado queda en cero. Una consulta histórica de enero no se reescribe por los hechos de febrero.

### Edge Cases

- Un ingreso vacío, cantidades no enteras o no positivas, costo o gasto negativo, fecha de recepción anterior a compra, variante duplicada en la misma entrega o proveedor inactivo impiden confirmar y muestran el campo a corregir.
- Dos confirmaciones simultáneas del mismo ingreso producen una sola entrada de stock; dos operaciones concurrentes que usan la última unidad no pueden asignarla dos veces.
- Si varias partidas de la variante tienen la misma fecha de recepción, la prioridad FIFO se determina por el orden estable en que fueron confirmadas; las existencias iniciales sin fecha de adquisición preceden a todos los ingresos posteriores a la incorporación y mantienen un orden estable por incorporación.
- Una recepción registrada tardíamente, aunque su fecha de recepción sea anterior a ventas ya pagadas, no reasigna costos de esas ventas; sus unidades participan en el FIFO disponible desde su confirmación.
- Reservas anteriores al pago comprometen unidades de partidas concretas en FIFO; su liberación las devuelve a disponibilidad de su partida. Confirmar pago fija su costo histórico, aunque el stock físico se descuente después al consumir la reserva.
- La cancelación anterior al pago libera la asignación y no produce venta; si el pago ya fue confirmado, la cancelación registra reversión comercial separada y no devuelve unidades vendibles antes de recepción apta cuando hubo salida física.
- Una devolución parcial nunca puede exceder las unidades vendidas o compradas menos devoluciones previas; un reintento no duplica reversión ni stock.
- Aceptar una devolución revierte el costo de la venta original aunque aún no se haya efectuado el reintegro o recibido físicamente la prenda; la devolución posterior de dinero y la clasificación física se registran como hechos separados, sin repetir la reversión de costo.
- Si el costo de alguna unidad es desconocido, se muestran importe vendido y costo conocido parcial, con margen total indeterminado; filtros y comparaciones conservan esa marca.
- Los datos anteriores a la activación carecen de costos/precios históricos salvo evidencia incorporada expresamente; no se reconstruyen compras o vigencias por inferencia.
- En la incorporación inicial se vinculan las reservas vigentes a unidades del saldo físico de su variante, incluidas órdenes con pago ya confirmado cuyas unidades todavía no se consumieron físicamente. Las ventas ya pagadas antes de la activación se identifican como históricas sin reconstruir su costo ni margen.
- Un corte inicial interrumpido no duplica variantes ya incorporadas: cada variante se incorpora completa o no se incorpora. Una diferencia detiene el corte, conserva constancia de variantes completadas y pendientes, y exige conciliación antes de reanudar; la nueva política no se activa hasta que todas concilien.
- Antes de completar el corte, la confirmación de ingresos y la asignación FIFO solo admiten variantes nuevas creadas con stock físico cero y sin reservas previas. Las variantes heredadas se rechazan en esos flujos hasta quedar incorporadas y hasta que la política nueva se active tras conciliar todas las variantes; la aplicación debe verificar esta condición bajo el mismo bloqueo que usa para modificar stock o reservas.
- Las devoluciones, reintegros y recepciones parciales se limitan por los saldos pendientes de la devolución aceptada. Los reintentos no agregan importes ni unidades. Una unidad clasificada dañada no se vuelve vendible por un segundo registro de recepción.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Solo administradores autorizados pueden gestionar proveedores, ingresos, ajustes, correcciones, devoluciones e informes administrativos.
- **FR-002**: Permitir crear, editar, consultar, desactivar y reactivar proveedores con nombre, contacto y observaciones. La reactivación exige motivo y reutiliza la misma identidad sin alterar ingresos históricos; el historial muestra los períodos de actividad y los motivos de cambio. Un proveedor inactivo no admite ingresos nuevos mientras conserve ese estado.
- **FR-003**: Registrar únicamente entregas completas recibidas, con un proveedor, fechas de compra y recepción, una o más líneas de producto y variante, cantidad entera positiva, costo unitario no negativo, observaciones y referencia opcional de comprobante. La referencia es texto, sin archivos adjuntos.
- **FR-004**: Registrar gastos adicionales no negativos de compra por separado; mostrar suma de mercadería, gastos y total de desembolso sin prorratear gastos al costo unitario.
- **FR-005**: Antes de confirmar, mostrar un resumen verificable. Confirmar una entrega aumenta stock una sola vez, conserva su origen y permite reconocer reintentos sin duplicar efectos.
- **FR-006**: Permitir crear ficha de producto y variantes desde la carga de ingreso, usando el catálogo existente. Persistir en la ficha si fue creada desde Compras, con valor falso para fichas preexistentes; la ficha nueva nace sin stock y no publicada. Las unidades entran solo al confirmar el ingreso. Solo una ficha marcada como creada desde Compras requiere al menos un ingreso confirmado de cualquiera de sus variantes para poder publicarse manualmente desde Productos, además de las condiciones habituales del catálogo. Un ingreso anulado no habilita publicación por sí mismo.
- **FR-007**: Mantener Productos como lugar de identidad, descripción, imágenes, categorías, variantes, publicación y precio de venta; usar los mismos productos y variantes en Compras, sin duplicarlos.
- **FR-008**: La entrada habitual de unidades debe proceder de ingresos confirmados. La creación de una variante desde Productos debe comenzar con stock cero; todo cambio posterior de stock, incluida la desactivación de una variante con saldo, debe pasar por un ajuste trazable con motivo y sin invadir reservas. Una recepción no se contabiliza dos veces.
- **FR-009**: Incorporar cada saldo físico heredado una sola vez como existencia inicial sin variar el total físico; vincular sus reservas vigentes, incluidas las de órdenes pagadas aún no consumidas, a unidades de ese saldo sin duplicarlas ni dejarlas libres para otra asignación. Las variantes nuevas que ya tengan partidas conciliadas antes del corte quedan cubiertas sin generar otra existencia inicial. Permitir costo conocido o estado de costo desconocido y prohibir costo cero inferido. Identificar ventas pagadas antes de activar la función como históricas sin reconstruir costo o margen. Ante interrupción o discrepancia, conservar qué variantes se incorporaron y cuáles faltan, impedir duplicados al reanudar y activar la nueva política global de stock solo después de conciliar todas y comprobar que las rutas que modifican stock y reservas respeten las partidas.
- **FR-010**: Para FIFO por variante, asignar primero unidades disponibles de existencias iniciales y luego ingresos confirmados por fecha de recepción y orden estable de confirmación. Una recepción registrada tardíamente entra al FIFO disponible desde su confirmación y no reasigna costos de ventas ya pagadas. Conservar vínculo entre cada unidad asignada, ingreso o saldo inicial, proveedor cuando exista, y línea de venta.
- **FR-011**: La reserva de una orden compromete unidades concretas en FIFO sin crear venta. Liberar una reserva restituye su disponibilidad de origen; confirmar pago reconoce venta y fija la asignación de costo una vez; el consumo físico posterior no crea otra venta ni otro costo.
- **FR-012**: Reconocer unidades vendidas, importe efectivo y margen de mercadería en la fecha de confirmación del pago. Una orden creada o reservada no se contabiliza como venta; un pago reiterado tampoco la duplica.
- **FR-013**: Conservar el importe efectivo de mercadería por línea, incluidos descuentos, y calcular margen bruto como ese importe menos costo FIFO de las unidades. Mostrar costos de envío cobrados y gastos adicionales de compra por separado; no llamar ganancia neta al margen.
- **FR-014**: Conservar desde la activación el precio regular publicado y sus vigencias. Si existe un mecanismo vigente que publique un precio promocional, conservar también ese precio y su vigencia; consultar ambos en una fecha y preservar los importes de ventas anteriores. Cuando no exista promoción vigente, mostrarlo expresamente. Esta feature no crea ni activa promociones de venta.
- **FR-015**: Registrar ajustes positivos y negativos con fecha, motivo, cantidad y origen/costo conocido o desconocido. Respetar reservas y stock no negativo; mostrar cómo afectan unidades y procedencia de costos.
- **FR-016**: Conservar el ingreso original ante correcciones o anulaciones, registrando actor, fecha, motivo, valor anterior y nuevo. Corregir costos ya asignados recalcula el margen vigente de cada venta afectada y muestra la revisión; en informes por período, la diferencia se registra en la fecha de corrección sin sustituir el asiento original. Si alguna unidad ya fue devuelta y su costo revertido, ajustar también esa reversión sin reconocer nuevamente costo de venta ni cambiar el origen FIFO. Rechazar toda operación que deje stock negativo, borre vínculos de ventas o desatienda reservas.
- **FR-017**: Diferenciar error de carga de devolución real. La devolución a proveedor, incluso parcial, identifica el ingreso de origen, reduce unidades elegibles e importe de compra correspondiente sin eliminar la recepción histórica.
- **FR-018**: Registrar devoluciones parciales de cliente contra su venta original. El backend determina el importe debido por las unidades aceptadas a partir del importe efectivo de mercadería atribuido a esas unidades en la venta original, incluidos descuentos; cada unidad solo puede contribuir una vez y los centavos restantes se asignan por el orden FIFO estable. No aceptar un importe debido enviado por el cliente como autoridad. Al aceptar una devolución, revertir una sola vez el costo FIFO de sus unidades, aunque el reintegro y la recepción física sigan pendientes. Recibir y clasificar físicamente las unidades aptas o dañadas antes de que cualquier unidad vuelva a stock vendible. Registrar por separado el importe debido y el efectivamente reintegrado.
- **FR-019**: La cancelación antes de pago no genera venta ni margen. La cancelación pagada anterior a la salida física usa la misma reversión comercial que una devolución: revierte costo una vez y registra reintegro pendiente, efectivo o sin reintegro. Si las unidades siguen reservadas, la decisión de restituirlas libera la reserva sin aumentar stock físico; la decisión de no restituirlas registra su salida no vendible. Si las unidades ya salieron físicamente, la cancelación administrativa directa se rechaza y se exige una devolución; solo una recepción posterior apta devuelve stock vendible. El importe efectivo neto y el margen vuelven a actualizarse solo por cada reintegro efectivo; mientras está pendiente se muestra la obligación separada, y si no corresponde reintegro se conserva el importe cobrado y se explica el motivo. Ningún flujo duplica stock, importes o costos.
- **FR-020**: Ofrecer historial de compras y costos, precios publicados, ventas, asignaciones FIFO, ajustes, correcciones y devoluciones desde el producto y la nueva sección administrativa. En consultas administrativas, diferenciar carga en curso, resultado vacío, error recuperable y acceso denegado; un reintento conserva período y filtros.
- **FR-021**: Permitir filtrar y comparar períodos por producto, variante y proveedor. Agrupar ingresos por fecha de recepción y ventas por fecha de pago; registrar reversión de costo en el período de aceptación de la devolución, reintegro en el período de pago efectivo y diferencias de corrección en su fecha propia, sin reescribir cifras de períodos anteriores. El margen del período suma esos efectos fechados; el acumulado reconcilia con la venta original. Mostrar fecha de compra, unidades recibidas, importes de mercadería, gastos adicionales, unidades vendidas, importes efectivos, costo vendido, margen bruto, devoluciones y correcciones.
- **FR-022**: Al filtrar proveedor, atribuir cada unidad vendida y su costo a la partida de origen. Distribuir el importe efectivo de venta, incluidos descuentos, proporcionalmente al precio vendido por unidad de cada partida; redondear a centavos y asignar los centavos restantes a las partidas con mayor fracción descartada, desempatando por orden FIFO estable. La suma atribuida debe igualar el importe efectivo total. Mostrar aparte unidades de existencia inicial o ajuste sin proveedor conocido.
- **FR-023**: Distinguir compras, ventas, stock remanente y margen. Comparar importes nominales sin inflación ni proyecciones. Si hay costos desconocidos, mostrar la cobertura del costo y no un margen total completo.
- **FR-024**: Excluir pedidos pendientes de recepción, entregas parciales de una misma compra, cuentas corrientes, pagos a proveedores, contabilidad completa, ganancias netas, proyecciones y reconstrucción histórica sin evidencia.
- **FR-025**: Excluir la creación, edición y activación de promociones de venta; el historial registra las que ya existan y estén efectivamente publicadas a partir de la activación del historial.
- **FR-026**: En una devolución aceptada, permitir varios reintegros efectivos parciales hasta el importe debido y registrar el saldo pendiente; cada reintento es idempotente. Permitir cerrar el saldo como sin reintegro solo con motivo, conservando lo ya efectivamente reintegrado. Varias recepciones aptas o dañadas pueden sumar hasta la cantidad aceptada, nunca superarla ni clasificar dos veces una unidad.

### Key Entities *(include if feature involves data)*

- **Proveedor**: Identidad, contacto, observaciones, estado e ingresos históricos.
- **Ingreso recibido**: Entrega completa de un proveedor, fechas de compra/recepción, observaciones, comprobante textual, gastos adicionales, confirmación y correcciones.
- **Partida de ingreso**: Producto y variante compartidos con catálogo, cantidad, costo unitario, unidades remanentes y proveedor de origen.
- **Existencia inicial**: Saldo preexistente por variante, costo conocido o desconocido y prioridad FIFO convencional.
- **Asignación de unidades**: Vínculo trazable entre reserva/venta y partidas de origen, con cantidad y costo histórico.
- **Movimiento de inventario**: Ajuste, consumo o devolución con motivo, estado físico y efecto sobre disponibilidad.
- **Venta reconocida**: Orden pagada, líneas e importes efectivos, fecha, costo asignado, devoluciones y margen revisable.
- **Vigencia de precio**: Precio publicado y período a partir de la activación de la función.
- **Corrección/devolución**: Hecho posterior con fecha, motivo, actor, valores previos y nuevos, vínculo con origen y efecto informado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En 100% de los reintentos y confirmaciones concurrentes de una recepción de prueba, el stock aumenta una sola vez por cada unidad declarada.
- **SC-002**: En escenarios de una venta que cruza al menos dos partidas y dos proveedores, el 100% de las unidades tiene origen identificable y el costo total coincide con la suma FIFO de esas partidas.
- **SC-003**: En 100% de órdenes de prueba sin pago, ventas y margen permanecen en cero; una confirmación de pago repetida genera un único reconocimiento.
- **SC-004**: En 100% de ventas de prueba con costo desconocido parcial o total, el informe identifica las unidades sin costo y evita mostrar un margen total completo.
- **SC-005**: Con proveedor y diez variantes preparados, al menos 9 de 10 administradores de prueba completan fecha, diez líneas y gastos, y llegan al resumen revisable en menos de cinco minutos medidos desde abrir un ingreso nuevo hasta ver el resumen, sin incluir la confirmación.
- **SC-006**: En un conjunto de prueba de 1.000 productos y 10.000 movimientos repartidos en un año, al menos 19 de 20 consultas consecutivas con los tres filtros (producto, variante y proveedor) muestran el resumen global completo y la primera página de detalle en cinco segundos o menos, medidos desde aplicar filtros hasta que ambos quedan visibles. Las páginas posteriores se cargan a pedido y no entran en esa medición; registrar tiempos, parámetros, cantidad total de resultados y tamaño de página de cada consulta.
- **SC-007**: En 100% de correcciones de costo y devoluciones parciales de prueba, la vista conserva el hecho original, el motivo y el efecto exacto sobre unidades e importes.
- **SC-008**: Al menos 9 de 10 administradores de prueba, sin asistencia y ante el mismo resumen con compras y ventas en períodos distintos, identifican correctamente las cuatro cifras —importe comprado, importe vendido, unidades remanentes y margen bruto— en una hoja de cuatro respuestas; solo cuenta como acierto quien responde las cuatro sin confundir margen con ganancia neta.

## Assumptions

- Se reutilizan el acceso administrativo, los productos, variantes, órdenes y reservas existentes. La función requiere cambios futuros en los repositorios `backend/` y `frontend/`, sus contratos y la documentación `docs/estado-actual/`; el plan deberá identificar los archivos exactos. Esta etapa solo modifica `specs/003-compras-proveedores-costos/` y `.specify/feature.json` en el repositorio raíz.
- Los importes son nominales en la moneda actual del catálogo. Los costos unitarios pueden ser cero solo cuando sea un costo real conocido; desconocido se identifica de forma distinta.
- Las existencias iniciales de adquisición desconocida se colocan antes de nuevos ingresos en FIFO, sin atribuirles fecha de compra ni proveedor ficticios.
- No se presume que el sistema actual registre descuentos, promociones, devoluciones ni pagos externos automáticos; la implementación deberá conectar eventos reales verificados. Si no existe un mecanismo de promociones publicadas, el historial promocional permanecerá vacío hasta que exista uno autorizado por otra feature.

## Comportamiento actual verificado y dependencias

- `Producto` tiene precio actual y `TalleProducto` tiene stock físico, estado y combinación única de producto/talle/color (`backend/prisma/schema.prisma`). No existe historial de costos, precios ni proveedores en ese esquema.
- La disponibilidad actual resta reservas efectivas al stock físico. La reserva activa se libera o consume una vez; consumirla descuenta stock físico (`backend/src/services/inventario.js`).
- La confirmación administrativa de pago marca `pagoConfirmadoEn` y `pago_confirmado`; el consumo de reserva ocurre después, en envío o entrega para retiro. La cancelación administrativa pagada usa `restituirStock` y puede liberar reservas o incrementar stock físico (`backend/src/services/ordenes.js`). Estas transiciones aún no registran FIFO ni devoluciones parciales.
- El carrito conserva un precio copiado al añadir una variante; checkout valida el precio vigente y guarda líneas históricas. No se halló lógica de promociones o descuentos en la inspección de código y documentación realizada; su existencia fuera de las rutas inspeccionadas queda por verificar (`backend/src/routes/carrito.routes.js`, `backend/src/services/checkout.js`, `docs/estado-actual/08-deuda-y-riesgos.md`).
- Productos y variantes permiten hoy edición administrativa directa del stock; la variante impide reducirlo por debajo de reservas efectivas (`backend/src/routes/talle-producto.routes.js`). La futura restricción de entradas por ingreso requerirá revisar expresamente este flujo.
