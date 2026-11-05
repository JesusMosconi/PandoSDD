# Tasks: Pagos y envío en Córdoba Capital

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/pagos-envio.md](contracts/pagos-envio.md), [quickstart.md](quickstart.md).

**Tests**: Son obligatorios para la lógica nueva del backend y los recorridos de pago: la spec exige escenarios verificables y el repositorio ya tiene infraestructura de tests. No se ejecutan migraciones ni cobros reales durante esta fase de generación de tareas.

**Organization**: Tareas por historia de usuario, en orden de dependencia. Rutas indicadas desde la raíz de `C:\Users\jechu\PandoCBA-full`; cada tarea identifica el repositorio. `[P]` indica archivos distintos sin dependencia pendiente.

## Phase 1: Setup

**Purpose**: Preparar trabajo aislado y cerrar insumos que afectan cobertura y pagos.

- [X] T001 Revisar `git status`, ramas y cambios locales en raíz, `backend/` y `frontend/`; preparar ramas de feature desde las ramas principales actualizadas, con un worktree limpio para el backend que tiene ediciones ajenas y sin incorporar esas ediciones ni los documentos locales ajenos; registrar ramas, bases y ubicaciones en `specs/006-pagos-envio-cordoba/verificacion.md` (raíz y tres repositorios).
- [X] T002 Documentar la decisión del usuario del 2026-10-29 en `specs/006-pagos-envio-cordoba/cobertura-cordoba-capital.md`: selección expresa de Córdoba Capital, postal solo como dato de dirección y revisión administrativa obligatoria antes del envío simulado (raíz).
- [X] T003 Verificar por nombre el entorno aislado y estado completo de migraciones pendientes antes de generar/aplicar la nueva migración; documentar evidencia sin secretos en `specs/006-pagos-envio-cordoba/verificacion.md` (raíz y backend; sin consultar ni escribir producción).
- [X] T004 Revisar las reglas de Next 16 para las rutas BFF y retorno que se usarán en `frontend/node_modules/next/dist/docs/`, y anotar decisiones aplicables en `specs/006-pagos-envio-cordoba/verificacion.md` (frontend y raíz).
- [X] T005 [P] Confirmar en la documentación vigente de Mercado Pago Orders API los campos, estados, expiración, idempotencia y URL de retorno usados en `specs/006-pagos-envio-cordoba/research.md` y `specs/006-pagos-envio-cordoba/contracts/pagos-envio.md`; corregir el contrato si la API cambió (raíz).

---

## Phase 2: Foundational

**Purpose**: Dejar listos los contratos y el esquema compartidos por las tres historias.

**Critical**: Completar esta fase antes de implementar historias. T002 y T003 son puertas para cobertura y migración.

- [X] T006 Revisar explícitamente spec y plan para cambios de esquema, precios y pago, y registrar cualquier decisión o excepción pendiente en `specs/006-pagos-envio-cordoba/verificacion.md` antes de modificar `backend/prisma/schema.prisma` (raíz).
- [X] T007 Diseñar en `backend/prisma/schema.prisma` las relaciones aditivas `IntentoPago`, `IncidenciaPago`, `ReintegroPago`, `Orden.domicilioRevisadoEn`/`domicilioRevisadoPorId`/`esDemostracion` y evidencia externa opcional en `PagoReintegro`, preservando órdenes manuales, `envioCoordinadoEn` e importes `null` heredados (backend).
- [X] T008 Completar en `backend/prisma/schema.prisma` las restricciones de `IntentoPago`: clave idempotente única, referencia externa única nullable, `importe` Decimal con dos decimales, `moneda='ARS'`, fechas y estados `preparado|creacion_incierta|abierto|aprobado|rechazado|cancelado|vencido|incidencia`; en `ReintegroPago`, `concepto=envio|cobro_sin_venta` y referencia externa única si existe; generar después una migración **nueva y aditiva** en `backend/prisma/migrations/<nueva_migracion>/migration.sql` y probarla solo en la base aislada de T003 (backend; depende de T007).
- [X] T009 [P] Documentar solo los **nombres** de variables exclusivamente de prueba, URL de retorno, `PAGOS_ONLINE_HABILITADOS` deshabilitada por defecto y operación del conciliador en `backend/.env.example` y `specs/006-pagos-envio-cordoba/quickstart.md`; no leer archivos `.env` ni agregar secretos (backend y raíz).

**Checkpoint**: Esquema y contratos listos; no iniciar pagos externos todavía.

---

## Phase 3: User Story 1 - Conocer el total antes de comprar (Priority: P1) 🎯 MVP funcional de cotización

**Goal**: Mostrar y fijar retiro o envío de ARS 15.000 solo para Córdoba Capital, con total exacto antes de crear la orden.

**Independent Test**: Un carrito de ARS 40.000 muestra ARS 40.000 en retiro y ARS 55.000 en envío cubierto; otra localidad bloquea la orden; cambiar precio, entrega o dirección invalida el resumen.

### Tests for User Story 1

- [X] T010 [US1] Escribir pruebas de cobertura para localidad normalizada, selección de T002, variantes de formato, otras localidades y postal informativo y retiro en `backend/test/cobertura-envio.test.js`; comprobar que fallan antes de implementar (backend).
- [X] T011 [US1] Verificar retrospectivamente subtotal más ARS 15.000, centavos, huella de resumen, cambios de entrega/dirección/precio/disponibilidad, confirmación idempotente, bandera apagada y preservación de orden manual heredada en `backend/test/checkout.test.js`, `backend/test/checkout-cotizacion.test.js` y `backend/test/ordenes-admin.test.js` (backend). La tarifa es fija por spec y forma parte de la huella; no existe cambio de tarifa en tiempo de ejecución. No se afirma una ejecución roja anterior a la implementación: la evidencia es la revisión retrospectiva autorizada el 05/11/2026.

### Implementation for User Story 1

- [X] T012 [US1] Implementar selección expresa de T002 y normalización de localidad/código postal informativo en `backend/src/services/cobertura-envio.js`, con respuesta `ENVIO_FUERA_COBERTURA` para dato no cubierto o ambiguo; mantener revisión de calle antes del despacho (backend).
- [X] T013 [US1] Aplicar cobertura en `normalizarEntrega`, cálculo Decimal de costo fijo y `totalFinal`, y agregar cobertura, tarifa y total a `huellaResumen` en `backend/src/services/checkout.js` solo con función online activa; retiro usa `costoEnvio='0.00'`, envío cubierto `costoEnvio='15000.00'`, fuera de cobertura `puedeConfirmar=false`; con función apagada conservar resumen manual (backend; depende de T012).
- [X] T014 [US1] Recalcular cobertura, precio, stock y total bajo la confirmación existente; con `PAGOS_ONLINE_HABILITADOS` activa persistir `Orden.costoEnvio`, `Orden.total`, `Orden.metodoPago='mercado_pago'`, `esDemostracion=true` y datos de envío normalizados en `backend/src/services/checkout.js`; con la bandera apagada conservar la orden manual actual. Una huella obsoleta devuelve 409 con resumen vigente sin crear orden ni reserva (backend; depende de T013).
- [X] T015 [US1] Ajustar respuestas de resumen, `pagosOnlineDisponibles` y errores por campo en `backend/src/routes/checkout.routes.js` y contratos de `frontend/src/types/orden.ts`, sin aceptar monto enviado por cliente (backend y frontend; depende de T013-T014).
- [X] T016 [US1] Mostrar subtotal, envío ARS 15.000, total final y rechazo de cobertura en `frontend/src/components/CheckoutPanel.tsx`; exigir aceptación del total vigente y conservar retiro sin costo (frontend; depende de T015).
- [X] T017 [US1] Actualizar detalle de orden del cliente en `frontend/src/components/MisOrdenes.tsx` para mostrar total cotizado nuevo y conservar texto de órdenes heredadas sin cotizar (frontend; depende de T015).
- [X] T018 [US1] Ejecutar pruebas de checkout con base aislada y revisar respuestas BFF existentes en `frontend/src/app/api/checkout/resumen/route.ts` y `frontend/src/app/api/checkout/confirmacion/route.ts`; registrar resultados y límites en `specs/006-pagos-envio-cordoba/verificacion.md` (backend, frontend y raíz).

**Checkpoint**: El total queda fijado en la orden; la pasarela aún no se habilita a compradores.

---

## Phase 4: User Story 2 - Pagar la orden (Priority: P1)

**Goal**: Iniciar, reintentar y conciliar un pago del total histórico con Mercado Pago, sin duplicar orden, cobro ni venta.

**Independent Test**: Con una orden nueva vigente, tarjetas de prueba aprobada/rechazada/pendiente producen estados locales correctos aun si el cliente cierra la página; reintentos y consultas repetidas no crean otra venta.

### Tests for User Story 2

- [X] T019 [P] [US2] Crear pruebas con proveedor simulado para `POST /api/ordenes/:id/pagos`: dueño, 401/403/404/409/503, importe histórico ARS, URL HTTPS admitida, doble clic, respuesta incierta y misma clave idempotente en `backend/test/pagos.test.js`; comprobar fallos iniciales (backend).
- [X] T020 [P] [US2] Crear pruebas de conciliación aprobada/rechazada/pendiente, referencia/comercio/moneda/importe incorrectos, consultas repetidas, reconocimiento FIFO único, supresión de correo real y fallo local posterior al cobro con incidencia persistente y recuperación controlada en `backend/test/pagos-integracion.test.js`, `backend/test/mercado-pago.test.js` y `backend/test/devoluciones.test.js`; comprobar fallo previo a la corrección de incidencia abierta (backend). Se reutilizaron las suites de integración y devolución existentes para no duplicar fixtures.
- [X] T021 [P] [US2] Extender pruebas de acceso de dueño y estado visible sin datos de tarjeta en `backend/test/pagos.test.js`; comprobar fallos iniciales (backend). Se usó el test de la nueva ruta de pago para cubrir en una sola prueba HTTP el 403 de orden ajena y la respuesta visible del dueño sin identificadores privados.

### Implementation for User Story 2

- [X] T022 [US2] Implementar cliente Orders API en `backend/src/services/mercado-pago.js` con `fetch` del runtime, `type=online`, `processing_mode=manual`, ítems de productos más línea de envío, `total_amount=Orden.total`, rechazo de credenciales de producción, referencia local, clave idempotente, timeout, estados explícitos y URL HTTPS del dominio oficial exacto confirmado en T005 para cada entorno; no persistir PAN/CVV/token de tarjeta (backend; depende de T019).
- [X] T023 [US2] Persistir `IntentoPago` y clave antes de llamar a Mercado Pago, serializar por orden, reutilizar intento abierto y reintentar creación incierta con la misma clave en `backend/src/services/pagos.js`; nunca mantener transacción de BD abierta durante HTTP (backend; depende de T022).
- [X] T024 [US2] Calcular expiración externa desde el tiempo restante de `Orden.venceEn` e impedir inicio cuando el proveedor no pueda admitir la vigencia operativa de 60 segundos comprobada en prueba; devolver 409 y permitir nueva compra si venció. Ningún reintento concede 24 horas adicionales en `backend/src/services/pagos.js` (backend; depende de T023). El proveedor no publica un mínimo garantizado: la respuesta externa se verifica antes de ofrecer cada enlace.
- [X] T025 [US2] Implementar consulta y validación de estado externo, cuenta, `external_reference`, ARS, `total_paid_amount` e identificador único antes de confirmar; solo con orden pendiente y hora de BD estrictamente anterior a `venceEn`, bloquear orden/variantes y ejecutar reconocimiento FIFO/evento una vez. Si falla el reconocimiento local después de un cobro, persistir incidencia, reintentar controladamente mientras la reserva siga válida y, si no puede completarse, dejar reintegro pendiente sin mostrar venta pagada. A partir de `venceEn`, registrar incidencia sin reactivar stock en `backend/src/services/pagos.js` y `backend/src/services/ordenes.js` (backend; depende de T020-T024).
- [X] T026 [US2] Crear ruta autenticada de dueño `POST /api/ordenes/:id/pagos` con `asyncHandler`, validación de ID, bandera online activa y errores previstos en `backend/src/routes/pagos.routes.js`, y montarla en `backend/src/index.js` (backend; depende de T023-T025).
- [X] T027 [US2] Exponer `estadoPago`, `importeCobrado`, `puedeReintentarPago`, `esDemostracion` y total histórico en `backend/src/services/ordenes.js` y `backend/src/routes/ordenes.routes.js`, sin credenciales ni identificadores de tarjeta; limitar conciliación puntual para no sobrecargar al proveedor (backend; depende de T025).
- [X] T028 [US2] Crear conciliador repetible para intentos `preparado|creacion_incierta|abierto` en `backend/src/jobs/conciliar-pagos.js` y `backend/package.json`; preparar workflow de prueba en `backend/.github/workflows/conciliar-pagos-prueba.yml` y configuración del entorno aislado de tesis, con frecuencia objetivo de cinco minutos, salida de último éxito/error y alerta por atraso documentadas en `specs/006-pagos-envio-cordoba/quickstart.md` (backend y raíz; depende de T025, sin activar producción).
- [X] T029 [US2] Crear BFF autenticado `frontend/src/app/api/ordenes/[id]/pagos/route.ts` usando `frontend/src/lib/api.ts`; actualizar tipos de intento/estado en `frontend/src/types/orden.ts` (frontend; depende de T026-T027).
- [X] T030 [US2] Añadir acción de pagar/reintentar y estados `sin_iniciar|pendiente|aprobado|rechazado|incidencia` en `frontend/src/components/MisOrdenes.tsx`; mostrar verificación si el cliente regresa antes de conciliar, sin confiar en parámetros de URL (frontend; depende de T027-T029).
- [X] T031 [US2] Conectar confirmación de checkout con acceso a pago y ruta de retorno a la orden en `frontend/src/components/CheckoutPanel.tsx` y `frontend/src/app/cuenta/page.tsx`, sin alterar estado desde el retorno (frontend; depende de T029-T030).
- [X] T032 [US2] Probar compra de prueba aprobada, rechazada y pendiente, retiro y envío, navegador cerrado antes del retorno, reintento y conciliador en el entorno aislado; registrar IDs no sensibles, resultados y desfase en `specs/006-pagos-envio-cordoba/verificacion.md` (raíz/backend/frontend; depende de T022-T031).

**Checkpoint**: La orden puede cobrarse y reconciliarse en prueba. No habilitar la demostración completa sin US3 y validación final.

---

## Phase 5: User Story 3 - Resolver excepciones de pago y entrega (Priority: P2)

**Goal**: Evitar pago confirmado sin reserva y dar trazabilidad al dinero cobrado cuando hay vencimiento, cancelación o reintegro.

**Independent Test**: Pago al límite de vencimiento, acreditación tardía, cobro duplicado y cancelación pagada generan una sola venta o incidencia/reintegro correcto; ninguna orden cancelada recupera stock por un aviso tardío.

### Tests for User Story 3

- [X] T033 [P] [US3] Verificar retrospectivamente carreras entre conciliación, cancelación y vencimiento exacto, proveedor inaccesible, liberación de reserva al cancelar y cobro conocido después en `backend/test/vencimiento.test.js` y `backend/test/pagos-integracion.test.js` (backend). La suite integrada pasó 15/15, incluido el nuevo caso de tres acciones concurrentes. No se afirma una ejecución roja anterior a implementar: la evidencia es la revisión retrospectiva autorizada el 05/11/2026.
- [X] T034 [P] [US3] Verificar retrospectivamente cancelación online pagada antes de salida, devolución parcial después de salida, saldo agregado de productos/envío sin duplicación, rechazo de reintegro de productos online sin evidencia externa, decisión motivada de envío, ausencia de coordinación física para orden simulada y bloqueo de transición sin domicilio revisado en `backend/test/pagos-integracion.test.js`, `backend/test/devoluciones.test.js` y `backend/test/ordenes-admin.test.js` (backend). El caso focalizado de devolución pasó 1/1. No se afirma una ejecución roja anterior a implementar: la evidencia es la revisión retrospectiva autorizada el 05/11/2026.

### Implementation for User Story 3

- [X] T035 [US3] Implementar `IncidenciaPago` en `backend/src/services/pagos.js` para `cobro_tardio|importe_incorrecto|referencia_incorrecta|cobro_duplicado|resultado_incierto|reconocimiento_fallido`; deduplicar por referencia/tipo, mantener estado `abierta|resuelta` y evitar cambio automático de orden/stock (backend; depende de T025).
- [X] T036 [US3] Implementar `ReintegroPago` para `envio|cobro_sin_venta` en `backend/src/services/pagos.js` y `backend/src/services/ordenes.js`, con estados `pendiente|en_proceso|completado|fallido`; integrar el saldo de productos ya registrado en `DevolucionCliente`/`PagoReintegro`, impedir que la suma efectivamente devuelta supere el total cobrado y exigir comprobación del proveedor o constancia externa verificable para completar (backend; depende de T035). Para esta tesis, la alternativa autorizada es una constancia interna generada, registrada y comprobada por el sistema en `administracion-pagos.js`; solo acredita una simulación, según FR-015/FR-022. No implica devolución monetaria.
- [X] T037 [US3] Integrar consulta del proveedor antes de vencer cuando sea posible en `backend/src/services/ordenes.js` y `backend/src/jobs/vencer-ordenes.js`; a `venceEn` cancelar/liberar aunque la consulta falle, registrar `resultado_incierto` y conciliar después sin reactivar stock (backend; depende de T033-T035).
- [X] T038 [US3] Adaptar cancelación pendiente y pagada antes de salida en `backend/src/services/ordenes.js` y `backend/src/services/devoluciones.js`: la cancelación local no espera la externa, los cobros posteriores van a incidencia, productos conservan su obligación existente y envío tiene obligación separada. Para órdenes online, `registrarReintegro` y su ruta en `backend/src/routes/admin-ordenes.routes.js` exigen referencia/comprobante externo examinado antes de registrar importe efectivo; después de salida, devolución parcial usa flujo de productos y reintegro de envío exige decisión motivada (backend; depende de T034-T036). En la simulación se exige constancia `SIM-` ingresada y declaración expresa de examen por administración, según FR-015; no se declara una devolución monetaria real.
- [X] T039 [US3] Rechazar confirmación manual de `metodoPago='mercado_pago'`; añadir acción administrativa para registrar revisión de calle/altura con actor/fecha y exigirla antes de `enviada` online pagada, manteniendo `envioCoordinado` para órdenes manuales heredadas, en `backend/src/services/ordenes.js` y `backend/src/routes/admin-ordenes.routes.js` (backend; depende de T025-T036).
- [X] T040 [US3] Exponer historial de intentos, incidencias, obligaciones de productos/envío y saldo monetario agregado en `backend/src/services/ordenes.js` y `backend/src/routes/admin-ordenes.routes.js` con `verificarToken` + `esAdmin`; registrar resolución/reintegro con importe, referencia verificada con proveedor o constancia externa comprobable, fecha, actor y motivo de envío posterior a salida (backend; depende de T035-T039). Para la demostración, las constancias y resultados son simulados y se exponen con actor, fecha e importe; el panel muestra esta trazabilidad.
- [X] T041 [US3] Actualizar panel de administración en `frontend/src/components/AdminOrdenes.tsx`, BFF en `frontend/src/app/api/admin/[...ruta]/route.ts` y tipos en `frontend/src/types/orden.ts` para mostrar cobro, incidencia, saldo/reintegros sin duplicación, registrar revisión de domicilio y resultado de reintegro simulado; rotular toda orden/pago/reintegro de prueba; ocultar confirmación manual en online (frontend; depende de T040).
- [X] T042 [US3] Mostrar al cliente estado de pago, incidencia y reintegro pendiente rotulando importes simulados sin prometer reembolso monetario completado en `frontend/src/components/MisOrdenes.tsx` (frontend; depende de T040).
- [X] T043 [US3] Ejecutar escenarios de carrera, cancelación, cobro tardío y reintegro en base aislada; documentar stock, venta FIFO, importe completo y resultado esperado en `specs/006-pagos-envio-cordoba/verificacion.md` (raíz/backend/frontend; depende de T035-T042). Cubierto por 14 escenarios integrados de pago y el caso focalizado con corte activo sintético, una venta/asignación FIFO, reserva liberada tras vencimiento y reintegros sin duplicación.

**Checkpoint**: Pagos excepcionales y dinero pendiente quedan visibles y gestionables.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validación completa y documentación del comportamiento entregado.

- [X] T044 [P] Actualizar `docs/estado-actual/02-modelo-de-datos.md`, `docs/estado-actual/06-flujos-de-negocio.md` y, si aparece un riesgo heredado verificado, `docs/estado-actual/08-deuda-y-riesgos.md`, preservando los cambios locales previos y distinguiendo órdenes manuales de online (raíz).
- [X] T045 [P] Revisar que `backend/src/services/pagos.js`, `backend/src/routes/pagos.routes.js` y `frontend/src/app/api/ordenes/[id]/pagos/route.ts` no filtren token, datos de tarjeta, identificadores privados ni URL arbitraria; verificar dueño, roles, bandera apagada, errores, códigos HTTP y resultado visible en no más de dos consultas en `backend/test/pagos.test.js` (backend/frontend).
- [X] T046 Ejecutar `npm.cmd test` desde `backend/` contra base aislada y `npm.cmd run lint` más `npm.cmd run build` desde `frontend/`; registrar conteos, fallos y limitación de que backend no define lint/build en `specs/006-pagos-envio-cordoba/verificacion.md` (tres repositorios).
- [X] T047 Recorrer `specs/006-pagos-envio-cordoba/quickstart.md` extremo a extremo en entorno de prueba, incluidos pagos aprobados/rechazados/pendientes, supresión de correos a clientes reales, vencimiento con proveedor caído, retiro, envío, revisión de domicilio, orden heredada, doble clic y reintegro sin duplicación; registrar evidencia y pendientes en `specs/006-pagos-envio-cordoba/verificacion.md` (tres repositorios). Recorrido de prueba cerrado con evidencia externa de #53/#54/#93/#94/#95, suite general 105 aprobadas/9 omitidas y prueba focalizada de reintegro con corte sintético; sin envíos, correos o reintegros reales.
- [X] T048 Verificar por separado programación real y alertas de `backend/src/jobs/conciliar-pagos.js`, cobertura declarativa acordada, credenciales de prueba, rechazo de credenciales de producción, migración en base aislada y bandera `PAGOS_ONLINE_HABILITADOS` apagada hasta validar la demostración; documentarla en `specs/006-pagos-envio-cordoba/verificacion.md` (raíz/backend; no implica desplegar ni activar cobros reales).

---

- [X] T049 Implementar guardas de demostración en `backend/src/services/mercado-pago.js`, `backend/src/services/pagos.js` y `backend/test/pagos.test.js`: comprobar entorno de credenciales y resultados con el procedimiento oficial confirmado en T005, sin inferirlo por prefijo; rechazar entorno desconocido/producción. Probar que no se emite una operación externa sin verificación (backend; requisito previo a T022-T032, cubre FR-019).
- [X] T050 Integrar `esDemostracion` en `backend/src/services/checkout.js`, `backend/src/services/ordenes.js`, `backend/src/services/devoluciones.js`, `frontend/src/components/MisOrdenes.tsx` y `frontend/src/components/AdminOrdenes.tsx`; suprimir correo externo para esas órdenes y permitir solo transiciones locales simuladas de despacho/reintegro. Probar marcador, rótulos, ausencia de efectos monetarios/físicos y transporte de correo simulado en `backend/test/ordenes-admin.test.js` y `backend/test/pagos-conciliacion.test.js` (backend/frontend; después de T007 y antes de T043/T047, cubre FR-022). La cobertura quedó en `pagos-integracion.test.js` y `devoluciones.test.js`: marcador, rótulos, proveedor simulado y cero HTTP ajeno al proveedor aun con clave de correo ficticia. No existe invocación de correo en las rutas de orden; despacho es transición local de demostración.
- [X] T051 Documentar en `specs/006-pagos-envio-cordoba/verificacion.md` que no se contrataron recursos pagos, identificar recursos gratuitos existentes o ejecución local equivalente y demostrar compra completa aprobada/rechazada/pendiente con credenciales de prueba. Distinguir evidencia contra Mercado Pago de pruebas con proveedor simulado; sin credenciales no declarar completada la integración externa (raíz; cierre después de T048-T050). #94 se observó primero `processing/in_process` y el 05/11 se reconfirmó `failed/failed` con transacción `rejected_by_issuer`; #53/#54/#95 acreditaron en prueba. La conciliación y los reintegros de excepción se verificaron separadamente con proveedor simulado.

## Dependencies & Execution Order

### Phase Dependencies

- Setup T001-T005 → Foundational T006-T009 → US1 T010-T018 → US2 T019-T032 → US3 T033-T043 → Polish T044-T048.
- Las guardas T049 se ejecutan antes de conectar el proveedor en US2; T050 atraviesa US1-US3 y precede a su recorrido final; T051 cierra la entrega. Su numeración adicional conserva los identificadores originales, no impone ejecución numérica.
- T002 es puerta para cobertura; T003 para migración. Si alguna no se resuelve, se puede seguir con diseño/pruebas simuladas, pero no habilitar checkout de demostración.
- La implementación en backend/frontend requiere ramas de feature propias; los commits/PR se manejan por repositorio y no forman parte de estas tareas sin pedido explícito.

### User Story Dependencies

- **US1** fija el importe histórico y puede demostrarse independientemente sin cobrar.
- **US2** usa el total de US1 y puede demostrarse con proveedor de prueba y una orden vigente, sin depender de cancelación pagada.
- **US3** usa intentos y confirmación de US2 para resolver carreras, pagos tardíos y reintegros. Es requisito para habilitar la demostración completa.

### Within Each User Story

- Escribir pruebas indicadas y comprobar fallo esperado antes de implementar lógica.
- Modelo/migración antes de servicios; servicios antes de rutas/BFF/UI.
- Cerrar una tarea con validación proporcional; antes de cerrar código de frontend ejecutar lint/build y en backend declarar ausencia de esos scripts.

### Parallel Opportunities

- T004 y T005 pueden investigarse en paralelo con T002/T003 porque editan insumos distintos.
- T010 y T011 no son paralelas: comparten `backend/test/checkout.test.js`. T019/T020/T021 pueden prepararse en archivos distintos; T033 debe coordinarse con T020 por archivo compartido.
- T044 y T045 pueden avanzar en paralelo tras US3: documentación raíz frente a revisión de rutas y pruebas.

## Parallel Example: User Story 2

```text
T019 [P] preparar pruebas de inicio en backend/test/pagos.test.js
T020 [P] preparar pruebas de conciliación en backend/test/pagos-conciliacion.test.js
T021 [P] preparar pruebas de visibilidad en backend/test/ordenes-cliente.test.js
Después: T022 → T023 → T024/T025 → T026-T031 → T032
```

## Implementation Strategy

1. Completar setup y fundamentos con base aislada y cobertura acordada.
2. Demostrar US1 como incremento de cotización y orden con total exacto en base aislada, **manteniendo apagada la función de demostración hasta verificar el entorno**.
3. Entregar US2 en prueba con medios y estados de Mercado Pago.
4. Completar US3 antes de habilitar la demostración, pues cierra casos de pagos simulados tras vencimiento/cancelación.
5. Cerrar documentación, suite y recorrido de prueba; revisar estado por repositorio y decidir publicación por separado.

## Notes

- Se respeta la regla actual de SDD: esta lista no autoriza implementación ni migraciones.
- Los paths de migración llevan marcador `<nueva_migracion>` porque el nombre se fija al crearla tras verificar el destino; no editar migraciones aplicadas.
- La conciliación periódica del plan exige una programación externa real y observada. Un archivo de job por sí solo no cumple T048.
