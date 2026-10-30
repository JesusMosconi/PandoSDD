# Contrato: API de vendedor, caja y ventas por canal

Base Express: `/api`. Todas las rutas usan `verificarToken`. Las rutas `/vendedor/*` usan además `esVendedor` (rol `vendedor` o `admin`, activo), y las rutas `/admin/*` usan `esAdmin`. Los importes se expresan como cadenas decimales con 2 decimales. Los errores responden `{ message, codigo?, ... }` con mensaje en español.

El navegador llega por el BFF de Next:
- `/api/vendedor/[...ruta]` → `/vendedor/...` (rol `vendedor` o `admin`).
- `/api/admin/[...ruta]` (existente) → `/admin/...`, con los nuevos prefijos `ventas` y `cajas`.

## Catálogo del punto de venta

### `GET /vendedor/productos?buscar=&categoria=&pagina=&limite=`

Lista los productos vendibles en el local (regla `whereProductoLocal`). `buscar` compara por nombre sin distinguir mayúsculas, o por ID exacto. `limite` vale hasta 50.

```json
{ "productos": [ { "id": 14, "nombre": "Remera Drop 3", "precio": "25000.00", "web": false,
    "imagen": "https://...", "categoria": "Remeras",
    "variantes": [ { "id": 81, "talle": "M", "color": "Negro", "hex": "#000", "stockDisponible": 3 } ] } ],
  "total": 1, "pagina": 1, "paginas": 1 }
```

Solo incluye las variantes con `stockDisponible > 0` y estado distinto de `inactivo`.

## Venta en curso

### `GET /vendedor/venta`

Devuelve o crea el carrito `canal="local"` del operador con su resumen (ver la respuesta de resumen).

### `POST /vendedor/venta/items` — `{ talleProductoId, cantidad }`

Agrega una línea o suma la cantidad. Valida la regla local y el stock disponible agrupado bajo bloqueo. Responde `201` con el resumen. Errores: `400` entrada inválida; `404` variante inexistente; `409` `producto_no_local`, `stock_insuficiente` o `variante_inactiva`.

### `PUT /vendedor/venta/items/:id` — `{ cantidad }` · `DELETE /vendedor/venta/items/:id` · `DELETE /vendedor/venta`

Modifica, quita o vacía. Las reducciones y eliminaciones siempre se permiten.

### `POST /vendedor/venta/resumen` — `{ dniCliente?, metodoPago? }`

```json
{ "carritoId": 120, "lineas": [ { "itemCarritoId": 9, "nombreProducto": "Remera Drop 3", "talle": "M",
    "color": "Negro", "cantidad": 2, "precioVigente": "25000.00", "importeLinea": "50000.00",
    "cambioPrecio": false, "disponible": true, "motivosBloqueo": [] } ],
  "total": "50000.00", "huellaResumen": "<sha256>", "puedeConfirmar": true,
  "caja": { "id": 7, "abiertaEn": "2026-10-29T12:00:00.000Z" } }
```

`caja` vale `null` si no hay caja abierta, y en ese caso `puedeConfirmar=false`.

### `POST /vendedor/venta/confirmacion`

```json
{ "claveConfirmacion": "uuid", "huellaResumen": "<sha256>", "dniCliente": "30.123.456",
  "metodoPago": "efectivo" }
```

- `201` → `{ venta: VentaLocal }` cuando se crea.
- `200` → la misma venta cuando se repite la clave con la misma intención.
- `400` → `CONFIRMACION_INVALIDA`, `DNI_INVALIDO`, `MEDIO_PAGO_INVALIDO` o `VENTA_VACIA`.
- `409` → uno de estos:
  - `CAJA_NO_ABIERTA`
  - `ITEMS_NO_DISPONIBLES` (con `itemsAfectados`)
  - `RESUMEN_CAMBIO` (con `resumen`)
  - `INVENTARIO_SUSPENDIDO`, `VARIANTE_SIN_CORTE` o `RESERVA_SIN_PARTIDA`
  - `INTENCION_EN_CONFLICTO`
- `503` → `CONFIRMACION_REINTENTABLE`.

`VentaLocal`:

```json
{ "id": 210, "numeroComprobante": 37, "fecha": "2026-10-29T15:04:05.000Z", "canal": "local",
  "dniCliente": "30123456", "metodoPago": "efectivo", "total": "50000.00", "cajaId": 7,
  "lineas": [ { "nombreProducto": "Remera Drop 3", "talle": "M", "color": "Negro", "cantidad": 2,
    "precioUnitario": "25000.00", "importeLinea": "50000.00" } ],
  "estado": "entregada" }
```

No expone usuario ni nombre del operador (FR-030).

## Historial y comprobante

### `GET /vendedor/ventas?desde=&hasta=&buscar=&pagina=&limite=`

Lista las órdenes con `canal="local"`, de la más reciente a la más antigua. `buscar` coincide con el número de comprobante exacto o con el DNI. Las fechas son días de Buenos Aires (`YYYY-MM-DD`), con `hasta` inclusive. Responde `{ ventas: VentaLocal[], total, pagina, paginas }`.

### `GET /vendedor/ventas/:id`

Devuelve `VentaLocal`. Responde `404` si no existe o si la orden no es del canal local.

## Caja

### `GET /vendedor/caja`

```json
{ "caja": { "id": 7, "estado": "abierta", "abiertaEn": "...", "efectivoInicial": "10000.00",
    "cantidadVentas": 3, "totalesPorMedio": { "efectivo": "50000.00", "debito": "40000.00" },
    "totalVentas": "90000.00", "efectivoEsperado": "60000.00" } }
```

`caja: null` si no hay caja abierta.

### `POST /vendedor/caja/apertura` — `{ claveApertura, efectivoInicial }`

- `201` → caja abierta.
- `200` con `reiterada: true` → misma clave.
- `409 CAJA_YA_ABIERTA` → otra caja abierta.
- `400` → importe inválido.

### `POST /vendedor/caja/cierre` — `{ cajaId, efectivoDeclarado, observacion? }`

Bloquea la caja, calcula la instantánea y la cierra. Responde `200` con la caja cerrada (incluye `efectivoDeclarado` y `diferencia`). Si la caja ya estaba cerrada, devuelve `200` con el mismo cierre cuando coinciden `cajaId` y el importe, y `409 CAJA_CERRADA` cuando no coinciden. Responde `404` si la caja no existe.

## Administración

### `GET /admin/ventas/resumen?desde=&hasta=`

Agrupa las órdenes con `pagoConfirmadoEn` en el período.

```json
{ "desde": "2026-10-01", "hasta": "2026-10-31", "total": "1250000.00", "cantidad": 41,
  "canales": [
    { "canal": "web", "total": "800000.00", "cantidad": 20,
      "medios": [ { "metodoPago": "manual", "total": "800000.00", "cantidad": 20 } ] },
    { "canal": "local", "total": "450000.00", "cantidad": 21,
      "medios": [ { "metodoPago": "efectivo", "total": "300000.00", "cantidad": 15 },
                  { "metodoPago": "debito", "total": "150000.00", "cantidad": 6 } ] } ] }
```

Invariante: la suma de los medios es igual al total del canal, y la suma de los canales es igual al total del período, al centavo.

### `GET /admin/ventas?canal=&metodoPago=&desde=&hasta=&pagina=&limite=`

Listado unificado para conciliación. Por fila: id, canal, fecha de pago, comprobante (si es local), DNI (si es local), medio y total.

### `GET /admin/cajas?pagina=&limite=` · `POST /admin/cajas/:id/cierre`

Muestra el historial de cajas con su instantánea. El cierre de respaldo usa el mismo contrato que `/vendedor/caja/cierre`.

### Cambios a rutas existentes

- `GET /admin/ordenes`: nuevos filtros `canal` y `metodoPago`. Cada orden presentada incluye `canal`, `numeroComprobante` y `dniCliente`.
- `GET /admin/informes/compras-ventas`: acepta `canal=web|local` (opcional), y los eventos de venta incluyen `canal`.
- `POST/PUT /admin/productos` y el listado admin: aceptan y devuelven `local`, y filtran con `?local=true|false`.
- `PUT /admin/usuarios/:id/rol`: acepta `vendedor`. Responde `409 VENDEDOR_EXISTENTE` si ya hay otro vendedor activo.
- `PATCH /admin/usuarios/:id/estado`: responde `409 VENDEDOR_EXISTENTE` al reactivar un vendedor si ya hay otro activo.
- `POST /usuarios/login` y `GET /usuarios/perfil`: sin cambios de contrato; `rol` puede valer `vendedor`.
