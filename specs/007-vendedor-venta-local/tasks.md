# Tasks: Rol vendedor y venta en local

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/venta-local-api.md](contracts/venta-local-api.md) y [quickstart.md](quickstart.md).

**Organización**: las tareas están agrupadas por historia. Los prefijos `backend/` (PandoCbaV2), `frontend/` (PandoCbaFrontend) y `specs/`/`docs/` (PandoSDD) indican repositorios Git distintos. Completar una tarea por vez y revisar `git status` en los tres repositorios antes de cada cambio. `[P]` indica archivos independientes que podrían prepararse en paralelo; no autoriza saltear dependencias.

**Tests**: se incluyen porque la constitution VI exige tests para la lógica de negocio nueva en el backend (que tiene `node --test`) y la spec define criterios de concurrencia e idempotencia (SC-002, SC-003, SC-005).

**Límites**: no leer `.env`. No ejecutar migraciones ni seeds, ni escribir en servicios externos, sin verificar el destino y la autorización. No hacer commit, push ni despliegue salvo pedido explícito. La pasarela de pagos (006) queda fuera de alcance.

## Phase 1: Setup

**Objetivo**: ramas correctas y revisión normativa antes de tocar el esquema.

- [X] T001 Verificar rama y cambios locales en `backend/` y `frontend/`. Crear `007-vendedor-venta-local` desde `origin/main` (backend) y `origin/master` (frontend), que incluyen la 005, sin arrastrar cambios ajenos. Registrar las bases en `specs/007-vendedor-venta-local/verificacion.md`.
- [X] T002 Revisar explícitamente el cambio de esquema, autorización e importes contra `spec.md`, `plan.md` y `data-model.md`. Registrar la aprobación en `specs/007-vendedor-venta-local/verificacion.md` antes de modificar `backend/prisma/schema.prisma` (constitution VII).

---

## Phase 2: Foundational (bloquea todas las historias)

**Objetivo**: datos, roles, regla de canal e inventario compartido, sin cambios visibles para los clientes web.

- [X] T003 Agregar a `backend/prisma/schema.prisma`:
  - `Producto.local Boolean @default(true)`.
  - En `Orden`: `canal String @default("web")`, `dniCliente String?`, `cajaId Int?` (relación `Caja`, Restrict) y `numeroComprobante Int? @unique`, con índices `[canal, pagoConfirmadoEn]` y `[cajaId]`.
  - El modelo `Caja`, según `data-model.md`.
- [X] T004 Crear la migración nueva `backend/prisma/migrations/20261029_vendedor_venta_local/migration.sql` con:
  - Las columnas y la tabla.
  - Los índices únicos parciales `Caja_una_abierta` y `Usuario_vendedor_activo_unico`.
  - El CHECK de orden local y los CHECK de `Caja`.

  Revisar el SQL contra el esquema sin aplicarlo. Regenerar el cliente con `prisma generate` sin conectarse a ninguna base.
- [X] T005 [P] Agregar `whereProductoLocal` y `esProductoLocal` a `backend/src/utils/visibilidad-producto.js`: `activo && local` y drop lanzado o sin colección (research R5).
- [X] T006 [P] Crear `backend/src/middleware/es-vendedor.js`. Consulta `rol` y `activo` en la base, acepta `vendedor` o `admin` y responde `403 ROL_NO_AUTORIZADO` en otro caso.
- [X] T007 Filtrar `canal: "web"` en `backend/src/utils/carrito.js` (`obtenerOCrearCarrito`), `backend/src/services/checkout.js` (`obtenerCarritoCheckout`) y en las consultas de carrito de `backend/src/routes/carrito.routes.js` (research R4).
- [X] T008 Extraer de `confirmarCheckout` a `backend/src/services/reserva-fifo.js` estas funciones, sin cambiar respuestas ni códigos del checkout:
  - `validarCorteParaVariantes`: estado del corte, candidatas FIFO y reservas heredadas.
  - `crearDetallesYReservas`: `DetalleOrden`, `ReservaStock` y `AsignacionPartida`.

  Hacer que `backend/src/services/checkout.js` las use.
- [ ] T009 Ejecutar la suite existente del backend (`npm test`) contra la base descartable autorizada después de T007 y T008. Las suites 002, 003 y 005 deben quedar en verde. Registrar el resultado en `verificacion.md`. *(2026-11-03: corrida hecha; la 007 en verde. Quedan 25 fallas de 002, 003 y 005 que también ocurren en `main`, porque sus escenarios no concilian variantes con el corte activo. Abierta hasta corregirlas.)*

**Checkpoint**: la web se comporta igual que antes y el esquema y los servicios base están listos.

---

## Phase 3: US3 — Gestionar el vendedor y la disponibilidad en el local (P1)

**Meta**: el admin habilita un único vendedor y marca qué productos se venden en el local.

**Prueba independiente**: asignar el rol vendedor a un usuario y marcar un producto como solo local. El vendedor entra a `/vendedor`; un segundo vendedor activo se rechaza; la web no muestra el producto solo local.

- [X] T010 [US3] Agregar `vendedor` a `rolesValidos` en `backend/src/routes/usuarios.routes.js`. En `PUT /admin/usuarios/:id/rol` y `PATCH /admin/usuarios/:id/estado`, mapear `P2002` del índice parcial a `409 VENDEDOR_EXISTENTE`. Envolver los handlers modificados en `asyncHandler`.
- [X] T011 [US3] Aceptar y devolver `local` con campos explícitos en las altas y ediciones de `backend/src/routes/productos.routes.js`, y agregar el filtro admin `?local=true|false`. El listado público no cambia.
- [X] T012 [P] [US3] Escribir `backend/test/roles-vendedor.test.js`. Debe cubrir:
  - Asignación de vendedor.
  - Rechazo del segundo vendedor activo y de la reactivación concurrente.
  - Que el vendedor reciba 403 en `/admin/*`, `/checkout/*` y `/ordenes`, y 401 cuando está inactivo.
  - Que un producto `web=false, local=true` no aparezca en `/productos`.
- [X] T013 [P] [US3] Agregar `"vendedor"` al tipo de rol en `frontend/src/types/usuario.ts` y `local: boolean` en `frontend/src/types/producto.ts`.
- [X] T014 [US3] Agregar `exigirVendedor()` (rol `vendedor` o `admin`; si no hay sesión va a `/login` y si el rol no corresponde va a `/`) en `frontend/src/lib/autorizacion.ts`.
- [X] T015 [US3] Crear el BFF `frontend/src/app/api/vendedor/[...ruta]/route.ts`, con el mismo patrón que el BFF admin: valida la sesión y el rol `vendedor` o `admin`, reenvía a `/vendedor/...` con Bearer y devuelve `no-store`.
- [X] T016 [US3] En `frontend/src/components/AuthForm.tsx`, redirigir al vendedor a `/vendedor`. En `frontend/src/components/Header.tsx` (y donde se calculan sus props en `frontend/src/app/layout.tsx`), mostrar «Punto de venta» a vendedor y admin y ocultar el carrito al vendedor.
- [X] T017 [P] [US3] En `frontend/src/components/AdminProductos.tsx`, agregar el checkbox «Local» en el formulario, el filtro «En local / Fuera de local» y la columna «Local».
- [X] T018 [P] [US3] En `frontend/src/components/AdminClientes.tsx`, agregar la opción de rol «Vendedor» y mostrar el error `VENDEDOR_EXISTENTE`.

**Checkpoint**: el vendedor inicia sesión, llega a una página protegida y el admin gestiona la disponibilidad en el local.

---

## Phase 4: US2 — Abrir y cerrar la caja diaria (P1)

**Meta**: una única caja abierta con apertura, resumen y cierre con arqueo.

**Prueba independiente**: el escenario de la spec ($10.000 inicial, 2 ventas en efectivo por $25.000 y una con débito por $40.000, $59.000 declarados) da esperado $60.000 y diferencia −$1.000. Para probarla antes de la fase 5 se usan órdenes locales creadas por el test.

- [X] T019 [US2] Crear `backend/src/services/caja.js` con:
  - `obtenerCajaAbierta`.
  - `abrirCaja` (idempotente por `claveApertura`; `409 CAJA_YA_ABIERTA`).
  - `resumenCaja`: totales por `metodoPago`, cantidad y efectivo esperado con decimales exactos.
  - `cerrarCaja`: `FOR UPDATE`, instantánea, declarado, diferencia y observación; terminal e idempotente.
  - `listarCajas`.
- [X] T020 [US2] Crear `backend/src/routes/vendedor.routes.js` con `router.use("/vendedor", verificarToken, esVendedor)` y las rutas `GET /vendedor/caja`, `POST /vendedor/caja/apertura` y `POST /vendedor/caja/cierre`, según el contrato. Registrar el router en `backend/src/index.js`.
- [X] T021 [P] [US2] Escribir `backend/test/caja.test.js`. Debe cubrir:
  - Apertura y reintento.
  - Dos aperturas concurrentes que dejan una sola caja abierta.
  - El cálculo de esperado y diferencia (SC-005).
  - Que no se pueda reabrir una caja.
  - Que no haya cierre doble con otro importe.
- [X] T022 [P] [US2] Crear `frontend/src/types/caja.ts` según el contrato.
- [X] T023 [US2] Crear `frontend/src/app/vendedor/layout.tsx` con `exigirVendedor()` y la navegación Venta / Caja / Ventas.
- [X] T024 [US2] Crear `frontend/src/app/vendedor/caja/page.tsx` y `frontend/src/components/CajaPanel.tsx` (client). Si no hay caja, muestra el formulario de apertura. Si hay una abierta, muestra el resumen y el formulario de cierre con el efectivo contado y la observación. Usa `apiFetchInterna` contra `/api/vendedor/caja...` con `claveApertura` generada por `crypto.randomUUID()`.

**Checkpoint**: la caja se abre y se cierra desde la interfaz.

---

## Phase 5: US1 — Registrar una venta en el local (P1) 🎯 Núcleo de la demo

**Meta**: buscar, armar la venta, ingresar DNI y medio, confirmar y obtener el comprobante.

**Prueba independiente**: con la caja abierta, vender 2 variantes con DNI y efectivo. El stock físico baja una vez, la orden queda `entregada` con `canal=local` y aparece el comprobante numerado.

- [X] T025 [US1] En `backend/src/services/venta-local.js`, implementar el catálogo `buscarProductosLocal` (regla `whereProductoLocal`, variantes con `stockDisponible` mediante `presentarVariantesConDisponibilidad`, paginado y límite 50) y la venta en curso:
  - `obtenerVentaEnCurso`: carrito `canal="local"` sin vencimiento.
  - `agregarItem`, `actualizarItem`, `quitarItem` y `vaciarVenta`: bloquean el carrito y la variante y comparan la cantidad agrupada con el disponible.
- [X] T026 [US1] En `backend/src/services/venta-local.js`, implementar `resumenVentaLocal`. Calcula el precio vigente y los motivos por línea (`producto_no_local`, `producto_retirado`, `drop_no_lanzado`, `variante_inactiva`, `stock_insuficiente`, `producto_improvisado`, `cantidad_invalida`), el total, la caja abierta y una `huellaResumen` (sha256 del carrito, líneas, precios y motivos).
- [X] T027 [US1] En `backend/src/services/venta-local.js`, implementar `confirmarVentaLocal` con la secuencia de research R2:
  1. Normalizar y validar el DNI y el medio de pago.
  2. Comprobar la idempotencia por `(usuarioId, claveConfirmacion)` con huella de solicitud.
  3. Bloquear carrito, caja abierta (`FOR UPDATE`), corte y variantes.
  4. Ejecutar `validarCorteParaVariantes` y comprobar la huella.
  5. Crear la orden `pendiente_pago` con `canal="local"`, `tipoEntrega="local"`, DNI, caja, `numeroComprobante = MAX+1` y `venceEn = creadaEn`.
  6. Ejecutar `crearDetallesYReservas`.
  7. Pasar a `pago_confirmado` y ejecutar `reconocerVentaFIFO`.
  8. Ejecutar `transicionarReservas("consumida")` y pasar a `entregada`.
  9. Registrar 3 `EventoOrden` con `origen="local"` y marcar el carrito `convertido`.

  Reintentar ante `P2002`/`P2034` y mapear `ErrorPartidas` a 409.
- [X] T028 [US1] Agregar a `backend/src/routes/vendedor.routes.js` las rutas `GET /vendedor/productos`, `GET|DELETE /vendedor/venta`, `POST /vendedor/venta/items`, `PUT|DELETE /vendedor/venta/items/:id`, `POST /vendedor/venta/resumen` y `POST /vendedor/venta/confirmacion`, con validación de IDs y campos explícitos.
- [X] T029 [P] [US1] Escribir `backend/test/venta-local.test.js`. Debe cubrir:
  - El camino feliz: estado `entregada`, asignaciones `vendida`, reserva `consumida`, stock y movimientos `salida_venta`.
  - Un producto solo local que se vende, un producto solo web que se rechaza y un drop no lanzado que se rechaza.
  - Una reserva web vigente que limita el disponible.
  - La carrera web contra local por la última unidad (SC-002).
  - Una clave repetida que da una sola venta (SC-003).
  - El cambio de precio que devuelve `RESUMEN_CAMBIO`.
  - DNI inválido, sin caja e inventario suspendido.
  - Una venta concurrente con el cierre que queda dentro de la caja o se rechaza.
  - Un comprobante correlativo sin huecos tras un rechazo.
  - Que el carrito web del admin no se mezcle con el carrito local.
- [X] T030 [P] [US1] Crear `frontend/src/types/venta-local.ts` (producto del punto de venta, línea, resumen y `VentaLocal`) según el contrato.
- [X] T031 [US1] Crear `frontend/src/app/vendedor/page.tsx` y `frontend/src/components/PuntoVenta.tsx` (client) con:
  - Buscador con filtro de categoría y tarjetas con selección de variante y stock disponible.
  - Panel de la venta en curso (+/−/quitar).
  - Campo DNI y selector de medio (efectivo, transferencia, débito, crédito).
  - Total y aviso de caja cerrada con enlace a `/vendedor/caja`.
  - Confirmar con `claveConfirmacion` estable por intento.
  - Manejo de `ITEMS_NO_DISPONIBLES` y `RESUMEN_CAMBIO` (mostrar el nuevo total y reconfirmar).
  - Redirección al comprobante.
- [X] T032 [US1] Crear `frontend/src/app/vendedor/ventas/[id]/page.tsx` y `frontend/src/components/ComprobanteVenta.tsx`. El comprobante muestra número, fecha y hora de Buenos Aires, DNI, líneas, total, medio y la leyenda «Comprobante interno, no válido como factura». Lleva un botón «Imprimir» (client, `window.print()`) y estilos de impresión.

**Checkpoint**: 🎯 primera vista presentable. Vendedor, caja, venta y comprobante funcionan de punta a punta.

---

## Phase 6: US5 — Consultar las ventas del local y reimprimir (P3)

**Meta**: historial del canal local con búsqueda por comprobante o DNI.

**Prueba independiente**: después de 3 ventas, buscar una por DNI y reimprimir con los mismos datos.

- [X] T033 [US5] Agregar `listarVentasLocal` (filtros por fecha de Buenos Aires y búsqueda por número o DNI) y `obtenerVentaLocal` (404 si el canal no es local) en `backend/src/services/venta-local.js`. Exponer `GET /vendedor/ventas` y `GET /vendedor/ventas/:id` en `backend/src/routes/vendedor.routes.js`, sin datos del operador.
- [X] T034 [US5] Crear `frontend/src/app/vendedor/ventas/page.tsx` y `frontend/src/components/HistorialVentasLocal.tsx`, con listado, filtros y enlace al comprobante.
- [X] T035 [P] [US5] Ampliar `backend/test/venta-local.test.js` para que el historial excluya las órdenes web y el detalle devuelva lo mismo que la confirmación.

---

## Phase 7: US4 — Separar las ventas por canal y medio de pago (P2)

**Meta**: resumen y listado administrativo por canal y medio, historial de cajas y canal en los informes.

**Prueba independiente**: con ventas web y locales en un período, los subtotales por canal y medio suman el total exacto (SC-004).

- [X] T036 [US4] Crear `backend/src/services/ventas-canal.js` con `resumenPorCanal(desde, hasta)` y `listarVentas(filtros)`: órdenes con `pagoConfirmadoEn` en el rango, agrupadas por `canal` y `metodoPago`, con totales en decimal exacto.
- [X] T037 [US4] Crear `backend/src/routes/admin-ventas.routes.js` con `verificarToken` y `esAdmin`, y las rutas `GET /admin/ventas/resumen`, `GET /admin/ventas`, `GET /admin/cajas` y `POST /admin/cajas/:id/cierre` (cierre de respaldo con `cerrarCaja`). Registrar el router en `backend/src/index.js`.
- [X] T038 [US4] Agregar los filtros `canal` y `metodoPago` en `listarOrdenesAdmin` (`backend/src/services/ordenes.js`) y en `backend/src/routes/admin-ordenes.routes.js`. Incluir `canal`, `numeroComprobante` y `dniCliente` en la orden presentada.
- [X] T039 [US4] Agregar `canal` a los eventos de venta de `backend/src/services/informes.js` y el filtro opcional `canal` en `backend/src/routes/admin-informes.routes.js`, sin alterar los totales sin filtro.
- [X] T040 [P] [US4] Escribir pruebas en `backend/test/ventas-canal.test.js`: suma exacta por canal y medio, límites de fecha y que la devolución posterior no modifique la caja cerrada.
- [X] T041 [US4] Agregar los prefijos `ventas` y `cajas` en `frontend/src/app/api/admin/[...ruta]/route.ts`. Agregar los tipos en `frontend/src/types/venta-local.ts`.
- [X] T042 [US4] Crear `frontend/src/app/admin/ventas/page.tsx` y `frontend/src/components/AdminVentas.tsx`, con un selector de período, tarjetas por canal, una tabla por medio, el listado filtrable y el historial de cajas con cierre de respaldo. Agregar el enlace en `frontend/src/app/admin/page.tsx`.
- [X] T043 [P] [US4] En `frontend/src/components/AdminOrdenes.tsx` y `frontend/src/types/orden.ts`, agregar los filtros canal y medio, la columna canal y el comprobante y DNI en el detalle de órdenes locales. En `frontend/src/components/AdminInformes.tsx`, agregar el filtro por canal.

---

## Phase 8: Polish y cierre

- [X] T044 Correr `npm run lint` y `npm run build` en `frontend/` sin errores. Declarar que `backend/` no tiene scripts de lint ni build. Correr `npm test` en el backend contra la base descartable.
- [ ] T045 Ejecutar el recorrido manual de `quickstart.md`, medir SC-001 y registrar la evidencia en `specs/007-vendedor-venta-local/verificacion.md`.
- [X] T046 [P] Actualizar `docs/estado-actual/02-modelo-de-datos.md`, `03-api-backend.md`, `04-frontend.md`, `05-autenticacion-y-autorizacion.md` y `06-flujos-de-negocio.md`. Registrar en `08-deuda-y-riesgos.md` la integración pendiente con la 006 y los índices parciales mantenidos a mano en SQL.
- [X] T047 Revisar los cambios contra la constitution: `asyncHandler`, campos explícitos, middleware, UTF-8, sin código muerto y Server Components por defecto.

---

## Dependencies & Execution Order

```text
Setup (T001–T002) → Foundational (T003–T009) → US3 (T010–T018) → US2 (T019–T024) → US1 (T025–T032) → US5 (T033–T035) → US4 (T036–T043) → Polish (T044–T047)
```

- T004 depende de T003. T008 debe estar terminada antes de T027. T009 valida T007 y T008.
- US2 necesita el router y el BFF de US3 (T015, T020). US1 necesita la caja de US2 (T019) para confirmar.
- US5 y US4 dependen de que existan ventas locales (US1). US4 es independiente de US5.

## Parallel Opportunities

- Fase 2: T005 y T006 en paralelo, una vez terminado T004.
- US3: T012, T013, T017 y T018 en paralelo después de T010 y T011.
- US2: T021 y T022 en paralelo con T023.
- US1: T029 y T030 en paralelo con T031 una vez definido el contrato.
- US4: T040 y T043 en paralelo con T042.

## Implementation Strategy

1. **Demo (MVP)**: fases 1 a 5. Es la primera vista para presentar: el vendedor inicia sesión, abre la caja, vende y emite el comprobante, y el admin marca los productos del local.
2. **Incremento 2**: fase 6 (historial y reimpresión).
3. **Incremento 3**: fase 7 (separación por canal y medio).
4. **Integración con la 006**: rebasar sobre la 006. Revisar `metodoPago`, `Orden` y la fecha de la migración (plan, «Coordinación con 006»). Repetir T009 y T044.

---

## Phase 9: Cambio 2026-11-02 — venta rápida y datos opcionales del cliente

**Origen**: pedido del responsable tras probar la primera versión. Spec (FR-012, FR-013, FR-015, FR-017, FR-018, FR-031, SC-001), plan («Cambio 2026-11-02» y Complexity Tracking), `data-model.md`, `research.md` (R12, R13), contrato y quickstart actualizados. Reemplaza el DNI de las tareas T003, T027, T029, T031, T032, T033, T038 y T043.

- [X] T048 Registrar en `verificacion.md` la aprobación del cambio de esquema y de la excepción de importe (constitution VII).
- [X] T049 Agregar a `backend/prisma/schema.prisma` `Orden.nombreCliente`, `Orden.telefonoCliente` e `ItemCarrito.concepto`, y quitar `Orden.dniCliente`. Crear `backend/prisma/migrations/20261102_venta_rapida_cliente_opcional/migration.sql` sin editar la `20261029`. Regenerar el cliente sin conectarse a ninguna base.
- [X] T050 En `backend/src/services/venta-local.js`: `agregarVentaRapida` (valida concepto e importe), resumen con líneas `ventaRapida`, confirmación con líneas rápidas después de las de catálogo y sin corte si no hay variantes, `normalizarCliente` en lugar de `normalizarDni`, historial que busca por comprobante, teléfono o nombre. Exponer `POST /vendedor/venta/rapida` en `backend/src/routes/vendedor.routes.js`.
- [X] T051 Reemplazar `dniCliente` por `nombreCliente` y `telefonoCliente` en `backend/src/services/ordenes.js` y `backend/src/services/ventas-canal.js`.
- [X] T052 [P] Actualizar `backend/test/soporte/venta-local.js`, `venta-local.test.js`, `caja.test.js` y `ventas-canal.test.js`; agregar pruebas de venta rápida (solo rápida, mixta, importe inválido, sin stock, caja e informe).
- [X] T053 [P] Frontend: tipos (`venta-local.ts`, `orden.ts`), `PuntoVenta.tsx` (panel de venta rápida y campos opcionales de nombre y teléfono, sin DNI), `ComprobanteVenta.tsx`, `HistorialVentasLocal.tsx`, `AdminOrdenes.tsx` y `AdminVentas.tsx`.
- [X] T054 Lint, `tsc` y build del frontend; `node --check` del backend; actualizar `docs/estado-actual/` y `verificacion.md`. La persona responsable aplica la migración en `Prueba` y corre `npm test`.

## Phase 10: Cambio 2026-11-04 — ajustes del recorrido manual

**Origen**: pruebas del responsable con `npm run dev`. Decisiones en la sesión 2026-11-04 de la spec.

- [X] T055 En `backend/src/services/caja.js`: `esDeJornadaAnterior` (día de Buenos Aires) y `deJornadaAnterior` en la caja abierta; el cierre bloquea los carritos locales activos antes que la caja y los pasa a `expirado` (`ventasEnCursoDescartadas`).
- [X] T056 En `backend/src/services/venta-local.js`: el resumen expone `caja.deJornadaAnterior` y no permite confirmar con esa caja; la confirmación responde `409 CAJA_JORNADA_ANTERIOR`; el catálogo incluye al final los productos sin variantes vendibles con `sinStock: true`.
- [X] T057 [P] Tests: `caja.test.js` (día de Buenos Aires, descarte al cerrar, bloqueo con caja de un día anterior) y `roles-vendedor.test.js` (producto sin stock visible y marcado).
- [X] T058 [P] Frontend: tipos `caja.ts` y `venta-local.ts`; `PuntoVenta.tsx` (aviso «Retomaste una venta en curso» con Vaciar, aviso de caja de un día anterior, tarjetas «Sin stock»); `CajaPanel.tsx` y `AdminVentas.tsx` (aviso de caja de un día anterior y de descarte al cerrar).
- [X] T059 Correr `caja.test.js` y `venta-local.test.js` contra `Prueba` sin caja abierta ajena, y repetir los pasos de caja y venta del quickstart.
