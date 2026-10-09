# Deuda y riesgos observados

Relevamiento estático del código. Las prioridades expresan impacto potencial; no se verificó incidencia en producción.

## Prioridad alta

1. **Visibilidad inconsistente de productos.** El listado público filtra `Producto.activo` y variantes sin stock, pero el detalle por ID devuelve el producto y todas sus variantes sin esos filtros. `POST /carrito/items` rechaza únicamente variantes con `estado="inactivo"` y no comprueba `Producto.activo` ni `web`. `GET /catalogo-inicio` incorpora productos seleccionados sin filtrar `activo` o `web`. Un producto oculto o dado de baja puede seguir visible por enlace directo o en el inicio, y su variante puede agregarse al carrito si se conoce el ID y supera la comprobación de stock. Fuentes: `backend/src/routes/productos.routes.js:13-53`, `backend/src/routes/carrito.routes.js:68-79`, `backend/src/routes/catalogo-inicio.routes.js:12-31`.

2. **Validación y asignación masiva de campos.** `validateBody` comprueba presencia y tipo de los campos declarados, pero no rechaza campos desconocidos. Varias rutas usan `data: req.body` después de esa validación; por ejemplo `productos`, `talle-producto`, `colors` y `catalogo-inicio`. Por eso, propiedades adicionales que Prisma admita pueden llegar a campos no previstos por la validación, como `activo` o `id` en operaciones donde el modelo los acepte. La aceptación concreta de cada valor depende de las restricciones de Prisma y PostgreSQL; no se probó cada combinación. Fuentes: `backend/src/utils/validate.js:7-29`, `backend/src/routes/productos.routes.js:57-66`, `backend/src/routes/talle-producto.routes.js:27-41`, `backend/src/routes/color.routes.js:22-25`, `backend/src/routes/catalogo-inicio.routes.js:57-67`, `backend/prisma/schema.prisma`.

## Prioridad media

3. **Stock comprobado y carrito escrito en pasos separados.** `POST /carrito/items` lee la variante y el carrito, compara la cantidad con `stock` y luego actualiza o crea `ItemCarrito` sin transacción que proteja ese ciclo; tampoco reserva ni descuenta existencias. Las solicitudes concurrentes pueden dejar cantidades incompatibles con el stock consultado. **Pasa a alta al implementar órdenes.** Fuentes: `backend/src/routes/carrito.routes.js:35-47`, `backend/src/routes/carrito.routes.js:58-89`.

4. **Entradas de registro y login poco normalizadas.** El `email` se consulta y guarda tal como llega: no se convierte a minúsculas ni se valida su formato. El registro solo exige presencia de `nombre`, `apellido`, `email`, `password` y longitud mínima de seis para la contraseña; login solo comprueba presencia. No hay validación explícita de tipos. Un `password` numérico no cumple el contrato que espera bcrypt y llega al `catch` que responde 500; en registro, `password.length` para un número no dispara la comprobación de longitud. Esto describe el camino del código, sin afirmar una prueba HTTP ejecutada. Fuentes: `backend/src/routes/usuarios.routes.js:24-43`, `backend/src/routes/usuarios.routes.js:47-61`.

5. **Ausencia de middleware de seguridad HTTP y de límite de solicitudes.** El servidor configura CORS y JSON, pero no monta `helmet` ni un limitador de solicitudes; ambos paquetes tampoco figuran como dependencias. Login queda expuesto a intentos repetidos sin control de frecuencia en esta aplicación. No se verificaron controles externos de infraestructura. Fuentes: `backend/src/index.js:24-40`, `backend/src/routes/usuarios.routes.js:47-61`, `backend/package.json`.

6. **Validaciones desiguales.** Las rutas de categoría y colección escriben campos sin `validateBody`; el validador usado en otras rutas solo verifica tipos básicos y no comprueba rangos, formatos ni estados permitidos. Fuentes: `backend/src/routes/categorias.routes.js:64-86`, `backend/src/routes/colecciones.routes.js:62-87`, `backend/src/utils/validate.js:1-29`, `backend/src/routes/talle-producto.routes.js:10-16`.

7. **Archivos de ejemplo de entorno incompletos.** `JWT_SECRET` es obligatorio para iniciar, pero no figura en `backend/.env.example`; tampoco aparecen allí `JWT_EXPIRES_IN` ni `PORT`. `API_URL` se lee en el servidor Next, pero falta en `frontend/.env.example`. **Corrección de la premisa:** `CORS_ORIGIN` sí figura en `backend/.env.example:2`; `PORT` no figura. Fuentes: `backend/src/index.js:21-26`, `backend/src/index.js:55`, `backend/src/routes/usuarios.routes.js:18-22`, `backend/.env.example:1-5`, `frontend/src/lib/session.ts:8`, `frontend/.env.example:1`.

8. **Imágenes de producto potencialmente huérfanas.** `DELETE /img-producto/:id` elimina la fila de Prisma pero no llama a Cloudinary para eliminar el archivo; la carga múltiple crea filas en un bucle sin compensación explícita si una escritura posterior falla. Fuentes: `backend/src/routes/img-producto.routes.js:12-35`, `backend/src/routes/img-producto.routes.js:61-64`, `backend/src/utils/upload.js:12-30`.

## Prioridad baja

9. **Duración de cookie y JWT desacopladas.** La cookie dura siete días fijos; el JWT usa `JWT_EXPIRES_IN` o `7d`. Una configuración distinta puede hacer que la cookie sobreviva al token o desaparezca antes. Fuentes: `frontend/src/app/api/auth/[modo]/route.ts:28-35`, `backend/src/routes/usuarios.routes.js:17-22`.

10. **Texto con caracteres rotos.** La respuesta de modo de autenticación inválido contiene `autenticaciÃ³n invÃ¡lida`. Fuente: `frontend/src/app/api/auth/[modo]/route.ts:11`.

11. **Nombre de función desactualizado.** `eliminarImagenLocal` llama a `cloudinary.uploader.destroy`, pese a que su nombre indica una operación local. Fuente: `backend/src/utils/imagen-local.js:7-18`.

12. **Pruebas no identificadas en los repositorios.** Ningún `package.json` define un script `test` y no se identificaron archivos de prueba propios en los árboles fuente revisados. **No verificado:** cobertura en CI u otros sistemas externos. Fuentes: `backend/package.json`, `frontend/package.json`, `backend/src/`, `frontend/src/`.

## Comportamiento actual con política pendiente

Al crear `ItemCarrito`, la ruta copia `Producto.precio` a `precioUnitario`; si el ítem ya existe, solo aumenta `cantidad` y conserva el precio guardado. El subtotal se calcula con `cantidad * Number(precioUnitario)` por ítem, no con el precio actual del producto. **Política de recálculo por definir:** el código no establece si un cambio posterior de precio debe actualizar el carrito ni cómo se calcularía el precio al crear una orden. Fuentes: `backend/src/routes/carrito.routes.js:24-31`, `backend/src/routes/carrito.routes.js:82-89`, `backend/prisma/schema.prisma` (`ItemCarrito.precioUnitario`).

## Funcionalidad pendiente

`Orden`, `DatosEnvio`, `Venta`, `Favorito`, `ActividadAdmin` y `ProductoImprovisado` existen en el esquema, pero no tienen rutas ni pantallas dedicadas en los routers y páginas relevados. La compra y el registro de ventas no están expuestos como flujo HTTP. Fuentes: `backend/prisma/schema.prisma`, `backend/src/index.js:28-40`, `frontend/src/app/`.

## Excepciones heredadas respecto de la constitution

La constitution 1.0.0 rige el código nuevo y modificado desde el 2026-10-09. Los casos siguientes son diferencias preexistentes, no tareas de refactorización automática. Fuente normativa: `.specify/memory/constitution.md`.

- **`asyncHandler`:** `usuarios.routes.js` es el único archivo de rutas montado que no usa `asyncHandler`; sus handlers async emplean `try/catch` propio. Algunos otros routers también tienen `try/catch` internos, pero envuelven sus handlers con `asyncHandler`. Fuentes: `backend/src/index.js:28-40`, `backend/src/routes/usuarios.routes.js:24-43`, `backend/src/routes/usuarios.routes.js:47-61`, `backend/src/routes/talle.routes.js:30-40`, `backend/src/utils/async-handler.js:1-2`.
- **UTF-8 visible:** el literal de autenticación contiene caracteres rotos. Fuente: `frontend/src/app/api/auth/[modo]/route.ts:11`.
- **Tests:** faltan scripts `test` y no se identificaron pruebas propias en los árboles fuente. Fuentes: `backend/package.json`, `frontend/package.json`, `backend/src/`, `frontend/src/`.
- **Borrado lógico parcial:** `DELETE /productos/:id` actualiza `activo=false` y `DELETE /talle-producto/:id` marca la variante inactiva; en cambio, las rutas DELETE de categorías, colecciones e imágenes de producto usan `delete` físico. Fuentes: `backend/src/routes/productos.routes.js:69-72`, `backend/src/routes/talle-producto.routes.js:47-54`, `backend/src/routes/categorias.routes.js:89-95`, `backend/src/routes/colecciones.routes.js:90-96`, `backend/src/routes/img-producto.routes.js:61-64`.
- **Normalización de entradas:** registro/login no normalizan ni validan formato de `email`; `validateBody` no rechaza campos desconocidos. Fuentes: `backend/src/routes/usuarios.routes.js:24-61`, `backend/src/utils/validate.js:7-29`.
- **Rutas públicas de escritura:** `POST /usuarios/registro`, `POST /usuarios/login` y `POST /suscripciones` no usan `verificarToken`. Fuentes: `backend/src/routes/usuarios.routes.js:24-61`, `backend/src/routes/suscripcion.routes.js:15-23`.
- **JWT expuesto fuera de la cookie BFF:** registro y login de Express devuelven `token` en JSON; el BFF lo recibe y crea una cookie `httpOnly`, pero la API Express también puede responder directamente. Fuentes: `backend/src/routes/usuarios.routes.js:37-40`, `backend/src/routes/usuarios.routes.js:53-57`, `frontend/src/app/api/auth/[modo]/route.ts:17-35`.
- **Acceso directo al backend desde el frontend:** `apiFetch` usa `NEXT_PUBLIC_API_URL` y las páginas públicas lo llaman sin pasar por una ruta del BFF. Fuente: `frontend/src/lib/api.ts:1-36`, `frontend/src/app/page.tsx:12-21`.

**No verificado:** incidencia, explotación o impacto de estos riesgos en producción; no se ejecutaron pruebas de integración ni se inspeccionaron datos reales.
