# Contrato propuesto: administración de compras, inventario e historial

Diseño de API para el BFF de Next y Express; no son rutas existentes. El navegador usa `/api/admin/...`; Express expone `/api/admin/...` y el BFF reenvía el prefijo nuevo. Todas las rutas requieren sesión admin vigente; Express verifica token y rol actual. La respuesta es JSON, sin caché para datos administrativos. Los nombres definitivos se fijan antes de implementar y se comparten con `frontend/src/types/`.

## Convenciones

- Identificadores enteros positivos; cantidades enteras positivas en ingresos/devoluciones y magnitud positiva en ajustes con dirección explícita. Fechas ISO 8601 y moneda del catálogo; importes decimales como cadenas para no perder precisión.
- En escrituras de confirmación, cliente envía `claveOperacion` opaca. Misma clave y mismo contenido devuelven resultado anterior (`reiterada: true`); misma clave con contenido distinto, `409`. Clave nueva para ingreso ya confirmado devuelve `409` con estado actual, nunca repite stock.
- El servidor valida proveedor/variantes/estados, recalcula subtotales y totales y responde errores `400` (entrada), `401`/`403` (sesión/rol), `404` (recurso ausente o no visible), `409` (estado, stock, idempotencia), `503` (conflicto transitorio agotado). Errores incluyen `{ codigo, message, campos? }` en español; no exponen secretos ni trazas.
- Listados aceptan `pagina`/`limite` acotados y devuelven `{ datos, pagina, limite, total }`; fechas de filtro son límites inclusivos de día en zona de negocio indicada por la interfaz y convertidos a intervalos de instantes sin ambigüedad. El plan no presupone una zona del servidor.

## Proveedores

| Método y ruta | Entrada | Salida/efecto |
|---|---|---|
| `GET /api/admin/proveedores` | `buscar`, `activo`, paginación | Lista con conteo de ingresos; no oculta referencias históricas. |
| `POST /api/admin/proveedores` | `{ nombre, contacto?, observaciones? }` | `201` proveedor activo. |
| `GET /api/admin/proveedores/:id` | ID | Ficha e historial paginado de ingresos. |
| `PUT /api/admin/proveedores/:id` | Campos editables explícitos | Proveedor actualizado; no cambia datos históricos de ingreso. |
| `POST /api/admin/proveedores/:id/desactivacion` | `{ motivo }` | Baja lógica; ingresos anteriores conservan vínculo. |
| `POST /api/admin/proveedores/:id/reactivacion` | `{ motivo }` | Activa la misma identidad; conserva períodos de inactividad e ingresos anteriores. |

## Compras e ingresos

| Método y ruta | Entrada | Salida/efecto |
|---|---|---|
| `GET /api/admin/compras` | recepción desde/hasta, proveedor, producto, variante, estado, paginación | Ingresos; fecha de compra visible además de recepción. |
| `POST /api/admin/compras` | `{ proveedorId, fechaCompra, fechaRecepcion, lineas:[{ varianteId,cantidad,costoUnitario }], gastosAdicionales:[{ concepto,importe }]?, observaciones?, comprobanteReferencia? }` | `201` borrador sin stock. No acepta variante duplicada. |
| `GET /api/admin/compras/:id` | ID | Borrador/confirmado, desglose, correcciones y devoluciones. |
| `PUT /api/admin/compras/:id` | Campos de borrador | Actualiza solo si no está confirmado; recalcula importes. |
| `POST /api/admin/compras/:id/resumen` | Sin importes autoritativos del cliente | Cantidades, subtotales, gastos, total y bloqueos; no mueve stock. |
| `POST /api/admin/compras/:id/confirmacion` | `{ claveOperacion, resumenAceptado }` | Ingreso confirmado, partidas y movimiento único. Reintento idéntico devuelve mismo ingreso. |
| `POST /api/admin/compras/:id/correcciones` | `{ partidaId, campo, valorNuevo, motivo, claveOperacion }` | Evento con antes/después e informes afectados; `409` si rompe conciliación. |
| `POST /api/admin/compras/:id/anulacion` | `{ motivo, claveOperacion }` | Compensación si unidades elegibles; nunca borra ingreso. |
| `POST /api/admin/compras/:id/devoluciones-proveedor` | `{ partidaId, cantidad, motivo, claveOperacion }` | Salida e importe de compra revertido; rechaza unidades comprometidas. |

La acción `POST /api/admin/compras/productos` crea una ficha desde la carga con los campos permitidos del catálogo, `web=false` y stock inicial `0`; el backend fija `creadoDesdeCompras=true` y el cliente no puede cambiar la marca. Las altas anteriores y las realizadas desde Productos conservan `false`. El BFF presenta esa acción desde Compras; la ficha creada no se suma como ingreso. Solo para fichas marcadas, el cambio de `web` a publicado se rechaza hasta que al menos un ingreso de sus variantes esté confirmado; después queda disponible el control manual de Productos si se cumplen las condiciones habituales del catálogo. Un ingreso anulado no habilita publicación por sí mismo.

## Inventario, devoluciones y precios

| Método y ruta | Entrada | Salida/efecto |
|---|---|---|
| `POST /api/admin/inventario/ajustes` | `{ varianteId, direccion, cantidad, motivo, costoUnitario? , origen?, claveOperacion }` | Movimiento trazable; costo desconocido explícito si falta. |
| `GET /api/admin/inventario/variantes/:id/historial` | período, paginación | Existencia inicial, ingresos, asignaciones, movimientos y costo conocido/desconocido. |
| `POST /api/admin/ordenes/:id/devoluciones` | `{ lineas:[{ detalleOrdenId,cantidad }], motivo, claveOperacion }` | El backend calcula `importeDebido` de las unidades aceptadas con el importe efectivo original, descuentos y centavos atribuidos; rechaza unidades ya devueltas y no acepta un importe del cliente. Aceptación parcial y reversión única de costo; no añade stock. |
| `POST /api/admin/ordenes/:id/devoluciones/:devolucionId/reintegros` | `{ importeEfectivo, claveOperacion }` | Registra un pago parcial o final positivo; acumulado ≤ importe debido. Devuelve `importeReintegradoAcumulado`, `saldoPendiente` y estado pendiente/parcial/efectivo. Reintento idéntico no duplica importe. |
| `POST /api/admin/ordenes/:id/devoluciones/:devolucionId/cierre-sin-reintegro` | `{ motivo, claveOperacion }` | Cierra solo el saldo pendiente como no reintegrable; conserva pagos parciales anteriores y su efecto. |
| `POST /api/admin/ordenes/:id/devoluciones/:devolucionId/recepciones` | `{ cantidadApta, cantidadDanada, motivo?, claveOperacion }` | Acumulado apta + dañada ≤ cantidad aceptada; ninguna unidad se clasifica dos veces. Solo apta vuelve a stock vendible. |
| `GET /api/admin/productos/:id/historial-precios` | período | Vigencias regulares y promociones publicadas existentes, si las hay. |

La cancelación pagada existente (`POST /api/admin/ordenes/:id/cancelacion`) acepta solo órdenes sin salida física. Usa la misma reversión de costo/dinero que una devolución por todas las unidades aún vendidas; si `restituirStock=true`, libera reservas activas sin aumentar stock físico, y si es `false`, consume las unidades y registra salida no vendible. Una orden con unidades ya despachadas responde `409 DEVOLUCION_REQUERIDA` y se gestiona por el flujo de devolución/recepción física. No existe segunda restitución por la ruta antigua. La cancelación previa al pago libera asignaciones sin venta.

## Informes e historial de producto

| Método y ruta | Filtros | Salida |
|---|---|---|
| `GET /api/admin/informes/compras-ventas` | `desde`, `hasta`, `productoId?`, `varianteId?`, `proveedorId?`, paginación/desglose | Resumen global de todos los registros filtrados, `totalResultados` y primera página de detalle; `compras` por recepción, `ventas` por pago, `gastosAdicionales`, `costoVendidoConocido`, `unidadesCostoDesconocido`, `margenBruto` decimal o `null`, devoluciones, reintegros y diferencias de corrección por fecha propia, sin reescribir períodos previos. |
| `GET /api/admin/productos/:id/historial` | período y paginación | Ingresos, partidas, precios, ventas, asignaciones FIFO, ajustes y devoluciones vinculadas. |

Si se filtra proveedor, la respuesta incluye solo asignaciones de sus partidas; `importeVentaAtribuido` es la porción proporcional a esas unidades, y las sumas de todos los proveedores más origen desconocido reconcilian con el importe efectivo de mercadería. Los gastos de compra y envío cobrado se muestran separados. Las consultas comparativas devuelven períodos independientes, importes nominales y advertencias de cobertura; nunca llaman ganancia neta al margen.

## Formas de respuesta representativas

```json
{
  "ingresoId": 42,
  "estado": "confirmado",
  "fechaCompra": "2026-02-05",
  "fechaRecepcion": "2026-02-12",
  "unidades": 3,
  "importeMercaderia": "350.00",
  "gastosAdicionales": "20.00",
  "totalDesembolso": "370.00",
  "reiterada": false
}
```

```json
{
  "importeVentaEfectivo": "500.00",
  "costoVendidoConocido": "350.00",
  "unidadesCostoDesconocido": 0,
  "margenBruto": "150.00",
  "importeReintegroPendiente": "0.00"
}
```

Si `unidadesCostoDesconocido > 0`, `margenBruto` es `null` y se presenta la advertencia, sin sustituir el costo faltante por cero.

En consultas administrativas, `200` con `datos: []`, `total: 0` y los filtros aplicados significa vacío legítimo. Mientras espera respuesta, la vista conserva filtros y muestra estado de carga; errores de red o `503` muestran fallo recuperable con reintento sin perder filtros; `401`/`403` muestran acceso denegado, no una lista vacía.
