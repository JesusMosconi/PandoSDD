# Research: Notificaciones por correo electrónico (fase 1)

**Fecha**: 2026-10-23 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## D1. Proveedor y forma de integración

- **Decision**: Resend, llamado con `fetch` nativo a `POST https://api.resend.com/emails` con `Authorization: Bearer <RESEND_API_KEY>` y cuerpo `{ from, to: [destinatario], subject, html, text, reply_to? }`. La respuesta exitosa trae `{ id }`; los errores traen `{ statusCode, name, message }`.
- **Rationale**: API simple, plan gratuito suficiente (3.000/mes, 100/día) y elegida por el usuario. Con `fetch` no se agrega ninguna dependencia, como pide `AGENTS.md` («No instalar dependencias salvo que la spec lo pida»).
- **Alternatives considered**: SDK `resend` (agrega una dependencia para una sola llamada HTTP); Brevo (equivalente, sin preferencia del usuario); Nodemailer con SMTP de Gmail (dependencia nueva, límites bajos y peor entrega).
- **Constraint verificado con el usuario**: sin dominio propio. Con el remitente `onboarding@resend.dev`, Resend solo acepta como destinatario el correo de la cuenta y responde 403 para cualquier otro. Verificar un dominio (registros SPF y DKIM) habilita a todos los destinatarios cambiando solo `EMAIL_REMITENTE`.

## D2. Momento y forma del envío

- **Decision**: llamar a `notificar*` con `void` después de persistir y de enviar la respuesta HTTP. Cada función captura sus errores; `enviarEmail` usa `AbortSignal.timeout(10000)`. Sin cola, sin reintentos y sin persistir el envío.
- **Rationale**: cumple FR-007 y SC-002 sin cambios de esquema. Los tres correos son de bajo riesgo: perder uno no afecta dinero ni stock.
- **Alternatives considered**: `await` antes de responder (acopla la latencia de Resend a la respuesta); tabla de pendientes más job como `vencer-ordenes` (requiere migración y programación; se reevalúa con las notificaciones de órdenes); `setImmediate` (no agrega nada frente a una promesa sin esperar).
- **Riesgo aceptado**: si el proceso se reinicia entre la respuesta y el envío, el correo se pierde. Es coherente con la Assumption «Sin reintentos ni historial».

## D3. Comportamiento sin configuración

- **Decision**: si falta `RESEND_API_KEY`, `enviarEmail` no llama a `fetch`, registra `[email:modo-registro] tipo=… para=a***@… asunto="…"` y devuelve `{ ok: true, modo: "registro" }`. Las variables se leen en cada llamada, no al importar, para que los tests puedan cambiarlas.
- **Rationale**: cumple FR-008. Desarrollo y tests no envían nada por accidente.
- **Alternatives considered**: abortar el arranque si falta la clave (rompe entornos locales que hoy funcionan); un proveedor falso inyectado (más complejo que leer el entorno).

## D4. Token de baja

- **Decision**: `token = "<id>.<firma>"`, donde `firma = base64url(HMAC-SHA256(EMAIL_TOKEN_SECRET, "baja-newsletter:" + id))`. `verificarTokenBaja` exige el formato `^\d+\.[A-Za-z0-9_-]{43}$`, recalcula la firma y compara con `crypto.timingSafeEqual`; devuelve el id entero positivo o `null`. Sin vencimiento. Sin `EMAIL_TOKEN_SECRET`, firmar lanza un error (la notificación lo captura y lo registra) y la ruta de baja responde 503.
- **Rationale**: cumple FR-005 sin migración. El prefijo `baja-newsletter:` separa este propósito de usos futuros del mismo secreto. El id no es dato personal legible. Un secreto separado de `JWT_SECRET` permite rotarlos de forma independiente; rotarlo invalida todos los enlaces de baja enviados, lo que se acepta.
- **Alternatives considered**: columna `tokenBaja` en `Suscripcion` (migración y cambio de esquema; el usuario eligió HMAC); JWT con `jsonwebtoken` (más largo y con vencimiento innecesario); firmar el correo en lugar del id (expone el dato personal en la URL).

## D5. Confirmación explícita de la baja

- **Decision**: el correo enlaza a `${FRONTEND_URL}/newsletter/baja?token=…`. La página muestra «¿Querés dejar de recibir novedades?» con un botón; al confirmar, hace `POST /suscripciones/baja` con `{ token }`. La ruta es idempotente.
- **Rationale**: cumple FR-006 y el escenario 4 de la US3. Algunos clientes y antivirus de correo abren los enlaces automáticamente; un GET que modifica datos produciría bajas sin intención.
- **Alternatives considered**: baja con GET en el backend devolviendo HTML (bajas accidentales y una pantalla fuera del diseño del sitio); encabezado `List-Unsubscribe` con un clic (útil para campañas masivas; se evalúa cuando exista el envío del newsletter, fuera de alcance).

## D6. Normalización de correo y compatibilidad

- **Decision**: nuevo `normalizarEmail(valor)` en `src/utils/email.js`: `trim().toLowerCase()` y la misma regla de formato que `normalizarEntrega` en `services/checkout.js` (≤254 caracteres, un `@`, partes no vacías, punto en el dominio, sin espacios). Devuelve el correo normalizado o `null`.
  - **Registro**: rechaza con 400 «Ingresá un correo electrónico válido» si es `null`; busca duplicados con `findFirst({ where: { email: { equals, mode: "insensitive" } } })`; guarda normalizado.
  - **Suscripción**: igual. Una fila heredada `Ana@Mail.com` cuenta como la misma suscripción; no se reescribe su correo.
  - **Login**: `findUnique` por el correo normalizado; si no hay resultado, `findUnique` por el valor recibido sin cambios. Evita que quien se registra como `Ana@Mail.com` (guardado `ana@mail.com`) quede afuera al escribirlo igual, y mantiene el acceso de cuentas heredadas con mayúsculas.
- **Rationale**: la constitution IV pide normalizar en código modificado; normalizar solo en registro rompería el login.
- **Alternatives considered**: login sin distinguir mayúsculas con `findFirst` (ambiguo si existen dos cuentas heredadas que solo difieren en mayúsculas); migrar los correos existentes a minúsculas (escritura en producción y riesgo de colisión con la restricción `@unique`; fuera de alcance); reutilizar `normalizarEntrega` (devuelve errores por campo de envío, no encaja).

## D7. Lógica de suscripción como servicio

- **Decision**: `src/services/suscripciones.js` con:
  - `suscribir(email)`, que devuelve `{ suscripcion, estado: "creada" | "reactivada" }` o lanza `ErrorSuscripcionActiva`.
  - `darDeBaja(id)`, que devuelve `{ suscripcion | null }`.

  La reactivación usa `updateMany({ where: { id, activo: false }, data: { activo: true, fechaSuscripcion: new Date() } })`: si `count === 0`, otra solicitud ganó y se responde 409. Un `P2002` al crear también responde 409. La baja usa `updateMany({ where: { id }, data: { activo: false } })`; con `count === 0` (fila inexistente) responde igual de exitosa.
- **Rationale**: permite testear la reactivación y las carreras contra la base de prueba sin levantar Express, siguiendo el patrón de 002 y 003 (rutas finas, servicios testeados). El `updateMany` condicionado evita mandar dos correos si llegan dos solicitudes simultáneas.
- **Alternatives considered**: `upsert` (no distingue entre «ya activa», «reactivada» y «creada»); dejar la lógica en la ruta (no se puede testear sin HTTP).

## D8. Plantillas

- **Decision**: `src/services/plantillas-email.js` exporta `plantillaBienvenida({ nombre, urlCatalogo, urlCuenta })`, `plantillaCambioPassword({ nombre, fechaHora, emailContacto })` y `plantillaSuscripcion({ urlBaja })`, cada una devuelve `{ asunto, html, texto }`. HTML de una columna de 600 px con estilos inline en blanco y negro, encabezado «PANDOCBA» en texto (sin imágenes remotas). `escaparHtml` sobre todo dato de usuario. Fecha con `Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Cordoba", dateStyle: "long", timeStyle: "short" })`.
- **Rationale**: cumple FR-010. Las funciones puras se testean sin red. Los estilos inline son los que mejor soportan los clientes de correo. Sin imágenes no hay recursos remotos que se bloqueen.
- **Alternatives considered**: motor de plantillas o React Email (dependencias nuevas); plantillas administradas en Resend (contenido fuera del repo y sin revisión de código).

## Variables de entorno

| Variable | Uso | Valor por defecto si falta |
|---|---|---|
| `RESEND_API_KEY` | Autenticación con Resend | Modo registro (D3) |
| `EMAIL_REMITENTE` | Campo `from` | `PandoCBA <onboarding@resend.dev>` |
| `EMAIL_TOKEN_SECRET` | Firma de enlaces de baja | Sin correo de suscripción y baja 503 (falla cerrada) |
| `FRONTEND_URL` | Base de los enlaces | `CORS_ORIGIN`, si no `http://localhost:3001` |
| `EMAIL_CONTACTO` | «Contactanos» y `reply_to` | El aviso indica «respondé a este correo» y no envía `reply_to` |
