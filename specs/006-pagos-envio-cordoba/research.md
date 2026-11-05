# Research: pagos y envío Córdoba Capital

## Checkout

**Decision**: Checkout Pro mediante Orders API: `type=online`, `processing_mode=manual`, `total_amount` igual a suma de ítems, referencia al ID local y clave idempotente estable por intento.

**Rationale**: Tarjetas y medios de Mercado Pago en entorno alojado; monto y credenciales permanecen en servidor. [Crear order](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/create-order?scope=prod).

**Alternatives considered**: Checkout API/Bricks dentro de la tienda aumenta la interfaz de pago; dos proveedores duplican conciliación.

## Confirmación

**Decision**: Verificar la order externa al conciliar intentos abiertos periódicamente y al consultar orden pendiente, con límite de frecuencia. Validar comercio, referencia, moneda, monto y estado. El retorno del navegador no acredita. La transición local es única bajo bloqueo. La función de cobros online queda apagada por defecto hasta verificar programación y entorno.

**Rationale**: Webhooks oficiales son HTTPS firmados, pero la constitution exige `verificarToken` en nuevas rutas de escritura. Un trabajo interno evita excepción de autenticación. [Notificaciones](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/notifications?scope=prod), [estados](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/payment-management/status/order-status?scope=prod).

**Alternatives considered**: Webhook firmado reduce latencia pero requiere enmienda constitucional; consultar solo cuando vuelve el cliente deja pagos sin actualizar.

## Vigencia

**Decision**: Derivar duración externa del tiempo que resta hasta `Orden.venceEn`; bloquear inicios demasiado próximos al vencimiento. A `venceEn` cancelar/liberar localmente aunque el proveedor no responda, registrar incertidumbre y resolver cualquier cobro conocido luego como incidencia sin stock.

**Rationale**: `expiration_time` es duración desde creación externa; `P1D` en un reintento extendería el pago más allá de la reserva. [Vigencia](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/additional-settings/define-order-validity?scope=prod).

**Alternatives considered**: Reiniciar reserva en cada intento retendría stock indefinidamente.

## Cobertura

**Decision**: ARS 15.000 por orden de envío. El usuario eligió el 2026-10-29 selección expresa de Córdoba Capital y revisión administrativa de la dirección antes del envío simulado. El código postal es informativo con validación de formato, sin lista positiva. Otras localidades se rechazan y pueden optar por retiro.

**Rationale**: El checkout ya recibe localidad/código postal. No se puede probar por esos datos que la calle esté dentro de Capital, por lo que se revisa antes del despacho.

**Alternatives considered**: Solo texto libre “Córdoba” admite localidades erróneas; geocodificación agrega dependencia y ambigüedad.

## Reintegros

**Decision**: Conservar `DevolucionCliente`/`PagoReintegro` como registro de obligaciones de productos; usar `ReintegroPago` para envío o cobro sin venta, con saldo agregado sin doble cuenta. Antes de salida, cancelar todo incluye envío. Después de salida, reintegrar envío requiere decisión administrativa con motivo. En esta tesis todos los reintegros se representan localmente y exigen constancia identificada como simulación `SIM-`; no se ejecuta ni registra una transferencia real.

**Rationale**: El flujo actual de devoluciones distribuye importes de productos. Orders API admite reembolso total/parcial para una fase posterior. [Reembolsos](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/refunds-cancellations?scope=prod).

**Alternatives considered**: Marcar reintegrado al cancelar sería falso; duplicar el importe de productos en un segundo registro monetario sobrestimaría la deuda; automatizar reembolsos ahora aumenta los casos de fallo externo.

## Decisión de tesis: exclusivamente pruebas

Se usan credenciales del entorno Prueba y tarjetas de prueba de Checkout Pro con Orders. Los pagos aprobados/rechazados/pendientes se obtienen del proveedor de prueba, no de parámetros del navegador. Los reintegros y despachos se representan localmente como simulación sin mover dinero ni mercadería. No se habilita producción ni se contratan recursos pagos.

El prefijo del token no demuestra el entorno: confirmar el método oficial vigente de comprobación en T005 y registrar evidencia sin secretos; si no se puede verificar, bloquear integración externa y usar pruebas simuladas hasta resolverlo. Referencia: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/create-application?scope=prod

Para la aplicación de tesis, soporte respondió en WCS-56669 (respuesta aportada por el usuario el 2026-10-30) que el checkout de prueba debe abrirse con `checkout_url` principal e inicio de sesión de un comprador de prueba separado del vendedor. Indicó credenciales de prueba `APP_USR` del vendedor y descartó el modo invitado y `sandbox_init_point` para esta reproducción. La [introducción pública de pruebas de Orders](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/integration-test-introduction?scope=prod) aún indica modo invitado; la [guía de cuentas de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/test-accounts) sí indica crear comprador. Se adopta el procedimiento específico de soporte y se comprobará el resultado antes de concluir que resolvió el error.

Revisión T005 del 2026-10-30: la [referencia de creación](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro/create-order/post) confirma `type=online`, `processing_mode=manual`, `total_amount` igual a la suma de ítems, `X-Idempotency-Key` obligatorio y `checkout_url` de respuesta. La [vigencia](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/additional-settings/define-order-validity?scope=prod) expresa `expiration_time` como duración ISO 8601 desde la creación externa; no publica un mínimo garantizado de segundos. Las [URLs de retorno](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/web-integration/configure-back-urls?scope=prod) admiten `success_url`, `failure_url`, `pending_url` y `auto_return` bajo `config.online`. El [catálogo de estados](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/payment-management/status/order-status?scope=prod) distingue `created`, `processing`, `processed/accredited` y `failed` con sus detalles. El contrato local vigente coincide en esos campos; el retorno continúa siendo informativo y el servidor consulta Orders. Dos órdenes reales de prueba aceptaron la solicitud y se acreditaron con los importes históricos exactos. El mínimo externo cercano al vencimiento no queda demostrado por esas compras y sigue como límite de T024.

La [guía pública de tarjetas para Orders](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/integration-test/test-purchase-with-card?scope=prod) enumera `OTHE` y `CONT`, pero también indica comprar como invitado, en conflicto con WCS-56669 para esta aplicación. No asumir que esos códigos funcionarán con el comprador de prueba; comprobarlo por separado antes de cerrar los escenarios rechazado y pendiente.

Prueba empírica T024 del 2026-11-04: con la cuenta vendedora `test_user` verificada, una única order de prueba sin comprador ni transacciones se creó con `expiration_time=PT60S`. Orders respondió `201`, ID `ORDTST01M6M212V1KJ5058C77T8FEH38`, estado `created`, `expiration_time=PT60S` y `created_date=2026-11-04T19:54:27.566Z`; no se abrió el checkout ni se completó un pago. Esto confirma aceptación de 60 segundos para la aplicación de tesis en esa ejecución, no un mínimo garantizado publicado por Mercado Pago. El guardado local exige al menos 90 segundos restantes, solicita como máximo el remanente menos 30 segundos y comprueba fecha/duración devueltas antes de ofrecer el enlace. No hay evidencia que justifique aceptar menos de 60 segundos ni extender el plazo en reintentos.
