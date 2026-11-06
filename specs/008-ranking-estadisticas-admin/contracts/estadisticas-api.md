# Contrato: API de estadísticas del administrador

Base Express: `/api`. Todas las rutas usan `verificarToken` y `esAdmin`. Responden con `Cache-Control: no-store`. Los importes son cadenas decimales con 2 decimales. Los errores responden `{ codigo, message }` en español:

- `400 FILTROS_INVALIDOS` para filtros inválidos.
- `404 PRODUCTO_NO_ENCONTRADO` cuando el producto no existe.
- 401/403 los resuelven los middlewares existentes.

El navegador llega por el BFF existente `/api/admin/[...ruta]`, que reescribe el nuevo prefijo `estadisticas` a `/admin/estadisticas/...`.

## Filtros comunes

| Parámetro | Regla |
| --- | --- |
| `desde`, `hasta` | Obligatorios, `AAAA-MM-DD`. Son días de Buenos Aires, con `hasta` inclusive. Deben cumplir `desde <= hasta` y abarcar como máximo 366 días. |
| `canal` | Opcional: `web` o `local`. |

## `GET /admin/estadisticas/inicio?desde&hasta`

El período anterior tiene la misma cantidad de días y termina el día previo a `desde`. `variacion` es un porcentaje con 1 decimal, o `null` si el valor anterior es cero. El ticket es `total ÷ cantidad`, o `"0.00"` si no hay ventas. `serieDiaria` incluye todos los días del período.

```json
{
  "desde": "2026-10-08", "hasta": "2026-11-06",
  "anterior": { "desde": "2026-09-08", "hasta": "2026-10-07" },
  "metricas": {
    "total":         { "actual": "450000.00", "anterior": "300000.00", "variacion": 50.0 },
    "cantidad":      { "actual": 18, "anterior": 15, "variacion": 20.0 },
    "ticketPromedio":{ "actual": "25000.00", "anterior": "20000.00", "variacion": 25.0 },
    "unidades":      { "actual": 42, "anterior": 30, "variacion": 40.0 }
  },
  "canales": [
    { "canal": "web",   "total": "300000.00", "cantidad": 10, "ticketPromedio": "30000.00" },
    { "canal": "local", "total": "150000.00", "cantidad": 8,  "ticketPromedio": "18750.00" }
  ],
  "serieDiaria": [ { "fecha": "2026-10-08", "web": "0.00", "local": "25000.00", "total": "25000.00" } ],
  "devoluciones": { "unidades": 2, "importe": "40000.00" },
  "topProductos": [ /* hasta 5 filas con la forma de una fila del ranking, ordenadas por unidades */ ]
}
```

`unidades` son las unidades netas de productos del catálogo: vendidas menos devueltas, sin venta rápida. `devoluciones` suma las devoluciones aceptadas en el período.

## `GET /admin/estadisticas/pendientes`

No recibe parámetros: describe el momento actual. `pagoPorConfirmar` cuenta las órdenes `pendiente_pago` sin vencer. Las demás claves de `ordenes` cuentan `pago_confirmado`, `en_preparacion`, `lista_para_retiro` y `enviada`. `reintegrosPendientes` cuenta las devoluciones de cliente en `pendiente` o `parcial`. `stock` considera las variantes no inactivas de productos activos, con disponible = stock físico − reservas vigentes, y lista hasta 8, de menor a mayor disponible.

```json
{
  "generadoEn": "2026-11-06T15:00:00.000Z",
  "ordenes": { "pagoPorConfirmar": 2, "porPreparar": 3, "enPreparacion": 1, "esperandoRetiro": 0, "enCamino": 4 },
  "reintegrosPendientes": 1,
  "incidenciasPago": 0,
  "comprasBorrador": 1,
  "caja": { "abierta": true, "abiertaEn": "2026-11-06T12:00:00.000Z", "ventas": 5, "deJornadaAnterior": false },
  "stock": { "umbralBajo": 2, "agotadas": 3, "bajas": 5,
    "variantes": [ { "varianteId": 9, "productoId": 4, "producto": "Remera", "talle": "M", "color": "Negro", "disponible": 0 } ] }
}
```

Con la caja cerrada, `caja` es `{ "abierta": false }`.

## `GET /admin/estadisticas/ranking`

Filtros adicionales:

| Parámetro | Regla |
| --- | --- |
| `categoriaId` | Opcional, entero positivo. |
| `orden` | Opcional: `unidades` (por defecto) o `importe`. |
| `minUnidades` | Opcional, entero ≥ 0. |
| `minImporte` | Opcional, decimal ≥ 0 con hasta 2 decimales. |
| `pagina` | Opcional, entero positivo. Por defecto 1. |
| `limite` | Opcional, entero positivo. Por defecto 20, máximo 100. |

Desempates:
- `orden=unidades`: unidades netas, luego importe neto, luego nombre e id.
- `orden=importe`: importe neto, luego unidades netas, luego nombre e id.

`posicion` es global, no se reinicia por página.

```json
{
  "filtros": { "desde": "2026-10-01", "hasta": "2026-10-31", "orden": "unidades" },
  "totalResultados": 42, "pagina": 1, "limite": 20, "paginas": 3,
  "datos": [ {
    "posicion": 1, "productoId": 14, "nombre": "Remera Drop 3", "categoria": "Remeras",
    "imagen": "https://...", "activo": true, "precioActual": "25000.00",
    "unidadesVendidas": 12, "unidadesDevueltas": 2, "unidadesNetas": 10,
    "importeVendido": "300000.00", "importeDevuelto": "50000.00", "importeNeto": "250000.00",
    "precioPromedio": "25000.00", "cantidadOrdenes": 9
  } ]
}
```

Si las unidades netas son cero o menos, `precioPromedio` vale `null`.

## `GET /admin/estadisticas/productos/:id?desde&hasta&canal`

`posicion` es la posición del producto en el ranking por unidades del período, o `null` si no tuvo ventas. `precios` usa la misma consulta que `GET /admin/productos/:id/historial`. `serieDiaria.precioPromedio` vale `null` los días sin unidades netas.

```json
{
  "producto": { "id": 14, "nombre": "Remera Drop 3", "categoria": "Remeras", "imagen": "https://...",
    "activo": true, "web": true, "local": true, "precioActual": "25000.00", "stockFisicoActual": 7 },
  "posicion": 1,
  "totales": { /* los mismos campos numéricos de una fila del ranking */ },
  "canales": [ { "canal": "web", "unidadesNetas": 6, "importeNeto": "150000.00" },
               { "canal": "local", "unidadesNetas": 4, "importeNeto": "100000.00" } ],
  "variantes": [ { "varianteId": 81, "talle": "M", "color": "Negro", "stock": 3,
    "unidadesNetas": 5, "importeNeto": "125000.00" } ],
  "serieDiaria": [ { "fecha": "2026-10-08", "unidadesNetas": 2, "importeNeto": "50000.00", "precioPromedio": "25000.00" } ],
  "precios": [ { "clase": "regular", "importe": "20000.00", "inicio": "2026-10-01T03:00:00.000Z", "fin": "2026-10-15T15:00:00.000Z", "origen": "cambio_producto" } ]
}
```

En `variantes` se agrupa por la variante vendida, con talle y color tomados de la instantánea de la venta. Las variantes actuales sin ventas se listan con 0 para mostrar su stock.
