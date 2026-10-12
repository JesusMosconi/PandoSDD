# Data Model: Checkout y órdenes

Este documento propone el modelo para el plan. No es una migración ejecutada. Fuente del modelo actual: `backend/prisma/schema.prisma`.

## Entidades existentes que cambian

### Orden

| Campo | Diseño | Regla |
|---|---|---|
| `id`, `usuarioId`, `carritoId` | Conservar | `carritoId` único; dueño y carrito deben coincidir. |
| `estado` | String con valores cerrados para órdenes nuevas | Nace `pendiente_pago`; filas heredadas conservan su estado y no se reinterpretan. |
| `tipoEntrega` | `retiro` o `envio` | Fijo desde creación. |
| `subtotal` | Decimal | Suma de `DetalleOrden.importeLinea`, calculada por backend. |
| `costoEnvio` | Decimal nullable sin default cero | `null` para envío sin cotizar; para retiro es no aplicable. El contrato expone `estadoCostoEnvio`, no infiere costo gratis. |
| `total` | Decimal nullable | Retiro: igual a subtotal. Envío: `null` mientras esta entrega no cotice envío. |
| `metodoPago` | String actual | `manual` para órdenes de esta entrega; no implica pasarela. |
| `creadaEn`, `venceEn` | Instantes UTC autoritativos para nuevas órdenes | Un único reloj de BD fija `creadaEn`; `venceEn = creadaEn + 120 horas` exactas. Campos opcionales para compatibilidad con filas heredadas. |
| `claveConfirmacion` | String nullable para filas heredadas | Unicidad `(usuarioId, claveConfirmacion)` para nuevas órdenes; misma clave con otra huella es conflicto. |
| `huellaSolicitud` | String nullable | Identifica datos normalizados de la intención confirmada; no es autoridad sobre precios. |
| `pagoConfirmadoEn`, `pagoConfirmadoPorId` | Instante y usuario opcionales | Solo en orden pagada; importe acreditado = subtotal. |
| `envioCoordinadoEn`, `envioCoordinadoPorId` | Instante y usuario opcionales | Necesarios para `enviada`; constancia externa sin monto. |
| `canceladaEn`, `motivoCancelacion`, `restituirStock` | Opcionales | `restituirStock` obligatorio para cancelación de pagada, con motivo; no se usa para cancelación pendiente. |

`fechaCreado` existente se conserva para compatibilidad. `creadaEn`/`venceEn` rigen órdenes nuevas; no convertir retrospectivamente `fechaCreado` ni generar reservas para filas heredadas sin política de migración aprobada. Para envío, `null` en costo/total expresa desconocido, nunca cero. Las respuestas distinguen `no_aplica` (retiro) de `sin_cotizar` (envío).

`estadoVisible` es derivado para consultas, no reemplaza `estado`: una pendiente con `venceEn <= reloj de base de datos` se presenta como `reserva_vencida_en_proceso` hasta que la tarea registre `cancelada_vencimiento`. En ese intervalo, las acciones de pago/cancelación voluntaria permanecen inhabilitadas y la reserva ya no cuenta para disponibilidad.

### DatosEnvio

Conservar relación 1:1 con `Orden`. Para órdenes nuevas con `envio`, dirección, ciudad, `codPostal`, teléfono y email son obligatorios y normalizados; con `retiro`, no crear `DatosEnvio`. Los tres campos actualmente opcionales pueden permanecer nullable en el esquema para no invalidar filas heredadas; el servicio impone la obligatoriedad del nuevo checkout.

### TalleProducto

`stock` conserva el conteo físico no negativo. `stockDisponible` es derivado, no campo persistido: `max(0, stock - compromisos efectivos)` en el instante de consulta. Se debe impedir un ajuste manual de `stock` por debajo de compromisos efectivos. Catálogo, detalle, carrito y checkout usan este valor derivado en sus validaciones/presentación.

### Carrito e ItemCarrito

Un carrito confirmado cambia de `activo` a `convertido` en la misma transacción que la orden; sus ítems se conservan para procedencia, pero el detalle de orden no depende de ellos. `ItemCarrito.precioUnitario` se usa solo para mostrar diferencia respecto del precio vigente. El carrito nuevo del usuario se crea cuando vuelve a comprar. La selección de carrito activo debe ser serializada al confirmar para impedir ediciones concurrentes; las rutas de edición que compitan deben comprobar `estado=activo` dentro de su transacción.

## Entidades nuevas

### DetalleOrden

- Relación muchos a uno con `Orden`; índice por `ordenId` y orden de línea.
- `productoId`, `talleProductoId` como referencia opcional histórica; los datos comprados no dependen de esas referencias.
- `nombreProducto`, `talle`, `color`, `cantidad` (entero positivo), `precioUnitario` Decimal, `importeLinea` Decimal y posición.
- `importeLinea = cantidad × precioUnitario`; suma de líneas = `Orden.subtotal`.
- Inmutable después de crear la orden. No hay líneas de `ProductoImprovisado` en checkout web.

### ReservaStock

- Relación muchos a uno con `Orden` y con `TalleProducto`; una fila por variante de la orden, con `cantidad` positiva, `estado` (`activa`, `liberada`, `consumida`) y fechas de transición.
- Unicidad `(ordenId, talleProductoId)`. Si el carrito contiene dos líneas de la misma variante, sumar sus cantidades antes de validar stock en resumen y confirmación, identificar ambas si la suma excede el disponible y reservar la cantidad agrupada validada.
- **Compromiso efectivo** para calcular disponible: `activa` de orden `pendiente_pago` con `venceEn > ahora`, o `activa` de orden pagada/en preparación/lista/enviada según transición antes de consumo. Una pendiente vencida no cuenta aun si el comando todavía no cambió su estado.
- `liberada` y `consumida` no se borran. Cada cambio se permite una sola vez con estado esperado, bajo transacción y bloqueo de variante.
- Al pasar a `enviada` (envío) o `entregada` (retiro), se consume y se decrementa `stock` físico. Si una cancelación pagada ocurre antes de consumo, la opción de no restituir también consume/decrementa; si ocurre después, restitución explícita incrementa `stock` físico una sola vez.

### EventoOrden

- Relación muchos a uno con `Orden`; `fecha`, `origen` (`cliente`, `administracion`, `tarea`), `actorUsuarioId` opcional para tarea, `estadoAnterior`, `estadoNuevo`, `motivo` opcional, decisión de restitución opcional.
- Apéndice inmutable para auditoría; crear junto con transición. No duplicar evento por reintento sin cambio.
- La pantalla muestra el estado actual desde `Orden`; el evento explica su historia. `ActividadAdmin` heredada no alcanza para guardar actor, motivo y transición, por lo que no se usa como único registro de esta feature.

## Transiciones y efectos

| Origen | Destino | Actor/condición | Reserva/stock |
|---|---|---|---|
| nuevo | `pendiente_pago` | Cliente, carrito válido y resumen aceptado | Crear `activa`, sin restar stock físico |
| `pendiente_pago` | `pago_confirmado` | Admin, hora BD `< venceEn` | Mantener `activa` |
| `pendiente_pago` | `cancelada_cliente` | Dueño, hora BD `< venceEn` | `activa → liberada` |
| `pendiente_pago` | `cancelada_admin` | Admin con motivo, hora BD `< venceEn` | `activa → liberada` |
| `pendiente_pago` | `cancelada_vencimiento` | Tarea o transición oportunista, hora BD `>= venceEn` | `activa → liberada` lógica; ya no contaba desde vencimiento |
| `pago_confirmado` | `en_preparacion` | Admin | Mantener `activa` |
| `en_preparacion` | `lista_para_retiro` | Admin, retiro | Mantener `activa` |
| `en_preparacion` | `enviada` | Admin, envío con constancia externa de costo/cobro | `activa → consumida`, reducir stock físico |
| `lista_para_retiro` | `entregada` | Admin | `activa → consumida`, reducir stock físico |
| `enviada` | `entregada` | Admin | Ya consumida; sin movimiento |
| pagada antes de entrega | `cancelada_admin` | Admin con motivo y decisión de restitución | Según estado de reserva y decisión; exactamente un movimiento |

`entregada` y canceladas son terminales. Transición repetida informa estado actual sin evento ni movimiento nuevo. En cancelación pagada se muestra `devolución pendiente de gestionar`; no se registra reembolso efectivo en esta fase.

## Migración y compatibilidad

1. Crear migración nueva; no editar migraciones aplicadas. Antes, verificar destino, rama y estado de migración de una base de prueba aislada. No ejecutar en producción por inferencia.
2. Agregar columnas opcionales primero para preservar órdenes existentes; quitar default de `costoEnvio` y hacer `total` nullable solo tras inspeccionar compatibilidad de código actual. No transformar `0` heredado en «sin cotizar» sin evidencia.
3. Crear índices: órdenes por `(usuarioId, creadaEn)`, `(estado, venceEn)`, unicidad `(usuarioId, claveConfirmacion)` y `carritoId`; reservas por `talleProductoId` y estado; eventos/detalles por orden.
4. Asegurar que nuevas rutas reconozcan órdenes creadas por este checkout; las filas heredadas sin `creadaEn`/`venceEn` se consultan sin acciones de vencimiento ni reservas retroactivas hasta política explícita.
5. Verificar que los nombres nuevos y relaciones Prisma sigan la constitution; ninguna baja física de órdenes, detalles, reservas o eventos.
