# Feature Specification: Rol vendedor y venta en local

**Feature Branch**: `007-vendedor-venta-local`
**Created**: 2026-10-29
**Status**: Borrador para revisión; requiere aprobación antes de `plan`
**Input**: Nuevo rol vendedor con pantalla de venta para vender en el local físico desde la misma aplicación. Algunos productos se venden solo en el local, otros solo en la web y otros en ambos canales. Incluye caja diaria y la separación de las ventas por canal (web o local) y por medio de pago.

## Clarifications

### Session 2026-10-29

- Q: ¿Cómo se distingue un producto que se vende solo en el local de uno oculto? → A: Con una disponibilidad para el local independiente de la publicación web. Habrá productos disponibles solo en el local.
- Q: ¿Puede el vendedor aplicar descuentos o modificar precios? → A: No. Nunca se planteó esa opción; se cobra el precio vigente del producto.
- Q: ¿Cuántos medios de pago admite una venta? → A: Uno por venta, elegido en el momento. La pasarela de pagos la desarrolla otra persona en la feature 006; esta feature no la integra.
- Q: ¿Qué datos del cliente se piden? → A: Solo el DNI. Se entrega un comprobante interno, no una factura fiscal.
- Q: ¿El administrador también puede vender desde el punto de venta? → A: Sí.
- Q: ¿La caja diaria entra en esta feature? → A: Sí. Además, las ventas deben poder separarse por canal (web o local) y por medio de pago.
- Q: ¿Hay una caja única para el local o una por vendedor? → A: Una sola caja para el local.
- Q: ¿Cuántos vendedores opera el sistema y se registra quién hizo cada venta? → A: Un solo vendedor, que es el responsable de abrir y cerrar la caja. Las ventas no se separan ni se informan por persona.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar una venta en el local (Priority: P1)

Como vendedor, quiero buscar los productos disponibles en el local, armar la venta con talle, color y cantidad, pedir el DNI del cliente, elegir el medio de pago y confirmarla, para entregar la mercadería y un comprobante en el momento.

**Why this priority**: Es el objetivo central de la feature: vender en el local con el mismo stock que la tienda web.

**Independent Test**: Con una caja abierta, el vendedor arma una venta de dos variantes, ingresa un DNI válido, elige «efectivo» y confirma. Se verifica que el stock físico baja en las cantidades vendidas, que la venta queda registrada con canal local, caja, DNI y medio de pago, y que se muestra un comprobante numerado.

**Acceptance Scenarios**:

1. **Given** un producto activo disponible en el local y no publicado en la web, **When** el vendedor lo busca, **Then** aparece con sus variantes y el stock disponible de cada una.
2. **Given** un producto publicado solo en la web, **When** el vendedor lo busca, **Then** no aparece en el punto de venta.
3. **Given** una venta en curso con ítems válidos, DNI válido y medio de pago elegido, **When** el vendedor confirma, **Then** se registra la venta como pagada y entregada, el stock físico baja una sola vez y se muestra el comprobante.
4. **Given** una variante con 1 unidad disponible y otra reservada por una orden web vigente, **When** el vendedor intenta vender 2, **Then** se rechaza indicando la cantidad disponible.
5. **Given** que el vendedor confirma dos veces la misma venta (doble clic o reintento), **When** se procesan ambas solicitudes, **Then** existe una sola venta y ambas respuestas muestran el mismo comprobante.
6. **Given** que el precio de un producto cambió mientras se armaba la venta, **When** el vendedor confirma, **Then** se informa el precio vigente y se pide confirmar de nuevo con ese importe.
7. **Given** una venta sin DNI o con un DNI inválido, **When** el vendedor confirma, **Then** se rechaza y se indica el campo a corregir.

---

### User Story 2 - Abrir y cerrar la caja diaria (Priority: P1)

Como vendedor, quiero abrir la caja con el efectivo inicial y cerrarla al final del día comparando el efectivo esperado con el contado, para rendir cuentas de lo vendido por cada medio de pago.

**Why this priority**: Sin caja abierta no se puede vender, y el cierre permite controlar el efectivo del local.

**Independent Test**: Abrir una caja con $10.000. Registrar dos ventas en efectivo por $25.000 y una con débito por $40.000. Cerrar declarando $59.000 contados. El cierre debe mostrar efectivo esperado $60.000, diferencia −$1.000 y totales de $50.000 en efectivo y $40.000 en débito.

**Acceptance Scenarios**:

1. **Given** que no hay caja abierta, **When** el vendedor intenta confirmar una venta, **Then** se rechaza y se le pide abrir la caja.
2. **Given** que no hay caja abierta, **When** el vendedor la abre indicando el efectivo inicial, **Then** queda abierta con su fecha y hora.
3. **Given** una caja abierta con ventas, **When** el vendedor solicita el cierre, **Then** ve la cantidad de ventas, el total por medio de pago y el efectivo esperado (inicial más ventas en efectivo).
4. **Given** el resumen de cierre, **When** el vendedor declara el efectivo contado y confirma, **Then** la caja queda cerrada con el importe declarado, la diferencia y una observación opcional, y no admite más ventas.
5. **Given** una caja cerrada, **When** alguien intenta modificarla o reabrirla, **Then** se rechaza; para seguir vendiendo hay que abrir una caja nueva.

---

### User Story 3 - Gestionar el vendedor y la disponibilidad en el local (Priority: P1)

Como administrador, quiero habilitar o dar de baja la cuenta del vendedor e indicar qué productos se venden en el local, para controlar el acceso al punto de venta y qué se ofrece en cada canal.

**Why this priority**: Sin vendedor ni productos disponibles en el local no se puede usar el punto de venta.

**Independent Test**: El administrador habilita a un usuario como vendedor y marca un producto como «solo local» (disponible en el local y no publicado en la web). Se verifica que el vendedor ingresa al punto de venta y ve ese producto, que la tienda web no lo muestra y que el vendedor recibe un rechazo al intentar entrar a la administración.

**Acceptance Scenarios**:

1. **Given** un usuario existente, **When** el administrador le asigna el rol vendedor, **Then** al iniciar sesión entra al punto de venta.
2. **Given** que ya existe un vendedor activo, **When** el administrador intenta asignar el rol vendedor a otro usuario, **Then** se rechaza indicando que primero debe dar de baja o quitar el rol al vendedor actual.
3. **Given** un vendedor dado de baja (lógica), **When** intenta iniciar sesión o seguir operando, **Then** se le niega el acceso.
4. **Given** el vendedor autenticado, **When** intenta acceder a la administración, al checkout web o a costos y márgenes, **Then** se le niega el acceso.
5. **Given** un producto, **When** el administrador cambia su disponibilidad en el local, **Then** el cambio se refleja en el punto de venta sin alterar su publicación web, y viceversa.
6. **Given** los productos existentes antes de esta feature, **When** se habilita la disponibilidad por canal, **Then** todos quedan disponibles en el local y conservan su publicación web.

---

### User Story 4 - Separar las ventas por canal y medio de pago (Priority: P2)

Como administrador, quiero ver las ventas separadas por canal (web o local) y por medio de pago, con filtros por fecha, para conocer el origen de los ingresos y conciliarlos.

**Why this priority**: Es un requisito explícito del negocio, pero depende de que existan ventas en el local (US1).

**Independent Test**: Con ventas web pagadas y ventas en el local con distintos medios en el mismo período, el administrador consulta el período y ve subtotales por canal y por medio cuya suma coincide con el total del período.

**Acceptance Scenarios**:

1. **Given** ventas web y locales en un período, **When** el administrador consulta ese período, **Then** ve el total y la cantidad de ventas por canal y, dentro de cada canal, por medio de pago.
2. **Given** el listado de ventas, **When** el administrador filtra por canal local y un medio de pago, **Then** ve solo esas ventas, con número de comprobante, fecha, DNI, medio y total.
3. **Given** los informes existentes de ventas, costo y margen, **When** se consultan, **Then** permiten distinguir lo vendido en la web de lo vendido en el local.
4. **Given** el historial de cajas, **When** el administrador lo consulta, **Then** ve cada caja con su apertura, cierre, totales por medio, efectivo esperado, efectivo declarado y diferencia.

---

### User Story 5 - Consultar las ventas del local y reimprimir un comprobante (Priority: P3)

Como vendedor, quiero ver las ventas del local de la caja actual y de días anteriores y volver a imprimir un comprobante, para responder consultas de clientes.

**Why this priority**: Mejora la atención, pero la venta funciona sin esta consulta.

**Independent Test**: Tras registrar tres ventas, el vendedor abre su historial, encuentra una por número de comprobante o DNI y reimprime el comprobante con los mismos datos.

**Acceptance Scenarios**:

1. **Given** ventas registradas en el local, **When** el vendedor consulta el historial, **Then** ve las ventas del canal local, de la más reciente a la más antigua, y no ve las ventas web.
2. **Given** una venta del local, **When** pide el comprobante, **Then** obtiene el mismo número, ítems, importes, medio y DNI que al confirmar.

---

### Edge Cases

- Un cliente web y el vendedor compiten por la última unidad: solo una operación la obtiene; la otra recibe un rechazo por stock sin dejar datos parciales.
- Un producto se desactiva o deja de estar disponible en el local mientras está en una venta en curso: la confirmación se rechaza indicando el ítem afectado, sin quitarlo automáticamente.
- El inventario está suspendido (por ejemplo, durante un corte): no se pueden confirmar ventas en el local.
- Se agrega un producto solo local al carrito web (por ejemplo, con un enlace directo): la tienda web lo sigue rechazando como no publicado.
- El vendedor es dado de baja con una caja abierta: el administrador puede cerrarla declarando el efectivo contado.
- Se pide abrir la caja dos veces (doble clic o reintento): solo se abre una; la segunda solicitud recibe la caja ya abierta.
- Una venta se confirma mientras se cierra la caja (por ejemplo, desde dos pestañas): la venta queda dentro de la caja que se cierra o se rechaza por caja cerrada; nunca queda fuera de una caja.
- La caja queda abierta de un día para otro: sigue siendo válida hasta su cierre y el resumen informa la fecha de apertura.
- Un ítem con cantidad cero, negativa o no entera: se rechaza.
- La venta en curso queda vacía: no se puede confirmar.
- Una devolución de una venta del local cuya caja ya cerró: el arqueo cerrado no se modifica; el reintegro se registra con su propia fecha.
- Una venta incluye un producto improvisado heredado: el punto de venta no lo admite.

## Requirements *(mandatory)*

### Functional Requirements

**Roles y acceso**

- **FR-001**: El sistema DEBE admitir un rol «vendedor» con una única cuenta activa a la vez. Solo un administrador puede asignarlo, quitarlo o dar de baja al vendedor, y la baja es lógica. Asignar el rol mientras otro vendedor sigue activo DEBE rechazarse. No existe autorregistro como vendedor.
- **FR-002**: El vendedor DEBE acceder únicamente al punto de venta, a la caja y al historial de ventas del local. NO DEBE acceder a la administración, al checkout web ni a datos de costos, márgenes, compras o proveedores.
- **FR-003**: Un administrador DEBE poder vender desde el punto de venta con las mismas reglas que el vendedor, siempre dentro de la caja abierta.
- **FR-004**: Toda operación del punto de venta DEBE verificar en el momento que el rol y el estado activo del usuario siguen vigentes.

**Disponibilidad por canal**

- **FR-005**: Cada producto DEBE tener una disponibilidad para el local independiente de su publicación web, de modo que pueda venderse en ambos canales, solo en la web, solo en el local o en ninguno.
- **FR-006**: Los productos existentes al habilitar la feature DEBEN quedar disponibles en el local y conservar sin cambios su publicación web.
- **FR-007**: El punto de venta DEBE ofrecer solo productos activos y disponibles en el local, incluidos los no publicados en la web, y solo variantes activas con stock disponible.
- **FR-008**: La tienda web DEBE seguir aplicando su regla actual de publicación. Un producto solo local NO DEBE mostrarse ni comprarse en la web.
- **FR-009**: El administrador DEBE poder marcar y filtrar los productos por disponibilidad en el local desde la gestión de productos.

**Venta en el local**

- **FR-010**: El vendedor DEBE poder buscar productos por nombre o identificador, elegir variante y cantidad, y modificar o quitar ítems de la venta en curso. La venta en curso DEBE conservarse si se recarga la pantalla.
- **FR-011**: El stock es único para ambos canales. Una venta en el local NO DEBE superar el stock disponible, que ya descuenta las reservas web vigentes, y DEBE resolver la concurrencia con la web sin vender de más.
- **FR-012**: El importe de cada ítem DEBE ser el precio vigente del producto, calculado por el sistema. No se admiten descuentos ni precios ingresados por el vendedor. Si el precio cambió desde que se armó la venta, DEBE mostrarse el importe vigente y pedirse una nueva confirmación.
- **FR-013**: Cada venta DEBE registrar el DNI del cliente, que es obligatorio, se guarda solo con dígitos y tiene 7 u 8 dígitos. No se exigen otros datos del cliente.
- **FR-014**: Cada venta DEBE tener exactamente un medio de pago: efectivo, transferencia, tarjeta de débito o tarjeta de crédito. El sistema registra el medio elegido sin procesar el cobro.
- **FR-015**: Al confirmar, en una sola operación indivisible, el sistema DEBE registrar la venta como pagada y entregada con canal local, caja, DNI y medio de pago; descontar el stock físico una sola vez; y fijar el costo de las unidades según el método FIFO vigente. Si algo falla, no DEBE quedar ningún efecto parcial.
- **FR-016**: Repetir la confirmación de la misma venta DEBE devolver la venta ya registrada sin duplicarla.
- **FR-017**: La confirmación DEBE rechazarse indicando cada ítem y su motivo cuando haya: venta vacía, cantidades inválidas, producto inactivo o no disponible en el local, variante inactiva, stock insuficiente, producto improvisado, inventario suspendido, caja no abierta, DNI inválido o medio de pago ausente.
- **FR-018**: Cada venta confirmada DEBE generar un comprobante interno con numeración correlativa propia. El comprobante incluye número, fecha y hora, DNI, ítems (producto, talle, color, cantidad, precio unitario e importe), total y medio de pago. DEBE poder imprimirse y reimprimirse con los mismos datos, e indicar que no es un comprobante fiscal.
- **FR-019**: El vendedor NO DEBE poder anular ni modificar una venta confirmada. Solo el administrador puede gestionar su devolución con motivo, mediante el flujo de devoluciones existente.

**Caja diaria**

- **FR-020**: Para confirmar una venta en el local DEBE existir una caja abierta. Hay una única caja del local y solo puede estar abierta una a la vez; abrir otra mientras sigue abierta DEBE rechazarse. El vendedor es el responsable de abrirla y cerrarla. Al abrirla se registra el efectivo inicial (cero o mayor) y la fecha y hora.
- **FR-021**: Cada venta en el local DEBE quedar asociada a la caja abierta en el momento de confirmarla.
- **FR-022**: El resumen de cierre DEBE mostrar la cantidad de ventas, el total por medio de pago, el total general y el efectivo esperado (efectivo inicial más ventas en efectivo).
- **FR-023**: Al cerrar, el vendedor DEBE declarar el efectivo contado. El sistema registra el importe declarado, la diferencia con el esperado, una observación opcional y la fecha y hora. Una caja cerrada no admite ventas, cambios ni reapertura.
- **FR-024**: El administrador DEBE poder consultar el historial de cajas y, solo como respaldo (por ejemplo, si el vendedor fue dado de baja), cerrar una caja que quedó abierta declarando el efectivo contado.
- **FR-025**: Las devoluciones posteriores al cierre NO DEBEN modificar los importes de una caja cerrada.

**Separación de ventas por canal y medio**

- **FR-026**: Toda venta DEBE identificar su canal (web o local) y su medio de pago. Las ventas web existentes se consideran del canal web.
- **FR-027**: El administrador DEBE poder listar las ventas filtrando por canal, medio de pago y rango de fechas, y obtener para un período el total y la cantidad por canal y por medio. La suma de los subtotales DEBE coincidir con el total del período.
- **FR-028**: Los informes existentes de ventas, costo y margen DEBEN poder separarse por canal. Una venta en el local cuenta en la fecha y hora de su confirmación.
- **FR-029**: El flujo de órdenes web (reserva, vencimiento, pago, preparación y entrega) NO DEBE cambiar de comportamiento por esta feature.
- **FR-030**: Las ventas del local NO se separan ni se informan por persona. La auditoría técnica puede conservar el usuario que ejecutó cada operación, sin exponerlo como filtro ni informe.

### Key Entities *(include if feature involves data)*

- **Vendedor**: única cuenta activa con rol vendedor, que puede darse de baja lógicamente. Registra ventas y es responsable de abrir y cerrar la caja.
- **Disponibilidad por canal**: atributo de cada producto que indica si se vende en el local, independiente de su publicación web.
- **Venta en el local**: venta del canal local, pagada y entregada al confirmarse. Tiene caja, DNI, medio de pago, líneas con instantánea del producto, precio e importe, total y comprobante. Comparte con las órdenes web el stock, el costo FIFO, las devoluciones y los informes.
- **Comprobante interno**: número correlativo e imprimible asociado a una venta del local. No tiene validez fiscal.
- **Caja**: período de operación de la única caja del local, con apertura (fecha y efectivo inicial), ventas asociadas y cierre (fecha, efectivo esperado, efectivo declarado, diferencia y observación). Su estado es abierta o cerrada.
- **Medio de pago**: efectivo, transferencia, débito o crédito en el local. En la web corresponde al que defina el flujo de pago vigente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un vendedor completa una venta de tres ítems, incluidos el DNI y el medio de pago, en menos de 90 segundos desde que empieza la búsqueda.
- **SC-002**: En pruebas de concurrencia entre la web y el local sobre la última unidad disponible, nunca se vende más que el stock disponible (0 casos de sobreventa).
- **SC-003**: Las confirmaciones repetidas de una misma venta producen exactamente una venta y un comprobante en el 100 % de los casos.
- **SC-004**: Para cualquier período, los totales por canal y por medio de pago suman exactamente el total de ventas del período, al centavo.
- **SC-005**: En el cierre de caja, el efectivo esperado coincide al centavo con el efectivo inicial más las ventas en efectivo de esa caja.
- **SC-006**: El 100 % de los intentos del vendedor de entrar a la administración, al checkout web o a datos de costos son rechazados.
- **SC-007**: Ningún producto solo local aparece en la tienda web, y ningún producto solo web aparece en el punto de venta.

## Assumptions

- Hay un único local físico, una única caja y un único vendedor. Varias sucursales, varias cajas, varios vendedores y los informes por vendedor quedan fuera de alcance.
- El comprobante es interno. La facturación electrónica (AFIP/ARCA) queda fuera de alcance.
- El DNI no se vincula con cuentas de clientes web ni se envía por correo. El comprobante no se envía por email en esta fase.
- Los cobros con tarjeta o transferencia se hacen fuera del sistema (posnet, home banking) y el vendedor solo registra el medio. La integración con la pasarela de pagos de la feature 006 queda fuera de alcance. Si la 006 define medios para la web, el listado por medio los usa.
- Los pagos mixtos (dos medios en una venta), los descuentos, las devoluciones hechas por el vendedor, el lector de código de barras y los retiros o ingresos de efectivo durante la caja quedan fuera de alcance.
- El punto de venta se usa en un navegador de escritorio o tablet con conexión. No hay modo sin conexión.
- Se reutilizan el stock disponible, el bloqueo de variantes, la asignación FIFO, las devoluciones y los informes existentes. La venta en el local se suma a esos procesos sin crear un circuito paralelo.
- Los modelos heredados `Venta` y `ProductoImprovisado` no se usan en esta feature.

## Dependencias y coordinación

- **Feature 006 (pasarela de pagos, en desarrollo y sin publicar)**: puede modificar el registro de pagos y el medio de pago de las órdenes. El plan DEBE revisar esos cambios antes de definir el esquema y rebasar la 007 sobre la 006 antes de integrar, para evitar migraciones en conflicto.
- **Constitution VII**: esta spec cambia esquema, autorización y el cálculo de importes de venta, por lo que la spec y el plan requieren revisión explícita antes de implementar.

## Repositorios y archivos previstos

Lista preliminar; el plan la actualiza.

- **backend/**: `prisma/schema.prisma` y una migración nueva (disponibilidad local, canal, DNI, medio de pago, caja y numeración de comprobantes); `src/middleware/` (nuevo `es-vendedor.js`); `src/utils/visibilidad-producto.js`; `src/services/` (servicio nuevo de venta local y caja; extracción de la lógica común de `checkout.js`; `informes.js`; `ordenes.js`); `src/routes/` (rutas nuevas del punto de venta y la caja; `productos.routes.js`, `usuarios.routes.js`, `admin-ordenes.routes.js`, `admin-informes.routes.js`); `src/index.js`; `test/` (pruebas nuevas de venta local, caja y concurrencia).
- **frontend/**: `src/app/vendedor/` (punto de venta, caja e historial); `src/app/api/vendedor/` (BFF); `src/lib/autorizacion.ts`, `src/lib/api.ts`; `src/components/` (componentes nuevos del punto de venta y la caja; `AdminProductos.tsx`, `AdminClientes.tsx`, `AdminOrdenes.tsx`, `AdminInformes.tsx`, `Header.tsx`, `AuthForm.tsx`); `src/types/` (tipos de venta local, caja y comprobante).
- **PandoSDD/**: `specs/007-vendedor-venta-local/` y `docs/estado-actual/` (modelo de datos, API, frontend, autorización y flujos de negocio).
