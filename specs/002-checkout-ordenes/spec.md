# Feature Specification: Checkout y órdenes

**Feature Branch**: `002-checkout-ordenes` (rama actual en los tres repositorios)
**Created**: 2026-10-11
**Status**: Aprobada para implementación local el 2026-10-11; migración y escrituras externas requieren autorización específica
**Input**: Primera entrega de checkout web, historial, pago manual y gestión de órdenes.

## Clarifications

### Session 2026-10-11

- Q: Si una orden es para envío y el costo sigue «a coordinar», ¿qué debe significar confirmar manualmente el pago? → A: Confirmar solo el pago del subtotal de productos; el envío sigue sin cotizar ni cobrar.
- Q: Cuando administración cancela una orden que ya figura como pagada, ¿cómo debe tratarse el stock? → A: Administración elige si restituir el stock al cancelar y debe registrar el motivo.
- Q: Si administración cancela una orden cuyo pago ya confirmó, ¿qué debe registrar esta primera entrega sobre la devolución del dinero? → A: Mostrar «devolución pendiente de gestionar»; la devolución se realiza fuera del sitio.
- Q: Para una orden con envío, ¿puede administración marcarla como «enviada» mientras el costo de envío siga «a coordinar»? → B: Solo si administración registra que el costo y su cobro se coordinaron fuera del sitio.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Confirmar compra (Priority: P1)

Como cliente autenticado, quiero revisar mi carrito, elegir retiro o envío y confirmar una orden con precios vigentes.

**Why this priority**: Es el flujo principal y evita prometer importes o disponibilidad incorrectos.

**Independent Test**: Confirmar un carrito válido con cada modalidad y verificar resumen, orden y reserva.

**Acceptance Scenarios**:

1. **Given** un carrito válido, **When** el cliente elige retiro y confirma, **Then** se crea una sola orden `pendiente_pago`, el total iguala el subtotal y se muestra el vencimiento.
2. **Given** un carrito válido, **When** elige envío y proporciona dirección, ciudad, código postal, teléfono y correo electrónico que cumplen las reglas de FR-002, **Then** ve «Subtotal de productos» y «Envío: costo a coordinar», sin total final numérico, y la orden conserva los datos normalizados.
3. **Given** un precio vigente distinto del guardado en el carrito, **When** revisa el resumen, **Then** ve precio anterior, vigente y diferencia por ítem y subtotal, y debe aceptar explícitamente el precio vigente.
4. **Given** producto retirado, variante inactiva, stock insuficiente o `ProductoImprovisado`, **When** confirma, **Then** no se crea orden, se identifican ítems y motivos y puede corregir el carrito sin borrado automático.

---

### User Story 2 - Consultar y cancelar mis órdenes (Priority: P1)

Como cliente, quiero ver en `/cuenta` mi historial y cancelar una orden pendiente de pago.

**Why this priority**: Da seguimiento y control durante la reserva.

**Independent Test**: Crear, consultar y cancelar una orden propia y comprobar estado e inventario.

**Acceptance Scenarios**:

1. **Given** una orden propia, **When** entro en `/cuenta`, **Then** veo fecha, detalle histórico, entrega, importes conocidos, estado y vencimiento si sigue pendiente.
2. **Given** una orden `pendiente_pago` antes de vencer, **When** la cancelo, **Then** pasa a `cancelada_cliente` y se libera stock una sola vez.
3. **Given** una orden ajena, **When** intento verla o cancelarla, **Then** no obtengo datos ni la modifico.

---

### User Story 3 - Administrar órdenes (Priority: P1)

Como administrador, quiero consultar órdenes, confirmar pagos manualmente y gestionar estados.

**Why this priority**: No hay pasarela de pagos en esta entrega.

**Independent Test**: Listar una orden pendiente, confirmar pago antes de vencer y avanzar su entrega.

**Acceptance Scenarios**:

1. **Given** un administrador, **When** consulta órdenes, **Then** ve listado y detalle con cliente, entrega, estado, vencimiento e importes conocidos, incluido envío sin cotizar.
2. **Given** una orden pendiente antes de vencer, **When** confirma manualmente el pago, **Then** pasa a `pago_confirmado`, se registran fecha y actor, y el vencimiento ya no la cancela. Si es envío, queda acreditado solo el subtotal de productos y el envío permanece sin cotizar ni cobrar.
3. **Given** una orden pagada, **When** avanza sus estados válidos, **Then** el cliente ve el estado actualizado y queda registro de la transición.
4. **Given** una orden con envío lista para despachar, **When** administración intenta marcarla `enviada`, **Then** debe registrar que el costo de envío y su cobro se coordinaron fuera del sitio; sin esa constancia, el cambio se rechaza.
5. **Given** una orden anterior a entrega, **When** administración la cancela, **Then** se registran motivo y actor; si estaba pendiente, se libera la reserva una sola vez. Si estaba pagada, administración elige si restituye el stock y registra el motivo de esa decisión; cliente y administración ven «devolución pendiente de gestionar».

---

### User Story 4 - Vencer reservas impagas (Priority: P1)

Como negocio, quiero recuperar stock de órdenes impagas al vencer 24 horas exactas.

**Why this priority**: Evita retener inventario indefinidamente.

**Independent Test**: Procesar órdenes antes, exactamente al y después del vencimiento, repitiendo la tarea.

**Acceptance Scenarios**:

1. **Given** orden creada en T y todavía pendiente, **When** se procesa desde T + 24 horas, **Then** queda `cancelada_vencimiento` y el stock se libera una sola vez.
2. **Given** ejecución tardía, **When** procesa una pendiente vencida, **Then** conserva la fecha original de vencimiento y registra la cancelación real sin prorrogar la reserva.
3. **Given** pago confirmado antes de vencer, **When** corre o se reintenta la tarea, **Then** no cancela ni libera stock.

### Edge Cases

- Carrito vacío: se impide confirmar y no se crea orden.
- Doble clic o misma solicitud repetida: una sola orden y reserva; reintento con datos diferentes para la misma intención se rechaza.
- Precio cambiado tras aceptar: se muestra el nuevo precio y exige otra aceptación; no se crea la orden con la aceptación anterior.
- Stock cambiado, producto retirado o variante inactiva entre revisión y confirmación: se indican ítems; el carrito sigue editable y no hay orden parcial.
- Pago exactamente al vencimiento: ya no se acepta. Si pago, tarea y cancelación compiten, solo una transición gana y las otras leen el estado resultante.
- Cancelación repetida: informa el estado actual sin liberar de nuevo.
- Cancelación administrativa de orden pagada sin decisión de restitución o sin motivo: se rechaza sin cambiar estado ni inventario.
- Una orden pagada cancelada no se presenta como dinero devuelto; la devolución se gestiona fuera del sitio y su finalización no se registra en esta entrega.
- Intentar marcar `enviada` sin constancia de coordinación del costo y cobro del envío: se rechaza y permanece `en_preparacion`.
- Falla de red tras confirmar: la misma intención se puede reintentar o la orden se puede consultar en `/cuenta` sin duplicarla.
- Envío incompleto: se señalan campos y no se crea orden; retiro no exige datos de envío.
- Si falla o demora la consulta del resumen o del historial, se informa el estado de carga y se ofrece reintentar; un resumen no actualizado nunca habilita la confirmación.
- Si una orden pendiente vence antes de que corra la tarea, el cliente ve el vencimiento efectivo en la primera consulta posterior; una vista abierta se actualiza dentro de los 60 segundos cuando la conexión funciona.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Solo un usuario autenticado cuyo rol vigente es `cliente` inicia checkout desde su carrito web activo y consulta o cancela sus órdenes; otros roles reciben 403 en las rutas API de cliente. Desde `/carrito` puede revisar, elegir entrega y regresar a editar; sin sesión se dirige a login y no se crea orden.
- **FR-002**: Elige `retiro` o `envio`. En envío son obligatorios dirección, ciudad, código postal, teléfono y correo electrónico. Se quitan espacios iniciales/finales y se reducen espacios internos consecutivos en los campos de texto. Dirección: 5 a 160 caracteres visibles; ciudad: 2 a 80 caracteres visibles; ambos rechazan caracteres de control. Código postal: 4 a 10 caracteres después de quitar espacios, letras o números con al menos un número, guardado en mayúsculas. Teléfono: admite dígitos, espacios, guiones, paréntesis y un `+` solo al inicio; se guarda sin separadores, con 8 a 15 dígitos y el `+` inicial si existía. Correo electrónico: hasta 254 caracteres, un solo `@`, parte local y dominio no vacíos, al menos un punto en el dominio, sin espacios, guardado en minúsculas. Cada campo inválido se identifica por nombre y no se crea orden. Para retiro no se exigen ni guardan datos de envío.
- **FR-003**: El servidor calcula precios vigentes, subtotal e importes finales conocidos con precisión decimal; no confía en importes remitidos por el cliente.
- **FR-004**: Retiro muestra «Subtotal de productos» y total igual a este; costo de envío no aplicable. Envío muestra «Subtotal de productos» y «Envío: costo a coordinar». El costo aún desconocido se representa como **sin cotizar**, nunca como cero, y el total final como **pendiente de definición**, nunca como subtotal o importe numérico.
- **FR-005**: Antes de confirmar se muestran cambios respecto del precio unitario guardado en el carrito por ítem y subtotal. La aceptación explícita se vincula al resumen vigente; cualquier nuevo cambio exige volver a aceptarlo.
- **FR-006**: Se rechaza carrito vacío, cantidades inválidas, producto retirado o no publicado en la tienda web, variante inactiva, stock insuficiente y `ProductoImprovisado`; se indican todos los ítems afectados y motivos sin eliminarlos automáticamente.
- **FR-007**: Una confirmación válida crea una única orden `pendiente_pago` con detalle histórico independiente del carrito: producto, variante (talle y color), cantidad, precio unitario vigente, importe de línea, subtotal, entrega, datos de envío si aplican y fecha. Cambios posteriores de catálogo o carrito no lo alteran.
- **FR-008**: Validación final de precios y disponibilidad, reserva de todas las unidades, detalle y orden ocurren como una sola operación: todo o nada. Compras simultáneas nunca reservan más que el stock disponible.
- **FR-009**: La misma intención de compra, incluso por doble clic o reintento, produce una sola orden y un solo movimiento de stock. Datos distintos para la misma intención se rechazan.
- **FR-010**: Para órdenes nuevas, la reserva vence exactamente 24 horas después del instante de creación, a la misma hora; el vencimiento se guarda y muestra a cliente y administración, sin depender de días hábiles ni de la ejecución de la tarea. Las órdenes existentes conservan su `venceEn` persistido.
- **FR-011**: Una tarea programada cancela órdenes que aún estén `pendiente_pago` al vencer o después y libera la reserva. Ejecución tardía o repetida no extiende el plazo ni duplica la liberación; se distinguen vencimiento original y momento de cancelación.
- **FR-012**: Administración solo confirma pago de `pendiente_pago` estrictamente antes del vencimiento. Registra actor y fecha; el stock continúa comprometido. En retiro se acredita el total, igual al subtotal; en envío se acredita solo el subtotal de productos y el envío permanece sin cotizar ni cobrar, sin total final. Al vencimiento exacto o después se rechaza, aunque la tarea no haya corrido.
- **FR-013**: El cliente solo cancela una orden propia `pendiente_pago` estrictamente antes del vencimiento. Administración puede cancelar una pendiente estrictamente antes del vencimiento o una pagada antes de entrega, con motivo; al vencimiento de una pendiente corresponde `cancelada_vencimiento`, aunque la tarea aún no haya corrido. Cancelar una pendiente libera stock. Para cancelar una pagada, administración debe elegir expresamente si restituye el stock y registrar el motivo de esa elección; sin ambos datos se rechaza la cancelación. La decisión y el movimiento correspondiente ocurren una sola vez.
- **FR-014**: Transiciones y movimientos de reserva son indivisibles e idempotentes. Ante carreras entre pago, cancelación y vencimiento, solo una transición compatible con estado y hora se aplica; las otras informan el estado final.
- **FR-015**: Estados permitidos: `pendiente_pago` → `pago_confirmado` → `en_preparacion` → `lista_para_retiro` (retiro) o `enviada` (envío) → `entregada`. Para pasar una orden de envío a `enviada`, administración debe registrar que el costo y su cobro se coordinaron fuera del sitio, con actor y fecha; esto no asigna un importe en la aplicación ni cambia la indicación de total final pendiente. Sin constancia se rechaza la transición. De pendiente se puede pasar a `cancelada_cliente`, `cancelada_admin` o `cancelada_vencimiento`; de pagada o sus estados posteriores previos a entrega, a `cancelada_admin`. Entregada y canceladas son terminales. Se rechazan saltos y rutas incompatibles con entrega.
- **FR-016**: `/cuenta` muestra solo órdenes propias, de más recientes a más antiguas, con detalle histórico; muestra cancelar solo cuando procede. Cada consulta y acción comprueba propiedad aunque se conozca un identificador ajeno.
- **FR-017**: Administración consulta listado y detalle, confirma pago, avanza y cancela según las reglas anteriores. Exige rol administrador vigente; registra actor, fecha, transición y motivo si corresponde.
- **FR-018**: Las operaciones autenticadas mantienen confidencial la credencial de sesión del cliente; permisos, precios, inventario y estados se determinan del lado del sistema y no por datos enviados por el navegador. Los errores previstos se comunican en español y permiten corregir o reintentar cuando sea posible.
- **FR-019**: No hay cobro en línea, confirmación automática de pago, cálculo de envío ni compra web de `ProductoImprovisado`. La confirmación manual identifica el subtotal de productos acreditado y, para envío, muestra expresamente que su costo sigue sin cotizar ni cobrar.
- **FR-020**: Una orden pagada que administración cancela muestra «devolución pendiente de gestionar» en el detalle de cliente y administración. La devolución del dinero se realiza fuera del sitio; la cancelación no afirma que el dinero fue devuelto y esta entrega no registra su finalización.
- **FR-021**: Cliente y administración pueden distinguir si la coordinación externa del costo y cobro del envío fue registrada. Esa constancia no convierte el costo desconocido en cero ni presenta un total final numérico.
- **FR-022**: Durante la consulta del resumen y del historial se muestra un estado de carga. Si cualquiera demora 10 segundos o falla, se muestra un mensaje de error y una opción de reintento; no se presenta un historial vacío como resultado de un error. Los datos de entrega ingresados se conservan. Tras recuperar el resumen, el cliente debe revisar y aceptar la versión actual antes de confirmar; nunca se confirma con datos no actualizados.
- **FR-023**: Campos, aceptación de precio y cancelación se operan por teclado con nombre accesible y foco visible. Los errores se asocian al campo o ítem correspondiente, se anuncian a lectores de pantalla y no dependen solo del color. Al fallar una confirmación, el foco pasa al resumen del error o al primer campo inválido; la cancelación exige una confirmación accesible que describe su efecto.
- **FR-024**: Al llegar a `venceEn`, una orden todavía almacenada como `pendiente_pago` se presenta al cliente y administración como «Reserva vencida; cancelación en proceso», sin ofrecer pago ni cancelación voluntaria. La primera consulta posterior al vencimiento debe mostrar ese estado efectivo aunque la tarea esté atrasada; una vista abierta y conectada lo refleja dentro de 60 segundos. Cuando la tarea registra `cancelada_vencimiento`, se muestra el estado definitivo y la fecha real de cancelación.

### Key Entities

- **Orden**: compromiso de compra, dueño, estado, creación, vencimiento, entrega, importes conocidos o sin cotizar, constancia de coordinación externa del envío cuando aplique, eventos de pago/cancelación e indicación de devolución pendiente cuando se cancela tras confirmar pago.
- **Detalle de orden**: fotografía de producto, variante, cantidad e importe aceptado, independiente del carrito.
- **Reserva de stock**: unidades comprometidas por orden y variante, con registro que evita liberación doble.
- **Carrito e intención de compra**: selección editable y referencia para reconocer reintentos.
- **Datos de envío**: dirección y contacto para entrega por envío.
- **Actividad de orden**: fecha, actor, cambio de estado y motivo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En 100 % de los escenarios válidos se crea exactamente una orden completa; en 100 % de los inválidos, ninguna orden parcial y el carrito queda corregible.
- **SC-002**: En pruebas de compras simultáneas por la última unidad, reservas nunca superan el stock; 100 % de dobles clics y reintentos de la misma intención producen una orden.
- **SC-003**: En 100 % de las órdenes pendientes procesadas desde su vencimiento hay una sola cancelación y liberación; órdenes pagadas antes de vencer nunca se cancelan por expiración.
- **SC-004**: En 100 % de pruebas de autorización el cliente solo ve/cancela órdenes propias y usuarios sin rol administrador no gestionan órdenes.
- **SC-005**: En 100 % de pruebas de envío sin cotización no se muestra total final numérico; en retiro el total coincide con el subtotal.
- **SC-006**: En prueba de uso, un cliente con carrito válido completa revisión y confirmación en menos de 3 minutos sin asistencia y comprende importe conocido y vencimiento.
- **SC-007**: En 100 % de las cancelaciones de órdenes pagadas, cliente y administración ven «devolución pendiente de gestionar» y ninguna vista indica que el dinero ya fue devuelto.
- **SC-008**: En 100 % de pruebas de órdenes con envío, `enviada` requiere constancia de coordinación externa del costo y cobro; esa constancia es visible sin mostrar un total final numérico.
- **SC-009**: En el 100 % de formularios de envío inválidos, el cliente ve el nombre de cada campo rechazado y no se crea orden; en retiro no se solicitan esos campos.
- **SC-010**: En el 100 % de fallos o demoras de 10 segundos de resumen/historial se ofrece reintento sin habilitar confirmación con un resumen desactualizado ni mostrar un historial vacío por error.
- **SC-011**: En el 100 % de recorridos de aceptación y cancelación por teclado se mantiene foco visible, errores asociados y anuncio accesible; los mensajes siguen siendo comprensibles sin distinguir colores.
- **SC-012**: En el 100 % de órdenes pendientes vencidas, la primera consulta posterior al límite muestra el vencimiento efectivo; una vista abierta con conexión lo refleja en un máximo de 60 segundos, incluso si la tarea se retrasa.

## Assumptions

- Se reutiliza la autenticación actual; no se redefinen registro, roles ni sesión.
- El pago ocurre fuera del sitio; el medio concreto y la conciliación externa quedan fuera de alcance.
- La devolución de un pago confirmado se gestiona fuera del sitio; esta entrega solo señala que queda pendiente, sin seguimiento de su finalización.
- Para envío, esta entrega registra únicamente la constancia de que costo y cobro se coordinaron fuera del sitio antes del despacho; no registra importe, cálculo ni estado de conciliación de ese cobro.
- El subtotal de productos se fija al confirmar. Cotización/cobro de envío requerirá un flujo posterior; mientras tanto, el total final de envío es desconocido y la confirmación manual solo acredita los productos.
- El carrito usado deja de ser activo tras crear la orden; una nueva compra usa otro carrito. Su vínculo histórico no sustituye el detalle.
- El stock de orden pagada sigue apartado hasta entrega o cancelación administrativa. En esta última, administración elige expresamente si restituye unidades según el estado físico y registra su motivo.

## Scope and design decisions for plan

- **Repositorios y archivos previstos**: raíz: esta `spec.md` y sus checklists. Implementación futura: `backend/prisma/schema.prisma`, nueva migración, rutas/servicios de órdenes y reserva, tarea programada y montaje en `backend/src/index.js`; `frontend/src/app/carrito/`, `frontend/src/app/cuenta/`, páginas de administración, rutas BFF y contratos en `frontend/src/types/`; documentación en `docs/estado-actual/`. El plan precisa la lista antes de editar. Las operaciones autenticadas del navegador deben pasar por el BFF existente y la lógica de negocio queda en backend, conforme a la constitution.
- **Esquema**: decidir representación de costo de envío desconocido y total final ausente, detalle histórico, reserva, vencimiento, transiciones e intención idempotente. Hoy `Orden` exige `total`, usa `costoEnvio=0` y apunta a `Carrito` único: no se presume que esos campos resuelvan el contrato. Esquema y precios requieren revisión explícita de spec y plan.
- **Reserva**: elegir estrategia para stock disponible, concurrencia, atomicidad e idempotencia, incluida la disponibilidad vista por otros compradores.
- **Tarea programada**: elegir ejecutor, frecuencia, reintentos, protección y observabilidad. La regla temporal se aplica por vencimiento en cada transición aunque la tarea corra tarde.
- **Base actual**: carrito conserva `precioUnitario` y puede contener ítems no disponibles o improvisados; su subtotal no es autoridad para la orden. Consultar `docs/estado-actual/08-deuda-y-riesgos.md`; no se autoriza refactor ajeno.
