# Guía de validación: Compras, proveedores e historial

Esta guía reúne recorridos de validación de la implementación 003. Usar únicamente rama y base **aisladas** confirmadas; registrar host, base, esquema, rama Git de raíz/backend/frontend, estado de migraciones y copia de recuperación antes de cualquier migración, seed, corte o test que escriba. Los resultados ejecutados están en [verificacion.md](verificacion.md).

## Preparación para la fase de implementación

1. Revisar y aprobar [spec.md](spec.md), [plan.md](plan.md) y la nueva migración propuesta, especialmente esquema, precios, checkout y cancelación pagada. Separar ramas de 003 en los tres repositorios conservando los cambios previos de 002.
2. Confirmar una base de prueba descartable autorizada. Verificar conexión/destino con medios de solo lectura; no ejecutar pruebas de escritura si host/base/esquema no coinciden con lo autorizado.
3. Aplicar **solo en esa base** la nueva migración cuando la implementación y autorización específica estén listas. Preparar productos/variantes, dos proveedores y dos recepciones con costos diferentes. No modificar migraciones ya aplicadas.
4. Iniciar backend desde `backend/` con `npm.cmd run dev` y frontend desde `frontend/` con `npm.cmd run dev` una vez configurado el entorno aislado por la persona responsable. No mostrar valores secretos en el registro de validación.

En una base **nueva y vacía**, `prisma migrate deploy` directo encuentra FIFO antes de la base de compras. Desde `backend/`, `node src/jobs/preparar-base-nueva.js --execute=SI --host=<host-directo-verificado> --base=<base-vacia-verificada>` aplica las 12 migraciones en orden de dependencia, tras validar destino y esquema. No usar ese comando en una base ya migrada. El corte es una operación posterior e independiente: `incorporar-existencias.js` deja `conciliado`; `activar-corte-inventario.js` registra rutas verificadas y activa solo tras revisar la evidencia operativa. Primero se probó en una base descartable y luego se ejecutó y activó en `Prueba/neondb` el 2026-10-19; ver [verificacion.md](verificacion.md). No se ejecutó en `production`.

## Recorridos esenciales

| Caso | Acción | Resultado esperado |
|---|---|---|
| Ingreso e idempotencia | Crear proveedor, ingreso con dos variantes y gasto; revisar y confirmar dos veces, incluyendo simultaneidad. | Un único aumento por variante; misma respuesta para reintento idéntico, gastos separados, historia preservada. |
| Barrera anterior al corte | Con el corte pendiente, intentar confirmar un ingreso sobre variante heredada; reservar una variante nueva y otra heredada. | La confirmación heredada se rechaza sin cambiar stock. La reserva nueva tiene asignaciones FIFO completas; la heredada conserva el checkout anterior sin asignaciones parciales ni margen nuevo. |
| Ficha desde compra | Crear producto/variante desde borrador mediante la acción de Compras; contrastar con una ficha preexistente. | La nueva ficha queda marcada, con stock cero y publicación bloqueada hasta confirmar un ingreso de alguna variante; la ficha preexistente conserva sus reglas de publicación. |
| FIFO y pago | Recibir 2 unidades a 100 y 2 a 150; reservar/vender 3. | Antes de pago no hay venta; al pago costo 350 con origen 2+1; consumo físico posterior no duplica venta/costo. |
| Carga tardía | Pagar una orden; registrar después un ingreso con fecha de recepción anterior. | La venta conserva sus partidas/costos; nuevo ingreso participa solo en futuras asignaciones. |
| Corte inicial | Variante con 10 unidades físicas y 2 reservadas. Ejecutar corte autorizado. | Saldo físico sigue 10, 2 vinculadas a reserva y 8 libres; repetir corte no duplica saldo. |
| Variante nueva durante el corte | Antes del corte, confirmar ingreso y reservar una variante nueva con partidas conciliadas; luego ejecutar el corte. | La variante nueva no recibe existencia inicial duplicada; su reserva conserva asignaciones. El job deja el corte conciliado; la política global requiere activación operativa explícita tras verificar rutas y recorridos. |
| Corte interrumpido | En base aislada, interrumpir después de completar una variante y antes de otra; luego reanudar. | La completada conserva una sola procedencia, la pendiente se concilia y completa; la política nueva no se activa antes de completar todas. Ante discrepancia, se detiene y se usa el procedimiento de recuperación previsto antes de reabrir escrituras. |
| Costo desconocido | Incorporar saldo inicial sin costo y vender parte. | Costo cero no se infiere; margen total `null` y cantidad sin costo visible. |
| Descuento/proveedores | Venta con descuento consume partidas de dos proveedores. | Importe atribuido proporcional por unidad; suma filtrada coincide exactamente con cobro de mercadería. |
| Ajuste y devolución proveedor | Intentar merma superior a libre; devolver parte elegible de una partida. | Merma rechazada sin efecto; devolución reduce unidades e importe de compra, conserva ingreso y motivo. |
| Corrección posterior | Corregir costo de una partida ya vendida. | Evento antes/después, venta original identificable y margen revisado; ningún cambio silencioso. |
| Devolución cliente | Aceptar 1 unidad vendida con descuento, dejar reintegro pendiente, registrar luego efectivo y recepción dañada/apta. | El backend calcula el importe debido de esa unidad sin confiar en un total del cliente; costo revierte en aceptación, dinero solo al reintegro, apta vuelve a vendible, dañada no y repetir cada acción no duplica. |
| Reintegro y recepción parciales | Aceptar 2 unidades, registrar varios pagos y dos recepciones con una apta y una dañada; intentar exceder importes o unidades. | El acumulado nunca supera lo debido o aceptado; cada pago reduce solo su importe, y ningún reintento duplica el efecto. |
| Cancelación pagada | Cancelar antes de salida física con ambas decisiones de restitución; intentar ruta antigua después de salida física. | Antes de salida comparte reversión y libera o consume reserva una vez; después responde conflicto y exige devolución, sin sumar stock hasta recepción apta. |
| Precio histórico | Cambiar precio regular y consultar fechas antes/después. | Vigencias no solapadas desde activación; ventas anteriores mantienen cobro efectivo. Promociones vacías si no hay mecanismo publicado. |
| Informes | Consultar períodos por producto/variante/proveedor, con venta en enero y devolución/reintegro en febrero; recorrer páginas de detalle. | Compras por recepción, ventas por pago y reintegros/correcciones por fecha propia; resumen global independiente de la página visible y margen acumulado conciliado. |
| Consulta vacía y error | Usar filtros sin datos y luego simular falla recuperable en entorno aislado. | Vacío legítimo se distingue de carga/error; reintento conserva filtros y acceso denegado no se muestra como vacío. |

## Verificaciones de calidad cuando exista implementación

- Desde `backend/`: `npm.cmd test`, **solo** con destino de base aislada verificado. Documentar pruebas ejecutadas, resultados y límites. Backend no dispone de scripts `lint` ni `build`.
- Desde `frontend/`: `npm.cmd run lint` y `npm.cmd run build`; validar navegación admin, roles, errores, estados vacíos/carga, teclado y tamaños móvil/escritorio.
- Medir SC-005 desde abrir un ingreso nuevo con proveedor y diez variantes preparados hasta ver su resumen, con diez administradores: exigir 9 tiempos menores a cinco minutos. Medir SC-006 desde aplicar los tres filtros hasta ver el resumen global y la primera página de detalle, en 20 consultas consecutivas sobre 1.000 productos y 10.000 movimientos de un año: exigir 19 tiempos de cinco segundos o menos y registrar filtros, total de resultados, tamaño de página y tiempos; páginas posteriores quedan fuera de esa medición. Medir SC-008 con diez administradores y el mismo resumen de dos períodos: cada uno responde sin ayuda cuatro cifras; exigir 9 hojas con las cuatro correctas. No declarar criterios cumplidos por inspección estática.
- Comprobar conciliación de partidas, asignaciones, reservas y `TalleProducto.stock` antes/después de cada recorrido. Ver [data-model.md](data-model.md) y [contracts/compras-historial.md](contracts/compras-historial.md) para reglas y respuestas.
- Actualizar `docs/estado-actual/` de rutas, modelo, frontend y flujos solo cuando el código correspondiente esté implementado y verificado. Ejecutar `git diff --check` por repo al cerrar tareas.
