# Research: Rol vendedor y venta en local

Fecha: 2026-10-29. Fuentes: spec 007, constitution 1.0.0, código de `origin/main` (backend) y `origin/master` (frontend) con la feature 005 integrada, y `docs/estado-actual/`. Esta investigación es de solo lectura.

## R1. Venta en el local como `Orden` o modelo propio

- **Decision**: la venta es una `Orden` con `canal="local"`, `tipoEntrega="local"` y estado final `entregada`, con `DetalleOrden`, `ReservaStock` y `AsignacionPartida`, igual que la web.
- **Rationale**: `reconocerVentaFIFO` fija costo e importe efectivo por asignación. `transicionarReservas(..., "consumida")` descuenta el stock físico y crea `salida_venta`. `informes.js` toma ventas por `Orden.pagoConfirmadoEn`, y `devoluciones.js` exige reservas consumidas y asignaciones vendidas. Al reutilizar `Orden`, margen, informes y devoluciones funcionan sin código paralelo.
- **Alternatives considered**: el modelo heredado `Venta` no tiene líneas, reservas ni FIFO, así que habría que duplicar todo. Un modelo `VentaLocal` nuevo implica la misma duplicación y doble mantenimiento de informes.

## R2. Secuencia transaccional de la confirmación

- **Decision**: una sola transacción, con hasta 3 reintentos ante `P2002` o `P2034`, como en checkout:
  1. Buscar por clave de idempotencia.
  2. Bloquear el carrito local.
  3. Bloquear `FOR UPDATE` la caja abierta.
  4. Leer `EstadoCorteInventario` con `FOR SHARE` y rechazar si está suspendido.
  5. Bloquear las variantes en orden de ID.
  6. Validar líneas y huella.
  7. Crear la `Orden` en `pendiente_pago` usando `reserva-fifo.js` para detalles, reservas y asignaciones.
  8. Pasar la orden a `pago_confirmado` y ejecutar `reconocerVentaFIFO`.
  9. Consumir reservas con `transicionarReservas`.
  10. Pasar a `entregada`.
  11. Registrar eventos y marcar el carrito `convertido`.
- **Rationale**: reutiliza las funciones probadas sin cambiar sus invariantes. Por ejemplo, `reconocerVentaFIFO` exige asignaciones `reservada` con reserva `activa`, y `transicionarReservas` exige asignaciones `vendida` al consumir. Los eventos intermedios quedan con la misma fecha y `origen="local"`, así que la trazabilidad es completa.
- **Alternatives considered**: crear la orden directamente en `entregada` saltando estados obligaría a duplicar la lógica de reconocimiento y consumo con otras precondiciones.
- **Nota de corte**: la regla de candidatas FIFO (corte activo, variantes heredadas e `inicioInventarioCero`) se mueve tal cual a `reserva-fifo.js`. La venta local aplica la misma condición que checkout.

## R3. Extracción compartida desde `checkout.js`

- **Decision**: `services/reserva-fifo.js` exporta:
  - `validarCorteParaVariantes(tx, ids)`: devuelve `corte` y `variantesFIFO`, o lanza los errores `VARIANTE_SIN_CORTE` y `RESERVA_SIN_PARTIDA`.
  - `crearDetallesYReservas(tx, { ordenId, items, variantesFIFO, ahora })`: devuelve la suma de líneas.

  `confirmarCheckout` pasa a llamarlas sin cambiar respuestas ni códigos.
- **Rationale**: es una sola regla de inventario para ambos canales. La suite 002/003 actúa como prueba de regresión del refactor.
- **Alternatives considered**: copiar el bloque es más rápido para la demo, pero duplica unas 120 líneas críticas y es contrario a la intención de la constitution VI.

## R4. Carrito de la venta en curso

- **Decision**: usar `Carrito` con `canal="local"` por usuario operador e `ItemCarrito` con `precioUnitario` como referencia. Sin vencimiento de 24 horas: la venta en curso persiste hasta confirmarse o vaciarse.

  Hay que corregir las funciones del carrito web para que filtren `canal: "web"`:
  - `utils/carrito.js#obtenerOCrearCarrito`
  - `services/checkout.js#obtenerCarritoCheckout`
  - las consultas de `carrito.routes.js`
- **Rationale**: un administrador puede tener a la vez un carrito web y uno local. Hoy las búsquedas toman «el último carrito activo» sin mirar el canal, y la venta local los mezclaría. `Orden.carritoId` es obligatorio y único, así que cada venta convierte su propio carrito.
- **Alternatives considered**: guardar la venta en curso en el navegador. Se descartó porque contradice FR-010 si se cambia de dispositivo y porque la constitution pide la lógica en el backend.

## R5. Disponibilidad por canal y drops

- **Decision**: agregar `Producto.local Boolean @default(true)` y la regla `whereProductoLocal = { activo: true, local: true, OR: [{ coleccionId: null }, { coleccion: { is: { fechaActivacion: { not: null } } } }] }`.
- **Rationale**: es independiente de `web` (spec FR-005). Se aplica la misma regla de lanzamiento de drops que en la web (005), para que el local no venda una pieza antes del lanzamiento.
- **Alternatives considered**: reinterpretar `web=false` como «solo local» haría imposible ocultar un producto de ambos canales sin desactivarlo. Ignorar el lanzamiento del drop en el local queda como posible pedido futuro.

## R6. Caja única

- **Decision**: crear la tabla `Caja` con estado `abierta`/`cerrada` y un índice único parcial `ON "Caja" ((true)) WHERE "estado" = 'abierta'`.
  - **Apertura**: se pide con clave de idempotencia. Si ya hay una caja abierta, devuelve esa caja con `reiterada` en vez de crear otra.
  - **Venta**: bloquea la caja con `FOR UPDATE`.
  - **Cierre**: también bloquea con `FOR UPDATE`, calcula desde las órdenes de la caja y guarda una instantánea de totales.
- **Rationale**: la base garantiza que haya una sola caja abierta. El bloqueo compartido entre venta y cierre impide que una venta quede fuera de la caja o entre en una ya cerrada.
- **Alternatives considered**: una fila fija con estado cambiante pierde el historial. Las cajas por usuario quedaron descartadas por la spec.

## R7. Numeración del comprobante

- **Decision**: `Orden.numeroComprobante Int? @unique`, asignado como `MAX(numeroComprobante)+1` dentro de la transacción de venta. Es seguro porque cada venta tiene el bloqueo exclusivo de la única caja abierta.
- **Rationale**: es correlativo y sin huecos ante rollbacks. Una `SEQUENCE` de PostgreSQL deja huecos.
- **Alternatives considered**: usar el ID de la orden no es correlativo dentro del canal local.

## R8. Vendedor único

- **Decision**:
  - Agregar `vendedor` a `rolesValidos`.
  - Crear el índice único parcial `ON "Usuario" ("rol") WHERE "rol" = 'vendedor' AND "activo" = true`.
  - Mapear `P2002` a `409 VENDEDOR_EXISTENTE` en `PUT /admin/usuarios/:id/rol` y en `PATCH /admin/usuarios/:id/estado` cuando se reactiva un vendedor.
- **Rationale**: la garantía queda en la base, sin carreras entre dos administradores.
- **Alternatives considered**: una validación solo en código es vulnerable a la concurrencia.

## R9. Autorización

- **Decision**:
  - El middleware `esVendedor` consulta `rol` y `activo` y acepta `vendedor` o `admin`.
  - El BFF `src/app/api/vendedor/[...ruta]/route.ts` valida la sesión con el mismo criterio y reenvía a `/vendedor/...`.
  - `exigirVendedor()` redirige a `/login` si no hay sesión y a `/` si el rol no corresponde.
  - En la web nada cambia: `esCliente` ya rechaza al vendedor en checkout y órdenes, y `esAdmin` lo rechaza en la administración.
- **Rationale**: sigue el patrón vigente (`esAdmin`/`esCliente` con consulta a la base, y BFF que revalida la sesión).

## R10. Medio de pago y separación por canal

- **Decision**:
  - El local guarda el medio en `Orden.metodoPago` (`efectivo`, `transferencia`, `debito` o `credito`). La web conserva `manual`.
  - `Orden.canal String @default("web")`, con índice `(canal, pagoConfirmadoEn)`.
  - El resumen por canal agrupa las órdenes con `pagoConfirmadoEn` en el período por `canal` y `metodoPago`, sumando `subtotal` (mercadería). Las devoluciones se informan aparte en el informe existente.
- **Rationale**: es el campo existente y probablemente el que extienda la 006. Un solo origen de verdad para «medio».
- **Alternatives considered**: un campo nuevo `medioPago` duplicaría `metodoPago` y complicaría la integración con la 006.

## R11. Ventas atribuidas a una persona

- **Decision**: `Orden.usuarioId`, que es obligatorio, toma el usuario operador. Los eventos guardan `actorUsuarioId`. Ninguna pantalla, filtro ni informe expone esos datos para ventas del local (FR-030). El historial del vendedor lista por `canal="local"`, no por usuario.
- **Rationale**: evita hacer opcional una FK usada por todo el circuito cliente y conserva la auditoría técnica.

## R12. DNI

- **Decision**: `Orden.dniCliente String?`, obligatorio cuando `canal="local"`. Se normaliza quitando puntos, espacios y guiones, y debe tener `^\d{7,8}$`.
- **Rationale**: cubre la spec FR-013 sin crear una entidad Cliente.
