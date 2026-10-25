# Data Model: Notificaciones por correo electrónico (fase 1)

**Sin cambios de esquema ni migraciones.** Se reutilizan entidades existentes de `backend/prisma/schema.prisma`.

## Usuario (existente, sin cambios)

| Campo | Uso en esta fase |
|---|---|
| `nombre` | Saludo en bienvenida y aviso de contraseña (escapado en HTML) |
| `email` | Destinatario. Las cuentas nuevas lo guardan normalizado (minúsculas, sin espacios); las heredadas conservan su valor |
| `activo` | Sin cambios: un usuario inactivo no puede cambiar la contraseña y no recibe el aviso |

**Reglas nuevas**: no se crea una cuenta si ya existe otra con el mismo correo sin distinguir mayúsculas. El login busca primero el correo normalizado y después el valor recibido tal cual.

## Suscripcion (existente, sin cambios de columnas)

| Campo | Uso en esta fase |
|---|---|
| `id` | Lo que firma el token de baja |
| `email` | Destinatario; se guarda normalizado en filas nuevas |
| `activo` | `true` suscripta, `false` dada de baja (baja lógica) |
| `fechaSuscripcion` | Se actualiza al reactivar |
| `usuarioId` | Sin uso en esta fase |

### Transiciones

```text
(no existe) ──suscribir──▶ activa                     → correo de agradecimiento
activa      ──suscribir──▶ activa (409)               → sin correo
inactiva    ──suscribir──▶ activa + fechaSuscripcion  → correo de agradecimiento
activa      ──baja (token) / DELETE admin──▶ inactiva → sin correo
inactiva    ──baja (token)──▶ inactiva (200)          → sin correo, idempotente
```

La búsqueda por correo no distingue mayúsculas, así que una fila heredada `Ana@Mail.com` y una solicitud `ana@mail.com` son la misma suscripción.

## Enlace de baja (no persistido)

- Formato: `<id>.<firma>`, donde `firma` es el HMAC-SHA256 en base64url (43 caracteres) de `"baja-newsletter:<id>"` con `EMAIL_TOKEN_SECRET`.
- Válido mientras no cambie el secreto. No vence.
- Identifica una sola suscripción; no contiene el correo.

## Notificación por correo (no persistida)

| Atributo | Valores |
|---|---|
| `tipo` | `bienvenida`, `cambio_password`, `suscripcion` |
| `para` | Correo de la cuenta o de la suscripción |
| `asunto`, `html`, `texto` | Generados por las plantillas |
| Resultado | `{ ok: true, id }`, `{ ok: true, modo: "registro" }` u `{ ok: false, motivo }`; solo se registra en los logs, con el destinatario enmascarado |
