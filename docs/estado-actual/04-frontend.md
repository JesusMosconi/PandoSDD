# Frontend

## Páginas

| URL | Función | Fuente `frontend/src/app/` |
|---|---|---|
| `/` | Inicio, drop, catálogo destacado y newsletter | `page.tsx` |
| `/categorias`, `/categorias/[id]` | Índice y productos filtrables por categoría | `categorias/page.tsx`, `categorias/[id]/page.tsx` |
| `/colecciones/[id]` | Productos de colección | `colecciones/[id]/page.tsx` |
| `/productos/[id]` | Detalle y variantes | `productos/[id]/page.tsx` |
| `/nosotros` | Contenido e imágenes institucionales | `nosotros/page.tsx` |
| `/login`, `/cuenta`, `/carrito` | Autenticación, perfil y carrito | `login/page.tsx`, `cuenta/page.tsx`, `carrito/page.tsx` |
| `/admin`, `/admin/productos`, `/admin/imagenes`, `/admin/clientes` | Panel y gestión | `admin/page.tsx`, `admin/productos/page.tsx`, `admin/imagenes/page.tsx`, `admin/clientes/page.tsx` |

Las rutas Next de API son `POST /api/auth/[modo]` (`login` o `registro`), `POST /api/auth/logout`, `GET/DELETE /api/carrito`, `POST /api/carrito/items`, `PUT/DELETE /api/carrito/items/[id]`, `GET/PUT /api/usuarios/perfil`, `PUT /api/usuarios/cambiar-password` y `GET/POST/PUT/PATCH/DELETE /api/admin/[...ruta]`. Fuentes: `frontend/src/app/api/auth/[modo]/route.ts`, `frontend/src/app/api/auth/logout/route.ts`, `frontend/src/app/api/carrito/route.ts`, `frontend/src/app/api/carrito/items/route.ts`, `frontend/src/app/api/carrito/items/[id]/route.ts`, `frontend/src/app/api/usuarios/perfil/route.ts`, `frontend/src/app/api/usuarios/cambiar-password/route.ts`, `frontend/src/app/api/admin/[...ruta]/route.ts`.

`apiFetch` arma la URL externa con `NEXT_PUBLIC_API_URL`; `apiFetchInterna` usa una ruta relativa, y ambas convierten errores HTTP en `ApiError`. `apiFetchAdmin` añade `/api/admin`. Las páginas de catálogo llaman a `apiFetch`, mientras `AuthForm`, `CarritoPanel`, `CuentaPanel` y `ProductVariants` llaman a `apiFetchInterna`; los componentes admin usan `apiFetchAdmin`. Fuentes: `frontend/src/lib/api.ts`, `frontend/src/app/page.tsx`, `frontend/src/components/AuthForm.tsx`, `frontend/src/components/CarritoPanel.tsx`, `frontend/src/components/CuentaPanel.tsx`, `frontend/src/components/ProductVariants.tsx`, `frontend/src/components/AdminProductos.tsx`.

Las páginas sin directiva `"use client"` son Server Components de Next: por ejemplo `page.tsx` de inicio consulta la API durante el render. Los componentes con esa directiva se ejecutan en el cliente para interacción: `Header`, `ProductGrid`, `ProductVariants`, `CarritoPanel`, `AuthForm`, `CuentaPanel`, `AdminProductos`, `AdminImagenes` y `AdminClientes`. Fuentes: `frontend/src/app/page.tsx`, `frontend/src/components/Header.tsx`, `frontend/src/components/ProductGrid.tsx`, `frontend/src/components/ProductVariants.tsx`, `frontend/src/components/CarritoPanel.tsx`, `frontend/src/components/AuthForm.tsx`, `frontend/src/components/CuentaPanel.tsx`, `frontend/src/components/AdminProductos.tsx`, `frontend/src/components/AdminImagenes.tsx`, `frontend/src/components/AdminClientes.tsx`.

Los contratos TypeScript están en `frontend/src/types/`: `carrito.ts`, `catalogo-inicio.ts`, `categoria.ts`, `coleccion.ts`, `color.ts`, `contenido-inicio.ts`, `imagen-nosotros.ts`, `producto.ts`, `talle-producto.ts`, `talle.ts` y `usuario.ts`. Fuente: esos archivos en `frontend/src/types/`.
