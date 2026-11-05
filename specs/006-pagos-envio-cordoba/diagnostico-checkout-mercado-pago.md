# Diagnóstico de Checkout Pro vía Orders — solo entorno de prueba

Fecha: 29 de octubre de 2026. Estado: caso técnico WCS-56669 creado y verificado en el Centro de atención; aguardando soporte.

## Consulta propuesta a soporte

Estamos integrando Checkout Pro vía Orders en Argentina para una tesis, exclusivamente con credenciales y tarjetas de prueba. Necesitamos identificar por qué el checkout falla después de confirmar la tarjeta, sin registrar una transacción en la order.

Datos para localizar la solicitud:

- Aplicación del panel: `807714045666272` (PandoCBA-Tesis), producto Checkout Pro, ambiente Prueba.
- Aplicación de las credenciales de prueba: `2147091673612411`.
- Vendedor de prueba: `3801948316`, identidad `test_user`, país AR/sitio MLA, activo y con venta permitida.
- Order de prueba: `ORDTST01M64NW30BC4JJA8GWCAH8Q7HR`.
- Referencia externa: `pando-tesis-orden-52`.
- ID de solicitud de creación en los logs: `1de42d80-b7fe-48b0-abf9-4af07e83ca07`.
- Creación: 29/10/2026, 17:33:24, hora Argentina (20:33:24 UTC).
- Endpoint: `POST /v1/orders`, resultado `201 Created`, duración indicada por el panel: 301 ms.

Solicitud aceptada: `type=online`, `processing_mode=manual`, total ARS `35000.01`, dos ítems por `20000.01` y `15000.00`, URLs de retorno HTTPS en `https://pando-tesis-retorno.vercel.app/`. No se envió objeto `payer`. La documentación del producto permite omitirlo; si se incluye, exige `payer.email`.

Reproducción informada:

1. En Edge InPrivate, sin iniciar sesión en Mercado Pago, abrir el `checkout_url` exacto devuelto por Orders.
2. Completar la tarjeta de prueba Mastercard publicada en el propio panel (terminación 0604), con titular APRO, vencimiento 11/30 y documento ficticio de la guía. No usar tarjetas reales.
3. El usuario informa que no se solicitó ni ingresó correo electrónico.
4. Al confirmar aparece «Una de las partes con la que intentás hacer el pago es de prueba».
5. La consulta posterior a `GET /v1/orders/{id}` conserva `status=created` y no devuelve transacciones de pago. El panel solo registra la creación exitosa.

Como diagnóstico adicional se abrió el `sandbox_init_point` de la preferencia asociada. Mostró la banda Sandbox, pero también falló con «Oh, no, algo anduvo mal». Este enlace corresponde a una prueba auxiliar de compatibilidad; la implementación principal sigue utilizando el `checkout_url` de Orders. No se considera una solución ni se propone sustituir el contrato sin validación.

Solicitamos confirmar:

- El motivo concreto del error del checkout asociado a la solicitud/order indicada.
- Si existe alguna condición adicional de la cuenta o aplicación de prueba que no figure en la guía actual.
- Si el flujo invitado sin cuenta compradora de prueba está habilitado para esta aplicación y credencial, como indica la documentación argentina vigente de Checkout Pro vía Orders.
- El procedimiento soportado para verificar los escenarios APRO, rechazo y pendiente sin pagos reales.

No adjuntar Access Tokens, contraseñas, códigos de verificación, datos de cuentas personales, cookies ni archivos HAR sin sanitización.

## Registro de envío

El usuario autorizó expresamente el envío el 29/10/2026. El canal de soporte recibió el reporte a las 18:21, hora Argentina, en la conversación `2ef5ef44-ffe9-4b4c-9bae-c53dc0256391`. Esta referencia identifica una conversación; no es un ticket humano confirmado.

El asistente de IA del proveedor respondió que no puede rastrear el Request ID y recomendó un comprador de prueba. Se envió una aclaración a las 18:23 señalando la contradicción con las guías específicas de Checkout Pro vía Orders y solicitando derivación a soporte humano o instrucciones para abrir un ticket. No se enviaron secretos ni se activaron credenciales reales.

Se confirmó la apertura del caso con el contenido autorizado a las 18:24 (Argentina). El Centro de atención muestra **WCS-56669**, título correspondiente al error de Checkout Pro vía Orders y estado **Aguardando soporte**. URL: https://www.mercadopago.com.ar/developers/es/support/center/tickets/detail/WCS-56669 . El proveedor también informó que enviará confirmación por correo; no se inspeccionó la bandeja de correo. La causa y la solución siguen pendientes de respuesta técnica.

## Límites del diagnóstico

El 2026-10-30 el usuario aportó respuesta de soporte para WCS-56669: atribuye como causa más probable el uso de invitado con vendedor de prueba y pide iniciar el `checkout_url` principal con comprador de prueba. También indica usar credenciales de prueba `APP_USR`, evitar `sandbox_init_point` y no usar los titulares de tarjeta manuales como procedimiento de este flujo. Esta respuesta corrige el procedimiento de reproducción anterior; queda pendiente repetirlo y comprobar el estado remoto y local.

El panel autenticado confirma Checkout Pro y ambiente Prueba. El Public Key mostrado corresponde a las mismas credenciales revisadas; no se copiaron secretos para este reporte. La cuenta está activa, tiene términos de Mercado Pago aceptados y permiso de órdenes/pagos. La preferencia no está vencida, no tiene email de comprador y no exige una cuenta registrada.

La página pública de estado consultada indica Checkout Pro y pagos operativos; esto no descarta una falla específica del entorno de prueba. No se afirma una incidencia general del proveedor ni un defecto confirmado del código local. La acreditación completa sigue pendiente de verificación.

Referencias oficiales consultadas:

- https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/create-order?scope=prod
- https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/integration-test-introduction?scope=prod
- https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/integration-test/test-purchase-with-card?scope=prod
- https://status.mercadopago.com/
