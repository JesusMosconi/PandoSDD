# Entorno y comandos

## Backend

Desde `backend/`, `npm ci` instala el lockfile y ejecuta `postinstall` (`prisma generate`); `npm run dev` usa nodemon y `npm start` ejecuta `node src/index.js`. Para aplicar las migraciones versionadas, el comando Prisma es `npx prisma migrate deploy`; **No verificado:** que se haya ejecutado en alguna base o despliegue. El backend no define script propio de migración, build, test o deploy. Fuentes: `backend/package.json`, `backend/package-lock.json`, `backend/prisma.config.ts`, `backend/prisma/migrations/`.

Variables leídas por backend: `DATABASE_URL` (`db.js`, `prisma.config.ts`), `JWT_SECRET` y `JWT_EXPIRES_IN` (`index.js`, `usuarios.routes.js`, `auth.js`), `CORS_ORIGIN` y `PORT` (`index.js`), `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (`utils/upload.js`). `backend/.env.example` enumera `DATABASE_URL`, `CORS_ORIGIN` y las tres de Cloudinary; faltan `JWT_SECRET`, `JWT_EXPIRES_IN` y `PORT`. Algunas tienen valor predeterminado en código, pero `JWT_SECRET` es obligatorio para iniciar. Fuentes: archivos citados y `backend/.env.example`.

## Frontend

Desde `frontend/`, `npm ci`; `npm run dev` inicia Next en el puerto 3001; `npm run build`, `npm start` y `npm run lint` son los demás scripts. No hay script de test ni de despliegue. Fuentes: `frontend/package.json`, `frontend/package-lock.json`.

`frontend/.env.example` enumera `NEXT_PUBLIC_API_URL`; el código además lee `API_URL` como preferencia para llamadas de servidor y `NODE_ENV` para la cookie. `API_URL` falta en el ejemplo; `NODE_ENV` es variable de entorno del runtime y tampoco figura. Fuentes: `frontend/.env.example`, `frontend/src/lib/api.ts`, `frontend/src/lib/session.ts`, `frontend/src/app/api/auth/[modo]/route.ts`.

**No verificado:** procedimiento real de despliegue de backend en Render o frontend en Vercel, configuración de Neon/Cloudinary, variables cargadas en plataformas, estado de migraciones y salud de los servicios. El repositorio solo aporta scripts, configuración Prisma y un README genérico de Next. Fuentes: `backend/package.json`, `backend/prisma.config.ts`, `frontend/package.json`, `frontend/README.md`.
