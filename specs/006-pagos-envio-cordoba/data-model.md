# Data model: pagos y envío Córdoba Capital

## Orden existente

- `subtotal`, `costoEnvio`, `total`: Decimal histórico, dos decimales. Orden online de retiro: `costoEnvio=0`, `total=subtotal`; envío cubierto: `costoEnvio=15000`, `total=subtotal+15000`.
- `metodoPago`: discriminante entre órdenes heredadas `manual` y nuevas `mercado_pago`. No reinterpretar `total=null`/`costoEnvio=null` heredados.
- `estado`, `creadaEn`, `venceEn`, `pagoConfirmadoEn`: conservar estados y plazo de reserva actuales. `pagoConfirmadoPorId` queda nulo en acreditación externa, con origen de evento `proveedor`.
- `domicilioRevisadoEn`, `domicilioRevisadoPorId`: opcionales para envíos online; solo administración puede fijarlos tras revisar calle/altura y son requisito para `enviada`. No reutilizar `envioCoordinadoEn`, cuyo significado heredado es otro.
- `esDemostracion`: marcador persistente obligatorio para órdenes de esta feature; se propaga a pagos, incidencias y reintegros mediante su orden y se expone en cliente/admin. Nunca se mezcla con órdenes reales ni habilita efectos físicos o monetarios.
- La huella aceptada incorpora cobertura, tarifa y total. No basta guardar un monto enviado por el navegador.
- Relación uno a muchos con `IntentoPago`; relación uno a muchos con `IncidenciaPago` y `ReintegroPago` según la necesidad de auditoría.

## DatosEnvio existente

- `ciudad` normalizada a `Córdoba Capital` y `codPostal` normalizado; `direccion`, `telefono`, `email` conservan reglas actuales.
- El código postal conserva validación de formato y se almacena como dato de dirección; no se usa una lista positiva ni prefijos para clasificar cobertura.
- La localidad normalizada debe ser Córdoba Capital. La selección es declarativa; administración revisa calle y altura antes de `enviada` simulada.

## IntentoPago nuevo

| Campo | Regla |
|---|---|
| `id`, `ordenId` | Clave interna y relación a una orden. |
| `proveedor` | `mercado_pago`. |
| `claveIdempotencia` | Única, estable para reintento de la misma creación externa. |
| `referenciaExterna` | Identificador externo de order, único cuando se conoce. |
| `importe`, `moneda` | Copia del total histórico y `ARS`. |
| `estado` | `preparado`, `creacion_incierta`, `abierto`, `aprobado`, `rechazado`, `cancelado`, `vencido` o `incidencia`. |
| `creadoEn`, `actualizadoEn`, `ultimoChequeoEn` | Auditoría y programación de conciliación. |
| `urlCheckout` | Solo URL del proveedor validada, sin credenciales; no autoridad de estado. |

Restricciones: una clave idempotente única; referencia externa única y nullable; no más de un intento abierto al mismo tiempo por orden (serializar con bloqueo de orden). No guardar PAN, CVV ni tokens de tarjeta. Si una llamada remota termina sin respuesta cierta, conservar `creacion_incierta` y reconciliar/reintentar con la misma clave antes de crear otro intento.

## IncidenciaPago nueva

- Relación con orden e intento si existen; referencia externa y tipo (`cobro_tardio`, `importe_incorrecto`, `referencia_incorrecta`, `cobro_duplicado`, `resultado_incierto`, `reconocimiento_fallido`).
- Importe y moneda verificados, momento de detección, estado `abierta`/`resuelta`, actor y explicación de resolución.
- Clave externa+típico evento para deduplicar hallazgos. Una incidencia no cambia automáticamente estado de orden ni stock.

## ReintegroPago nuevo

- Relación con orden y con incidencia/cancelación que lo originó; `concepto` (`envio`, `cobro_sin_venta`), importe debido en ARS, importe efectivamente reintegrado, estado `pendiente`/`en_proceso`/`completado`/`fallido`, método, referencia externa única cuando exista, fechas/actor y motivo si el envío se reintegra después del despacho.
- `PagoReintegro` y `DevolucionCliente` existentes siguen siendo autoridad para el dinero de productos. `ReintegroPago` cubre envío o cobros sin venta; el resumen administrativo suma obligaciones y movimientos comprobados de ambos sin duplicarlos.
- Para órdenes online, `PagoReintegro` añade referencia/comprobante externo y fecha de comprobación opcionales en el esquema (nulos para filas heredadas). Registrar importe efectivo de productos exige esa evidencia validada; una clave local de idempotencia sola no prueba devolución de dinero.
- La suma de todos los importes efectivamente reintegrados por una orden no puede superar lo efectivamente cobrado. No marcar `completado` por cancelar orden: comprobar el resultado del proveedor o una constancia externa verificable.

## Invariantes y transiciones

1. Orden nueva online: `subtotal + costoEnvio = total = importe del intento` en ARS.
2. `pendiente_pago` + pago remoto acreditado + reserva vigente → `pago_confirmado`, reconocimiento FIFO una vez y evento único.
3. Rechazo o abandono → orden sigue `pendiente_pago` hasta reintento o vencimiento.
4. En `venceEn`, la reserva deja de contar y la orden se cancela/libera según flujo actual incluso si el proveedor no responde. Un cobro conocido después → incidencia y reintegro pendiente; nunca reactivar orden/stock.
5. Cancelación de orden online pagada antes de salida → obligaciones de productos por `DevolucionCliente` y de envío por `ReintegroPago`, cuya suma es el total cobrado. Después de salida, devolución parcial de productos usa `DevolucionCliente`; envío solo se reintegra por decisión expresa con motivo.
6. Reconsulta repetida o concurrente de proveedor → misma situación final sin segunda venta ni segundo correo.
7. Cancelación local de orden pendiente con intento abierto → intento de cancelación externa fuera de transacción; si la red falla se registra incertidumbre y se reconcilia. Un cobro posterior se trata como incidencia.
8. `domicilioRevisadoEn` y actor son obligatorios para transicionar envío online a `enviada`; la orden manual heredada conserva `envioCoordinadoEn`.
9. Un cobro validado que no pudo registrarse como venta deja `IncidenciaPago` persistente; el reintento de reconocimiento conserva idempotencia y respeta `venceEn`. Si la venta ya no es posible, el importe queda pendiente de reintegro, sin marcar la orden pagada.

## Migración

Agregar tablas/relaciones e índices sin reemplazar órdenes anteriores. Antes de generar/aplicar, verificar base aislada, rama no principal, migraciones pendientes y compatibilidad de despliegue. Nunca editar migraciones aplicadas ni ejecutar en producción por inferencia.
