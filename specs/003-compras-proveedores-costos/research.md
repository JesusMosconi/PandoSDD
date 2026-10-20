# Investigación y decisiones: Compras, proveedores e historial

Fecha: 2026-10-17. Fuentes: spec de esta feature, constitution, código y documentación local. Esta investigación es de solo lectura respecto de código y datos; las decisiones de esquema requieren revisión explícita antes de implementarse.

## D1. Fuente de verdad del inventario y FIFO

**Decision**: Mantener `TalleProducto.stock` como cantidad física visible a los flujos existentes. Registrar partidas de procedencia y movimientos auditables cuya suma de unidades físicas debe conciliar con ese saldo. Al crear una reserva, asignar cantidades de partidas de la misma variante en FIFO dentro de la transacción que crea la orden. Cada asignación referencia línea de orden, reserva y partida; la reserva no es venta. En confirmación de pago se fija la atribución de costo; cuando la reserva se consume en envío o entrega se descuenta el stock físico y la partida, sin reconocer una segunda venta.

**Rationale**: `backend/src/services/inventario.js` calcula disponibilidad a partir de stock físico y reservas; `backend/src/services/checkout.js` crea una reserva por variante y `backend/src/services/ordenes.js` descuenta después el stock físico. Conservar esa semántica limita cambios en catálogo y checkout y permite la trazabilidad requerida.

**Alternatives considered**: Reemplazar directamente `stock` por una suma de partidas alteraría todas las rutas de catálogo, carrito y cancelación antes de tener un corte conciliado. Asignar FIFO solo al pago podría perder la procedencia reservada si otros ingresos o reservas cambian entre creación y pago.

**Invariantes**: Una unidad no puede estar a la vez libre en dos asignaciones; por variante, unidades libres + reservadas + vendidas aún físicas + otras salidas clasificadas concilian con partidas y stock físico según su estado. Ordenar bloqueos por ID de variante y luego por partida; revalidar cantidades bajo bloqueo. Añadir índices para variante, fecha/orden de recepción, estado y vínculos de orden. No inferir costo desconocido como cero.

## D2. Recepciones, fecha de negocio e idempotencia

**Decision**: Un ingreso tiene borrador y confirmación única. La confirmación valida proveedor activo, líneas, fechas e importes, crea las partidas y aumenta stock en una sola transacción; la restricción de estado y una clave de reintento identifican la operación ganadora. La fecha de recepción agrupa compras y ordena partidas confirmadas; una recepción cargada tarde entra en la cola disponible cuando se confirma y nunca reasigna ventas pagadas.

**Rationale**: FR-003 a FR-005 y aclaración 1 exigen revisión previa, entrega completa y ningún doble aumento. El orden histórico por fecha no debe reescribir costos de ventas anteriores.

**Alternatives considered**: Crear partidas y stock durante el borrador expone mercadería no confirmada. Confiar solo en botón deshabilitado no protege reintentos ni carreras.

## D3. Corte inicial y operaciones existentes

**Decision**: Implementar primero ingresos y FIFO solo para variantes nuevas verificadas con stock inicial cero y sin reservas previas; las variantes heredadas conservan su checkout anterior y no admiten ingresos nuevos ni asignaciones FIFO parciales. Después, ejecutar un corte por variante sobre una base aislada validada: suspender escrituras de stock y reservas, bloquear variantes heredadas y reservas vigentes, registrar en una transacción la partida inicial igual al `stock` físico sin incrementarlo y marcar la variante como completada. Enlazar reservas a ese saldo y dejar libres solo unidades no comprometidas. Las variantes nuevas con partidas conciliadas se omiten sin crear existencia inicial duplicada. Tratar como históricas sin costo reconstruido las ventas pagadas antes del corte. Ante interrupción, conservar las completadas, conciliar pendientes y reanudar sin repetir variantes; ante discrepancia detenerse y no activar la política global. El job alcanza `conciliado` sin activar. Solo reabrir escrituras bajo la nueva política tras una transición operativa explícita a `activo` con todas las variantes conciliadas y constancia persistida de verificación de rutas, o tras restaurar la copia de recuperación autorizada si el corte no puede terminar.

**Rationale**: La spec prohíbe sumar stock de nuevo y reconstruir compras o márgenes anteriores. La base puede contener órdenes abiertas; el saldo inicial debe incluir sus unidades físicas comprometidas.

**Alternatives considered**: Exigir cero reservas activas retrasaría indefinidamente la adopción. Marcar reservas existentes como libres permitiría prometer dos veces la misma unidad. Una migración que suma stock inicial duplicaría cantidades.

**Prerequisito operativo**: Antes de cualquier ejecución real verificar por separado rama Git, host/base/esquema del entorno aislado, estado de migraciones y copia de recuperación. Este plan no ejecuta el corte ni consulta bases externas.

## D4. Precios, descuentos y proveedor

**Decision**: Capturar una vigencia de precio regular cada vez que cambia `Producto.precio`, comenzando con el precio observado al activar el historial. Usar intervalos sin solapamiento; no inferir vigencias anteriores. El historial promocional solo registra publicaciones de un mecanismo ya existente y verificado; el código inspeccionado expone un único `Producto.precio`, por lo que el historial promocional permanecerá vacío mientras no exista ese mecanismo. Las ventas usan `DetalleOrden` como instantánea del importe de mercadería, y el importe efectivo descontado se distribuye a unidades/partidas proporcionalmente al precio de venta por unidad: centavos inferiores primero y residuo por mayor fracción descartada, con desempate FIFO estable.

**Rationale**: `frontend/src/components/AdminProductos.tsx` edita el precio regular; `backend/src/services/checkout.js` valida el precio vigente y guarda detalles históricos. La spec exige comparar precio publicado con cobro real y filtrar ventas por proveedor sin duplicar importes.

**Alternatives considered**: Calcular precio histórico desde `UpdatedAt` no recupera valores ni vigencias anteriores. Crear un motor promocional aquí excede la aclaración 3. Aplicar la venta completa a cada proveedor sobrecuenta ingresos.

## D5. Correcciones, devoluciones y margen

**Decision**: Registrar hechos compensatorios enlazados al original, con actor, fecha, motivo, valores antes/después e importes. Una corrección de costo cambia el costo vigente de la partida y recalcula la vista de margen de ventas afectadas, preservando la versión anterior y registrando la diferencia en su fecha; si una unidad ya fue devuelta, ajusta también la reversión de su costo sin nuevo costo neto. Una devolución de cliente aceptada revierte una sola vez el costo FIFO de las unidades originales. El backend calcula el importe debido con el importe efectivo atribuido a esas unidades, incluidos descuentos y centavos, sin aceptar un total del cliente. Varios reintegros efectivos pueden reducir por separado el ingreso neto hasta ese importe; el saldo puede cerrarse sin reintegro con motivo. Ventas, reversión y reintegros se muestran en sus períodos propios sin reescribir el mes de venta; el acumulado reconcilia. Varias recepciones físicas aptas/dañadas se acumulan hasta las unidades aceptadas y solo las aptas cambian stock vendible. Una cancelación pagada anterior a salida física usa la misma reversión y libera o consume la reserva; después de salida, la ruta anterior rechaza y remite a devolución. La devolución a proveedor disminuye unidades disponibles de la partida e importe neto de compras; no borra el ingreso.

**Rationale**: Resuelve FR-016 a FR-019 y aclaración 5 sin equiparar aceptación, dinero y retorno físico. `backend/src/services/ordenes.js` hoy tiene cancelación pagada completa con `restituirStock`; no hay devolución parcial. El diseño debe reemplazar o coordinar esa vía para impedir doble restitución.

**Alternatives considered**: Editar ingreso/venta en sitio destruye evidencia. Restituir stock al aceptar una devolución puede publicar unidades no recibidas o dañadas. Descontar importe antes del reintegro contradice la definición de importe efectivamente cobrado.

## D6. Autorización, validación y contratos

**Decision**: Nuevas rutas administrativas Express bajo `/api/admin/...` con `verificarToken` y `esAdmin`, handlers `asyncHandler`, validación de formato/rango y listas explícitas de campos. El BFF Next actual debe reenviar esos prefijos administrativos preservando sesión, estado y errores. Los cálculos de cantidades, costos, importes, descuento y margen se hacen o verifican en backend con decimal exacto; la UI muestra borrador/resumen/confirmación, estados de carga/error/reintento y advertencias de costo desconocido. Reutilizar `frontend/src/lib/api.ts` y contratos tipados.

**Rationale**: Constitution I, III, IV y V. `frontend/src/app/api/admin/[...ruta]/route.ts` solo remapea `ordenes`; los demás prefijos se envían sin `admin`, por lo que hay que actualizar el mapeo o elegir rutas coherentes. `frontend/src/app/admin/page.tsx` tiene tarjetas fijas y `AdminProductos.tsx` permite stock inicial/edición directa.

**Alternatives considered**: Rutas administrativas nuevas bajo prefijos públicos con protección parcial aumentan riesgo. Cálculo de margen en el cliente crea inconsistencias y acepta importes no autoritativos.

## D7. Validación y límites

**Decision**: Probar conciliación de cantidades, FIFO con múltiples costos/proveedores, idempotencia y concurrencia, corte con reservas abiertas, costo desconocido, descuento repartido, cambio de precio, corrección tras venta, devolución parcial y reintegro pendiente/efectivo/sin reintegro en base de prueba aislada. Usar infraestructura `node:test` existente en backend; ejecutar lint/build frontend cuando haya código. Medir SC-005/006/008 en recorrido de interfaz y conjunto de datos representativo, sin afirmar resultados aún.

**Rationale**: Son las propiedades con mayor riesgo de inconsistencia. `backend/package.json` tiene `test`, pero no scripts de lint/build; `frontend/package.json` tiene lint/build.

**Alternatives considered**: Pruebas de funciones puras solamente no detectan carreras de stock ni errores del corte. Ejecutar seeds o pruebas sobre producción incumple el límite de esta tarea.
