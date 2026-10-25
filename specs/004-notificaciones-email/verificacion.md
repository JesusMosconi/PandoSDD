# Verificación: Notificaciones por correo electrónico (fase 1)

## T001 — Ramas (2026-10-23)

| Repo | Rama de origen | Rama de trabajo | Estado previo |
|---|---|---|---|
| Raíz (`PandoSDD`) | `master` | `004-notificaciones-email` | Solo `specs/004-notificaciones-email/` sin rastrear |
| `backend/` (`PandoCbaV2`) | `main` (al día con `origin/main`) | `004-notificaciones-email` | Limpio |
| `frontend/` (`PandoCbaFrontend`) | `master` (al día con `origin/master`) | `004-notificaciones-email` | Limpio |

Guías revisadas: `AGENTS.md` raíz, `frontend/AGENTS.md` y `frontend/CLAUDE.md` (Next 16: consultar `node_modules/next/dist/docs/`). `backend/` no tiene `AGENTS.md` ni `CLAUDE.md`.

## T002 — Aprobación (2026-10-23)

El usuario aprobó el plan y pidió continuar con las etapas de `tasks.md`. La aprobación cubre los cambios en rutas de autenticación: registro, login (D6) y cambio de contraseña. No cubre configurar variables en Render, commit, push ni deploy.

## T003–T030 — Implementación (2026-10-23)

Backend (`PandoCbaV2`, rama `004-notificaciones-email`): `.env.example`, `src/utils/email.js`, `src/utils/token-baja.js`, `src/services/email.js`, `src/services/plantillas-email.js`, `src/services/notificaciones.js`, `src/services/suscripciones.js`, `src/routes/usuarios.routes.js` (registro, login, cambio de contraseña), `src/routes/suscripcion.routes.js`, `test/notificaciones.test.js`, `test/suscripciones.test.js`. Sin dependencias nuevas ni cambios de esquema.

Frontend (`PandoCbaFrontend`, rama `004-notificaciones-email`): `src/types/suscripcion.ts`, `src/components/ConfirmarBajaNewsletter.tsx`, `src/app/newsletter/baja/page.tsx`.

Raíz: `docs/estado-actual/03`, `04`, `06`, `07` y `08`.

Desvío menor del orden de `tasks.md`: las tres plantillas (T009, T015 y la de T022) se escribieron juntas en T007 porque comparten archivo. La hora del aviso usa formato de 24 horas (`hourCycle: "h23"`) porque `es-AR` devolvía «3:30 p. m.».

## T032 — Comprobaciones (2026-10-23)

| Comprobación | Resultado |
|---|---|
| `node --test test/notificaciones.test.js test/suscripciones.test.js` | 12 pasan, 0 fallan, 4 omitidas (base de prueba no configurada en esta terminal) |
| `npm test` (suite completa, backend) | 68 tests: 23 pasan, 11 omitidas, 34 fallan. Las 34 son pruebas existentes de 002/003 que fallan en `exigirBasePrueba()` porque la terminal no tiene `DATABASE_URL` de la base de prueba (hostname `invalid`). No están relacionadas con 004. |
| Backend lint/build | No existen scripts de lint ni build. |
| Carga de módulos de rutas | `usuarios.routes.js` y `suscripcion.routes.js` importan sin errores. |
| HTTP local sin base (`DATABASE_URL` inválida a propósito, puertos 3999 y 3998) | Baja sin token → 400 `El campo "token" es obligatorio`; token roto → 400 «El enlace de baja no es válido»; token firmado con otro secreto → 400; sin `EMAIL_TOKEN_SECRET` → 503 «La baja no está disponible en este momento»; suscripción con correo inválido → 400; registro con correo inválido → 400; registro con contraseña numérica → 400 (antes 500); registro sin campos → 400 con el mensaje anterior. |
| `npm run lint` (frontend) | 0 errores; 9 avisos `no-img-element`, todos en archivos que ya existían. |
| `npm run build` (frontend) | Compila; ruta `ƒ /newsletter/baja` generada. |
| `git diff --check` en los tres repos | Sin problemas. |
| Revisión contra la constitution | `asyncHandler` en handlers nuevos y modificados (login sigue con `try/catch`, fuera de alcance); campos explícitos en `create`; mensajes en español; UTF-8; sin secretos en el código; excepción de la ruta de baja documentada. |

## Pendiente de verificar

- **T021**: `test/suscripciones.test.js` contra la base de prueba aislada (creación, 409, reactivación, fila con mayúsculas, carrera, baja idempotente). Requiere las variables de la base de prueba en la terminal.
- **T031**: parte A de `quickstart.md` con base (registro, login con mayúsculas, cambio de contraseña y suscripción de punta a punta) y parte B con Resend real.
- Carga de variables en Render y envío real a terceros (requiere dominio propio verificado).
