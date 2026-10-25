# Contract: Notificaciones por correo y baja del newsletter

Base: `${API_URL}` = `/api` en Express. Todos los mensajes van en español.

## Rutas modificadas

### `POST /usuarios/registro` (pública, sin cambios de contrato salvo validación)

- Body: `{ nombre: string, apellido: string, email: string, password: string, telefono?: string }`.
- `email` se normaliza (trim y minúsculas) y se valida su formato.

| Caso | Status | Body |
|---|---|---|
| Éxito | 201 | `{ usuario, token }` como hoy; `usuario.email` normalizado |
| Falta un campo o no es string | 400 | `{ message }` (texto de `validateBody` o el actual) |
| Contraseña < 6 | 400 | `{ message: "La contraseña debe tener al menos 6 caracteres" }` |
| Correo con formato inválido | 400 | `{ message: "Ingresá un correo electrónico válido" }` |
| Correo ya registrado (sin distinguir mayúsculas) o carrera `P2002` | 409 | `{ message: "El email ya está registrado" }` |

Efecto lateral: solo con 201 → notificación `bienvenida`.

### `POST /usuarios/login` (pública)

Sin cambios de contrato. Busca primero por el correo normalizado y después por el valor recibido.

### `PUT /usuarios/cambiar-password` (autenticada)

Sin cambios de contrato ni de mensajes. Efecto lateral: solo con 200 → notificación `cambio_password`.

### `POST /suscripciones` (pública)

- Body: `{ email: string }`.

| Caso | Status | Body |
|---|---|---|
| Creada | 200 | `Suscripcion` (como hoy) |
| Reactivada | 200 | `Suscripcion` con `activo: true` y nueva `fechaSuscripcion` |
| Formato inválido | 400 | `{ message: "Ingresá un correo electrónico válido" }` |
| Ya activa (o carrera) | 409 | `{ message: "Ya existe una suscripción con este email" }` (como hoy) |

Efecto lateral: con 200 → notificación `suscripcion`.

## Ruta nueva

### `POST /suscripciones/baja` (pública; autorización = token firmado)

- Body: `{ token: string }`.

| Caso | Status | Body |
|---|---|---|
| Token válido (suscripción activa, inactiva o inexistente) | 200 | `{ message: "Tu suscripción fue dada de baja" }` |
| Falta `token` o no es string | 400 | `{ message }` de `validateBody` |
| Token con formato o firma inválidos | 400 | `{ message: "El enlace de baja no es válido" }` |
| `EMAIL_TOKEN_SECRET` sin configurar | 503 | `{ message: "La baja no está disponible en este momento" }` |

La respuesta no incluye el correo ni datos de la suscripción. Debe registrarse **antes** de `DELETE /suscripciones/:id` o con una ruta distinta; `POST` y `DELETE` no colisionan.

## Frontend

### Página `/newsletter/baja?token=<token>`

- Server Component; lee `searchParams` (una `Promise` en Next 16).
- Sin `token` → mensaje «El enlace de baja no es válido» y enlace al inicio.
- Con `token` → `ConfirmarBajaNewsletter` (cliente):
  - Estado inicial: texto «¿Querés dejar de recibir novedades de PandoCBA?» y botón «Confirmar baja».
  - Enviando: botón deshabilitado, «Procesando…».
  - 200 → «Listo, ya no vas a recibir novedades.» y enlace al inicio.
  - 400 → «El enlace de baja no es válido.»
  - Otro error o falla de red → «No pudimos procesar la baja. Intentá de nuevo.» con el botón habilitado.
  - Mensajes con `role="status"`; el botón se opera por teclado.
- Llama a `apiFetch<RespuestaBajaSuscripcion>("/suscripciones/baja", { method: "POST", body: JSON.stringify({ token }) })`.
- Tipo en `src/types/suscripcion.ts`: `export type RespuestaBajaSuscripcion = { message: string };`.

## Interfaz interna del backend

```text
utils/email.js
  normalizarEmail(valor: unknown): string | null
  enmascararEmail(email: string): string                  // "ana@mail.com" → "a***@mail.com"

utils/token-baja.js
  firmarTokenBaja(suscripcionId: number): string          // lanza si falta EMAIL_TOKEN_SECRET
  verificarTokenBaja(token: string): number | null        // lanza si falta EMAIL_TOKEN_SECRET
  tokenBajaDisponible(): boolean

services/email.js
  enviarEmail({ tipo, para, asunto, html, texto, responderA? }):
    Promise<{ ok: true, id } | { ok: true, modo: "registro" } | { ok: false, motivo }>   // nunca rechaza

services/notificaciones.js                                 // nunca rechazan
  notificarBienvenida(usuario): Promise<void>
  notificarCambioPassword(usuario, fecha: Date): Promise<void>
  notificarSuscripcion(suscripcion): Promise<void>

services/suscripciones.js
  suscribir(email: string): Promise<{ suscripcion, estado: "creada" | "reactivada" }>  // lanza ErrorSuscripcionActiva
  darDeBaja(id: number): Promise<void>
```

## Contenido de los correos

| Tipo | Asunto | Contenido mínimo |
|---|---|---|
| `bienvenida` | «Bienvenido/a a PandoCBA» | «Hola, {nombre}». Tu cuenta ya está lista. Botón «Ver catálogo» → `${FRONTEND_URL}/categorias`. Enlace «Mi cuenta» → `${FRONTEND_URL}/cuenta`. |
| `cambio_password` | «Se cambió la contraseña de tu cuenta» | «Hola, {nombre}». La contraseña se cambió el {fecha y hora en Córdoba}. «Si no fuiste vos, contactanos» a {EMAIL_CONTACTO} (o «respondé a este correo»). Sin enlaces para cambiar la contraseña. |
| `suscripcion` | «Gracias por suscribirte a PandoCBA» | Agradecimiento; vas a enterarte primero de los drops. «¿No querés recibir más correos? Darte de baja» → `${FRONTEND_URL}/newsletter/baja?token=…`. |

Todos tienen versión de texto plano con los mismos datos y las URL completas, y remitente `EMAIL_REMITENTE`.

## Variables de entorno (backend `.env.example`)

```text
JWT_SECRET="cambiar-por-un-secreto-largo"
RESEND_API_KEY=""
EMAIL_REMITENTE="PandoCBA <onboarding@resend.dev>"
EMAIL_TOKEN_SECRET="cambiar-por-otro-secreto-largo"
FRONTEND_URL="http://localhost:3001"
EMAIL_CONTACTO="contacto@ejemplo.com"
```

El frontend no necesita variables nuevas.
