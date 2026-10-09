# Estado actual de PandoCBA

Relevamiento estático del código al 9 de octubre de 2026. `backend/` es una API Express con Prisma/PostgreSQL; `frontend/` es una aplicación Next.js. Son repositorios Git independientes. El navegador obtiene catálogo y contenido mediante `apiFetch` hacia la API; para sesión, carrito, cuenta y administración usa rutas `/api` de Next que reenvían peticiones con el token de una cookie. Fuentes: `backend/src/index.js`, `backend/src/db.js`, `frontend/src/lib/api.ts`, `frontend/src/app/api/auth/[modo]/route.ts`, `frontend/src/app/api/admin/[...ruta]/route.ts`.

El alcance implementado comprende catálogo por categorías y colecciones, variantes por talle/color, imágenes, suscripción, registro/login, perfil, carrito y administración de productos, imágenes y clientes. No hay flujo HTTP de compra u órdenes en los archivos de rutas relevados. Fuentes: `backend/src/index.js`, `backend/src/routes/productos.routes.js`, `backend/src/routes/carrito.routes.js`, `backend/src/routes/usuarios.routes.js`, `frontend/src/app/admin/page.tsx`, `frontend/src/app/carrito/page.tsx`.

| Repositorio | Responsabilidad | Evidencia |
|---|---|---|
| `backend/` | API `/api`, autenticación JWT, persistencia Prisma e imágenes Cloudinary | `backend/src/index.js`, `backend/src/middleware/auth.js`, `backend/src/db.js`, `backend/src/utils/upload.js` |
| `frontend/` | Páginas React/Next y rutas internas de sesión, carrito, cuenta y admin | `frontend/src/app/page.tsx`, `frontend/src/app/api/auth/[modo]/route.ts`, `frontend/src/app/api/carrito/route.ts`, `frontend/src/app/api/admin/[...ruta]/route.ts` |

La evidencia de este relevamiento es código y configuración versionada; no se ejecutaron servicios ni se consultó la base de datos. **No verificado:** estado de los despliegues y de los datos reales; faltan acceso operativo y comprobación en esos entornos. Fuentes del alcance inspeccionado: `backend/src/index.js`, `frontend/package.json`.
