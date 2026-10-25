# Feature Specification: Notificaciones por correo electrónico (fase 1)

**Feature Branch**: `004-notificaciones-email`
**Created**: 2026-10-23
**Status**: Borrador para revisión; requiere aprobación antes de `plan`
**Input**: Primeras automatizaciones de notificación por correo electrónico disparadas por acciones del usuario: bienvenida al crear la cuenta, aviso de contraseña cambiada y confirmación de suscripción al newsletter con opción de baja.

## Clarifications

### Session 2026-10-23

- Q: ¿Qué servicio de envío se usa? → A: Un proveedor externo de correo transaccional (Resend), invocado sin agregar dependencias nuevas. La elección técnica se detalla en el plan.
- Q: ¿Existe un dominio propio verificado para el remitente? → A: Todavía no. Esta fase se implementa y prueba con el remitente provisto por el proveedor; la entrega a clientes reales queda condicionada a verificar un dominio (ver Assumptions).
- Q: ¿Cómo se autoriza la baja del newsletter desde el correo? → A: Con un enlace personal firmado que identifica la suscripción, sin requerir sesión y sin cambios de esquema.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bienvenida al crear la cuenta (Priority: P1)

Como persona que acaba de registrarse, quiero recibir un correo de bienvenida que confirme que mi cuenta existe y me lleve al catálogo y a «Mi cuenta».

**Why this priority**: Es el primer contacto por correo con cada cliente y confirma que la dirección registrada es correcta.

**Independent Test**: Registrar una cuenta nueva y verificar que llega un único correo con saludo personalizado y enlaces operativos al catálogo y a `/cuenta`.

**Acceptance Scenarios**:

1. **Given** una persona sin cuenta, **When** completa el registro con éxito, **Then** recibe un correo de bienvenida dirigido a su nombre, con un enlace al catálogo y otro a «Mi cuenta».
2. **Given** un registro rechazado (datos faltantes, contraseña corta o correo ya registrado), **When** se responde el error, **Then** no se envía ningún correo.
3. **Given** que el servicio de correo falla o no está configurado, **When** la persona se registra, **Then** la cuenta se crea y la sesión se inicia igual que hoy; la falla queda registrada para diagnóstico.

---

### User Story 2 - Aviso de contraseña cambiada (Priority: P1)

Como cliente, quiero enterarme por correo cada vez que se cambia la contraseña de mi cuenta, para detectar un acceso no autorizado.

**Why this priority**: Es una alerta de seguridad; protege la cuenta aunque otra persona haya obtenido la sesión.

**Independent Test**: Cambiar la contraseña desde `/cuenta` y verificar que llega un correo con fecha y hora del cambio y una vía de contacto.

**Acceptance Scenarios**:

1. **Given** un cliente autenticado, **When** cambia su contraseña con éxito, **Then** recibe un correo que informa el cambio, indica fecha y hora en horario de Córdoba y dice «Si no fuiste vos, contactanos» con una vía de contacto.
2. **Given** un intento con la contraseña actual incorrecta o una nueva contraseña inválida, **When** se rechaza, **Then** no se envía ningún correo.
3. **Given** que el servicio de correo falla, **When** el cliente cambia su contraseña, **Then** el cambio se aplica y se confirma igual que hoy.
4. **Given** el correo de aviso, **When** se lee, **Then** no contiene la contraseña nueva ni la anterior, ni ningún enlace que permita cambiarla.

---

### User Story 3 - Confirmación de suscripción y baja del newsletter (Priority: P1)

Como visitante, quiero recibir un «Gracias por suscribirte» al anotarme en el newsletter y poder darme de baja desde ese mismo correo sin iniciar sesión.

**Why this priority**: Confirma la suscripción y ofrece una baja simple, que es una práctica esperada para correos de difusión.

**Independent Test**: Suscribir un correo, abrir el enlace de baja, confirmarla, verificar que la suscripción queda inactiva y volver a suscribirse.

**Acceptance Scenarios**:

1. **Given** un correo no suscripto, **When** se suscribe desde el sitio, **Then** la suscripción queda activa y recibe un correo de agradecimiento con un enlace personal de baja.
2. **Given** un correo con suscripción activa, **When** intenta suscribirse otra vez, **Then** ve el aviso actual «Este correo ya está suscripto» y no recibe un correo nuevo.
3. **Given** un correo que se dio de baja, **When** vuelve a suscribirse, **Then** la suscripción se reactiva, el sitio informa éxito y recibe un nuevo correo de agradecimiento.
4. **Given** el enlace de baja, **When** la persona lo abre, **Then** ve una página que le pide confirmar la baja; abrir el enlace por sí solo no da de baja.
5. **Given** la página de baja con un enlace válido, **When** confirma, **Then** la suscripción queda inactiva y ve un mensaje de baja confirmada.
6. **Given** un enlace de baja ya usado, **When** confirma otra vez, **Then** ve el mismo mensaje de baja confirmada sin error.
7. **Given** un enlace alterado, incompleto o inventado, **When** intenta confirmar, **Then** ve un mensaje de enlace inválido y ninguna suscripción cambia.

### Edge Cases

- Correo escrito con mayúsculas o espacios al inicio o al final (en registro o suscripción): se trata como la misma dirección en minúsculas y sin espacios; `Ana@Mail.com ` y `ana@mail.com` no generan dos cuentas ni dos suscripciones.
- Servicio de correo caído, lento o sin configurar: la acción principal responde en el mismo tiempo y con el mismo resultado que sin notificaciones; el correo no se reintenta en esta fase.
- Nombre o apellido con caracteres especiales o marcado HTML: se muestran como texto literal en el correo, sin alterar su formato ni insertar contenido.
- Enlace de baja de una suscripción que fue eliminada por administración: se informa baja confirmada sin error.
- Enlace de baja copiado de un correo ajeno: solo afecta a la suscripción a la que pertenece; no permite conocer ni modificar otras.
- Baja realizada por administración: no envía correo.
- Cuenta registrada que además está suscripta al newsletter: cada acción envía solo su propio correo.
- Usuario inactivo: no puede cambiar la contraseña (comportamiento actual), por lo tanto no recibe el aviso.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Tras un registro exitoso, el sistema envía un único correo de bienvenida a la dirección registrada, con saludo por nombre, enlace al catálogo y enlace a «Mi cuenta». Un registro rechazado no envía correo.
- **FR-002**: Tras un cambio de contraseña exitoso, el sistema envía un único correo de aviso a la dirección de la cuenta con fecha y hora del cambio en horario de Córdoba (America/Argentina/Cordoba), el texto «Si no fuiste vos, contactanos» y una vía de contacto del negocio. No incluye contraseñas ni enlaces para cambiarla. Un intento rechazado no envía correo.
- **FR-003**: Tras una suscripción nueva o una reactivación, el sistema envía un único correo de agradecimiento con un enlace personal de baja. Un intento sobre una suscripción ya activa no envía correo.
- **FR-004**: Si la suscripción existe inactiva, una nueva suscripción con el mismo correo la reactiva y registra la nueva fecha de suscripción, en lugar de rechazarla.
- **FR-005**: El enlace de baja identifica una sola suscripción, no expone datos personales legibles, no puede fabricarse ni modificarse para apuntar a otra suscripción sin conocer un secreto del sistema, y se puede usar sin iniciar sesión.
- **FR-006**: Abrir el enlace muestra una página de confirmación; la baja se aplica solo cuando la persona confirma. La baja es lógica (la suscripción queda inactiva) y repetirla devuelve el mismo resultado exitoso. Un enlace inválido se rechaza con un mensaje en español sin modificar datos.
- **FR-007**: Ninguna falla, demora o falta de configuración del servicio de correo cambia el resultado, el código de respuesta ni el tiempo de respuesta percibido de registro, cambio de contraseña o suscripción. Cada falla de envío queda registrada con el tipo de notificación y el motivo, sin registrar contraseñas ni el contenido completo del correo.
- **FR-008**: Sin servicio de correo configurado (entornos de desarrollo y pruebas), el sistema no intenta enviar y deja constancia del correo que habría enviado (tipo, destinatario y asunto).
- **FR-009**: Los correos de registro y suscripción se normalizan (sin espacios iniciales o finales y en minúsculas) antes de buscar, comparar o guardar. Las cuentas y suscripciones existentes no se modifican.
- **FR-010**: Cada correo incluye versión HTML y versión de texto plano con el mismo contenido, en español, con remitente identificable como PandoCBA. Los datos ingresados por el usuario se muestran como texto literal.
- **FR-011**: Los enlaces de los correos apuntan al sitio público configurado para el entorno (catálogo, «Mi cuenta» y página de baja) y funcionan al abrirse desde el correo.
- **FR-012**: Los mensajes visibles de las rutas modificadas se mantienen en español y los contratos actuales de respuesta de registro, cambio de contraseña y suscripción no cambian, salvo la reactivación descrita en FR-004.
- **FR-013**: La capa de envío es reutilizable para notificaciones futuras: agregar un tipo nuevo de correo no requiere modificar la forma de enviar.

### Key Entities

- **Notificación por correo**: tipo (bienvenida, contraseña cambiada, suscripción), destinatario, asunto y contenido. No se persiste en esta fase; solo queda constancia en los registros del servidor.
- **Suscripción**: entidad existente (correo, activa/inactiva, fecha de suscripción). Se reutiliza sin cambios de esquema; gana el comportamiento de reactivación.
- **Enlace de baja**: referencia firmada a una suscripción; no se almacena.
- **Usuario**: entidad existente; aporta nombre y correo para las notificaciones.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el 100 % de los registros, cambios de contraseña y suscripciones exitosos con el servicio operativo se envía exactamente un correo del tipo correspondiente; en el 100 % de los intentos rechazados, ninguno.
- **SC-002**: Con el servicio de correo caído o sin configurar, el 100 % de esas tres acciones devuelve el mismo resultado que sin notificaciones y ninguna demora más de 1 segundo adicional por causa del correo.
- **SC-003**: En el 100 % de las pruebas, un enlace de baja alterado, truncado o inventado no modifica ninguna suscripción.
- **SC-004**: Una persona completa la baja desde el correo en no más de dos acciones (abrir enlace y confirmar), sin iniciar sesión.
- **SC-005**: El 100 % de las personas dadas de baja pueden volver a suscribirse desde el sitio y reciben confirmación.
- **SC-006**: En el 100 % de los correos enviados los enlaces abren la página esperada del sitio del entorno, y el texto plano conserva toda la información del HTML.
- **SC-007**: Ningún correo de aviso de contraseña ni registro del servidor contiene una contraseña.

## Assumptions

- **Entrega limitada sin dominio**: mientras no se verifique un dominio propio, el proveedor solo entrega al correo dueño de la cuenta del proveedor. La fase se considera implementada con ese alcance de prueba; habilitar la entrega a clientes reales requiere verificar el dominio y cambiar la configuración del remitente, sin cambios de código.
- **Sin reintentos ni historial**: si un envío falla, el correo se pierde y solo queda registrado. Una cola persistente con reintentos se evaluará cuando se sumen notificaciones de órdenes.
- **Sin confirmación doble (double opt-in)**: la suscripción queda activa al enviarse el formulario, como hoy; el correo es de agradecimiento, no de verificación.
- **Sin verificación de correo de cuenta**: la bienvenida no exige confirmar la dirección para usar la cuenta.
- La vía de contacto del aviso de contraseña es un correo del negocio configurable por entorno.
- Las cuentas creadas por administración, si existieran, no forman parte de este alcance; solo el registro público dispara la bienvenida.
- No hay preferencias de notificación por usuario en esta fase; los tres correos son transaccionales y siempre se envían.

## Out of Scope

- Notificaciones de órdenes (confirmación, pago, envío, cancelación, vencimiento).
- Recuperación de contraseña olvidada.
- Envío de campañas del newsletter.
- Límite de frecuencia (rate limit) en rutas públicas; se registra como deuda.
- Panel de administración para ver correos enviados.

## Scope and design decisions for plan

- **Repositorios y archivos previstos**:
  - Raíz (`PandoSDD`): esta `spec.md`, `checklists/requirements.md`, luego `plan.md`, `tasks.md`, `contracts/notificaciones.md`; y `docs/estado-actual/03-api-backend.md`, `06-flujos-de-negocio.md`, `07-entorno-y-comandos.md`, `08-deuda-y-riesgos.md`.
  - `backend/`: nuevos `src/services/email.js`, `src/services/notificaciones.js`, `src/services/plantillas-email.js`, `src/utils/token-baja.js`, `test/notificaciones.test.js`; modificados `src/routes/usuarios.routes.js` (solo registro y cambio de contraseña), `src/routes/suscripcion.routes.js`, `.env.example`.
  - `frontend/`: nueva página `src/app/newsletter/baja/` con un componente cliente mínimo para confirmar; contrato en `src/types/` si corresponde. `NewsletterForm.tsx` sin cambios funcionales.
  - El plan precisa la lista antes de editar.
- **Proveedor**: Resend mediante su API HTTP con el `fetch` nativo de Node 22; no se instalan dependencias. Sin clave configurada se usa un modo que solo registra.
- **Envío no bloqueante**: el correo se dispara después de persistir y sin que la respuesta lo espere; los errores se capturan y registran.
- **Enlace de baja**: token HMAC-SHA256 sobre el id de la suscripción con un secreto propio por entorno (distinto de `JWT_SECRET`), comparado en tiempo constante. Sin cambios en `schema.prisma` ni migraciones. El token no vence en esta fase.
- **Ruta pública de baja**: escribe datos sin `verificarToken`; el token firmado actúa como autorización. Es una excepción nueva a la constitution (III) que esta spec justifica y que debe registrarse en `08-deuda-y-riesgos.md`. Se usa una operación de confirmación explícita (no un simple acceso al enlace) para que los analizadores de enlaces de los clientes de correo no provoquen bajas.
- **Variables de entorno nuevas** (por nombre en `.env.example`): `RESEND_API_KEY`, `EMAIL_REMITENTE`, `EMAIL_TOKEN_SECRET`, `FRONTEND_URL`, `EMAIL_CONTACTO`. Se agrega también `JWT_SECRET`, requerido hoy y ausente del ejemplo.
- **Constitution en código modificado**: registro y cambio de contraseña pasan a `asyncHandler`; los emails de registro y suscripción se normalizan a minúsculas (resuelve parcialmente el ítem 4 de `08-deuda-y-riesgos.md`); los datos a persistir se construyen con campos explícitos. El plan agrega un ajuste mínimo en login (buscar primero por el correo normalizado y después por el valor recibido) para que quien se registre con mayúsculas pueda volver a entrar; el resto de `usuarios.routes.js` queda fuera de alcance. El plan también suma `src/utils/email.js`, `src/services/suscripciones.js`, `test/suscripciones.test.js`, `frontend/src/components/ConfirmarBajaNewsletter.tsx` y `docs/estado-actual/04-frontend.md` a la lista de archivos.
- **Riesgo de abuso**: registro y suscripción son públicos y ahora envían correo a la dirección ingresada. Mitigación en esta fase: no reenviar a suscripciones activas. Un rate limit queda como deuda registrada.
- **Tests**: unitarios sin base de datos para token, plantillas y capa de envío (con `fetch` simulado). La reactivación se prueba contra la base de prueba si el escenario existente lo permite; si no, se verifica manualmente y se documenta.
- **Esquema, autenticación y precios**: no se modifica el esquema ni el cálculo de precios. Se modifican rutas de autenticación (registro y cambio de contraseña) solo para agregar la notificación, normalizar el correo y adoptar `asyncHandler`; requiere revisión explícita de spec y plan según la constitution (VII).
