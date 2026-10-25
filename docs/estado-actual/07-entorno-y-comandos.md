# Entorno y comandos

## Backend

Desde `backend/`, `npm ci` instala el lockfile y ejecuta `postinstall` (`prisma generate`); `npm run dev` usa nodemon y `npm start` ejecuta `node src/index.js`. Para aplicar las migraciones versionadas, el comando Prisma es `npx prisma migrate deploy`; **No verificado:** que se haya ejecutado en alguna base o despliegue. El backend no define script propio de migración, build, test o deploy. Fuentes: `backend/package.json`, `backend/package-lock.json`, `backend/prisma.config.ts`, `backend/prisma/migrations/`.

Variables leídas por backend: `DATABASE_URL` (`db.js`, `prisma.config.ts`), `JWT_SECRET` y `JWT_EXPIRES_IN` (`index.js`, `usuarios.routes.js`, `auth.js`), `CORS_ORIGIN` y `PORT` (`index.js`), `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (`utils/upload.js`). `backend/.env.example` enumera `DATABASE_URL`, `CORS_ORIGIN` y las tres de Cloudinary; faltan `JWT_SECRET`, `JWT_EXPIRES_IN` y `PORT`. Algunas tienen valor predeterminado en código, pero `JWT_SECRET` es obligatorio para iniciar. Fuentes: archivos citados y `backend/.env.example`.

### Variables de notificaciones (extensión 004 en la rama de trabajo)

`backend/.env.example` incorpora, sin valores reales, `JWT_SECRET` y las variables de correo leídas por `services/email.js`, `services/notificaciones.js`, `services/plantillas-email.js` y `utils/token-baja.js`:

| Variable | Uso | Si falta |
|---|---|---|
| `RESEND_API_KEY` | Clave de la API de Resend | No se envía nada; se registra `[email:modo-registro]` en consola |
| `EMAIL_REMITENTE` | Remitente (`from`) | `PandoCBA <onboarding@resend.dev>` |
| `EMAIL_TOKEN_SECRET` | Firma de los enlaces de baja | No se envía el correo de suscripción y la baja responde 503 |
| `FRONTEND_URL` | Base de los enlaces de los correos | `CORS_ORIGIN`, si no `http://localhost:3001` |
| `EMAIL_CONTACTO` | Contacto del aviso de contraseña y `reply_to` | El aviso dice «respondé a este correo» |

`.env` está en `backend/.gitignore`, así que sus valores no llegan a Render con el deploy: en producción estas variables se cargan en el panel *Environment* del servicio de Render. `FRONTEND_URL` debe ser la URL de producción en Vercel. Sin un dominio propio verificado en Resend, solo se entregan correos al dueño de la cuenta del proveedor; el subdominio `*.vercel.app` no sirve para verificar. **No verificado:** carga de estas variables en Render.

`npm test` ejecuta `node --test --test-concurrency=1 test/*.test.js`. `test/notificaciones.test.js` no usa base; `test/suscripciones.test.js` se omite si falta `PANDO_TEST_BRANCH_ID`.

## Frontend

Desde `frontend/`, `npm ci`; `npm run dev` inicia Next en el puerto 3001; `npm run build`, `npm start` y `npm run lint` son los demás scripts. No hay script de test ni de despliegue. Fuentes: `frontend/package.json`, `frontend/package-lock.json`.

`frontend/.env.example` enumera `NEXT_PUBLIC_API_URL`; el código además lee `API_URL` como preferencia para llamadas de servidor y `NODE_ENV` para la cookie. `API_URL` falta en el ejemplo; `NODE_ENV` es variable de entorno del runtime y tampoco figura. Fuentes: `frontend/.env.example`, `frontend/src/lib/api.ts`, `frontend/src/lib/session.ts`, `frontend/src/app/api/auth/[modo]/route.ts`.

**No verificado:** procedimiento real de despliegue de backend en Render o frontend en Vercel, configuración de Neon/Cloudinary, variables cargadas en plataformas, estado de migraciones y salud de los servicios. El repositorio solo aporta scripts, configuración Prisma y un README genérico de Next. Fuentes: `backend/package.json`, `backend/prisma.config.ts`, `frontend/package.json`, `frontend/README.md`.
