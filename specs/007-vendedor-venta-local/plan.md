# Implementation Plan: Rol vendedor y venta en local

**Branch**: `007-vendedor-venta-local` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

**Input**: Spec aprobada en conversación el 2026-10-29. Esta fase solo produce diseño; no modifica código, esquema ni datos.

## Summary

Agregar el canal de venta «local» sobre el circuito de órdenes existente. Una venta en el local es una `Orden` con `canal="local"` que se crea pagada y entregada en una sola transacción. Reutiliza la disponibilidad efectiva, el bloqueo de variantes, la asignación FIFO (`seleccionarPartidasFIFO`, `reconocerVentaFIFO`) y el consumo de reservas (`transicionarReservas`). Así los informes, el margen y las devoluciones existentes funcionan sin un circuito paralelo.

Se agregan:

- `Producto.local`, independiente de `web`.
- El rol `vendedor`, con una única cuenta activa.
- La entidad `Caja`, con una sola abierta a la vez.
- DNI, caja y número de comprobante en `Orden`.

El frontend suma un punto de venta, la caja, el historial con comprobante imprimible y una vista administrativa de ventas por canal y medio, todo detrás de un BFF propio. La base de comparación es `main`/`master` con la feature 005 integrada.

**Primera vista para presentar**: las fases A y B de [Orden de implementación](#orden-de-implementación) alcanzan para mostrar el recorrido completo: vendedor, caja, venta y comprobante. La fase C (vista administrativa e informes por canal) se suma después. Los ajustes que requiera la feature 006 se hacen al integrarla (ver [Coordinación con 006](#coordinación-con-006)).

## Technical Context

**Language/Version**: JavaScript ESM en Express 5.2; TypeScript strict en Next.js 16.2 y React 19.2.

**Primary Dependencies**: Prisma 7.8 con `@prisma/adapter-pg` sobre PostgreSQL; servicios existentes de inventario, partidas FIFO, órdenes y devoluciones; sesión y BFF de Next. Sin dependencias nuevas.

**Storage**: PostgreSQL. Cambios aditivos en `Producto`, `Orden` y `Usuario` (solo un índice), más la tabla nueva `Caja`. Migración versionada `20261029_vendedor_venta_local`.

**Testing**: `node --test` en backend contra una base descartable (rama `Prueba`); `npm run lint` y `npm run build` en frontend; recorrido visual local. Backend no tiene scripts de lint ni build.

**Target Platform**: API Express (Render) y Next.js (Vercel). El punto de venta se usa en un navegador de escritorio o tablet del local.

**Project Type**: aplicación web en tres repositorios Git (PandoSDD, backend, frontend).

**Performance Goals**: búsqueda del punto de venta en menos de 1 segundo con el catálogo actual. Confirmación de una venta de hasta 10 líneas en menos de 2 segundos. Resumen por canal de un mes en menos de 3 segundos.

**Constraints**:
- Precios e importes los calcula el backend; no hay descuentos.
- Stock único entre canales, sin sobreventa.
- Una sola caja abierta y un solo vendedor activo, garantizados por la base.
- El flujo web (002/003/005) no cambia de comportamiento.
- No se integra la pasarela de pagos (006).

**Scale/Scope**: un local, una caja, un vendedor, decenas de ventas por día. Cuatro pantallas nuevas en el frontend y tres pantallas administrativas modificadas.

## Constitution Check

*GATE previo a investigación y reevaluado tras diseño: aprobado, condicionado a la revisión explícita del esquema, la autorización y el cálculo de importes antes de implementar (principio VII).*

| Principio | Aplicación |
| --- | --- |
| I. Separación | Reglas, importes, stock y caja en Express. Next solo presenta; las escrituras del navegador pasan por el BFF `/api/vendedor/[...ruta]` y el BFF administrativo existente. |
| II. Datos | Migración nueva y aditiva con nombres en español. Baja lógica del vendedor (`activo=false`). Ninguna baja física. Los productos existentes quedan con `local=true`. |
| III. API | Handlers con `asyncHandler` y errores en español. Datos Prisma armados con campos explícitos. Todas las rutas nuevas usan `verificarToken`, más el nuevo `esVendedor` (rol `vendedor` o `admin`, consultado en la base) o `esAdmin`. |
| IV. Seguridad | JWT en la cookie httpOnly existente. Precio vigente calculado en el servidor, con huella de resumen. El DNI se normaliza a dígitos. No hay secretos nuevos. |
| V. Frontend | Server Components para páginas y comprobante; `"use client"` solo en el punto de venta y en los formularios de caja. Tipos en `src/types/` y solicitudes por `apiFetchInterna`. Consultar `node_modules/next/dist/docs/` ante APIs dudosas de Next 16. |
| VI. Calidad | Tests de backend para venta, caja, roles y concurrencia. La suite existente (002/003/005) debe seguir pasando. Lint y build del frontend. Actualizar `docs/estado-actual/`. |
| VII. Secuencia | Spec commiteada; este plan y la migración requieren revisión. Después vienen `tasks.md` y la implementación. |

**Reevaluación tras Phase 1**: el modelo y los contratos respetan los principios. No se propone ninguna excepción.

## Project Structure

### Documentation (this feature)

```text
specs/007-vendedor-venta-local/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/venta-local-api.md
├── checklists/requirements.md
└── tasks.md                  # Fase posterior ($speckit-tasks)
```

### Source Code

```text
backend/  (PandoCbaV2)
├── prisma/
│   ├── schema.prisma                         # Producto.local, Orden (canal, dniCliente, cajaId, numeroComprobante), Caja
│   └── migrations/20261029_vendedor_venta_local/migration.sql   # incluye índices únicos parciales
├── src/
│   ├── index.js                              # montar vendedor.routes y admin-ventas.routes
│   ├── middleware/es-vendedor.js             # NUEVO
│   ├── utils/visibilidad-producto.js         # whereProductoLocal / esProductoLocal
│   ├── utils/carrito.js                      # filtrar canal "web"
│   ├── services/
│   │   ├── reserva-fifo.js                   # NUEVO: crear detalles + reservas + asignaciones FIFO (extraído de checkout.js)
│   │   ├── checkout.js                       # usa reserva-fifo.js; filtra carrito canal "web"
│   │   ├── venta-local.js                    # NUEVO: venta en curso, resumen, confirmación, historial, comprobante
│   │   ├── caja.js                           # NUEVO: abrir, estado, cierre, historial
│   │   ├── ventas-canal.js                   # NUEVO: resumen por canal y medio
│   │   ├── ordenes.js                        # filtros canal/metodoPago en listado admin; presentar campos nuevos
│   │   └── informes.js                       # canal en eventos de venta
│   └── routes/
│       ├── vendedor.routes.js                # NUEVO: /vendedor/*
│       ├── admin-ventas.routes.js            # NUEVO: /admin/ventas/resumen, /admin/cajas
│       ├── usuarios.routes.js                # rol vendedor y vendedor único
│       ├── productos.routes.js               # campo local en alta/edición/filtros admin
│       ├── carrito.routes.js                 # canal "web"
│       └── admin-ordenes.routes.js           # query canal/metodoPago
└── test/
    ├── venta-local.test.js                   # NUEVO
    ├── caja.test.js                          # NUEVO
    └── roles-vendedor.test.js                # NUEVO

frontend/  (PandoCbaFrontend)
├── src/app/
│   ├── vendedor/layout.tsx                   # exigirVendedor + navegación del punto de venta
│   ├── vendedor/page.tsx                     # punto de venta
│   ├── vendedor/caja/page.tsx                # apertura y cierre
│   ├── vendedor/ventas/page.tsx              # historial del local
│   ├── vendedor/ventas/[id]/page.tsx         # comprobante imprimible
│   ├── admin/ventas/page.tsx                 # NUEVO: resumen por canal/medio + cajas
│   └── api/vendedor/[...ruta]/route.ts       # NUEVO: BFF vendedor
├── src/components/
│   ├── PuntoVenta.tsx                        # NUEVO (client)
│   ├── CajaPanel.tsx                         # NUEVO (client)
│   ├── HistorialVentasLocal.tsx              # NUEVO
│   ├── ComprobanteVenta.tsx                  # NUEVO (+ botón imprimir client)
│   ├── AdminVentas.tsx                       # NUEVO
│   ├── AdminProductos.tsx                    # checkbox/filtro/columna Local
│   ├── AdminClientes.tsx                     # opción de rol vendedor
│   ├── AdminOrdenes.tsx                      # filtros canal y medio, columna canal
│   ├── AuthForm.tsx                          # redirección del vendedor a /vendedor
│   └── Header.tsx                            # acceso «Punto de venta»; vendedor sin carrito
├── src/lib/autorizacion.ts                   # exigirVendedor
├── src/app/api/admin/[...ruta]/route.ts      # prefijos "ventas" y "cajas"
└── src/types/ (venta-local.ts, caja.ts NUEVOS; usuario.ts, producto.ts, orden.ts)

PandoSDD/
└── docs/estado-actual/ (02, 03, 04, 05, 06, 08)
```

**Structure Decision**: se mantienen los tres repositorios y sus convenciones. La lógica nueva va en servicios propios (`venta-local.js`, `caja.js`, `ventas-canal.js`). La creación de líneas, reservas y asignaciones FIFO se extrae de `checkout.js` a `reserva-fifo.js` para que la web y el local compartan exactamente la misma regla de inventario.

## Orden de implementación

| Fase | Contenido | Resultado |
| --- | --- | --- |
| A. Base | Migración, `Producto.local`, rol vendedor y vendedor único, `esVendedor`, filtro de canal en carrito, extracción `reserva-fifo.js` con suite 002/003 en verde | Fundamentos sin cambio visible para clientes |
| B. Punto de venta (demo) | Caja (abrir, estado, cerrar), venta en curso, resumen, confirmación, comprobante, historial; BFF y pantallas `/vendedor/*`; login y Header; checkbox Local en productos; rol en clientes | **Primera vista presentable**: US1, US2, US3 y US5 |
| C. Separación por canal | `/admin/ventas` (resumen por canal y medio, cajas, cierre de respaldo), filtros en órdenes, canal en informes | US4 |
| D. Cierre | Docs de estado actual, verificación en `Prueba`, revisión post-006 | Entrega |

## Coordinación con 006

- La 007 usa `Orden.metodoPago` para el medio del local (`efectivo`, `transferencia`, `debito`, `credito`). En la web hoy vale `manual`. Si la 006 cambia el significado o agrega otra tabla de pagos, se ajustan `ventas-canal.js` y el filtro por medio.
- Si la 006 toca `Orden`, `checkout.js` o `AdminOrdenes.tsx`, hay que rebasar la 007 y resolver los conflictos manteniendo ambas reglas.
- Si la 006 trae una migración con fecha posterior al 2026-10-29, se renombra la carpeta de la 007 **antes** de aplicarla en cualquier base, para conservar el orden de dependencias. Nunca se renombra una migración ya aplicada.

## Complexity Tracking

Sin violaciones a justificar.
