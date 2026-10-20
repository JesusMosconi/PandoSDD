# Research: Checkout y órdenes

## D1. Reserva e inventario

**Decision**: Conservar `TalleProducto.stock` como existencias físicas y registrar una sola reserva por variante de cada orden; si varias líneas comparten variante, sumar sus cantidades al reservar. La disponibilidad para nuevas compras es `stock - unidades comprometidas`, donde cuentan las reservas pendientes **solo antes de** `venceEn` y las de órdenes pagadas aún no consumidas. Una pendiente vencida deja de contar en el instante exacto, incluso si el proceso programado corre tarde. El estado de reserva registra si está activa, liberada o consumida.

**Rationale**: Evita que el horario del programador cambie el plazo efectivo. También conserva el detalle auditable y permite restituir o no en cancelaciones pagadas. La reserva se crea únicamente junto con la orden.

**Alternatives considered**: Descontar `stock` al crear la orden y sumarlo al cancelar simplifica la lectura, pero una tarea tardía mantendría bloqueadas unidades vencidas hasta ejecutarse, salvo agregar liberación oportunista en múltiples rutas. Se descarta como fuente única de disponibilidad.

**Concurrency rule**: Todas las escrituras que cambien reservas o stock físico bloquean la fila de variante en orden ascendente de ID y vuelven a calcular disponibilidad dentro de la misma transacción. Al validar un carrito con varias líneas de la misma variante, se suman sus cantidades antes de compararlas con el disponible, tanto en resumen como en confirmación; si faltan unidades, se identifican todas esas líneas. Confirmación simultánea por última unidad: solo la primera puede reservarla. La edición administrativa de stock debe respetar compromisos vigentes. La consulta de carrito/catálogo usa disponibilidad neta, sin reservar. La implementación puede usar SQL parametrizado dentro de la transacción Prisma para bloqueo de filas; no usar SQL construido con entrada cruda.

## D2. Consumo y restitución

**Decision**: La reserva pagada sigue comprometida. Para envío se consume al pasar a `enviada`; para retiro al pasar a `entregada`. Consumir reduce `stock` físico y deja de restar la reserva, por lo que la disponibilidad neta no aumenta. Cancelar una pendiente libera reserva sin mover `stock`. Cancelar una pagada antes de consumo: si administración elige restituir, libera la reserva sin tocar `stock`; si elige no restituir, consume unidades y reduce `stock`. Cancelar una pagada tras consumo: si elige restituir, incrementa `stock`; de lo contrario, no lo cambia. Cada movimiento se registra una sola vez con evento y actor.

**Rationale**: La decisión administrativa sobre mercadería ya enviada no se infiere del estado de pago. El historial distingue unidades comprometidas de unidades que salieron del inventario.

**Alternatives considered**: Liberación automática en toda cancelación pagada; podría ofrecer unidades que ya no están físicamente disponibles.

## D3. Orden histórica, importes y migración

**Decision**: Introducir `DetalleOrden` con nombre de producto, talle, color, cantidad, precio unitario e importe de línea inmutables, más referencias opcionales a catálogo. En `Orden`, `costoEnvio` y `total` son nulos para envío sin cotizar; para retiro `costoEnvio` no aplica y `total=subtotal`. Mantener `subtotal` decimal. Guardar `venceEn` explícito y una fecha de creación autoritativa obtenida del reloj de la base. Guardar constancia externa del envío con fecha y actor, sin importe inventado. Cambiar `DatosEnvio` para exigir los cinco campos en órdenes de envío nuevas, validado además en servicio; filas heredadas requieren migración compatible.

**Rationale**: `Orden` actual requiere `total`, usa `costoEnvio=0` y solo apunta a `Carrito`; `ItemCarrito.precioUnitario` puede quedar viejo. Ninguno preserva por sí solo el contrato de compra. El plan debe poder convivir con órdenes existentes sin asumir que no las hay.

**Alternatives considered**: Consultar el carrito o el catálogo como detalle histórico; cambia cuando se edita el carrito o el producto. Guardar envío desconocido como cero; comunica un total falso.

## D4. Revisión, aceptación e idempotencia

**Decision**: Un resumen backend incluye ítems, precio guardado y vigente, subtotal, bloqueos y una `huellaResumen` calculada sobre cliente, carrito, ítems/cantidades, precios vigentes, entrega y datos normalizados. La confirmación requiere aceptación explícita y esa huella; el backend recalcula, compara y rechaza cambios con un resumen nuevo. La interfaz reutiliza una `claveConfirmacion` opaca por intento hasta obtener resultado definitivo. En orden se persisten clave y huella de solicitud con unicidad por usuario; `carritoId` sigue único. Reintento idéntico devuelve la orden; clave repetida con otra solicitud devuelve conflicto. Clave distinta sobre carrito ya comprado también devuelve conflicto, sin segunda reserva.

**Rationale**: La huella prueba que el cliente aceptó el resumen que vio, pero jamás reemplaza el recálculo backend. La clave y restricciones únicas protegen doble clic y pérdida de respuesta.

**Alternatives considered**: Deshabilitar solo el botón; no protege reintentos de red. Confiar solo en `carritoId @unique`; evita duplicados, pero no distingue una repetición idéntica de una alterada.

## D5. Vencimiento y reloj

**Decision**: Para órdenes nuevas, `venceEn = creadaEn + 24 horas` con instantes UTC de la base de datos; las existentes conservan su `venceEn`. Toda transición sensible evalúa el reloj de la base después de adquirir los bloqueos necesarios. A partir del vencimiento, pago y cancelación voluntaria de pendiente se rechazan y se materializa `cancelada_vencimiento`. Un comando backend ejecuta barridos por lotes, con registro de ejecución, errores y reintento; se programa una vez por hora en producción. Una tarea que empieza tarde procesa todos los pendientes vencidos; no prorroga reservas. La lógica transaccional de transición se comparte con las acciones normales.

**Rationale**: El programador puede retrasarse, detenerse o repetir una ejecución. La disponibilidad y elegibilidad dependen del instante persistido, no del momento del barrido.

**Alternatives considered**: Temporizador por proceso Express; no sobrevive reinicio ni asegura ejecución si no hay instancia activa. Interpretar un día como fecha calendario; viola las 24 horas exactas.

**Deployment dependency**: El workflow de GitHub Actions debe quedar en la rama predeterminada, tomar el código desplegado de `main`, recibir solo el secreto de producción, validar el destino y registrar corridas, fallas y reintentos. Se eligió una hora de intervalo porque el requisito temporal se cumple con el reloj de base incluso si el barrido llega tarde. GitHub puede retrasar u omitir ejecuciones programadas; la persona responsable aceptó una corrida manual exitosa en producción como criterio de cierre de T041 el 2026-10-17, sin exigir observar el primer disparo horario. [Programación oficial de GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).

## D6. Transacciones y autorización

**Decision**: Usar transacciones Prisma con bloqueo de filas PostgreSQL y restricciones únicas; capturar conflictos/deadlocks, reintentar un número acotado de veces solo la operación completa y devolver error recuperable si se agota. Las rutas de checkout y órdenes propias usan `verificarToken` y `esCliente`, que consulta el rol vigente en la base; las administrativas usan `verificarToken` y `esAdmin`, también con rol vigente. Las BFF leen la cookie httpOnly y no revelan el token. El comando de vencimiento usa acceso de servidor a DB y no expone una ruta pública.

**Rationale**: Las filas bloqueadas serializan compras de la misma variante y las restricciones únicas son la última defensa de idempotencia. PostgreSQL documenta bloqueos de filas; Prisma documenta conflictos de escritura y necesidad de reintentos en ciertas transacciones. [PostgreSQL: bloqueo explícito](https://www.postgresql.org/docs/current/explicit-locking.html), [Prisma: transacciones v7](https://docs.prisma.io/docs/orm/v7/prisma-client/queries/transactions).

**Alternatives considered**: Validar stock y escribir en pasos separados como el carrito actual; permite sobreventa. Exponer una ruta pública de mantenimiento; amplía superficie de ataque innecesariamente.

## D7. Validación

**Decision**: Probar atomicidad, última unidad concurrente, repetición de solicitud, precio cambiado, vencimiento exacto, tarea tardía/repetida, devolución/stock en cancelación pagada y aislamiento por usuario/admin en base de prueba descartable. El backend y frontend carecen de script `test`; se podrá usar el runner integrado de Node si la versión disponible lo permite y pruebas manuales de interfaz, sin instalar dependencias por este plan. Ejecutar lint/build frontend al modificar código; backend declara ausencia de scripts.

**Rationale**: Las pruebas de concurrencia y tiempo verifican propiedades que no se deducen de una revisión estática. Nunca apuntar estas pruebas a datos de cliente/producción.
