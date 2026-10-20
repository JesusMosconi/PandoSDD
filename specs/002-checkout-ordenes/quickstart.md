# Quickstart de validación: Checkout y órdenes

Guía para la fase de implementación. No ejecutar sobre datos de clientes ni asumir que el entorno local es aislado. Este documento no autoriza migraciones, seeds o despliegues.

## Antes de probar

1. Revisar [spec.md](spec.md), [plan.md](plan.md), [data-model.md](data-model.md) y [contratos](contracts/checkout-ordenes.md). Confirmar aprobación explícita del diseño de esquema y precios.
2. Confirmar `git status --short --branch` **por separado** en raíz, `backend/` y `frontend/`. Trabajar en ramas de checkout no `main`/`master` y preservar ediciones ajenas. Los tres repositorios estaban en `002-checkout-ordenes` al iniciar la implementación; comprobarlo de nuevo antes de editar.
3. Verificar por medio autorizado, sin imprimir secretos, que `DATABASE_URL` y cualquier URL de migración apuntan a una base descartable/aislada, su host y rama de Neon. Consultar estado de migraciones antes de aplicar una migración nueva. No abrir archivos `.env`.
4. Confirmar versión de Node, dependencias instaladas y programador de vencimiento disponible. No hay configuración de scheduler verificada en el repo.

## Comandos de verificación existentes

Desde `frontend/`: `npm.cmd run lint` y `npm.cmd run build`. Desde `backend/`: no hay scripts de lint ni build; declarar esa limitación. Si la implementación incorpora pruebas con runner integrado de Node, documentar el comando real en `backend/package.json` y correrlo sobre base aislada. `git diff --check` en cada repositorio afectado. No ejecutar migración sin confirmar destino y autorización.

## Escenarios de extremo a extremo

1. **Retiro**: cliente autenticado agrega dos variantes; desde `/carrito` entra a checkout, revisa precios, acepta y confirma. Verificar una orden `pendiente_pago`, detalle inmutable, total igual a subtotal y vencimiento exactamente 24 horas después de creación. Un nuevo carrito queda disponible.
2. **Envío**: exigir los cinco campos; normalizar email. Mostrar subtotal y «Envío: costo a coordinar» sin total final. Confirmar pago manual: solo productos acreditados. Intentar marcar `enviada` sin constancia externa: rechazo; con constancia: éxito sin total numérico.
   Probar límites de longitud, espacios y caracteres de FR-002 en cada campo; un error identifica exactamente los campos rechazados y conserva los datos ingresados.
3. **Precio**: cambiar precio de producto en base de prueba entre agregar al carrito y revisar. Mostrar precio anterior/vigente. Cambiarlo otra vez después de aceptar: confirmación devuelve resumen nuevo y exige nueva aceptación; sin orden parcial.
4. **Disponibilidad**: retirar producto, desactivar variante, reducir stock por debajo de cantidad y agregar `ProductoImprovisado` a carritos de prueba. Probar además dos líneas de la misma variante: cada una cabe por separado, pero su suma supera el stock; resumen y confirmación deben bloquear ambas. Cada caso impide confirmar, identifica ítem/motivo y conserva carrito editable. No se borra ítem automáticamente.
5. **Concurrencia**: dos clientes intentan comprar la última unidad al mismo tiempo; exactamente uno obtiene reserva. Probar también edición de stock administrativa concurrente y edición de un carrito mientras se confirma; no sobreventa ni orden incompleta.
6. **Idempotencia**: doble clic y dos solicitudes con misma clave/cuerpo devuelven una orden. Reutilizar clave con cuerpo diferente y clave nueva sobre carrito convertido: conflicto sin nueva orden. Simular pérdida de respuesta y reintentar.
7. **Vencimiento**: con reloj de prueba controlado, probar un instante antes, exactamente a T+24h y después para una orden nueva. Al vencimiento exacto la reserva ya no reduce disponibilidad. Barrido tardío cancela pendiente, conserva vencimiento original y no mueve stock físico; ejecutar dos veces y comprobar un único evento/liberación. Pago justo antes de vencer detiene cancelación; exactamente al vencer se rechaza aun si la tarea no corrió.
8. **Cancelaciones**: cliente cancela pendiente antes de vencer y reintenta. Administración cancela una pagada con decisión `restituirStock=true` y luego `false` en órdenes de prueba separadas, antes/después del consumo; verificar movimientos correctos y sin duplicados. Ambas muestran «devolución pendiente de gestionar», no «devuelto».
9. **Permisos**: cliente A no lista/ve/cancela orden de B; sin sesión no hay acceso; usuario no admin recibe 403 para administración. Revisar también que BFF no entrega el JWT al navegador.
10. **Historial**: modificar nombre, precio o visibilidad de producto después de confirmar; `/cuenta` y admin conservan nombre/variante/precio históricos. Órdenes heredadas sin nuevos campos no se convierten en pendientes ni reservas nuevas.
11. **Fallos de consulta**: retrasar más de 10 segundos y hacer fallar el resumen y el historial. Comprobar carga, error, reintento, conservación de datos de entrega y ausencia de confirmación con resumen viejo; un fallo de historial no equivale a «sin órdenes».
12. **Accesibilidad**: recorrer aceptación de precio, errores de campo/ítem y cancelación solo con teclado y lector de pantalla; comprobar foco visible, asociación de mensajes y confirmación comprensible sin depender del color.
13. **Vencimiento visible**: con la tarea detenida, consultar una pendiente justo después de `venceEn`; debe mostrar «Reserva vencida; cancelación en proceso» y deshabilitar pago/cancelación voluntaria. Una vista ya abierta debe reflejarlo dentro de 60 segundos con conexión; cuando el barrido corre, debe mostrar cancelación definitiva y fecha real.

## Salida esperada de la tarea

Cada corrida informa número de pendientes vencidas procesadas, omitidas por carrera, fallidas y duración; falla visible para reintento/alerta. El workflow de GitHub Actions inicia el comando en producción según programación horaria. La prueba con tarea retrasada debe demostrar que el límite de pago y la disponibilidad siguen rigiéndose por `venceEn`.

## Registro de evidencia

Anotar para cada escenario entorno aislado, rama de cada repo, host/branch de base (sin credenciales), hora de prueba en UTC, resultado esperado/observado y comandos realmente ejecutados. Registrar límites no probados. Actualizar `docs/estado-actual/` en la misma tarea que cambie rutas, modelo o flujos.
