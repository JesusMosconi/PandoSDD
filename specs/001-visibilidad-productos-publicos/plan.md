# Implementation Plan: Visibilidad consistente de productos públicos

**Branch**: `001-visibilidad-productos-publicos` (repo raíz) | **Date**: 2026-10-09 | **Spec**: [spec.md](spec.md)

**Input**: Spec aclarada y decisión de alcance: backend principal más ajuste mínimo de presentación en frontend.

## Summary

Centralizar en `backend/src/utils/` la regla pública `Producto.activo=true && Producto.web=true` como condición reutilizable para consultas y comprobaciones. Aplicarla al listado y detalle de productos, catálogo destacado y carrito, conservando la rama `admin=true`. Mantener ítems antiguos en el carrito con un indicador derivado de disponibilidad y mostrarlo en `CarritoPanel`; impedir aumentos de cantidad de ítems no disponibles. Verificar manualmente los seis escenarios, sin esquema, migraciones, autenticación ni recálculo de precios.

## Technical Context

**Language/Version**: backend JavaScript ES modules, Node según instalación existente; frontend TypeScript `strict`, Next.js 16.2.10 y React 19.2.4 (`backend/package.json`, `frontend/package.json`, `frontend/tsconfig.json`).

**Primary Dependencies**: Express 5, Prisma 7 con `@prisma/adapter-pg`; frontend Next/React existentes. Sin dependencias nuevas.

**Storage**: PostgreSQL mediante Prisma; esquema y migraciones sin cambios.

**Testing**: no hay infraestructura de tests ni scripts `test` en ambos `package.json`; se usará la verificación manual reproducible de [quickstart.md](quickstart.md). El frontend sí tiene scripts `lint` y `build`; el backend no.

**Target Platform**: API Express y aplicación web Next existentes; despliegues reales no verificados.

**Project Type**: dos repositorios Git de aplicación web más repo raíz para specs y docs.

**Performance Goals**: conservar el patrón de consultas existente; filtrar productos en Prisma, sin cargar colecciones completas para descartarlas en memoria.

**Constraints**: sin cambio de `schema.prisma`, migraciones, auth, precios ni PUT/DELETE de productos; preservar mensajes y estados existentes para no disponibles; leer `frontend/AGENTS.md` y la documentación instalada de Next antes de usar APIs nuevas.

**Scale/Scope**: tres routers backend, un helper backend, un componente y un tipo frontend, más dos docs de flujo/API y el registro de riesgo resuelto.

## Constitution Check

*GATE: comprobado antes de investigación y de nuevo tras el diseño.*

| Regla | Resultado del diseño |
|---|---|
| Arquitectura | Pasa: la decisión de disponibilidad y consultas viven en backend; frontend solo presenta el indicador recibido. |
| Datos | Pasa: no hay cambio de esquema ni migración. |
| Backend | Pasa: handlers existentes conservan `asyncHandler`; el helper se usa en consultas y comprobaciones. No se amplían escrituras sin token. |
| Seguridad y precios | Pasa: se conserva BFF para carrito y `precioUnitario`/subtotal actuales; no se toca auth. |
| Frontend | Pasa: ajuste en Client Component ya existente y tipo de `src/types/`; sin APIs nuevas de Next. |
| Calidad | Pasa como plan: archivos UTF-8; lint/build de frontend al implementar; limitación de tests y scripts backend declarada, con verificación manual. |
| Spec-Driven | Pasa: spec y aclaraciones preceden al plan; tasks e implementación seguirán después. |

No se justifica ninguna excepción nueva. Las diferencias heredadas no relacionadas siguen en `docs/estado-actual/08-deuda-y-riesgos.md`.

## Project Structure

### Documentation (this feature)

```text
specs/001-visibilidad-productos-publicos/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/catalogo-carrito.md
└── checklists/requirements.md
```

`tasks.md` será creado por `$speckit-tasks`, no por este plan.

### Source Code (repositorios separados)

```text
backend/
└── src/
    ├── utils/visibilidad-producto.js            # nuevo helper puro
    └── routes/
        ├── productos.routes.js                   # listado público y detalle
        ├── catalogo-inicio.routes.js             # listado y detalle destacados
        └── carrito.routes.js                     # agregado, aumento y lectura

frontend/
└── src/
    ├── components/CarritoPanel.tsx               # marca visible y control de aumento
    └── types/carrito.ts                          # indicador derivado de respuesta

docs/estado-actual/
├── 03-api-backend.md
├── 06-flujos-de-negocio.md
└── 08-deuda-y-riesgos.md
```

**Structure Decision**: helper en backend, sin nueva capa de datos. `backend/` y `frontend/` están hoy en ramas `main` y `master`; antes de implementarlos, crear y verificar una rama de feature separada en cada repo. Commits y PRs, si se solicitan, serán independientes por repo.

## Diseño y secuencia para tareas

1. Introducir el helper de visibilidad con una condición Prisma reutilizable y una comprobación de objeto cargado. Usar nombres de dominio en español.
2. Aplicar la condición a `GET /productos` público y a `GET /productos/:id`; mantener intacta la rama `admin=true`, así como PUT y DELETE. Filtrar en el detalle variantes de stock cero. El producto oculto responde 404 con `Producto no encontrado`.
3. Filtrar `GET /catalogo-inicio` y `GET /catalogo-inicio/:id` por producto visible. Para el detalle, usar `findFirst` con `id` y condición sobre la relación `producto`, o cargar el objeto y devolver 404 cuando su producto no sea visible: `findUnique` no admite filtros por relación. No borrar filas de `CatalogoInicio`; conservar `orden` de las restantes. El detalle de una selección oculta responde como selección inexistente.
4. En `POST /carrito/items`, validar la variante y su producto, y consultar el carrito existente sin crearlo. Calcular `cantidadFinal` con la cantidad del ítem existente, si lo hay, y comprobar el stock antes de crear el carrito o escribir el ítem. Un rechazo no debe crear un carrito vacío ni alterar uno existente. En `PUT /carrito/items/:id`, comparar la cantidad solicitada con `item.cantidad`: aplicar el rechazo por producto no visible solo si la nueva cantidad es mayor; permitir reducciones de un ítem cuyo producto no es visible. Mantener la validación previa ante `talleProducto.estado="inactivo"` y ante stock insuficiente, incluso en las reducciones, y mantener DELETE de ítem. No tocar `precioUnitario` ni la fórmula de subtotal.
5. En `carrito.routes.js`, crear una sola función de presentación que calcule `disponible` para cada ítem y conserve `conSubtotal`. Usarla tanto en `GET /carrito` como en `devolverCarritoActualizado`, de modo que POST, PUT y DELETE de ítems, además de DELETE `/carrito`, devuelvan el mismo campo. Los ítems con `productoImprovisado` y sin variante devuelven `disponible: true`. En `CarritoPanel`, mostrar “No disponible” y deshabilitar aumento para ítems con `disponible=false`; mantener la opción de quitar. Ajustar solo el tipo de respuesta necesario.
6. Ejecutar [quickstart.md](quickstart.md) en entorno aislado para los seis escenarios originales y los casos de `web=false`/sin stock; ejecutar `npm run lint` y `npm run build` en frontend. En backend no hay scripts equivalentes; informar la limitación. Revisar `git diff --check` de los repos afectados.
7. Actualizar `docs/estado-actual/03-api-backend.md` y `06-flujos-de-negocio.md` con el contrato implementado; marcar como resueltos solo los subítems de visibilidad realmente verificados en `08-deuda-y-riesgos.md`, sin borrar riesgos no abordados.

## Riesgos y límites

- El helper debe evitar que un `where` adicional reemplace accidentalmente el predicado `activo && web` o que `admin=true` lo herede.
- La disponibilidad del ítem es derivada en cada lectura; no se agrega columna ni se recalcula el precio guardado.
- El cambio del listado para `web=false` es intencional según la aclaración; requiere verificar el catálogo público completo.
- La comprobación de stock y su escritura siguen sin ser atómicas; está fuera de alcance y permanece documentada.
- `GET /talle-producto` y `GET /img-producto/:productoId` siguen siendo públicos y no filtran por visibilidad del producto; quedan fuera de esta implementación y registrados como riesgo residual en `docs/estado-actual/08-deuda-y-riesgos.md`.
- El subtotal actual sigue incluyendo ítems no disponibles porque suma todos los `ItemCarrito`; `docs/estado-actual/06-flujos-de-negocio.md` lo documenta como decisión pendiente para una futura spec de checkout, sin cambiar ahora el cálculo.
- Antes de desplegar, contar en la base real los productos con `web=false` y revisar el impacto de excluirlos del catálogo público. La verificación funcional se hace primero en una base descartable; el conteo real debe ser de solo lectura y realizarlo una persona autorizada sin exponer credenciales.

## Complexity Tracking

No hay violaciones nuevas de la constitution que requieran justificación.
