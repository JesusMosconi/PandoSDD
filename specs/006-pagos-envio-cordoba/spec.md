# Feature Specification: Pagos en línea y envío en Córdoba Capital

**Feature Branch**: `codex/006-pagos-envio-cordoba`

**Created**: 2026-10-27

**Status**: Draft

**Input**: Tesis: demostrar el flujo completo de pago con tarjetas de prueba de Mercado Pago, sin ventas, cargos ni comisiones reales; ofrecer envío simulado por $15.000 únicamente dentro de Córdoba Capital y retiro sin envío. El cliente debe conocer el total completo antes de confirmar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conocer el total antes de comprar (Priority: P1)

Como cliente, quiero elegir retiro o envío y conocer el importe final para decidir si continúo con la compra.

**Why this priority**: Un total incompleto impide cobrar de forma confiable y genera sorpresas para el cliente.

**Independent Test**: Preparar un carrito válido y comparar los totales de retiro, envío dentro de Capital y dirección fuera de cobertura.

**Acceptance Scenarios**:

1. **Given** un carrito con subtotal de $40.000, **When** el cliente elige retiro, **Then** ve envío no aplicable y total de $40.000.
2. **Given** el mismo carrito, **When** elige un domicilio cubierto en Córdoba Capital, **Then** ve envío de $15.000 y total de $55.000 antes de confirmar.
3. **Given** un domicilio fuera de Córdoba Capital, **When** solicita envío, **Then** se informa que no hay cobertura y no puede crear la orden con envío.
4. **Given** un total mostrado, **When** el precio, el carrito o los datos de entrega cambian antes de confirmar, **Then** se solicita aceptar el nuevo resumen y nunca se cobra un importe anterior sin aviso.

---

### User Story 2 - Pagar la orden (Priority: P1)

Como cliente, quiero pagar con tarjeta o con los medios habilitados de Mercado Pago y ver el resultado de mi orden.

**Why this priority**: Es el recorrido principal que se demostrará en la tesis.

**Independent Test**: Crear una orden de prueba de retiro y otra con envío, completar pagos de prueba y comprobar el importe y el estado visible de cada orden.

**Acceptance Scenarios**:

1. **Given** una orden pendiente vigente, **When** inicia el pago, **Then** el importe a pagar coincide exactamente con el total persistido de esa orden.
2. **Given** un pago acreditado y verificado, **When** se actualiza la orden, **Then** pasa una sola vez a pago confirmado, conserva la reserva y muestra la acreditación al cliente y a administración.
3. **Given** un pago rechazado o abandonado, **When** el cliente vuelve a su orden vigente, **Then** puede reintentar sin crear otra compra ni duplicar el cobro.
4. **Given** un pago todavía pendiente de acreditación, **When** el cliente consulta su orden, **Then** ve que sigue pendiente y no se le promete entrega ni pago confirmado.

---

### User Story 3 - Resolver excepciones de pago y entrega (Priority: P2)

Como administrador, quiero identificar pagos tardíos, cancelaciones y reintegros pendientes para resolverlos sin perder el rastro del dinero ni del stock.

**Why this priority**: Evita pedidos pagados sin stock reservado y devoluciones de dinero invisibles.

**Independent Test**: Simular vencimiento, pago tardío y cancelación de una orden pagada; verificar estados, reserva e importe a reintegrar.

**Acceptance Scenarios**:

1. **Given** una orden vencida o cancelada, **When** llega una acreditación tardía, **Then** no se reactiva ni se confirma automáticamente; administración ve el cobro y la necesidad de resolverlo o reintegrarlo.
2. **Given** una orden pagada que se cancela antes de la salida física, **When** administración confirma la cancelación, **Then** queda visible el reintegro pendiente por el importe efectivamente cobrado, incluido el envío cuando corresponda.
3. **Given** dos comprobaciones del mismo pago o resultados recibidos fuera de orden, **When** se procesan, **Then** la orden, el stock y el historial cambian como máximo una vez por transición válida.
4. **Given** un envío online pagado, **When** administración intenta marcarlo `enviada` sin revisar el domicilio, **Then** la transición se rechaza; al registrar la revisión con actor y fecha puede continuar.

### Edge Cases

- Un código postal de formato válido no prueba cobertura. El comprador debe seleccionar expresamente Córdoba Capital y administración revisar la dirección; “Córdoba” sin Capital no basta.
- Una dirección ambigua o que no pueda clasificarse con certeza no se acepta para envío automático; el cliente puede elegir retiro.
- El cliente cierra la página de pago, vuelve antes de la conciliación o manipula el resultado de regreso: la orden solo cambia tras verificar la acreditación.
- El proveedor no responde al iniciar un pago: la orden conserva su importe y estado; el reintento no crea cobros duplicados.
- La misma orden recibe varios intentos, pero solo uno puede justificar la transición a pagada; cualquier acreditación adicional se señala para resolución.
- Una comprobación se repite, llega tarde, corresponde a otra orden o informa otro importe: no confirma una orden incorrecta.
- La reserva llega a su vencimiento mientras el pago está pendiente o se acredita: no se promete stock que ya se liberó; el cobro tardío exige resolución administrativa.
- Un cambio posterior de la tarifa de envío no altera órdenes ya creadas.
- Una orden pendiente se cancela mientras tiene un intento externo abierto: se intenta cerrar el intento externo, pero la cancelación local no depende de la disponibilidad del proveedor; cualquier cobro posterior queda como incidencia y reintegro pendiente.
- El proveedor acredita antes del vencimiento, pero el reconocimiento local de la venta falla: el cobro queda identificado como incidencia para reintento controlado o reintegro; nunca se comunica una venta confirmada sin haberla registrado.
- En una devolución parcial posterior a la salida física, los productos conservan su flujo de devoluciones; una eventual devolución del cargo de envío se decide y registra expresamente con motivo. El mismo dinero no se registra dos veces.
- Órdenes anteriores con envío sin cotizar o pago manual conservan su interpretación histórica; no se convierten retroactivamente en pagos digitales.
- Se comprueban centavos exactos, cantidades agrupadas, falta de stock y cancelaciones concurrentes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El comprador puede elegir retiro o envío. El envío de esta entrega se ofrece al seleccionar expresamente Córdoba Capital; el resto de la provincia y otras jurisdicciones se rechazan. El código postal se guarda como dato de dirección, sin clasificar cobertura. Administración revisa la calle y altura antes del despacho simulado.
- **FR-002**: Para envío cubierto, la tarifa es exactamente ARS 15.000 por orden, con independencia de la cantidad de artículos. Retiro no tiene costo de envío.
- **FR-003**: Antes de confirmar, el cliente ve subtotal de productos, costo de envío aplicable y total final. Una orden nueva guarda esos importes como valores históricos; el total equivale a la suma exacta del subtotal y el envío.
- **FR-004**: La cobertura exige localidad normalizada Córdoba Capital, declarada por el comprador; no se afirma una comprobación geográfica automática. Otra localidad se rechaza para envío con un mensaje que permite corregirla o elegir retiro. Administración registra actor y fecha de la revisión de calle/altura antes de marcar `enviada` una orden online. El código postal conserva validación de formato, sin lista positiva de códigos.
- **FR-005**: El cliente debe aceptar un resumen vigente. Si cambian precio, disponibilidad, entrega o cobertura, no se crea ni cobra la orden con el resumen anterior.
- **FR-006**: Una orden de esta entrega nace pendiente de pago con una única reserva efectiva y un vencimiento conocido. El cliente puede iniciar o reintentar el pago mientras siga vigente.
- **FR-007**: Los medios ofrecidos son tarjeta de crédito, tarjeta de débito y los medios de Mercado Pago habilitados para el comercio. El cliente completa los datos de pago en el entorno del proveedor; PandoCBA no almacena datos de tarjeta.
- **FR-008**: Cada intento de pago se vincula inequívocamente a una orden y solicita exactamente el total histórico de esa orden. El importe no se toma del navegador.
- **FR-009**: Reintentos de una misma acción no generan dos órdenes ni dos cobros. Los intentos de pago, sus identificadores externos y sus resultados quedan consultables por administración sin exponer credenciales ni datos de tarjeta.
- **FR-010**: El regreso del navegador desde el proveedor no acredita por sí mismo la orden. Una acreditación solo se acepta tras comprobar identidad de la operación, orden, importe, moneda y estado con el proveedor.
- **FR-011**: Las consultas o comprobaciones repetidas y los resultados externos fuera de orden no duplican transición, venta, reserva, evento, correo ni movimiento de stock. Un resultado inválido no cambia datos.
- **FR-012**: Un pago rechazado, abandonado o pendiente no cambia la orden a pagada. La interfaz distingue esos resultados y permite reintentar mientras la orden esté vigente.
- **FR-013**: El plazo de pago ofrecido nunca puede extenderse más allá del vencimiento de la reserva. Al alcanzar `venceEn`, la reserva deja de contar para disponibilidad y la orden sigue la cancelación actual aun si el proveedor no responde; se registra el resultado incierto para conciliación posterior. Una acreditación conocida después del vencimiento no reactiva esa reserva.
- **FR-014**: Una acreditación recibida después de que la orden perdió su reserva no reactiva la orden ni consume stock; se registra como incidencia visible para administración y se identifica el importe a resolver o reintegrar.
- **FR-015**: Una orden online pagada y cancelada antes de la salida física conserva el importe efectivamente cobrado y muestra obligaciones de reintegro por productos y envío sin duplicarlas. Después de la salida física se usa el flujo de devoluciones de productos; cualquier reintegro del envío exige decisión administrativa expresa con motivo. Ningún reintegro de productos o envío se muestra completado sin comprobarlo en el proveedor o registrar una constancia externa examinada por administración. En esta demostración sin movimiento monetario, el registro de productos requiere una constancia `SIM-` ingresada y declaración expresa de examen por administración; la obligación de envío o cobro sin venta se cierra con una constancia interna generada y comprobada por el sistema. Ambos resultados se rotulan expresamente como simulación y no acreditan una devolución monetaria. Las órdenes manuales heredadas conservan su registro anterior.
- **FR-016**: Para órdenes nuevas pagadas íntegramente en línea, administración ve el pago confirmado y el importe de envío cobrado. El despacho exige revisión registrada del domicilio, no la constancia heredada de coordinación externa del cobro. Las órdenes heredadas conservan su regla anterior.
- **FR-017**: El cliente y administración pueden consultar el estado actual de la orden y un historial suficiente para explicar pago, rechazo, vencimiento, cancelación e incidencias.
- **FR-018**: La confirmación manual de pago existente no puede confirmar por segunda vez una orden con pago en línea ni eludir las verificaciones de importe y vencimiento.
- **FR-019**: Esta entrega funciona exclusivamente con credenciales de prueba de Mercado Pago y datos ficticios en un entorno aislado. Las credenciales de producción se rechazan por configuración; no existe activación de cobros reales en esta feature. Con la función de demostración deshabilitada, el checkout existente conserva su comportamiento manual.
- **FR-020**: La cancelación local de una orden con intento externo abierto no espera una respuesta del proveedor; se intenta cancelar el pago externo y cualquier acreditación posterior se registra como incidencia con reintegro pendiente.
- **FR-021**: Si una acreditación válida no puede convertirse en venta por un fallo local o de inventario, se registra una incidencia persistente con el importe cobrado y se reintenta de forma controlada mientras la reserva sea válida; si ya no puede completarse, queda un reintegro pendiente. El cliente y administración no ven la orden como pagada antes de registrar la venta.
- **FR-022**: Toda orden, pago, incidencia y reintegro de esta feature se identifica como simulación en cliente y administración. No se ejecutan envíos físicos, devoluciones de dinero ni correos a clientes reales; los datos y destinatarios de demostración son ficticios.

### Key Entities

- **Orden**: compra con dueño, entrega, subtotal, costo de envío, total, vencimiento, reserva y estado.
- **Datos de envío**: dirección, localidad, código postal y contacto; permite evaluar cobertura y coordinar entrega.
- **Intento de pago**: operación iniciada para una orden con importe, moneda, identificador externo, estado e historial de resultados.
- **Incidencia de pago**: acreditación o inconsistencia que no puede aplicarse automáticamente a una orden; registra su resolución pendiente o final.
- **Reintegro**: obligación y eventual constancia de devolución de dinero por productos, envío o incidencia; se presenta un saldo único sin duplicar lo registrado en devoluciones de mercadería.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el 100 % de los escenarios de retiro y envío cubierto, el cliente ve el total exacto antes de confirmar y el importe solicitado al pagar coincide con el total guardado.
- **SC-002**: En el 100 % de las pruebas con otra localidad declarada, no se crea una orden con envío; un código postal de formato válido no decide cobertura. El despacho online requiere constancia de revisión de calle/altura.
- **SC-003**: En el 100 % de las pruebas con pago aprobado, rechazado y pendiente, el estado de la orden representa el resultado comprobado.
- **SC-004**: En pruebas de doble clic, reintentos y comprobaciones repetidas, se observa una orden y como máximo un cobro aplicado y una transición a pagada por compra; cualquier segundo cobro externo se detecta como incidencia y no se oculta.
- **SC-005**: En el 100 % de los pagos tardíos simulados, no se reactiva una reserva liberada y queda visible la incidencia para administración.
- **SC-006**: Un cliente puede identificar si pagó, si debe reintentar o si su pago está pendiente en no más de dos consultas de su orden.
- **SC-007**: Se demuestra la compra simulada completa de retiro y de envío, junto con cancelación y reintegro simulado pendiente, sin transacciones reales.
- **SC-008**: En el 100 % de las cancelaciones online pagadas antes de la salida física, el saldo a reintegrar incluye productos y envío cobrados exactamente una vez; una devolución parcial posterior conserva el flujo de productos y requiere decisión expresa para el envío.

## Assumptions

- Se utiliza una aplicación de Mercado Pago con credenciales de prueba y tarjetas de prueba. No se requieren credenciales de producción ni se habilitan cuotas comerciales o cobros reales en esta feature.
- La tarifa de ARS 15.000 es una decisión comercial vigente para esta entrega. Su cambio futuro aplica solo a órdenes nuevas.
- Decisión del usuario del 2026-10-29: selección expresa de Córdoba Capital y revisión administrativa obligatoria de la dirección antes del despacho simulado. El código postal no determina la cobertura ni se promete validación geográfica automática.
- El plazo actual de reserva de 24 horas se conserva, pero la disponibilidad del pago se ajusta para no superarlo.
- Los reintegros efectivos pueden requerir una acción administrativa en la primera entrega; el sistema debe registrar con precisión el importe y su estado, y no presentarlos como terminados antes de confirmarlo.
- La entrega usa consultas periódicas al proveedor, no un webhook público. El trabajo programado de prueba debe estar activo y supervisado durante la demostración.
- Las órdenes de demostración deben identificarse visiblemente como simuladas y no pueden disparar despacho físico, reintegros monetarios reales ni comunicaciones a clientes reales.
- Se reutiliza la autenticación de clientes y la administración existentes. Las órdenes y pagos históricos no se reinterpretan.

## Scope & Repositories

- **Raíz**: esta spec y sus checklists; al implementarse, documentación de flujos y modelo en `docs/estado-actual/`.
- **Backend**: `backend/prisma/schema.prisma`, una migración nueva, checkout, órdenes, reserva/inventario, vencimiento, rutas de pagos, conciliador y pruebas de esos flujos.
- **Frontend**: previsiblemente resumen de carrito/checkout, vista de órdenes, rutas BFF y contratos en `frontend/src/types/`. La lista exacta se cerrará en el plan.
