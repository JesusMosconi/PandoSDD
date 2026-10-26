# Implementation Plan: gestión administrativa de drops

**Branch**: `codex/005-gestionar-drops` | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md)

**Input**: Spec aprobada en conversación. Esta fase solo produce diseño; no modifica código, esquema ni datos.

## Summary

Extender la colección existente con ciclo de vida y textos propios. El backend determinará estado, disponibilidad y selección para Inicio y Categorías mediante una regla compartida; un trabajo interno registrará activaciones y reemplazos sin escrituras desde rutas públicas. El frontend presentará esos resultados y permitirá gestionar drops y pieza de marca por el BFF administrativo. Una migración nueva y aditiva preservará datos heredados; debe revisarse antes de ejecutarse.

## Technical Context

**Language/Version**: JavaScript ESM en Express 5.2; TypeScript strict en Next.js 16.2 y React 19.2.

**Primary Dependencies**: Prisma 7.8 con PostgreSQL; sesión/BFF administrativo, inventario y carga de imágenes existentes. Sin dependencias nuevas previstas.

**Storage**: PostgreSQL; `Coleccion`, `Producto`, `TalleProducto`, `ContenidoInicio`; migración versionada nueva.

**Testing**: `node --test` en backend; `npm run lint` y `npm run build` en frontend; recorridos HTTP y visuales. Backend no tiene scripts de lint ni build.

**Target Platform**: API Express y Next.js desplegados por separado; fechas ingresadas como hora de Buenos Aires y almacenadas como instantes inequívocos.

**Project Type**: aplicación web en tres repositorios Git (raíz, backend, frontend).

**Performance Goals**: respuesta pública en menos de 2 segundos; listado administrativo de 100 drops en menos de 3 segundos durante pruebas.

**Constraints**: no cambiar precios ni autenticación; sin acceso del frontend a la base; disponibilidad efectiva incluye reservas; activación en hasta 60 segundos con backend en servicio; el despliegue debe mantener activo el proceso interno. GET públicos sin escrituras.

**Scale/Scope**: un activo, varios futuros, tres lanzados recientes en Categorías y una pieza de marca; catálogo destacado de Inicio fuera de alcance.

## Constitution Check

*GATE previo a investigación y reevaluado tras diseño: aprobado, condicionado a revisión explícita del cambio de esquema antes de implementarlo.*

| Principio | Aplicación |
| --- | --- |
| I. Separación | Reglas y datos en Express; presentación en Next; escrituras desde navegador por BFF. |
| II. Datos | Migración nueva, baja lógica, preservación histórica e inventario de datos heredados antes de aplicarla. |
| III. API | Campos permitidos explícitos, validación, `asyncHandler`, `verificarToken` y `esAdmin` para rutas que escriben. Lecturas públicas puras; transición persistente en trabajo interno. |
| IV. Seguridad | Reutilizar cookie httpOnly; no tocar autenticación ni precios. |
| V. Frontend | Server Components por defecto, tipos estrictos y capa `apiFetch`; consultar guías locales si una API Next 16 resulta dudosa. |
| VI. Calidad | Pruebas de estados/concurrencia en backend; lint/build frontend; actualizar docs de estado actual. |
| VII. Secuencia | Plan y cambio de esquema sujetos a revisión; `tasks.md` e implementación en fases posteriores. |

**Reevaluación tras Phase 1**: modelo y contratos mantienen los principios; no hay excepción propuesta.

## Project Structure

### Documentation (this feature)

```text
specs/005-gestionar-drops/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/drops-api.md
└── tasks.md                  # Fase posterior
```

### Source Code (three repositories)

```text
backend/prisma/schema.prisma
backend/prisma/migrations/       # nueva migración al implementar
backend/src/routes/admin-drops.routes.js
backend/src/routes/drops.routes.js
backend/src/routes/colecciones.routes.js
backend/src/index.js
backend/src/jobs/activar-drops.js
backend/src/services/drops.js    # selección y transiciones compartidas
backend/src/services/inventario.js
backend/test/drops.test.js
frontend/src/app/page.tsx
frontend/src/app/categorias/page.tsx
frontend/src/app/admin/page.tsx
frontend/src/app/admin/drops/page.tsx
frontend/src/app/admin/imagenes/page.tsx
frontend/src/app/api/admin/[...ruta]/route.ts
frontend/src/components/AdminDrops.tsx
frontend/src/components/AdminImagenes.tsx
frontend/src/components/DropCountdown.tsx
frontend/src/types/coleccion.ts
frontend/src/types/drop.ts
docs/estado-actual/02-modelo-de-datos.md
docs/estado-actual/06-flujos-de-negocio.md
```

**Structure Decision**: raíz mantiene specs y docs; backend y frontend son repositorios Git separados. Al implementar, crear ramas correspondientes en ambos desde bases verificadas, preservando cambios ajenos.

## Design Sequence

1. Hacer inventario estático de esquema, migraciones y consumidores; preparar una migración aditiva sin backfill supuesto. Antes de aplicarla, inventariar en el entorno destino autorizado colecciones, `contadorActivo`, fechas, productos y contenido `hero`, documentando el mapeo por registro. No inferir datos de producción desde el código.
2. Añadir campos de ciclo de vida y textos a `Coleccion`; introducir pieza de marca independiente y migración aditiva. Conservar el contenido `hero` existente y definir su traslado explícito después del inventario.
3. Centralizar disponibilidad y resolución de estados en backend. El trabajo interno evalúa al arrancar y al menos una vez por minuto, registrando activación y cierre por reemplazo en una transacción con bloqueo para varias instancias. Las consultas públicas solo leen; calculan el fin por fecha. Si el backend estuvo detenido, el trabajo evalúa pendientes al reinicio sin inventar activaciones históricas durante el apagado.
4. Definir respuestas públicas de Inicio y Categorías y listado/acciones administrativas. Conservar el listado de `/colecciones` necesario para edición administrativa, pero bloquear el detalle público y la exposición/compra de productos asignados hasta que exista activación registrada. El catálogo destacado público respeta la misma publicación.
5. Construir panel, portada y Categorías; mover edición de portadas y pieza de marca fuera de «Imágenes».
6. Validar escenarios del [quickstart](quickstart.md), pruebas backend, lint/build frontend y documentación. Revisar esquema, migración y entorno antes de cualquier ejecución o despliegue.

## Risks and Decisions

- `contadorActivo` tiene valor predeterminado `true`; no representa vigencia. El mapeo de registros heredados exige inventario del destino y revisión antes de migrar.
- La selección exige disponibilidad efectiva de variantes y reservas, no solo `Producto.activo` y `web`.
- La activación ocurre en hasta 60 segundos con proceso activo; el fin por fecha se refleja en la primera lectura. El trabajo interno debe ser idempotente y seguro ante concurrencia y reinicio. Su continuidad es una condición de despliegue; si el entorno suspende el proceso, la activación se retrasa hasta reiniciarlo.
- La imagen final de marca fue provista el 2026-10-24 y contiene logo y mensaje. Está versionada en el frontend y configurada en la rama aislada con una migración nueva. Antes de habilitar la funcionalidad en producción hay que verificar que la imagen sea accesible y conservar el bloqueo de borrado que deje la pieza incompleta.
- `/colecciones` ya tiene consumidores administrativos y conserva su listado. El detalle público de un drop sin activación devuelve 404. Los productos se filtran en lecturas públicas, carrito y checkout con una regla compartida; la disponibilidad interna para decidir una activación sigue contando productos preparados, aunque todavía no sean publicables. Sus mutaciones heredadas deben validar o delegar a la misma regla para impedir borrado físico y programación inválida.

## Complexity Tracking

No se proponen violaciones de la constitution.
