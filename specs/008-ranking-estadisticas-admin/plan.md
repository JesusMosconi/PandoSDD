# Implementation Plan: Ranking de productos, trazabilidad y panel de inicio del administrador

**Branch**: `008-ranking-estadisticas-admin` | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

## Summary

Se agregan tres consultas de solo lectura en el backend sobre los datos existentes: el panel de inicio, el ranking y la trazabilidad por producto. En el frontend se suman tres pantallas, con gráficos de Recharts. No hay cambios de esquema ni migraciones.

La base de comparación es `main` (backend) y `master` (frontend, PandoSDD), con la 006 y la 007 integradas.

## Technical Context

**Language/Version**: JavaScript ESM en Express 5.2; TypeScript strict en Next.js 16.2 y React 19.2.

**Primary Dependencies**: Prisma 7.8 (`$queryRaw` parametrizado para las agregaciones). Dependencia nueva solo en el frontend: `recharts`.

**Storage**: PostgreSQL, solo lectura. Usa el índice existente `Orden(canal, pagoConfirmadoEn)`.

**Testing**: `node --test` en el backend contra la base descartable (`PANDO_TEST_BRANCH_ID`); `npm run lint` y `npm run build` en el frontend.

**Performance Goals**: cada endpoint responde en menos de 1 segundo para 366 días con el volumen actual. La agregación se hace en SQL; no se cargan filas en memoria.

**Constraints**:
- Los importes se suman con `numeric` en SQL y se devuelven con `toFixed(2)`.
- Los días se calculan en `America/Argentina/Buenos_Aires`, igual que `rangoBuenosAires`.

## Constitution Check

| Principio | Aplicación |
| --- | --- |
| I. Separación | Los cálculos se hacen en Express. Next solo presenta y consulta por el BFF administrativo existente. |
| II. Datos | Sin cambios de esquema. |
| III. API | Rutas con `verificarToken` y `esAdmin`, `asyncHandler`, validación explícita de filtros y errores en español. El SQL va parametrizado con `Prisma.sql`, sin interpolar texto del usuario. |
| IV. Seguridad | Solo lectura y solo para el admin. Los vendedores no ven costos ni estas métricas. |
| V. Frontend | Páginas de servidor con `exigirAdministrador()` y componentes `"use client"` solo donde hay filtros y gráficos. Tipos en `src/types/estadisticas.ts`. |
| VI. Calidad | Tests nuevos del backend; lint y build del frontend; actualización de `docs/estado-actual/`. |
| VII. Secuencia | La spec, el plan y las tareas se revisan antes de implementar. La dependencia nueva está declarada en la spec. |

## Diseño

### Backend: `src/services/estadisticas.js`

- `periodo(desde, hasta)`: devuelve los límites de instantes (reutiliza `rangoBuenosAires` de `ventas-canal.js`), la cantidad de días y el período anterior.
- La CTE base `ventasNetas` une dos conjuntos:
  - **Ventas**: `DetalleOrden` JOIN `Orden` con `pagoConfirmadoEn` en el rango y `productoId IS NOT NULL`, con signo `+`.
  - **Devoluciones**: `DevolucionCliente` JOIN `DetalleOrden` JOIN `Orden` con `aceptadaEn` en el rango, con signo `−` sobre `cantidad` e `importeDebido`.

  Los filtros opcionales de canal y categoría se aplican en ambos conjuntos. Ranking y trazabilidad agrupan esta misma CTE.
- `rankingProductos(filtros)`:
  - agrupa por producto;
  - aplica `HAVING` para los mínimos;
  - calcula `ROW_NUMBER()` sobre el orden pedido para la posición global;
  - pagina con `LIMIT`/`OFFSET` y cuenta el total con `COUNT(*) OVER()`.

  Después completa nombre, categoría, imagen (`ImgProducto` de menor `orden`), estado activo y precio actual con una consulta Prisma por los ids de la página.
- `resumenInicio(filtros)`:
  - `resumenPorCanal` para el período actual y el anterior;
  - la serie diaria con `generate_series` sobre los días del período y `LEFT JOIN` de los totales de `Orden.subtotal` por día y canal;
  - `rankingProductos({ ..., limite: 5 })` para el top.
- `estadisticasProducto(id, filtros)`:
  - verifica que el producto exista;
  - toma los totales y la posición del ranking sin paginar, filtrado por el producto, sobre el ranking completo;
  - agrupa por canal, por variante y por día;
  - agrega las vigencias de precio con el mismo `where` que `historialProducto`, extraído a una función compartida en `informes.js`;
  - agrega el stock por variante.

### Backend: `src/routes/admin-estadisticas.routes.js`

- Valida los filtros con `validarFecha` y `validarIdentificador`, más un límite de 366 días.
- Define la clase local `ErrorEstadistica` y su middleware de error, igual que en `admin-informes.routes.js`.
- Se monta en `src/index.js`.

### Frontend

- `recharts`: gráficos `ResponsiveContainer`, `AreaChart` (serie diaria por canal), `BarChart` horizontal (top 10 del ranking) y `LineChart` con `type="stepAfter"` para el precio publicado contra el precio promedio cobrado.
  - Colores: negro para la web y neutro-500 para el local, siguiendo el estilo blanco y negro del sitio.
  - Tooltips con `formatearDinero`.
- **Panel** `src/app/admin/page.tsx`: `exigirAdministrador()`, encabezado y `AdminInicio` (client). Debajo, la grilla de módulos actual con «Ranking» agregado.
- **Ranking** `src/app/admin/ranking/page.tsx`: carga las categorías en el servidor (`GET /categorias`) y renderiza `AdminRanking`. Los filtros se sincronizan con la URL para poder compartirla.
- **Trazabilidad** `src/app/admin/productos/[id]/page.tsx`:
  - `params` es asíncrono en Next 16;
  - carga en el servidor las variantes del producto para el selector de `AdminInformes`;
  - renderiza `AdminTrazabilidadProducto` y, debajo, `AdminInformes` con `productoIdInicial`.
- `AdminProductos.tsx`: enlace «Estadísticas» en cada fila.
- BFF: prefijo `estadisticas` agregado en `src/app/api/admin/[...ruta]/route.ts`.

## Riesgos

- Las devoluciones de ventas de períodos anteriores pueden dejar netos negativos. Es el comportamiento esperado y está documentado en la spec.
- Recharts necesita el DOM. Los componentes de gráficos son client components, así que no hay problema de SSR.

## Orden de implementación

1. Backend: servicio, rutas y tests.
2. Frontend: dependencia, BFF y tipos; después ranking, panel y trazabilidad.
3. Documentación de `estado-actual` y `verificacion.md`.
