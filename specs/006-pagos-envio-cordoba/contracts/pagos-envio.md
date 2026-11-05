# Contracts: checkout, pago y consulta

El navegador llama al BFF de Next para operaciones autenticadas; el BFF delega a Express con el usuario vigente. Los nombres concretos se ratifican al crear `tasks.md`.

## `POST /api/checkout/resumen`

Entrada existente: `{ tipoEntrega: "retiro" | "envio", datosEnvio?: { direccion, ciudad, codPostal, telefono, email } }`. La respuesta indica `pagosOnlineDisponibles`; con la función apagada conserva la semántica manual actual.

Salida nueva de envío cubierto: `estadoCostoEnvio="cotizado"`, `costoEnvio="15000.00"`, `totalFinal="<subtotal+15000>"`, `cobertura="cordoba_capital"`, `huellaResumen`, `puedeConfirmar=true` si el resto es válido. Retiro: `costoEnvio="0.00"`, `totalFinal=subtotal`, `estadoCostoEnvio="no_aplica"`. Fuera de cobertura: `puedeConfirmar=false`, error de campo de ciudad con código `ENVIO_FUERA_COBERTURA`; no prometer total pagable.

## `POST /api/checkout/confirmacion`

Conserva clave y huella de confirmación. El servidor recalcula tarifa/cobertura dentro de la operación de reserva; si cambió el resumen, 409 con resumen nuevo. Respuesta 201/200 idempotente: orden pendiente con `subtotal`, `costoEnvio`, `total`, `metodoPago="mercado_pago"`, `venceEn`, sin URL de pago todavía. No aceptar precio/tarifa desde cliente.

## `POST /api/ordenes/:id/pagos`

Autenticación de dueño. Inicia o recupera el intento abierto de una orden online pendiente y vigente. Respuesta 200: `{ ordenId, intentoId, estado, urlCheckout, venceEn }`, con URL HTTPS del proveedor validada. Respuestas: 401 sin sesión, 403 ajena, 404 inexistente, 409 vencida/cancelada/pagada o intento aún indeterminado, 503 proveedor temporalmente indisponible. Doble solicitud reutiliza el intento y nunca crea dos operaciones externas.

## `GET /api/ordenes/:id` y `GET /api/ordenes`

Exponen `estadoPago` (`sin_iniciar`, `pendiente`, `aprobado`, `rechazado`, `incidencia`), `importeCobrado`, `costoEnvio`, `total`, `puedeReintentarPago`, `domicilioRevisado` y `saldoMonetarioPendiente`, sin credenciales ni identificadores sensibles. Consultar puede solicitar conciliación limitada de una orden pendiente, pero la respuesta no inventa acreditación mientras el proveedor no confirme.
Todas las respuestas de órdenes de demostración exponen `esDemostracion=true` y rotulan los importes como simulados. Las rutas de pago rechazan credenciales de producción; las rutas de despacho y reintegro de dinero real rechazan órdenes de demostración. Los estados de despacho y reintegro se pueden ensayar solo como simulación en la base aislada, sin efectos externos.

## Administración

`POST /admin/ordenes/:id/pago` devuelve 409 para `metodoPago="mercado_pago"`. Una acción administrativa autenticada registra revisión de calle/altura con actor y fecha; `PATCH /admin/ordenes/:id/estado` exige esa revisión para `enviada` online pagada, mientras la orden heredada sin cotizar exige `envioCoordinado`. La vista administrativa muestra intentos, incidencias, obligaciones de productos y envío, reintegros efectivos y saldo agregado sin duplicarlos. Registrar reintegro completado, tanto de productos como de envío, exige importe, referencia comprobada con el proveedor o constancia externa examinada por administración, fecha y actor; reintegrar envío después del despacho exige motivo. La ruta existente de `PagoReintegro` solicita esa evidencia adicional solo para órdenes online y conserva el contrato manual heredado.

## Conciliación interna

Rutas implementadas para la tesis: `GET /ordenes/:id/pago` consulta y puede conciliar el intento del dueño con límite de frecuencia; `POST /admin/ordenes/:id/revision-domicilio` registra revisión; `POST /admin/ordenes/:id/reintegro-envio` exige motivo; `POST /admin/ordenes/:id/reintegros-pago/:reintegroId` exige `referenciaExterna` de simulación; `POST /admin/ordenes/:id/incidencias/:incidenciaId/resolucion` exige motivo y constancia `SIM-`, sin eludir un reintegro pendiente. Todas requieren token y autorización de dueño o rol administrativo vigente, según corresponda.

Trabajo programado lee intentos abiertos/indeterminados, consulta Orders API y valida comercio, referencia, moneda, total y estado. Usa la misma transición transaccional que una consulta puntual. Debe registrar éxito/error y alertar por atraso; no es una ruta pública de escritura. Al llegar `venceEn`, se cancela la orden local y la reserva deja de contar incluso si el proveedor está inaccesible; registrar incertidumbre y reconciliar después. En cancelación voluntaria de orden pendiente con intento abierto, intentar cancelar externamente sin demorar la cancelación local.
Un cobro validado cuyo reconocimiento local falla queda como incidencia persistente y visible; el conciliador reintenta la transición idempotente mientras la reserva sea válida y, si ya no es posible, deja reintegro pendiente. No informa la orden como pagada sin venta registrada.

## Retorno del proveedor

La URL de retorno abre la orden correspondiente para el dueño autenticado y muestra “Verificando pago” hasta conocer el resultado. Parámetros de URL nunca acreditan dinero ni alteran estado.
