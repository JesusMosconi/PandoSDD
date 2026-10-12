# Frontend

## Páginas

| URL | Función | Fuente `frontend/src/app/` |
|---|---|---|
| `/` | Inicio, drop, catálogo destacado y newsletter | `page.tsx` |
| `/categorias`, `/categorias/[id]` | Índice y productos filtrables por categoría | `categorias/page.tsx`, `categorias/[id]/page.tsx` |
| `/colecciones/[id]` | Productos de colección | `colecciones/[id]/page.tsx` |
| `/productos/[id]` | Detalle y variantes | `productos/[id]/page.tsx` |
| `/nosotros` | Contenido e imágenes institucionales | `nosotros/page.tsx` |
| `/login`, `/cuenta`, `/carrito`, `/checkout` | Autenticación, perfil, carrito y revisión de compra | `login/page.tsx`, `cuenta/page.tsx`, `carrito/page.tsx`, `checkout/page.tsx` |
| `/admin`, `/admin/productos`, `/admin/imagenes`, `/admin/clientes`, `/admin/ordenes` | Panel y gestión | `admin/page.tsx`, `admin/productos/page.tsx`, `admin/imagenes/page.tsx`, `admin/clientes/page.tsx`, `admin/ordenes/page.tsx` |

Las rutas Next de API son `POST /api/auth/[modo]` (`login` o `registro`), `POST /api/auth/logout`, las rutas de carrito, perfil y contraseña, `POST /api/checkout/resumen`, `POST /api/checkout/confirmacion`, GET `/api/ordenes` y `/api/ordenes/[id]`, POST `/api/ordenes/[id]/cancelacion` y el proxy `GET/POST/PUT/PATCH/DELETE /api/admin/[...ruta]`. Fuentes: `frontend/src/app/api/auth/`, `frontend/src/app/api/carrito/`, `frontend/src/app/api/usuarios/`, `frontend/src/app/api/checkout/`, `frontend/src/app/api/ordenes/`, `frontend/src/app/api/admin/[...ruta]/route.ts`.

`apiFetch` arma la URL externa con `NEXT_PUBLIC_API_URL`; `apiFetchInterna` usa una ruta relativa, y ambas convierten errores HTTP en `ApiError`. `apiFetchAdmin` añade `/api/admin`. Las páginas de catálogo llaman a `apiFetch`, mientras `AuthForm`, `CarritoPanel`, `CuentaPanel` y `ProductVariants` llaman a `apiFetchInterna`; los componentes admin usan `apiFetchAdmin`. Fuentes: `frontend/src/lib/api.ts`, `frontend/src/app/page.tsx`, `frontend/src/components/AuthForm.tsx`, `frontend/src/components/CarritoPanel.tsx`, `frontend/src/components/CuentaPanel.tsx`, `frontend/src/components/ProductVariants.tsx`, `frontend/src/components/AdminProductos.tsx`.

`ApiError` conserva `codigo`, `itemsAfectados`, `camposInvalidos` y un resumen actualizado cuando llegan de Express. La función `reenviarAExpress` se usa desde BFF para enviar Bearer solo entre servidores y devolver la respuesta HTTP original con cuerpo, estado y tipo de contenido; el navegador sigue usando `apiFetchInterna`.

El proxy administrativo Next mapea `/api/admin/ordenes` a la ruta administrativa de Express, conserva las rutas previas para otros módulos, responde 401/403 en JSON y reutiliza `reenviarAExpress` con respuestas `no-store`.

Las páginas sin directiva `"use client"` son Server Components de Next: por ejemplo `page.tsx` de inicio consulta la API durante el render. Los componentes con esa directiva se ejecutan en el cliente para interacción: `Header`, `ProductGrid`, `ProductVariants`, `CarritoPanel`, `AuthForm`, `CuentaPanel`, `AdminProductos`, `AdminImagenes` y `AdminClientes`. Fuentes: `frontend/src/app/page.tsx`, `frontend/src/components/Header.tsx`, `frontend/src/components/ProductGrid.tsx`, `frontend/src/components/ProductVariants.tsx`, `frontend/src/components/CarritoPanel.tsx`, `frontend/src/components/AuthForm.tsx`, `frontend/src/components/CuentaPanel.tsx`, `frontend/src/components/AdminProductos.tsx`, `frontend/src/components/AdminImagenes.tsx`, `frontend/src/components/AdminClientes.tsx`.

Los contratos TypeScript están en `frontend/src/types/`: `carrito.ts`, `catalogo-inicio.ts`, `categoria.ts`, `coleccion.ts`, `color.ts`, `contenido-inicio.ts`, `imagen-nosotros.ts`, `orden.ts`, `producto.ts`, `talle-producto.ts`, `talle.ts` y `usuario.ts`. `orden.ts` prepara respuestas y errores de checkout, cliente y administración; `talle-producto.ts` distingue `stock` físico de `stockDisponible`. Fuente: esos archivos en `frontend/src/types/`.

`ProductCard` y `ProductVariants` muestran talles/variantes con `stockDisponible>0` y estado activo, a partir de la respuesta pública del backend. Esta interfaz requiere la migración y las rutas de disponibilidad de checkout 002 para funcionar contra una base.

`/carrito` consulta el rol vigente desde el servidor y ofrece `/checkout` a clientes con ítems; los ítems bloqueados permanecen editables. `/checkout` exige sesión y rol cliente, muestra precio del carrito y vigente, entrega, campos de envío, subtotal y costo de envío a coordinar, con aceptación explícita. Al cambiar entre retiro y envío conserva visibles los productos y actualiza automáticamente el resumen cuando la entrega tiene los datos necesarios; mientras tanto invalida la aceptación y bloquea confirmar. Antes de confirmar, explica que la reserva dura cinco días corridos (120 horas). Tras crear la orden muestra el número de pedido, un título legible del estado y solo la fecha de vencimiento, aunque el backend conserva el instante exacto. Conserva la clave de confirmación al reintentar una respuesta perdida. El backend revalida rol y precios.

`/cuenta` incluye historial y detalle de órdenes solo para cliente: instantáneas de productos, importes conocidos, vencimiento, coordinación de envío sin monto inventado y cancelación con confirmación. Usa títulos legibles para los estados. Distingue carga y error de un historial vacío; una solicitud cancelada por desmontaje no se presenta como fallo, los errores reales admiten reintento tras 10 segundos y las pendientes abiertas se actualizan cada 60 segundos mientras hay conexión. Fuente: `frontend/src/components/MisOrdenes.tsx`, `CuentaPanel.tsx`, `frontend/src/app/cuenta/page.tsx`.

`/admin` enlaza a `/admin/ordenes`. Allí el administrador filtra/lista órdenes, ve detalle y eventos con el nombre actual de cada actor cuando está disponible, confirma pagos manuales, avanza estados y cancela con motivo y decisión de stock para pagadas. Los importes de envío siguen sin cotizar; la constancia externa y la devolución pendiente se muestran sin afirmar cobro ni reembolso automático. Los fallos de acciones permiten consultar el estado y reintentar. Fuente: `frontend/src/components/AdminOrdenes.tsx`, `frontend/src/app/admin/ordenes/page.tsx`.

Las vistas administrativas con pendientes abiertos consultan lista/detalle cada 60 segundos mientras hay conexión. Muestran «Reserva vencida; cancelación en proceso» antes de que el barrido registre `cancelada_vencimiento`, y luego la fecha real de cancelación. Las respuestas se piden sin caché por el BFF.
