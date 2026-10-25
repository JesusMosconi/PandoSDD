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

## T021 y T031 — Pruebas locales con base (2026-10-25)

**Base usada: la de producción, con autorización explícita del usuario.** La rama de prueba de Neon (`br-snowy-glitter-acxy36q0`) no estaba accesible y por el momento solo el equipo usa la base, así que el usuario autorizó crear y borrar usuarios y suscripciones de prueba en ella, por esta única vez. Para no tocar el catálogo, **no se corrió la suite completa**: los tests de 002/003 crean categorías, productos, stock y órdenes. `exigirBasePrueba()` no se modificó. Las variables se cargaron con `node --env-file` desde un archivo fuera del repo; no se leyó ningún `.env`.

| Comprobación | Resultado |
|---|---|
| T021: copia de `test/suscripciones.test.js` sin `exigirBasePrueba()` (mismos 4 casos y misma limpieza) | 4 pasan, 0 fallan: creación, 409 si está activa, baja idempotente, reactivación con la misma fila y fecha nueva, fila heredada con mayúsculas tratada como la misma, dos `suscribir` simultáneos con exactamente una reactivación, baja de id inexistente sin error. |
| `node --test test/notificaciones.test.js` | 12 pasan, 0 fallan. |
| Parte A por HTTP contra el backend local (`/api`, puerto 3998, sin `RESEND_API_KEY`) | 13/13 correctos: registro con `Prueba004…@Ejemplo.com ` → 201 y correo guardado en minúsculas; login con mayúsculas → 200; registro duplicado → 409 «El email ya está registrado»; cambio con contraseña actual incorrecta → 401; cambio correcto → 200 y login con la nueva → 200; login de una cuenta heredada guardada con mayúsculas (D6) → 200; suscripción → 200 en minúsculas; suscripción repetida → 409 «Ya existe una suscripción con este email»; baja con token firmado → 200 y `activo = false`; baja repetida → 200; token alterado → 400 «El enlace de baja no es válido»; volver a suscribirse → 200, misma fila, `activo = true` y `fechaSuscripcion` nueva. |
| Logs de la parte A | Exactamente un `[email:modo-registro]` por éxito: `tipo=bienvenida`, `tipo=cambio_password` y dos `tipo=suscripcion` (alta y re-suscripción), todos con `para=p***@ejemplo.com`. Ningún registro en los caminos 409 y 401. |
| Sección 4 (puerto 3997, `RESEND_API_KEY` inventada, sin `EMAIL_TOKEN_SECRET`) | Registro → 201 y log `tipo=bienvenida ok=false motivo="401 API key is invalid"`; suscripción → 200 y log `motivo="Falta EMAIL_TOKEN_SECRET para los enlaces de baja"`, sin envío; baja → 503 «La baja no está disponible en este momento». |
| Limpieza | Se borraron todos los usuarios y suscripciones creados (`@example.invalid` y `…004…@ejemplo.com`); un conteo posterior dio 0 restos. |
| Codificación | El asunto «Se cambió la contraseña…» es correcto en el log (UTF-8). La «Ã» que se vio al principio era solo cómo `Get-Content` de PowerShell 5.1 mostraba el archivo. |

Las pruebas de la parte A se hicieron llamando a la API directamente, sin pasar por la UI del frontend; la página `/newsletter/baja` en el navegador queda para la parte B.

## T031 — Parte B con Resend real (2026-10-25)

Backend local en el puerto 3000 con la misma base (autorizada, ver arriba) y una `RESEND_API_KEY` real cargada desde un archivo fuera del repo. El usuario hizo los pasos en el navegador, con el frontend en `npm run dev` y el correo dueño de la cuenta de Resend como destinatario.

| Paso | Resultado |
|---|---|
| Registro | Resend aceptó y entregó la bienvenida (`last_event=delivered`, consultado por API). No apareció en la bandeja de entrada de Gmail: se filtró por el remitente compartido `onboarding@resend.dev`. No es un fallo del código; se resuelve con dominio propio verificado. |
| Cambio de contraseña | Llegó el aviso, con `reply_to` = `EMAIL_CONTACTO`. Ni el HTML ni el texto plano contienen URL. |
| Suscripción, baja, baja repetida, token alterado y re-suscripción | Llegaron los correos y el enlace abrió `/newsletter/baja` sin dar de baja hasta confirmar; el resto se comportó como describe el quickstart, según el usuario. Estado final en la base: una sola fila, en minúsculas, `activo = true` y `fechaSuscripcion` nueva. |
| Texto plano (consultado por la API de Resend) | Los tres tipos tienen versión de texto con las mismas URL que el HTML: `/categorias` y `/cuenta` en la bienvenida, `/newsletter/baja?token=…` en la suscripción, ninguna en el aviso. |
| 403 con destinatario ajeno (sección 4) | Registro → 201 y log `ok=false motivo="403 You can only send testing emails to your own email address…"`. Con un dominio `example.com`, Resend responde 422 en lugar de 403; también se registra y no afecta la respuesta. Usuarios de prueba borrados. |
| `<b>Ana</b>` en el correo real | No se probó: el registro se hizo con otro nombre. Lo cubre `test/notificaciones.test.js` (escapado en HTML y texto). |

### Bugs encontrados y corregidos (frontend, commit `cdf327b`)

- **Cambio de contraseña con mensaje de error falso**: `CuentaPanel` llamaba a `event.currentTarget.reset()` después del `await`. React ya había puesto `currentTarget` en `null`, así que la excepción caía en el `catch` y mostraba «No pudimos actualizar tu contraseña» aunque el cambio era exitoso. Ahora se guarda el formulario antes del `await`.
- **Formulario «Más información» del footer sin conectar**: solo hacía `console.log`, heredado. Ahora llama a `POST /suscripciones` y muestra el resultado.
- **Mensaje de la suscripción que persistía**: ahora se borra a los 6 segundos o al volver a escribir. La lógica de los dos formularios se extrajo a `src/lib/useSuscripcionNewsletter.ts`.

`npm run lint`: 0 errores (los mismos 9 avisos `no-img-element` heredados). `npm run build`: compila. `git diff --check`: sin problemas. El usuario volvió a probar en el navegador y confirmó que todo funciona.

### Observación

El `motivo` del 403 que devuelve Resend incluye completo el correo dueño de la cuenta, y se registra tal cual en la consola. No es un dato de clientes, pero conviene tenerlo en cuenta al compartir logs.

## Pendiente de verificar

- **T021 en la base de prueba aislada** con `npm.cmd test` y `exigirBasePrueba()`, junto con la suite completa de 002/003, cuando vuelva a estar disponible la rama de prueba de Neon.
- Carga de variables en Render y envío real a terceros (requiere dominio propio verificado).
