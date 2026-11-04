# Verificación: Rol vendedor y venta en local

## T001 — ramas y bases (2026-10-30)

| Repositorio | Rama | Base |
| --- | --- | --- |
| PandoSDD | `007-vendedor-venta-local` | `origin/master` `9188280` (incluye 005) |
| backend (PandoCbaV2) | `007-vendedor-venta-local` | `origin/main` `a5fd08e` (incluye 005) |
| frontend (PandoCbaFrontend) | `007-vendedor-venta-local` | `origin/master` `419c5a0` (incluye 005) |

Backend y frontend no tenían cambios locales al crear las ramas. La feature 006 (pasarela de pagos) aún no está publicada y no forma parte de estas bases.

## T002 — revisión de esquema, autorización e importes

Aprobado por Lucas Salguero el 2026-10-30, en conversación. Alcance aprobado:

- `Producto.local` (los productos existentes quedan en `true`).
- En `Orden`: `canal`, `dniCliente`, `cajaId` y `numeroComprobante`; el medio va en el campo existente `metodoPago`.
- Tabla `Caja` con índice único parcial (una sola abierta).
- Rol `vendedor` con índice único parcial (un solo vendedor activo).
- Precio calculado siempre en el servidor, sin descuentos.
- Migración solo aditiva.

## T003–T008 — fase A en backend (2026-10-30)

- `prisma/schema.prisma`: `Producto.local`; en `Orden`, `canal`, `dniCliente`, `cajaId` y `numeroComprobante` con sus índices; modelo `Caja`.
- `prisma/migrations/20261029_vendedor_venta_local/migration.sql`: columnas, tabla `Caja`, CHECK de estado y cierre, CHECK de datos locales en `Orden` (DNI de 7 u 8 dígitos, caja y comprobante), índices únicos parciales `Caja_una_abierta` y `Usuario_vendedor_activo_unico`, y FK `Orden.cajaId`. **No se aplicó a ninguna base.**
- `prisma validate` y `prisma generate` pasaron con una configuración temporal sin `dotenv/config` y URL ficticia, que luego se eliminó. No se leyó `.env` ni hubo conexión a una base.
- `src/utils/visibilidad-producto.js`: `whereProductoLocal` y `esProductoLocal`, con la misma regla de lanzamiento de drops.
- `src/middleware/es-vendedor.js`: acepta `vendedor` o `admin` activos, consultados en la base.
- Carrito web filtrado por `canal: "web"` en `src/utils/carrito.js` y en `obtenerCarritoCheckout` (`src/services/checkout.js`). Las rutas de `carrito.routes.js` dependen de `obtenerOCrearCarrito` y no requirieron cambios. El fixture de tests ya crea carritos `canal: "web"`.
- `src/services/reserva-fifo.js`: `leerCorteParaVenta`, `validarCorteParaVariantes` y `crearDetallesYReservas`, extraídas de `confirmarCheckout`. Los errores previstos se lanzan como `ErrorPartidas`, que el checkout ya traduce a 409 con el mismo código y mensaje (`INVENTARIO_SUSPENDIDO`, `VARIANTE_SIN_CORTE`, `RESERVA_SIN_PARTIDA`).
- `node --check` pasó en los archivos modificados y el módulo de checkout carga y exporta lo mismo que antes. El backend no tiene scripts de lint ni build.

## T009 — suite existente contra base descartable

La persona responsable informó el 2026-11-02 que aplicó la migración `20261029_vendedor_venta_local` en la rama `Prueba` de Neon (no en producción). La suite se ejecutó el 2026-11-03 contra la base de prueba del `.env`: la 007 queda en verde; las 25 fallas de 002, 003 y 005 también ocurren en `main` (ver «Migración y suite contra la base de prueba»).

## Fases 3 a 6 — vendedor, caja, venta, comprobante e historial (2026-10-30)

Implementado para la primera vista presentable (US3, US2, US1, US5). Los tests de backend de estas fases (T012, T021, T029, T035) quedan pendientes porque requieren la base descartable.

**Backend**
- `src/routes/usuarios.routes.js`: rol `vendedor`. `P2002` del índice parcial se responde como `409 VENDEDOR_EXISTENTE`. Los handlers de estado y rol pasan a `asyncHandler`.
- `src/routes/productos.routes.js`: campo `local` explícito en alta y edición.
- `src/services/caja.js`: apertura idempotente, una sola caja abierta, resumen por medio con decimales exactos, cierre bajo `FOR UPDATE` con instantánea e historial.
- `src/services/venta-local.js`: catálogo con la regla local, venta en curso (carrito `canal="local"`, bloqueo consultivo por operador), resumen con huella y confirmación según research R2 (caja `FOR UPDATE`, corte, variantes, reserva FIFO, pago, consumo, `entregada`, tres eventos, comprobante `MAX+1`), además de historial y detalle.
- `src/routes/vendedor.routes.js`, montado en `src/index.js`, con `verificarToken` y `esVendedor` según el contrato.
- `node --check` pasó y los módulos cargan sin conexión.

**Frontend**
- BFF `src/app/api/vendedor/[...ruta]/route.ts` y `apiFetchVendedor`.
- `exigirVendedor`. El login redirige al vendedor a `/vendedor`. El Header muestra «Punto de venta» y oculta el carrito al vendedor.
- Páginas `/vendedor` (punto de venta), `/vendedor/caja`, `/vendedor/ventas` y `/vendedor/ventas/[id]` (comprobante imprimible, con encabezado y pie ocultos al imprimir).
- Admin: opción de rol «Vendedor» en Clientes; checkbox, filtro y columna «Local» en Productos.
- `tsc --noEmit` sin errores. `npm run lint` con 0 errores y 13 advertencias heredadas (ninguna en archivos nuevos). `npm run build` compiló.

**Sin verificar**: ejecución contra base de datos y recorrido visual.

## T012, T021, T029, T035 — tests de backend (2026-11-02)

Escritos con el estilo de los tests existentes (`node:test`, `crearEscenario`, `exigirBasePrueba`, limpieza en `finally`). Se agregó `test/soporte/venta-local.js`: escenario con un operador de rol admin (el admin también vende y así no compite con el índice de vendedor único), inventario FIFO opcional, apertura de caja, venta completa y limpieza de órdenes, devoluciones, cajas, partidas e ingresos.

| Archivo | Cubre |
| --- | --- |
| `test/roles-vendedor.test.js` | Asignación por HTTP; `409 VENDEDOR_EXISTENTE` al asignar y al reactivar; dos reactivaciones simultáneas dejan uno activo; el vendedor recibe 403 en `/admin/ordenes`, `/admin/usuarios`, `/productos?admin=true`, `/checkout/resumen` y `/ordenes`, 200 en `/vendedor/caja` y 401 inactivo; el cliente recibe 403 en `/vendedor`; `esVendedor` admite al admin activo; un producto `web=false, local=true` no aparece en `/productos` ni en su detalle, pero sí en el punto de venta. |
| `test/caja.test.js` | Validación de importes; apertura idempotente y `CAJA_YA_ABIERTA`; dos aperturas simultáneas dejan una caja; SC-005 exacto de la spec ($10.000, dos ventas en efectivo de $25.000, una de débito de $40.000, $59.000 declarados → esperado $60.000 y diferencia −$1.000); cierre repetido, `CAJA_CERRADA`, 404 y caja que no se reabre. |
| `test/venta-local.test.js` | Normalización de DNI; camino feliz FIFO (entregada, asignaciones vendidas con importe, reserva consumida, stock −2, `salida_venta` −2, tres eventos `local`, carrito convertido, comprobante `MAX+1`, sin `usuarioId`); solo local se vende, solo web y drop no lanzado se rechazan; reserva web vigente limita; carrera web contra local por la última unidad (SC-002); misma clave en paralelo da una venta (SC-003) y `INTENCION_EN_CONFLICTO`; `RESUMEN_CAMBIO` y reconfirmación; `VENTA_VACIA`, `DNI_INVALIDO`, `MEDIO_PAGO_INVALIDO`, `CONFIRMACION_INVALIDA`, `CAJA_NO_ABIERTA`; inventario suspendido (solo con `PANDO_TEST_SPECIAL=1`); venta concurrente con cierre; comprobante correlativo tras un rechazo; carrito web del admin separado; historial que excluye órdenes web, búsqueda por DNI y número, límites de día y detalle igual a la confirmación (T035). |

Los tests que usan la base se omiten si falta `PANDO_TEST_BRANCH_ID`. Los de caja y venta se omiten si la base tiene una caja abierta ajena, y los de roles si hay un vendedor activo ajeno, para no tocar datos que no crearon. Sin base, `node --test test/caja.test.js test/roles-vendedor.test.js test/venta-local.test.js` dio 2 aprobados, 21 omitidos y 0 fallas (solo cargan módulos y corren las pruebas puras). **Pendiente:** ejecución contra `Prueba`.

Corrección durante la revisión: T011 figuraba hecha, pero `GET /productos?admin=true` no filtraba por `local` en el backend (el filtro de Productos era solo del cliente). Se agregó `local=true|false` al listado admin.

## Fase 7 — US4, ventas por canal y medio (2026-11-02)

**Backend**
- `src/services/ventas-canal.js`: `resumenPorCanal` (agrupa por `canal` y `metodoPago` las órdenes con `pagoConfirmadoEn` en días de Buenos Aires, suma `subtotal` en decimal exacto, siempre devuelve web y local) y `listarVentas` (filtros de canal, medio y período, sin datos del operador).
- `src/routes/admin-ventas.routes.js`, montado en `src/index.js`, con `verificarToken` y `esAdmin`: `GET /admin/ventas/resumen` (período obligatorio), `GET /admin/ventas`, `GET /admin/cajas` y `POST /admin/cajas/:id/cierre` (usa `cerrarCaja`).
- `src/services/ordenes.js` y `src/routes/admin-ordenes.routes.js`: filtros `canal`, `metodoPago` y `tipoEntrega=local`; la orden admin incluye `canal`, `metodoPago`, `numeroComprobante` y `dniCliente`. **Decisión:** en las órdenes locales se ocultan `cliente`, `usuarioId`, `pagoConfirmadoPorId` y los actores de los eventos, porque si no el operador aparecía como cliente y en el historial (FR-030).
- `src/services/informes.js` y `src/routes/admin-informes.routes.js`: los eventos de venta incluyen `canal`; con `canal=web|local` el informe solo incluye ventas, devoluciones de clientes y reintegros de ese canal (compras, correcciones y movimientos no tienen canal). Sin filtro, las consultas y los totales no cambian.
- `test/ventas-canal.test.js` (T040): límites del día de Buenos Aires; suma exacta por canal y medio medida como diferencia antes y después (la base de prueba tiene otras órdenes); listado por canal y medio y límites de medianoche; órdenes admin e informe por canal sin datos del operador; una devolución posterior no modifica la caja cerrada.
- `node --check` pasó en todos los archivos modificados. El backend no tiene scripts de lint ni build.

**Frontend**
- BFF admin con los prefijos `ventas` y `cajas`. Tipos en `src/types/venta-local.ts`, `caja.ts`, `orden.ts` e `informe.ts`.
- `/admin/ventas` (`src/components/AdminVentas.tsx`): período, tarjetas por canal con tabla por medio, listado filtrable con enlace al comprobante y cajas con cierre de respaldo. Enlace en el panel admin.
- `AdminOrdenes.tsx`: filtros de canal y medio, opción de entrega «En el local», canal y medio en la lista, comprobante y DNI en el detalle de las órdenes locales. `AdminInformes.tsx`: filtro por canal y canal en cada venta.

## Fase 8 — cierre (2026-11-02)

- **T044 (parcial):** en el frontend, `tsc --noEmit` sin errores; `npm run lint` con 0 errores y las mismas 13 advertencias heredadas de `<img>`, ninguna en archivos nuevos; `npm run build` compiló e incluye `/admin/ventas` y las rutas `/vendedor`. El backend no tiene scripts de lint ni build. **Pendiente:** `npm test` del backend contra `Prueba`.
- **T045:** pendiente. El recorrido del quickstart y la medición de SC-001 requieren levantar backend y frontend contra `Prueba`.
- **T046:** se agregaron secciones 007 en `docs/estado-actual/02` a `06`, y en `08` los riesgos: integración pendiente con la 006, índices parciales fuera de `schema.prisma`, numeración `MAX+1` atada a la caja única y tests que dependen de estado global.
- **T047:** sin hallazgos. Los handlers nuevos y modificados usan `asyncHandler`; las rutas construyen los datos con campos explícitos; las que escriben usan `verificarToken`, y las administrativas `esAdmin`; los importes se calculan en el servidor; DNI e importes se normalizan; los archivos nuevos están en UTF-8 sin caracteres rotos; la página `/admin/ventas` es Server Component y solo `AdminVentas` es client; las llamadas usan `src/lib/api.ts` y los contratos están en `src/types/`. No se agregaron variables de entorno.

## Cambio 2026-11-02 — venta rápida y datos opcionales del cliente (T048–T054)

**T048 — aprobación.** El responsable probó la primera versión con `npm run dev` («funciona la lógica») y pidió el 2026-11-02: (1) una venta rápida de dos toques para accesorios y productos no cargados; (2) no guardar el DNI y pedir, opcionales, nombre y teléfono. En la conversación eligió: importe libre (sin botones predefinidos), sin control de stock y quitar la columna del DNI. Esto aprueba el cambio de esquema y la excepción de importe ingresado por el vendedor (constitution IV y VII), registrada en el Complexity Tracking del plan. Spec, plan, `data-model.md`, `research.md` (R12 y R13), contrato y quickstart quedaron actualizados.

**Suite T009 (corrida del 2026-11-02).** 113 tests: 40 aprobados, 34 fallidos y 39 omitidos. Las 34 fallas tienen la misma causa: `exigirBasePrueba` recibió el host `invalid`, que es el valor por defecto cuando falta `DATABASE_URL`. `npm test` no carga `.env`, así que la corrida no tenía base configurada. Por la misma razón, las pruebas que dependen de `PANDO_TEST_BRANCH_ID` (todas las de la 007, suscripciones) quedaron omitidas. Ningún test llegó a la base, de modo que no hay fallas atribuibles a la 007 ni a código ajeno: la suite todavía no se ejecutó de verdad. **Pendiente:** repetir con `DATABASE_URL` de `Prueba` y `PANDO_TEST_BRANCH_ID` definidos en la terminal, después de aplicar `20261102_venta_rapida_cliente_opcional`.

**Backend**
- `prisma/schema.prisma`: `Orden.nombreCliente` y `Orden.telefonoCliente` en lugar de `dniCliente`, e `ItemCarrito.concepto`. `prisma validate` y `prisma generate` pasaron con una configuración temporal sin `dotenv` y con una URL ficticia, borrada al terminar. No se leyó `.env` ni hubo conexión.
- `prisma/migrations/20261102_venta_rapida_cliente_opcional/migration.sql` (nueva; la `20261029` no se editó): recrea `Orden_datos_local_check` sin el DNI, elimina `dniCliente`, agrega nombre y teléfono con `Orden_cliente_local_check`, y agrega `ItemCarrito.concepto` con `ItemCarrito_venta_rapida_check`. **No se aplicó a ninguna base.**
- `src/services/venta-local.js`: `normalizarVentaRapida` y `agregarVentaRapida`; el resumen marca las líneas `ventaRapida` con el importe ingresado; la confirmación registra las líneas de catálogo con `crearDetallesYReservas` y las rápidas después, sin reserva ni FIFO, y no toma el corte si no hay ítems de catálogo; `normalizarCliente` reemplaza a `normalizarDni`; la huella de la solicitud incluye nombre y teléfono; el historial busca por comprobante, teléfono o nombre.
- `src/routes/vendedor.routes.js`: `POST /vendedor/venta/rapida`; la confirmación acepta `nombreCliente` y `telefonoCliente`.
- `src/services/ordenes.js` y `src/services/ventas-canal.js`: nombre y teléfono en lugar del DNI.
- Tests: se reemplazaron las pruebas del DNI y se agregaron las de cliente (normalización, `CLIENTE_INVALIDO`, intención distinta por teléfono, búsqueda por nombre y teléfono) y de venta rápida (validación del importe; venta mixta con stock solo en el catálogo, orden de líneas, comprobante y caja; venta solo rápida sin reservas, con edición y quita de la línea). Sin base: 31 tests, 4 aprobados, 27 omitidos y 0 fallas.

**Frontend**
- `PuntoVenta.tsx`: botón «Venta rápida» que abre un formulario con concepto opcional e importe (abrir, escribir el importe y agregar, con Enter o con el botón); las líneas rápidas no se limitan por stock; los campos opcionales «Nombre» y «Teléfono» reemplazan al DNI.
- `ComprobanteVenta.tsx`, `HistorialVentasLocal.tsx`, `AdminVentas.tsx` y `AdminOrdenes.tsx` muestran nombre y teléfono; el selector de devoluciones no ofrece líneas rápidas. Se quitó `formatearDni`. Tipos actualizados en `venta-local.ts` y `orden.ts`.
- `tsc --noEmit` sin errores; `npm run lint` con 0 errores y las 13 advertencias heredadas; `npm run build` compiló.

**T054 — pendiente:** repetir el recorrido del quickstart (pasos 6 a 8 actualizados). La migración y la suite quedaron hechas el 2026-11-03 (sección siguiente).

## Migración y suite contra la base de prueba (2026-11-03)

**Destino.** El `.env` del responsable apunta al endpoint Neon `ep-fancy-queen-acudbg1e` (base `neondb`). El agente solo leyó host y base con un script, sin ver la contraseña. El responsable confirmó que es una base de prueba, no producción. `prisma migrate status` mostró aplicada la `20261029` y pendiente solo la `20261102`.

**Migración.** `npx prisma migrate deploy` aplicó `20261102_venta_rapida_cliente_opcional` sin errores.

**Control de destino de los tests.** `exigirBasePrueba` (`test/soporte/escenario.js`) aceptaba solo `ep-floral-dust-acglee71` (rama `br-snowy-glitter-acxy36q0`). Ahora tiene una lista de bases de prueba por endpoint, con o sin `-pooler`. `PANDO_TEST_BRANCH_ID` debe coincidir con la confirmación de esa base: `br-snowy-glitter-acxy36q0` para `ep-floral-dust` y el propio endpoint `ep-fancy-queen-acudbg1e` para la nueva, cuyo ID de rama no está registrado. La variable no está en `.env`: se define en la terminal.

Comando usado:

```powershell
$env:PANDO_TEST_BRANCH_ID = "ep-fancy-queen-acudbg1e"
node --env-file=.env --test --test-concurrency=1 "test/*.test.js"
```

**Datos tocados con autorización.** La base tenía la caja N.º 6 abierta (sin ventas) y el vendedor activo `test@test.com` (id 9), creados al probar con `npm run dev`. Con eso, los tests de la 007 se omitían. Con autorización del responsable, la caja 6 se cerró con `cerrarCaja` (declarado = esperado, diferencia 0, observación «Cerrada para correr los tests de la 007»). El vendedor 9 se desactivó para la corrida y se reactivó al final. Después de la corrida no quedaron cajas abiertas.

**Correcciones en el soporte de tests de la 007.**
- En esta base el corte de inventario está `activo`, así que toda variante vende por FIFO y debe estar conciliada. `crearEscenarioLocal` ahora detecta el corte activo. En ese caso registra cada variante del escenario como `EstadoCorteVariante` conciliada con origen `nueva`, igual que `POST /talle-producto`, le carga el stock con una compra confirmada y borra ese registro en la limpieza.
- Bug: la función `producto()` del escenario pisaba al producto base (`escenario.producto.id` quedaba `undefined`). Se renombró a `crearProducto()`.
- «Con el inventario suspendido…» se omite con el corte activo. Un CHECK (`EstadoCorteInventario_activacion_check`) impide suspender un corte activo: la suspensión solo existe durante el corte. La actualización rechazada no cambió la base.

**Resultado de la 007.** `caja`, `roles-vendedor`, `venta-local` y `ventas-canal`: 31 tests, 30 aprobados, 0 fallas y 1 omitido (el de inventario suspendido, por lo anterior).

**Suite completa.** 113 tests: 79 aprobados, 25 fallidos y 9 omitidos. Las 25 fallas son de `checkout` (3), `compras` (2), `inventario-fifo` (7), `ordenes-admin` (5), `ordenes-cliente` (3) y `vencimiento` (5). Todas tienen la misma causa: `VARIANTE_SIN_CORTE` o «La variante necesita el corte inicial». Los escenarios viejos crean variantes sin conciliar y esta base tiene el corte activo. **No son de la 007:** el código de `main` (a5fd08e), corrido en un worktree temporal contra la misma base, dio las mismas 25 fallas. Quedan para un arreglo futuro, que sería aplicar a `crearEscenario` el mismo ajuste de corte activo.

## Cambio 2026-11-04 — ajustes del recorrido manual (T055–T059)

**Origen y decisiones.** Al recorrer el quickstart, el responsable observó que la venta en curso y la caja abierta sobreviven al cierre de sesión, y que no veía los productos solo-local en el punto de venta. Eligió: descartar la venta en curso al cerrar la caja (no al cerrar sesión); cierre de caja manual, con aviso y bloqueo de ventas si la caja es de un día anterior; mostrar los productos sin stock marcados. La spec (sesión 2026-11-04, FR-007, FR-010 y FR-020), `research.md` (R4), `data-model.md` y el contrato quedaron actualizados.

**Diagnóstico de los productos solo-local.** En `Prueba` la regla local funciona. «medias» (17) y «Remera Prueba» (223) están activos, con `local=true` y `web=false`, pero no tienen variantes, así que el catálogo los ocultaba por no tener stock. Además, «Pantalon 04» y tres productos de prueba tienen variantes con `stockDisponible=0`, y tres productos están en drops no lanzados.

**Pruebas (2026-11-04).** Con `PANDO_TEST_BRANCH_ID=ep-fancy-queen-acudbg1e`, `caja`, `roles-vendedor` y `venta-local` dieron 29 tests: 6 aprobados, 0 fallas y 23 omitidos. Pasaron la prueba pura de `esDeJornadaAnterior` y la de producto sin stock. Las de caja y venta se omitieron porque el responsable tenía abierta la caja N.º 65 del recorrido manual, y no se tocó. Frontend: `tsc --noEmit` y `eslint` sobre los archivos cambiados sin errores. **Pendiente (T059):** correr esas pruebas sin caja abierta ajena.

**Prueba de punta a punta de la caja de un día anterior (2026-11-04).** Cambiar la fecha de Windows no sirve para probarlo: la confirmación usa la hora de la base (Neon), y con el reloj cambiado fallan la conexión TLS y los tokens. En su lugar, un script movió `abiertaEn` de la caja abierta N.º 66 y la restauró al terminar (en un `finally`). Levantó las rutas del vendedor en un puerto libre y las llamó por HTTP con un token del vendedor N.º 9. Resultados:
- `GET /vendedor/caja` y el listado de cajas del admin devuelven `deJornadaAnterior=true`.
- Se puede armar la venta, pero el resumen da `puedeConfirmar=false`.
- Confirmar responde `409 CAJA_JORNADA_ANTERIOR`. No se creó ninguna orden ni se consumió número de comprobante.
- Abrir otra caja responde `409 CAJA_YA_ABIERTA`: primero hay que cerrar la vieja.
- Borde de medianoche (Buenos Aires): abierta ayer a las 23:59 cuenta como jornada anterior; abierta hoy a las 00:01, no.
- Con la apertura original restaurada, `deJornadaAnterior=false` y `puedeConfirmar=true`. La venta de prueba (una línea rápida) se vació sin confirmarse.

**T059 — hecho (sección siguiente).**

**T059 — cierre de la caja N.º 66 y suite de la 007 (2026-11-04).** Con autorización del responsable:
- **Descarte al cerrar.** Se agregó una línea rápida a la venta en curso del vendedor N.º 9 (carrito 199). Después se cerró la caja N.º 66 con `cerrarCaja`: 1 venta, efectivo esperado 0,00, declarado igual, diferencia 0 y observación «Cerrada para correr los tests de la 007 (T059)». Resultado: `ventasEnCursoDescartadas=1` y el carrito 199 quedó `expirado`. La nueva venta en curso (carrito 200) está vacía y sin caja.
- **Primera corrida.** 34 tests: 29 aprobados, 1 falla y 4 omitidos. Falló «una venta simultánea con el cierre…». Cuando el cierre gana la carrera, ahora descarta el carrito, y la confirmación respondía `400 VENTA_VACIA` en lugar de `409 CAJA_NO_ABIERTA`.
- **Corrección.** En `confirmarVentaLocal`, si no hay carrito activo ni caja abierta, responde `409 CAJA_NO_ABIERTA` con el mensaje «La caja se cerró y la venta en curso se descartó». Una venta en curso vacía sigue dando `VENTA_VACIA`.
- **Segunda corrida.** La prueba de la carrera pasó 4 de 4 veces. `caja`, `roles-vendedor`, `venta-local` y `ventas-canal` dieron 34 tests: 30 aprobados, 0 fallas y 4 omitidos. Tres de roles se omiten por el vendedor activo N.º 9, que no se tocó; la de inventario suspendido se omite porque el corte está activo. Al terminar no quedan cajas abiertas.
