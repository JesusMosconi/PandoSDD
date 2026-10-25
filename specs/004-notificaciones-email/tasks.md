# Tasks: Notificaciones por correo electrónico (fase 1)

**Input**: `specs/004-notificaciones-email/spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/notificaciones.md` y `quickstart.md`.

**Organization**: fases por historia de usuario. Cada ruta indica su repositorio: raíz para `specs/` y `docs/`, `backend/` para la API y `frontend/` para Next. Completar una tarea por vez y preservar cambios ajenos. **Cierre de cada tarea**: si modifica `frontend/`, ejecutar `npm.cmd run lint` y `npm.cmd run build` desde ese repo antes de marcarla; si modifica `backend/`, ejecutar `npm.cmd test` y declarar que no existen scripts de lint ni build; ejecutar `git diff --check` en cada repo afectado y anotar el resultado en `specs/004-notificaciones-email/verificacion.md`.

**Tests**: la spec no pide TDD. Según `plan.md`, la lógica nueva lleva pruebas `node:test` sin dependencias nuevas: unitarias sin base en `backend/test/notificaciones.test.js` y de suscripción contra la base de prueba aislada en `backend/test/suscripciones.test.js`.

**Límites**: sin dependencias nuevas, sin cambios en `schema.prisma` ni migraciones. No leer ni escribir `.env`. No configurar variables en Render, hacer commit, push ni desplegar sin pedido explícito.

## Phase 1: Setup

**Purpose**: dejar listos ramas, aprobación y variables antes de tocar código.

- [X] T001 Verificar `git status --short --branch` en raíz, `backend/` y `frontend/`; crear la rama `004-notificaciones-email` en `backend/` desde `main` y en `frontend/` desde `master` sin perder cambios; registrar las ramas en `specs/004-notificaciones-email/verificacion.md` (raíz).
- [X] T002 Registrar en `specs/004-notificaciones-email/verificacion.md` (raíz) la aprobación explícita del plan por tocar rutas de autenticación (registro, login y cambio de contraseña), según la constitution VII. No empezar Phase 2 sin ella.
- [X] T003 Agregar a `backend/.env.example`, sin valores reales: `JWT_SECRET`, `RESEND_API_KEY`, `EMAIL_REMITENTE="PandoCBA <onboarding@resend.dev>"`, `EMAIL_TOKEN_SECRET`, `FRONTEND_URL="http://localhost:3001"` y `EMAIL_CONTACTO`, con un comentario breve de uso por variable (ver la tabla de `research.md`).

---

## Phase 2: Foundational

**Purpose**: utilidades y capa de envío compartidas por las tres historias. Depende de Phase 1.

- [X] T004 [P] Crear `backend/src/utils/email.js` con `normalizarEmail(valor)`, que devuelve `trim().toLowerCase()` o `null` si no es string o no cumple «hasta 254 caracteres, un solo `@`, parte local y dominio no vacíos, al menos un punto en el dominio que no esté al inicio ni al final, sin espacios» (misma regla que `normalizarEntrega` en `backend/src/services/checkout.js`, que no se modifica); y `enmascararEmail(email)` (`ana@mail.com` → `a***@mail.com`).
- [X] T005 [P] Crear `backend/src/utils/token-baja.js` con `firmarTokenBaja(id)`, `verificarTokenBaja(token)` y `tokenBajaDisponible()`: token `"<id>.<firma>"`, firma = base64url de HMAC-SHA256 con `EMAIL_TOKEN_SECRET` sobre `"baja-newsletter:<id>"`; validar `^\d+\.[A-Za-z0-9_-]{43}$` e id entero positivo; comparar con `crypto.timingSafeEqual`; devolver el id o `null`. Leer el secreto en cada llamada; lanzar un error si falta al firmar o verificar.
- [X] T006 Crear `backend/src/services/email.js` con `enviarEmail({ tipo, para, asunto, html, texto, responderA })`, que nunca rechaza. Sin `RESEND_API_KEY`: no llamar a `fetch`, registrar `[email:modo-registro] tipo=… para=<enmascarado> asunto="…"` y devolver `{ ok: true, modo: "registro" }`. Con la clave: `POST https://api.resend.com/emails` con `Authorization: Bearer`, cuerpo `{ from: EMAIL_REMITENTE ?? "PandoCBA <onboarding@resend.dev>", to: [para], subject, html, text, reply_to? }` y `AbortSignal.timeout(10000)`; devolver `{ ok: true, id }` u `{ ok: false, motivo }` (status y `message` de Resend, o nombre del error de red o timeout). Registrar tipo, destinatario enmascarado y resultado; nunca el HTML ni la clave. Depende de T004.
- [X] T007 [P] Crear `backend/src/services/plantillas-email.js` con `escaparHtml` (escapa `& < > " '`), un envoltorio HTML común (una columna de 600 px, estilos inline en blanco y negro, encabezado «PANDOCBA» en texto, sin imágenes remotas) y `urlFrontend(ruta)`, que usa `FRONTEND_URL`, si falta `CORS_ORIGIN` y si falta `http://localhost:3001`, sin barra final duplicada.
- [X] T008 Crear `backend/test/notificaciones.test.js` con pruebas sin base: `normalizarEmail` (mayúsculas y espacios, inválidos, no string), `enmascararEmail`, token (ida y vuelta, firma alterada, id no numérico o cero, formato roto, secreto distinto, error sin secreto), `escaparHtml`, y `enviarEmail` con `mock.method(globalThis, "fetch")` (sin clave no llama a `fetch`; con clave arma el cuerpo esperado; respuesta 403 y `fetch` que rechaza devuelven `{ ok: false }` sin lanzar). Restaurar variables de entorno y mocks después de cada prueba. Depende de T004–T007.

**Checkpoint**: capa de envío y utilidades probadas. Las tres historias pueden empezar; comparten `plantillas-email.js` y `notificaciones.js`, así que conviene hacerlas en orden.

---

## Phase 3: User Story 1 — Bienvenida al crear la cuenta (P1, MVP)

**Goal**: un registro exitoso envía un único correo de bienvenida sin afectar la respuesta; el correo se normaliza y el login sigue funcionando.

**Independent Test**: pasos de registro y login de la parte A de `quickstart.md`, y el registro de la parte B.

- [X] T009 [US1] Agregar `plantillaBienvenida({ nombre, urlCatalogo, urlCuenta })` en `backend/src/services/plantillas-email.js` con asunto «Bienvenido/a a PandoCBA», «Hola, {nombre}», botón «Ver catálogo» y enlace «Mi cuenta», y su versión de texto plano con las URL completas.
- [X] T010 [US1] Crear `backend/src/services/notificaciones.js` con `notificarBienvenida(usuario)`: arma la plantilla con `urlFrontend("/categorias")` y `urlFrontend("/cuenta")`, llama a `enviarEmail` con `tipo: "bienvenida"` y captura todo error sin rechazar.
- [X] T011 [US1] Modificar `POST /usuarios/registro` en `backend/src/routes/usuarios.routes.js`: envolver en `asyncHandler`; validar con `validateBody` (`nombre`, `apellido`, `email`, `password` string; `telefono` string opcional) sin perder el mensaje actual de campos requeridos; `normalizarEmail` → 400 «Ingresá un correo electrónico válido»; mantener la regla de 6 caracteres; buscar duplicados con `findFirst({ where: { email: { equals, mode: "insensitive" } } })` → 409 «El email ya está registrado»; crear con campos explícitos y mapear `P2002` a 409; responder 201 `{ usuario, token }` como hoy y después llamar a `void notificarBienvenida(usuario)`.
- [X] T012 [US1] Modificar `POST /usuarios/login` en `backend/src/routes/usuarios.routes.js` (D6): buscar con `findUnique` por el correo normalizado y, si no hay resultado, por el valor recibido sin cambios; mantener el resto del flujo, los códigos y los mensajes.
- [X] T013 [US1] Agregar a `backend/test/notificaciones.test.js` pruebas de `plantillaBienvenida` (URL de catálogo y cuenta presentes en HTML y texto; `<b>Ana</b>` aparece escapado) y de que `notificarBienvenida` resuelve aunque `fetch` rechace.
- [X] T014 [US1] Actualizar `docs/estado-actual/03-api-backend.md` (raíz): validación y normalización del registro, compatibilidad del login y la notificación de bienvenida.

**Checkpoint**: US1 se puede validar de punta a punta sin las otras historias.

---

## Phase 4: User Story 2 — Aviso de contraseña cambiada (P1)

**Goal**: un cambio de contraseña exitoso envía el aviso de seguridad sin afectar la respuesta.

**Independent Test**: pasos de cambio de contraseña de las partes A y B de `quickstart.md`.

- [X] T015 [US2] Agregar `plantillaCambioPassword({ nombre, fechaHora, emailContacto })` en `backend/src/services/plantillas-email.js`: asunto «Se cambió la contraseña de tu cuenta»; fecha con `Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Cordoba", dateStyle: "long", timeStyle: "short" })`; «Si no fuiste vos, contactanos» con `EMAIL_CONTACTO`, o «respondé a este correo» si falta. Sin contraseñas ni enlaces para cambiarla.
- [X] T016 [US2] Agregar `notificarCambioPassword(usuario, fecha)` en `backend/src/services/notificaciones.js` con `tipo: "cambio_password"` y `responderA: EMAIL_CONTACTO` si existe; nunca rechaza.
- [X] T017 [US2] Modificar `PUT /usuarios/cambiar-password` en `backend/src/routes/usuarios.routes.js`: envolver en `asyncHandler` conservando validaciones, códigos y mensajes; después del `update` exitoso, responder y llamar a `void notificarCambioPassword(usuario, new Date())`. No notificar en ningún camino de error.
- [X] T018 [US2] Agregar a `backend/test/notificaciones.test.js` pruebas de `plantillaCambioPassword`: fecha de Córdoba para un instante fijo, contacto presente o texto alternativo, y ausencia de `http` en el cuerpo del aviso.
- [X] T019 [US2] Actualizar `docs/estado-actual/03-api-backend.md` (raíz) con la notificación del cambio de contraseña.

**Checkpoint**: US2 se puede validar de punta a punta.

---

## Phase 5: User Story 3 — Suscripción y baja del newsletter (P1)

**Goal**: agradecimiento con enlace de baja, reactivación de suscripciones dadas de baja y baja confirmada desde una página.

**Independent Test**: pasos de suscripción de la parte A, todos los pasos de suscripción y baja de la parte B y los casos sin `EMAIL_TOKEN_SECRET` de la sección 4 de `quickstart.md`.

- [X] T020 [US3] Crear `backend/src/services/suscripciones.js` (D7) con `ErrorSuscripcionActiva`, `suscribir(email)` y `darDeBaja(id)`. `suscribir` busca sin distinguir mayúsculas: si está activa, lanza el error; si está inactiva, aplica `updateMany({ where: { id, activo: false }, data: { activo: true, fechaSuscripcion: new Date() } })` y con `count === 0` lanza el error; si no existe, crea con el correo normalizado y mapea `P2002` al error; devuelve `{ suscripcion, estado: "creada" | "reactivada" }`. `darDeBaja` usa `updateMany({ where: { id }, data: { activo: false } })` y no falla si `count === 0`.
- [X] T021 [US3] Crear `backend/test/suscripciones.test.js` con `exigirBasePrueba()`: creación, 409 si está activa, reactivación con fecha nueva, fila heredada con mayúsculas tratada como la misma, dos `suscribir` simultáneos sobre una fila inactiva (exactamente una reactivación), baja idempotente y baja de id inexistente. Correos `@example.invalid` con sufijo aleatorio y limpieza al final. Si la base de prueba no está disponible, registrarlo en `verificacion.md` sin marcar la tarea.
- [X] T022 [US3] Agregar `plantillaSuscripcion({ urlBaja })` en `backend/src/services/plantillas-email.js` (asunto «Gracias por suscribirte a PandoCBA», enlace «Darte de baja») y `notificarSuscripcion(suscripcion)` en `backend/src/services/notificaciones.js`, que firma el token, arma `urlFrontend("/newsletter/baja?token=…")` con el token codificado y envía con `tipo: "suscripcion"`. Si falta `EMAIL_TOKEN_SECRET`, registra el motivo y no envía; nunca rechaza.
- [X] T023 [US3] Modificar `backend/src/routes/suscripcion.routes.js`. En `POST /suscripciones`: `validateBody` → `normalizarEmail` → 400 «Ingresá un correo electrónico válido» → `suscribir` → 200 con la suscripción → `void notificarSuscripcion(suscripcion)`; `ErrorSuscripcionActiva` → 409 «Ya existe una suscripción con este email». Agregar `POST /suscripciones/baja` público con `asyncHandler`: `validateBody({ token: "string" })`; si `!tokenBajaDisponible()` → 503 «La baja no está disponible en este momento»; si el token es inválido → 400 «El enlace de baja no es válido»; si no, `darDeBaja(id)` → 200 `{ message: "Tu suscripción fue dada de baja" }`. GET y DELETE de administración sin cambios.
- [X] T024 [US3] Agregar a `backend/test/notificaciones.test.js` pruebas de `plantillaSuscripcion` (URL de baja con token verificable) y de que `notificarSuscripcion` sin secreto no llama a `fetch` ni rechaza.
- [X] T025 [P] [US3] Crear `frontend/src/types/suscripcion.ts` con `export type RespuestaBajaSuscripcion = { message: string };`.
- [X] T026 [US3] Crear `frontend/src/components/ConfirmarBajaNewsletter.tsx` (`"use client"`) que recibe `token` y muestra los estados inicial, enviando, confirmada, enlace inválido (400) y error con reintento, con los textos de `contracts/notificaciones.md`. Llama a `apiFetch<RespuestaBajaSuscripcion>("/suscripciones/baja", { method: "POST", body: JSON.stringify({ token }) })`; mensajes con `role="status"`, botón operable por teclado y deshabilitado mientras envía; estilo consistente con `NewsletterForm.tsx`. Depende de T025.
- [X] T027 [US3] Crear `frontend/src/app/newsletter/baja/page.tsx` como Server Component que espera `searchParams` (`Promise` en Next 16, como en `src/app/categorias/[id]/page.tsx`). Sin `token` string, muestra «El enlace de baja no es válido» y un enlace al inicio; con token, renderiza `ConfirmarBajaNewsletter`. Agregar metadata con `robots: { index: false }`. Depende de T026.
- [X] T028 [US3] Actualizar `docs/estado-actual/03-api-backend.md` (POST de suscripción y nueva ruta de baja), `docs/estado-actual/04-frontend.md` (página `/newsletter/baja`) y `docs/estado-actual/06-flujos-de-negocio.md` (suscripción, reactivación, baja y notificaciones) (raíz).

**Checkpoint**: US3 se puede validar de punta a punta.

---

## Phase 6: Polish & Cross-Cutting

- [X] T029 Actualizar `docs/estado-actual/07-entorno-y-comandos.md` (raíz): variables nuevas por nombre, cómo se configuran en Render (panel *Environment*, porque `.env` está en `.gitignore` y no llega al deploy) y el modo registro sin `RESEND_API_KEY`.
- [X] T030 Actualizar `docs/estado-actual/08-deuda-y-riesgos.md` (raíz): ítem 4 resuelto para registro y suscripción, con compatibilidad del login (D6); nueva excepción justificada `POST /suscripciones/baja` sin `verificarToken`; rate limit pendiente en rutas públicas que envían correo; sin dominio verificado (solo entrega al dueño de la cuenta de Resend); sin reintentos; correos heredados con mayúsculas no migrados.
- [X] T031 Ejecutar `quickstart.md` partes A y 4 (sin envío real) y, si el usuario provee una cuenta de Resend, la parte B; registrar resultados reales y lo no verificado en `specs/004-notificaciones-email/verificacion.md` (raíz).
- [X] T032 Revisar el diff de `backend/` y `frontend/` contra la constitution (asyncHandler, campos explícitos, mensajes en español, UTF-8, sin código muerto, sin secretos) y contra FR-001 a FR-013; correr `npm.cmd test` (backend), `npm.cmd run lint` y `npm.cmd run build` (frontend) y `git diff --check` en los tres repos; registrar en `verificacion.md`.
- [X] T033 Preparar para el usuario la lista de variables a cargar en Render (backend) antes del deploy: `RESEND_API_KEY`, `EMAIL_REMITENTE`, `EMAIL_TOKEN_SECRET`, `FRONTEND_URL` (URL de Vercel de producción) y `EMAIL_CONTACTO`. No configurarlas desde el agente.

## Dependencies & Execution Order

- **Setup**: T001 → T002 (aprobación) → T003.
- **Foundational**: T004, T005 y T007 en paralelo; T006 depende de T004; T008 depende de T004–T007.
- **US1**: T009 → T010 → T011; T012 después de T011 (mismo archivo); T013 después de T010; T014 al final.
- **US2**: depende de Foundational. T015 → T016 → T017; T018 después de T016; T019 al final. Comparte archivos con US1 (`plantillas-email.js`, `notificaciones.js`, `usuarios.routes.js`): hacerla después de US1.
- **US3**: depende de Foundational. T020 → T021; T022 después de T005 y T007; T023 depende de T020 y T022; T024 después de T022; T025 → T026 → T027 (frontend, puede avanzar en paralelo con T020–T024); T028 al final.
- **Polish**: después de las historias incluidas en la entrega.

## Parallel Opportunities

- **Foundational**: T004 (`utils/email.js`), T005 (`utils/token-baja.js`) y T007 (`plantillas-email.js`) tocan archivos distintos.
- **US3**: el frontend (T025–T027) avanza en paralelo con el backend (T020–T024) porque el contrato ya está fijado en `contracts/notificaciones.md`.

## Implementation Strategy

1. Setup y Foundational: capa de envío probada en modo registro, sin red.
2. **MVP = US1** (bienvenida): valida de punta a punta la capa de envío, la normalización y el login.
3. US2 y después US3, validando cada una con `quickstart.md`.
4. Polish: documentación, verificación y lista de variables para Render. Sin commit, push ni deploy sin pedido explícito.
