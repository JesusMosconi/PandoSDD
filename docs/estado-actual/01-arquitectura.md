# Arquitectura

## Capas y recorrido

`frontend/src/app/**/page.tsx` renderiza páginas; `frontend/src/components/` contiene la UI interactiva. `frontend/src/lib/api.ts` expone `apiFetch` (URL externa `NEXT_PUBLIC_API_URL`), `apiFetchInterna` (ruta relativa) y `apiFetchAdmin` (proxy `/api/admin`). Las rutas `frontend/src/app/api/` leen la cookie y envían `Authorization: Bearer` a Express. Express monta los routers bajo `/api`; `backend/src/db.js` crea PrismaClient con `PrismaPg` y `DATABASE_URL`. Fuentes: `frontend/src/lib/api.ts`, `frontend/src/lib/session.ts`, `frontend/src/app/api/admin/[...ruta]/route.ts`, `backend/src/index.js`, `backend/src/db.js`.

Flujo concreto de agregar al carrito: `ProductVariants` → `POST /api/carrito/items` de Next → `POST /api/carrito/items` de Express → consultas y escritura de `Carrito`, `TalleProducto` e `ItemCarrito` con Prisma → PostgreSQL. La ruta comprueba cantidad y stock y devuelve subtotal. Fuentes: `frontend/src/components/ProductVariants.tsx`, `frontend/src/app/api/carrito/items/route.ts`, `backend/src/routes/carrito.routes.js`, `backend/prisma/schema.prisma`.

## Servicios y configuración

Cloudinary está integrado mediante Multer Storage y sus credenciales se leen de `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET`. Prisma usa PostgreSQL mediante `DATABASE_URL`. La configuración leída por Express incluye `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN` y `PORT`. Fuentes: `backend/src/utils/upload.js`, `backend/src/db.js`, `backend/prisma.config.ts`, `backend/src/index.js`, `backend/src/routes/usuarios.routes.js`.

Next lee `NEXT_PUBLIC_API_URL` para `apiFetch`; sus rutas de servidor y sesión prefieren `API_URL` y recurren a `NEXT_PUBLIC_API_URL`. `NODE_ENV` determina el atributo `secure` de la cookie. Fuentes: `frontend/src/lib/api.ts`, `frontend/src/lib/session.ts`, `frontend/src/app/api/auth/[modo]/route.ts`.

**No verificado:** despliegue efectivo en Vercel, Render o Neon, URL pública, proyecto, rama y configuración de producción. El README de frontend contiene instrucciones genéricas para Vercel, pero no identifica un despliegue de PandoCBA; la integración de PostgreSQL y Cloudinary sí consta en el código. Fuentes: `frontend/README.md`, `backend/src/db.js`, `backend/src/utils/upload.js`.
