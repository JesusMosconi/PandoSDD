# Implementation Plan: Notificaciones por correo electrónico (fase 1)

**Branch**: `004-notificaciones-email` (creada en el repo raíz; crear la misma rama en `backend/` desde `main` y en `frontend/` desde `master` al empezar la implementación) | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Spec 004 con tres aclaraciones del 2026-10-23. Este plan define el diseño; no autoriza escribir en servicios externos ni configurar variables en producción.

## Summary

Agregar al backend una capa de envío de correo genérica (Resend por HTTP con el `fetch` nativo, sin dependencias nuevas) y tres notificaciones disparadas después de persistir: bienvenida (registro), aviso de contraseña cambiada y agradecimiento de suscripción con enlace de baja. El envío nunca bloquea ni altera la respuesta: se dispara sin `await`, captura sus errores y los registra. Sin `RESEND_API_KEY`, solo registra lo que habría enviado. La baja usa un token HMAC sobre el id de la suscripción, se confirma desde una página nueva del frontend y se aplica con una ruta pública `POST /suscripciones/baja`. La suscripción de un correo dado de baja se reactiva. Los correos de registro y suscripción se normalizan, y el login se adapta para no dejar afuera a quien se registre con mayúsculas.

## Technical Context

**Language/Version**: JavaScript ESM en backend (Node local verificado: v24.17.0; GitHub Actions usa Node 22; la versión del host de producción no está documentada, pero `fetch` y `AbortSignal.timeout` existen desde Node 18). TypeScript strict con Next.js 16 y React 19 en frontend.

**Primary Dependencies**: Express 5.2.1, Prisma 7.8 con `@prisma/adapter-pg`. API HTTP de Resend (`POST https://api.resend.com/emails`). **Sin dependencias nuevas** en ningún repo.

**Storage**: PostgreSQL existente. **Sin cambios de esquema ni migraciones**: se reutilizan `Usuario` y `Suscripcion`. Las notificaciones no se persisten.

**Testing**: `node:test` en `backend/test/`. Tests unitarios sin base para token, normalización, plantillas y capa de envío (con `fetch` simulado vía `mock.method`). Tests de reactivación y baja contra la base de prueba aislada con `exigirBasePrueba()` de `test/soporte/escenario.js`. Frontend: `npm run lint` y `npm run build`. Backend: sin scripts de lint ni build; declararlo al cerrar.

**Target Platform**: API Node/Express y web Next. Las variables nuevas se configuran en el host del backend; ese host no está documentado en `docs/estado-actual/` y se verifica antes de desplegar.

**Project Type**: E-commerce web con `backend/` y `frontend/` separados y documentación/specs en el repo raíz.

**Performance Goals**: Ninguna acción principal suma más de 1 segundo por causa del correo (SC-002). Como el envío no se espera, el costo en la respuesta es despreciable. Timeout de 10 segundos por envío para no dejar promesas colgadas.

**Constraints**: Sin dominio verificado, Resend solo entrega al correo dueño de la cuenta (remitente `onboarding@resend.dev`). Plan gratuito de Resend: 3.000 correos/mes y 100/día. Sin reintentos ni cola. Sin cambios de esquema.

**Scale/Scope**: Un correo por registro, cambio de contraseña o suscripción. 3 tipos de notificación, 2 rutas modificadas en `usuarios.routes.js` más login (ver decisión D6), 1 ruta modificada y 1 nueva en `suscripcion.routes.js`, 1 página nueva en frontend.

## Constitution Check

*GATE: evaluado antes de investigar y otra vez después del diseño.*

| Principio | Decisión y verificación prevista | Estado |
|---|---|---|
| I. Separación | Envío, firma y verificación del token y reglas de suscripción en backend. El frontend solo presenta la página de baja y delega la confirmación a Express. | Cumple |
| II. Datos | Sin cambios de esquema. La baja es lógica (`activo: false`); la reactivación actualiza la misma fila. | Cumple |
| III. API | Handlers nuevos y modificados con `asyncHandler`; datos construidos con campos explícitos; entradas validadas con `validateBody` más normalización de correo. **Excepción**: `POST /suscripciones/baja` escribe sin `verificarToken` (ver Complexity Tracking). `POST /usuarios/registro` y `POST /suscripciones` ya eran públicas (excepciones heredadas registradas en `08-deuda-y-riesgos.md`). | Cumple con una excepción justificada |
| IV. Seguridad | `RESEND_API_KEY` y `EMAIL_TOKEN_SECRET` solo por entorno y listadas por nombre en `.env.example`. Correos normalizados a minúsculas. Comparación de firma en tiempo constante. Sin contraseñas en correos ni en logs. El JWT no se toca. | Cumple |
| V. Frontend | La página de baja es Server Component; solo el botón de confirmación es cliente. Usa `apiFetch` de `src/lib/api.ts`; el tipo de respuesta va en `src/types/suscripcion.ts`. No es una operación autenticada, así que no requiere BFF (igual que `NewsletterForm`). | Cumple |
| VI. Calidad | UTF-8; tests para la lógica nueva porque el backend ya tiene `node:test`; lint y build en frontend; declarar ausencia de lint/build en backend. | Cumple |
| VII. SDD | Spec escrita y revisada, este plan, después `tasks.md`. Toca rutas de autenticación (registro, cambio de contraseña, login): requiere aprobación explícita de este plan antes de implementar. | Pendiente de aprobación |

**Gate**: Sin violaciones no justificadas. La única excepción nueva está en Complexity Tracking. Implementar requiere aprobación explícita del plan por tocar autenticación.

## Phase 0: Research decisions

Ver [research.md](research.md). Resumen:

- **D1** Resend por HTTP con `fetch` nativo; sin SDK.
- **D2** Envío sin esperar, después de persistir, sin cola ni reintentos.
- **D3** Modo registro (sin enviar) cuando falta `RESEND_API_KEY`.
- **D4** Token de baja `"<id>.<firma>"` con HMAC-SHA256 y un secreto propio; sin vencimiento.
- **D5** La baja se confirma con un POST desde una página, no al abrir el enlace.
- **D6** Normalización de correo con compatibilidad para cuentas heredadas en mayúsculas, incluido el login.
- **D7** La lógica de suscripción pasa a un servicio para poder probarla.
- **D8** Plantillas como funciones puras con escape HTML y versión de texto plano.

## Phase 1: Design

- [data-model.md](data-model.md): entidades reutilizadas, transiciones de la suscripción, token y notificación.
- [contracts/notificaciones.md](contracts/notificaciones.md): rutas modificadas y nueva, variables de entorno, interfaz de la capa de envío y contenido de cada correo.
- [quickstart.md](quickstart.md): validación local y con Resend real.

### Flujo por acción

1. **Registro** (`POST /usuarios/registro`): validar con `validateBody` (`nombre`, `apellido`, `email`, `password` string; `telefono` opcional) → `normalizarEmail` → 400 si es inválido → buscar duplicado sin distinguir mayúsculas → 409 → crear con campos explícitos (un `P2002` por carrera también responde 409) → responder 201 como hoy → `void notificarBienvenida(usuario)`.
2. **Cambio de contraseña** (`PUT /usuarios/cambiar-password`): misma lógica de hoy dentro de `asyncHandler` → después del `update` exitoso, responder → `void notificarCambioPassword(usuario, new Date())`.
3. **Login** (`POST /usuarios/login`): buscar por el correo normalizado; si no existe, buscar por el valor recibido tal cual (cuentas heredadas). El resto queda igual. Ver D6.
4. **Suscripción** (`POST /suscripciones`): `suscribir(email)` en `services/suscripciones.js` → `creada` o `reactivada` → responder 200 con la suscripción (mismo contrato) → `void notificarSuscripcion(suscripcion)`. Si ya está activa → 409 sin correo.
5. **Baja** (`POST /suscripciones/baja`): `verificarTokenBaja(token)` → id o `null` → 400 «El enlace de baja no es válido» → `darDeBaja(id)` (idempotente; si la fila no existe también responde éxito, según el borde de la spec) → 200 `{ message: "Tu suscripción fue dada de baja" }`. Sin `EMAIL_TOKEN_SECRET` → 503.

### Garantías de no bloqueo

- Cada `notificar*` es `async` y envuelve todo en `try/catch`; nunca rechaza. Las rutas lo llaman con `void` después de responder.
- `enviarEmail` usa `AbortSignal.timeout(10000)`, no lanza y devuelve `{ ok: true, id }` u `{ ok: false, motivo }`.
- Se registra: tipo de notificación, destinatario enmascarado (`a***@mail.com`), resultado e id de Resend o motivo. Nunca el HTML, contraseñas ni la clave.

### Review points before implementation

- **Autenticación**: el cambio en login (D6) es necesario para no romper el acceso de quien se registre con mayúsculas. Requiere aprobación explícita.
- **Host de producción** (confirmado el 2026-10-23): el backend corre en Render y el frontend en Vercel. `.env` está en `backend/.gitignore`, así que sus valores **no** llegan a Render con el deploy: las 5 variables nuevas se cargan a mano en el panel *Environment* del servicio de Render. `FRONTEND_URL` es la URL de producción de Vercel. Sin `EMAIL_TOKEN_SECRET` no hay correos de suscripción ni bajas (falla cerrada).
- **Dominio** (confirmado el 2026-10-23): no hay dominio propio. El subdominio `*.vercel.app` no sirve para Resend, porque requiere cargar registros DNS (SPF y DKIM) en un dominio que se controle. Hasta verificar un dominio propio, solo llega correo al dueño de la cuenta de Resend. Los registros y suscripciones de otras personas en producción generarían errores 403 de Resend en los logs, sin afectar a nadie. Decidir si se configura `RESEND_API_KEY` en producción antes de tener dominio.
- **Datos heredados**: correos con mayúsculas en `Usuario` y `Suscripcion` no se migran; la búsqueda sin distinguir mayúsculas evita duplicados nuevos. Si existieran dos filas que solo difieren en mayúsculas, se toma la más antigua y se registra el caso en `08-deuda-y-riesgos.md`.

## Project Structure

### Documentation (this feature)

```text
specs/004-notificaciones-email/
├── spec.md
├── checklists/requirements.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/notificaciones.md
├── tasks.md                 # lo genera $speckit-tasks
└── verificacion.md          # se crea al ejecutar las tareas
```

### Source Code (repositorios separados; archivos previstos)

```text
backend/
├── .env.example                          # + JWT_SECRET, RESEND_API_KEY, EMAIL_REMITENTE, EMAIL_TOKEN_SECRET, FRONTEND_URL, EMAIL_CONTACTO
├── src/utils/email.js                    # nuevo: normalizarEmail, enmascararEmail
├── src/utils/token-baja.js               # nuevo: firmarTokenBaja, verificarTokenBaja
├── src/services/email.js                 # nuevo: enviarEmail (Resend o modo registro)
├── src/services/plantillas-email.js      # nuevo: plantillas puras { asunto, html, texto }
├── src/services/notificaciones.js        # nuevo: notificarBienvenida, notificarCambioPassword, notificarSuscripcion
├── src/services/suscripciones.js         # nuevo: suscribir, darDeBaja
├── src/routes/usuarios.routes.js         # registro, login, cambiar-password
├── src/routes/suscripcion.routes.js      # POST /suscripciones y nueva POST /suscripciones/baja
├── test/notificaciones.test.js           # nuevo: unitarios sin base
└── test/suscripciones.test.js            # nuevo: contra base de prueba
frontend/
├── src/app/newsletter/baja/page.tsx      # nuevo: Server Component que lee ?token=
├── src/components/ConfirmarBajaNewsletter.tsx   # nuevo: "use client", botón y estados
└── src/types/suscripcion.ts              # nuevo: RespuestaBajaSuscripcion
docs/estado-actual/                        # repo raíz
├── 03-api-backend.md                     # rutas de suscripción, registro y login
├── 04-frontend.md                        # página /newsletter/baja
├── 06-flujos-de-negocio.md               # notificaciones y baja
├── 07-entorno-y-comandos.md              # variables nuevas
└── 08-deuda-y-riesgos.md                 # excepción de baja pública, rate limit, dominio, ítem 4 parcialmente resuelto
```

**Structure Decision**: se respetan los dos repositorios de código y el repo raíz de documentación. En backend, la lógica nueva va en `services/` y `utils/` como en 002 y 003; las rutas solo orquestan. `services/checkout.js` no se toca aunque tenga su propia validación de correo: unificarla queda fuera de alcance.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| `POST /suscripciones/baja` escribe sin `verificarToken` (constitution III) | Quien se suscribe al newsletter no necesariamente tiene cuenta; la baja debe funcionar desde el correo sin iniciar sesión (FR-005, SC-004). El token HMAC solo puede generarlo el sistema y autoriza exactamente una suscripción. | Exigir sesión impide la baja a suscriptores sin cuenta. Una baja por GET al abrir el enlace sería más simple, pero los analizadores de enlaces de los clientes de correo la dispararían solos. |
| Login modificado aunque no lo pide la spec | Al normalizar el correo en registro, el login sin normalizar dejaría afuera a quien se registró con mayúsculas. | No normalizar en registro contradice la constitution IV para código modificado. Normalizar solo en login rompería las cuentas heredadas con mayúsculas. |
