# Plan de implementación: selección del catálogo de Inicio

**Rama actual (raíz)**: `003-compras-proveedores-costos`; **rama prevista para 004**: `codex/004-seleccion-catalogo-inicio` en cada repo afectado.  
**Fecha**: 2026-10-23 | **Spec aprobada**: [spec.md](spec.md)

## Resumen

Agregar una vista administrativa para elegir y ordenar hasta cinco productos. La API conservará selecciones cuyo producto deje de ser público y expondrá al visitante solo los visibles. El drop destacado sigue independiente.

## Contexto técnico

- **Backend**: Node.js ESM, Express 5, Prisma 7 y PostgreSQL. `CatalogoInicio` tiene `id`, `orden`, `productoId`; las rutas actuales no garantizan cupo ni unicidad.
- **Frontend**: Next 16, React 19, TypeScript `strict`. Inicio ya limita a cinco y asigna la tarjeta grande al primer resultado. El panel tiene BFF `/api/admin/[...ruta]`, pero no gestión de esta selección.
- **Pruebas**: backend usa `node:test`; frontend dispone de lint y build. No se prevén dependencias nuevas.
- **Alcance**: selección global de cero a cinco productos. No cambia precios, autenticación, inventario ni gestión de drops.

## Constitution Check

*Puerta comprobada antes de investigar y después del diseño.*

| Principio | Diseño | Resultado |
|---|---|---|
| Separación | Reglas y persistencia en backend; navegador administrativo por BFF | Cumple |
| Datos | Baja lógica de `CatalogoInicio`; migración nueva para estado y unicidad | Revisión expresa de spec y plan antes de tocar esquema |
| API | `asyncHandler`, validación, campos permitidos, `verificarToken` y `esAdmin` | Cumple |
| Seguridad | Cookie `httpOnly`; sin cambios en precios o secretos | Cumple |
| Frontend | Server Component por defecto, cliente solo para edición, capa `api.ts` y tipos | Cumple |
| Calidad | UTF-8, pruebas backend y lint/build frontend al implementar | Cumple |
| Spec-Driven | Spec aprobada antes de este plan; tasks e implementación pendientes | Cumple |

**Puerta previa**: no se modifica código ni datos en esta fase. Antes de implementar, revisar explícitamente la migración y este plan, aislar ramas 004 y verificar destino y estado de migraciones.  
**Puerta posterior**: [research.md](research.md), [data-model.md](data-model.md), [contracts/catalogo-inicio.md](contracts/catalogo-inicio.md) y [quickstart.md](quickstart.md) preservan estos principios. No se propone excepción nueva.

## Fase 0: investigación

[research.md](research.md) registra la elección de una lista ordenada enviada completa desde administración, actualización atómica, baja lógica y reutilización de filas. No quedan aclaraciones de negocio abiertas.

## Fase 1: diseño y secuencia

1. **Datos heredados y modelo**: agregar `activo` con valor inicial verdadero y unicidad de `productoId` en una migración nueva. Antes de aplicarla, inspeccionar en destino autorizado duplicados, más de cinco filas y órdenes repetidos. Si aparecen, detenerse para una conciliación revisable; no borrar datos automáticamente.
2. **Backend**: centralizar todas las escrituras de `CatalogoInicio` bajo validación y exclusión transaccional. Exigir cero a cinco IDs existentes y distintos; normalizar posiciones activas a 1..N. Quitar desactiva la fila; volver a agregar reactiva la misma. Se acepta agregar un producto ya inactivo o no publicado: queda seleccionado y oculto al público. Ninguna operación fallida deja una lista parcial. Las rutas individuales existentes deben adoptar las mismas invariantes.
3. **Lecturas**: `GET /catalogo-inicio` conserva solo selecciones activas de productos públicos. Añadir lectura administrativa protegida de todas las selecciones activas con motivos de ocultamiento. El producto oculto sigue contando para el cupo. Resolver empates heredados por ID hasta normalizar datos.
4. **BFF y panel**: reutilizar `/api/admin/[...ruta]`, `apiFetchAdmin` y los tipos compartidos; añadir entrada desde `/admin` y vista para agregar, quitar y mover productos. Mostrar estados de carga, vacío, guardado y error, y el motivo de ocultamiento.
5. **Inicio y docs**: comprobar que la respuesta pública mantiene orden relativo y que `page.tsx` compacta los visibles. Ajustar la página solo si la verificación muestra necesidad. Actualizar `docs/estado-actual/02-modelo-de-datos.md`, `03-api-backend.md`, `04-frontend.md` y `06-flujos-de-negocio.md` al implementar; `08-deuda-y-riesgos.md` solo si surge una excepción heredada verificada.

## Verificación prevista

Probar cero, uno y cinco seleccionados; sexto intento, duplicado, reordenamiento, baja y reincorporación, ocultamiento por `activo` y `web`, acceso 401/403 y escrituras concurrentes. Verificar tarjeta grande, pequeñas y vacío en navegador. Las pruebas que escriban base requieren destino aislado verificado y autorizado. Al editar frontend correr lint y build; backend tiene tests pero no scripts de lint/build. Revisar `git diff --check` en cada repo afectado.

## Estructura prevista

```text
specs/004-seleccion-catalogo-inicio/
  spec.md, checklists/requirements.md, plan.md, research.md,
  data-model.md, contracts/catalogo-inicio.md, quickstart.md
backend/
  prisma/schema.prisma
  prisma/migrations/<nueva_migracion>/migration.sql
  src/routes/catalogo-inicio.routes.js
  src/services/catalogo-inicio.js (si se centralizan)
  test/catalogo-inicio.test.js
frontend/
  src/app/admin/page.tsx
  src/app/admin/catalogo-inicio/page.tsx
  src/components/AdminCatalogoInicio.tsx
  src/app/api/admin/[...ruta]/route.ts (solo si hace falta)
  src/types/catalogo-inicio.ts
  src/app/page.tsx (solo si hace falta)
docs/estado-actual/
  02-modelo-de-datos.md, 03-api-backend.md, 04-frontend.md,
  06-flujos-de-negocio.md, 08-deuda-y-riesgos.md (si corresponde)
```

Los nombres finales de nuevos archivos y la secuencia de ejecución se concretarán en `tasks.md`. La feature debe aislarse de los cambios locales previos antes de editar backend o frontend.
