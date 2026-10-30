# Data Model: Rol vendedor y venta en local

Migración nueva y aditiva: `backend/prisma/migrations/20261029_vendedor_venta_local/migration.sql`. Requiere revisión explícita antes de aplicarse (constitution VII). No edita migraciones existentes. Si la feature 006 trae una migración posterior, renombrar esta carpeta antes de aplicarla en cualquier base.

## Cambios en modelos existentes

### Producto

| Campo | Tipo | Regla |
| --- | --- | --- |
| `local` | `Boolean @default(true)` | Disponible en el punto de venta. Es independiente de `web`. Los productos existentes quedan en `true`. |

Regla compartida nueva en `utils/visibilidad-producto.js`:
- **Vendible en el local** = `activo && local` y (sin colección o colección con `fechaActivacion`).
- **Variante vendible** = `estado != "inactivo"` y `stockDisponible > 0`.

### Usuario

- `rol` admite `"cliente"`, `"admin"` y `"vendedor"`.
- Índice único parcial (SQL): `CREATE UNIQUE INDEX "Usuario_vendedor_activo_unico" ON "Usuario" ("rol") WHERE "rol" = 'vendedor' AND "activo" = true;`. Garantiza un solo vendedor activo.

### Orden

| Campo | Tipo | Regla |
| --- | --- | --- |
| `canal` | `String @default("web")` | `"web"` o `"local"`. Las filas existentes quedan en `"web"`. |
| `dniCliente` | `String?` | Obligatorio si `canal="local"`. Solo dígitos, entre 7 y 8. |
| `cajaId` | `Int?` → `Caja` | Obligatorio si `canal="local"`. `onDelete: Restrict`. |
| `numeroComprobante` | `Int? @unique` | Solo en el canal local. Correlativo: `MAX+1` bajo el bloqueo de la caja. |
| `metodoPago` | existente | Web: `"manual"`. Local: `"efectivo"`, `"transferencia"`, `"debito"` o `"credito"`. |
| `tipoEntrega` | existente | Local: `"local"`. |

Índices: `@@index([canal, pagoConfirmadoEn])` y `@@index([cajaId])`.

CHECK en SQL: `("canal" = 'web') OR ("dniCliente" IS NOT NULL AND "cajaId" IS NOT NULL AND "numeroComprobante" IS NOT NULL)`.

Valores de una orden del local:

| Campo | Valor |
| --- | --- |
| `usuarioId` | operador |
| `carritoId` | carrito local convertido |
| `creadaEn`, `venceEn`, `pagoConfirmadoEn` | la misma hora de base |
| `pagoConfirmadoPorId` | operador |
| `subtotal`, `total` | suma de las líneas |
| `costoEnvio` | `null` |
| `claveConfirmacion` | clave de idempotencia enviada por el punto de venta |

### Carrito

- `canal` existente: `"web"` (como hasta ahora) o `"local"`. El carrito local no vence a las 24 horas.
- Las búsquedas del carrito web deben filtrar `canal: "web"`.

### EventoOrden

- `origen` admite `"local"`. Una venta registra tres eventos con la misma fecha: `null→pendiente_pago`, `pendiente_pago→pago_confirmado` y `pago_confirmado→entregada`.

## Entidad nueva: Caja

| Campo | Tipo | Regla |
| --- | --- | --- |
| `id` | `Int @id @default(autoincrement())` | |
| `estado` | `String @default("abierta")` | `"abierta"` o `"cerrada"`. |
| `efectivoInicial` | `Decimal @db.Decimal(14,2)` | ≥ 0. |
| `abiertaEn` | `DateTime @db.Timestamptz(3)` | Hora de la base. |
| `abiertaPorId` | `Int` | Auditoría técnica. |
| `claveApertura` | `String? @unique` | Idempotencia de la apertura. |
| `cerradaEn` | `DateTime? @db.Timestamptz(3)` | |
| `cerradaPorId` | `Int?` | Auditoría técnica. |
| `cantidadVentas` | `Int?` | Instantánea al cierre. |
| `totalesPorMedio` | `Json?` | Instantánea al cierre, por ejemplo `{ "efectivo": "50000.00", "debito": "40000.00" }`. |
| `totalVentas` | `Decimal? @db.Decimal(14,2)` | Instantánea al cierre. |
| `efectivoEsperado` | `Decimal? @db.Decimal(14,2)` | `efectivoInicial` + ventas en efectivo. |
| `efectivoDeclarado` | `Decimal? @db.Decimal(14,2)` | ≥ 0, ingresado al cerrar. |
| `diferencia` | `Decimal? @db.Decimal(14,2)` | `declarado - esperado`. |
| `observacion` | `String?` | Hasta 500 caracteres. |
| `ordenes` | `Orden[]` | |

- Índice único parcial (SQL): `CREATE UNIQUE INDEX "Caja_una_abierta" ON "Caja" ((true)) WHERE "estado" = 'abierta';`
- CHECK: `"efectivoInicial" >= 0`; además `estado = 'cerrada'` exige `cerradaEn`, `efectivoDeclarado`, `efectivoEsperado` y `diferencia` no nulos.

### Transiciones

```text
(no existe) --abrir--> abierta --cerrar--> cerrada   (terminal; no se reabre)
```

- Abrir con una caja ya abierta devuelve la existente (`reiterada: true`) si la clave coincide. Si la clave es distinta, responde `409 CAJA_YA_ABIERTA`.
- Cerrar una caja ya cerrada devuelve el cierre registrado si la clave coincide. Si no, responde `409 CAJA_CERRADA`.
- Las devoluciones posteriores no modifican la instantánea de cierre.

## Validaciones de la venta en el local

| Regla | Código |
| --- | --- |
| Hay una caja abierta | `CAJA_NO_ABIERTA` |
| La venta tiene al menos una línea y cantidades enteras > 0 | `VENTA_VACIA` / `cantidad_invalida` |
| El producto está activo, disponible en el local y con el drop lanzado | `producto_retirado` / `producto_no_local` / `drop_no_lanzado` |
| La variante está activa y la cantidad agrupada no supera el disponible | `variante_inactiva` / `stock_insuficiente` |
| No hay productos improvisados | `producto_improvisado` |
| El inventario no está suspendido y las variantes están conciliadas si el corte está activo | `INVENTARIO_SUSPENDIDO` / `VARIANTE_SIN_CORTE` / `RESERVA_SIN_PARTIDA` |
| El DNI tiene 7 u 8 dígitos tras normalizar | `DNI_INVALIDO` |
| El medio de pago es válido | `MEDIO_PAGO_INVALIDO` |
| La huella del resumen está vigente | `RESUMEN_CAMBIO` (devuelve el resumen nuevo) |
| La clave repetida tiene otra intención | `INTENCION_EN_CONFLICTO` |
