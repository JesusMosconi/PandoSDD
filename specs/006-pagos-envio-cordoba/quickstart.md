# Quickstart: validación de pagos y envío

Este documento guía la validación futura; no ejecuta migraciones ni pagos. Usar una rama de feature en cada repositorio y comprobar la identidad y las migraciones de la base elegida. No leer archivos `.env`.

## Preparación

1. Revisar [spec](spec.md), [modelo](data-model.md) y [contratos](contracts/pagos-envio.md).
2. Confirmar selección expresa de Córdoba Capital y revisión administrativa de la dirección antes del envío simulado.
3. Configurar por nombre las credenciales de **prueba** de Mercado Pago y la URL de retorno; comprobar que el entorno de Mercado Pago es `prueba`. La programación del conciliador es una tarea separada.
4. Verificar estado de migraciones de la rama Neon elegida. En `production/neondb`, la migración 006 ya está aplicada; no repetirla ni usar cuentas o datos reales en compras de demostración.

### Variables y configuración de sesión

El ejemplo versionado del backend documenta los nombres `PAGOS_ONLINE_HABILITADOS` (false por defecto), `PAGOS_ENTORNO` (solo prueba), `MP_ACCESS_TOKEN_PRUEBA`, `MP_USUARIO_PRUEBA_ID`, `MP_APLICACION_PRUEBA_ID`, `MP_URL_RETORNO`, `PANDO_TEST_BRANCH_ID`, `PANDO_TEST_DATABASE_HOST`, `PANDO_TEST_DATABASE` y `PAGOS_CONCILIACION_LIMITE`. No copiar claves a documentos o al chat. El prefijo del token no determina su entorno.

### Despliegue con Neon production y Mercado Pago de prueba

En Render, confirmar que `DATABASE_URL` apunta a `production/neondb` del proyecto Neon `PandoCba` antes de activar la función. Configurar `PAGOS_ENTORNO=prueba`, `PANDO_TEST_BRANCH_ID=br-bitter-firefly-acgi1ey3`, `MP_ACCESS_TOKEN_PRUEBA`, `MP_USUARIO_PRUEBA_ID` y `MP_APLICACION_PRUEBA_ID` de la cuenta vendedora de prueba. El código exige el host Neon correspondiente, admite la conexión directa o pooler y verifica `test_user` al contactar Mercado Pago; el nombre heredado `PANDO_TEST_BRANCH_ID` no cambia el carácter de prueba del pago. Mantener `PAGOS_ONLINE_HABILITADOS=false` hasta que el backend actualizado esté desplegado y los valores anteriores verificados; cambiarla a `true` habilita el checkout de demostración para todos los compradores autenticados. Las órdenes de prueba reservan inventario de esa base y deben crearse con datos ficticios.

Usar `MP_URL_RETORNO=https://pando-cba-frontend.vercel.app/cuenta` solo si ese es el dominio productivo vigente en Vercel. El backend agrega `orden=<id>` y exige HTTPS; el usuario debe regresar con su sesión iniciada. El retorno no acredita el pago: la pantalla de cuenta consulta al backend y este verifica el estado con Mercado Pago cuando hay un intento pendiente. Sin el punto de conciliación programada, un pago cuyo comprador no vuelva puede permanecer pendiente localmente hasta una consulta de estado o una conciliación manual. Esta limitación debe comunicarse antes de habilitar pruebas públicas.

La herramienta local `backend/.codex-006/scripts/entorno-tesis.mjs` recibe credenciales temporalmente en memoria; su formulario se abre en `http://127.0.0.1:4317/`. Cerrarla descarta los valores. Verifica el destino Neon y la identidad de prueba de Mercado Pago. Las acciones permitidas de `acciones-tesis.mjs` ejecutan pruebas, verifican identidad y permiten arrancar backend/conciliador locales sin exportar claves. También contiene las operaciones acotadas de baseline y migración utilizadas en la preparación de esta rama; no repetirlas como paso de arranque. La migración ya aplicada y los resultados se registran en `verificacion.md`. Configurar credenciales no equivale a validar una compra completa.

La programación local gratuita del conciliador está preparada para pruebas. Antes de dar por terminado el recorrido hay que observar ejecuciones reales del job y registrar último éxito, errores y atraso. No contratar servicios pagos.

## Validación local automatizada

- Desde `backend/`: `npm.cmd test` con la base aislada configurada. Deben pasar tests de checkout, pagos, vencimiento, órdenes, devoluciones e inventario FIFO.
- Desde `frontend/`: `npm.cmd run lint` y `npm.cmd run build`. El backend no define lint ni build.

## Recorridos integrados de prueba

1. Carrito de $40.000: retiro muestra $40.000; envío a Córdoba Capital muestra $55.000. Otra localidad bloquea envío; el código postal no determina cobertura.
2. Cambiar precio, cantidad, entrega o dirección entre resumen y confirmación: 409 con nuevo resumen, sin orden ni pago con importe viejo.
3. Confirmar una sola compra con doble clic y reintento de conexión: una orden, una reserva y como máximo un intento externo abierto.
4. Crear la order con las credenciales de prueba del vendedor, abrir su `checkout_url` principal e iniciar sesión en el checkout con un comprador de prueba distinto. No usar una cuenta personal, ingreso como invitado ni `sandbox_init_point` para este flujo, según la respuesta específica de soporte WCS-56669. Probar resultado aprobado, rechazado y pendiente solo cuando el checkout permita simularlos; la [guía pública de tarjetas](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/integration-test/test-purchase-with-card?scope=prod) describe un procedimiento como invitado que contradice ese ticket y sus códigos de titular requieren comprobación experimental en sesión de comprador de prueba. Verificar estado remoto y local; cerrar el navegador antes del retorno y comprobar que el conciliador actualiza la orden.
5. Repetir consultas/conciliaciones y simular respuesta incierta del proveedor: no duplicar venta, stock, correo ni cobro.
6. Simular pago exactamente al vencer y proveedor inaccesible: a `venceEn` la reserva deja de contar y la orden se cancela; cobro conocido después queda como incidencia y reintegro pendiente, sin reactivar stock.
7. Simular cobro aprobado con fallo de reconocimiento local: incidencia persistente, orden no pagada, reintento idempotente antes de vencer o reintegro pendiente si ya no puede completarse.
8. Cancelar antes y después de pagar: con intento abierto, la cancelación local no espera al proveedor; antes del despacho el saldo a reintegrar agrega productos más $15.000 de envío una vez. Después del despacho, una devolución parcial de productos conserva su flujo y reintegrar envío requiere decisión con motivo.
9. Probar orden heredada manual con envío sin cotizar: conservar total ausente y constancia de coordinación externa; no reinterpretar como nueva orden online.
10. Verificar que un usuario no ve ni paga una orden ajena, que el admin no confirma manualmente una orden online y que el retorno manipulado no acredita dinero.
11. Intentar marcar `enviada` sin revisión de calle/altura registrada: rechazar; registrar revisión con actor y fecha y repetir. Verificar que la orden manual heredada sigue exigiendo coordinación externa.
12. Mantener la función de demostración deshabilitada hasta verificar el destino Neon elegido y las credenciales de prueba. Marcar las órdenes como simuladas y bloquear despacho físico, correos reales y reintegros monetarios.
13. Verificar rechazo de credenciales de cobro real y de una respuesta externa que no se identifique como prueba; no inferir entorno por prefijo del token.
14. Confirmar rótulos de simulación en cliente y admin, transporte de correo simulado, despacho sin efecto físico y reintegro sin transferencia real.
15. Ejecutar la demostración con recursos gratuitos existentes o localmente, sin contratar planes pagos; registrar qué parte se verificó contra Mercado Pago y qué parte con proveedor simulado.

## Criterio de habilitación

Los tests y lint/build deben pasar y las compras de prueba deben conciliarse. La programación del trabajo queda fuera de esta activación y su ausencia limita la confirmación de pagos cuando el comprador no consulta su orden. Verificar que no haya credenciales de cobro real y que la migración ya esté aplicada en el destino Neon elegido antes de activar la demostración. Registrar resultados y límites de cada prueba en un archivo de verificación de esta feature. Si una prueba de duplicación produce dos cargos externos, ambos deben quedar visibles y resolverse aunque solo uno se aplique a la orden.

### Conciliador de tesis

La opción gratuita utilizada localmente es `scripts/programar-conciliacion-tesis.mjs`, ejecutada por la herramienta temporal en un proceso separado. Consulta inmediatamente y luego cada cinco minutos; no iniciar mientras haya suites que simulan referencias de Mercado Pago. Cada ejecución registra fecha, duración, consultados y errores. Un error produce una línea ALERTA; si no aparece un éxito durante más de diez minutos con el equipo encendido, revisar el proceso y la conexión. Apagar el equipo detiene esta programación.

Se prepara además `.github/workflows/conciliar-pagos-prueba.yml` para ejecución manual, sin cron automático ni activación remota. Requiere entorno `tesis-pagos`, secretos de tesis y variable `PAGOS_TESIS_JOB_HABILITADO=true`. No se han cargado secretos en GitHub ni ejecutado el workflow. La frecuencia de cinco minutos corresponde al proceso local; no afirmar que GitHub esté programado.

### Retorno HTTPS de la sesión local

Publicado con autorización: `https://pando-tesis-retorno.vercel.app/` en el proyecto separado `pando-tesis-retorno`. Configurar ese valor como `MP_URL_RETORNO` en el proceso de prueba (la herramienta temporal lo conserva en memoria). Reiniciar solo los hijos backend/conciliador si se modifica el retorno, conservando la sesión de credenciales. La página enlaza a `http://localhost:3003/cuenta?orden=<id>`; mantener el frontend de tesis en ese puerto y abrir el enlace desde el mismo equipo. No desplegar secretos ni apuntar el puente al sitio comercial. Recibir el retorno no acredita el pago: el backend consulta al proveedor.

Para esta aplicación, soporte de Mercado Pago indicó en WCS-56669 usar el `checkout_url` principal con sesión de **comprador de prueba** de Argentina, distinta del vendedor de prueba. Crear esa cuenta desde Tus integraciones > PandoCBA-Tesis > Cuentas de prueba > Crear cuenta de prueba, con país Argentina y tipo Comprador. El usuario debe ingresar usuario, contraseña y eventual código de verificación directamente en su navegador; no transmitirlos por chat ni guardarlos en el repositorio. No usar la cuenta personal, el modo invitado ni `sandbox_init_point`. La guía pública de Orders todavía menciona modo invitado; esta prueba sigue la instrucción específica de soporte para el caso. Registrar el resultado remoto y local antes de dar el pago por validado.
