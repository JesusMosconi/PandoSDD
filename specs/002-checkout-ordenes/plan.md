# Implementation Plan: Checkout y órdenes

**Branch**: `002-checkout-ordenes` (rama de feature actual en los tres repositorios) | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md)

**Input**: Spec de checkout con cuatro aclaraciones registradas el 2026-10-11. Este plan define diseño; no autoriza migrar, desplegar ni modificar datos.

**Rama de trabajo**: Los tres repositorios están en `002-checkout-ordenes`. La spec del repositorio raíz permanece sin commit y se conservó al cambiar de rama.

## Summary

Implementar revisión y confirmación del carrito en backend con precios y disponibilidad vigentes, detalle histórico e idempotencia. Mantener `TalleProducto.stock` como existencias físicas y calcular disponibilidad restando reservas vigentes. Una transacción serializa confirmaciones por variante y cierra el carrito junto con la orden. Las órdenes nuevas vencen a las 24 horas según reloj de base de datos; las existentes conservan su `venceEn`. Un proceso programado materializa cancelaciones y puede reintentarse. El navegador usa BFF para checkout, historial y administración. El costo de envío y total final de envíos permanecen desconocidos.

## Technical Context

**Language/Version**: JavaScript ESM y Node.js en backend; TypeScript strict, Next.js 16.2.10 y React 19.2.4 en frontend. Versión exacta de Node de producción: no documentada; verificar antes de despliegue.

**Primary Dependencies**: Express 5.2.1, Prisma 7.8 con `@prisma/adapter-pg`, PostgreSQL vía `pg`; Next.js BFF. Sin dependencias nuevas previstas.

**Storage**: PostgreSQL con esquema Prisma; el cambio de plazo no necesita migración. Verificar el host, la rama `production` de Neon y las órdenes pendientes antes de activar el barrido de producción. No reescribir `venceEn` de órdenes existentes.

**Testing**: Usar las pruebas existentes de `node:test` en `backend/test/` para comprobar creación con vencimiento de 24 horas, límite exacto, carreras e invariancia del `venceEn` de órdenes anteriores, contra una base aislada autorizada. Registrar comando y resultado real. Frontend: lint y build antes de cerrar cada tarea que lo modifique; backend: declarar ausencia de scripts de lint/build en cada tarea afectada.

**Target Platform**: API Node/Express y web Next. El comando de vencimiento se ejecuta desde GitHub Actions; la configuración de producción debe residir en `main`, validar el destino y usar un secreto específico. Por decisión de la persona responsable del 2026-10-17, una corrida manual exitosa en producción, junto con los despliegues verificados, basta para confirmar esta entrega; la primera corrida programada queda fuera del criterio de cierre.

**Project Type**: E-commerce web con dos repositorios de código (`backend/`, `frontend/`) y documentación/spec en el repositorio raíz.

**Performance Goals**: Confirmación de carrito pequeño en menos de 3 minutos de recorrido humano (SC-006); no se fija SLA de API sin mediciones. Procesar vencimientos en lotes acotados con programación horaria sobre la base de producción; la validez temporal no depende de la puntualidad de la tarea.

**Constraints**: 24 horas exactas para órdenes nuevas; `venceEn` existente inmutable; sin sobreventa ni doble liberación; precios calculados en backend; envío sin total final; sesión por cookie httpOnly/BFF; sin pasarela ni cálculo de envío.

**Scale/Scope**: Una orden por carrito web confirmado; cantidades e ítems limitados por validación de entrada y parámetros de lote definidos al implementar. No hay volumen de producción verificado; índices para consultas por dueño, estado/vencimiento y reservas por variante.

## Constitution Check

*GATE: Evaluado antes de investigación y después del diseño.*

| Principio | Decisión y verificación prevista | Estado |
|---|---|---|
| I. Separación | Lógica, permisos e inventario en backend; navegador autenticado solo por BFF Next | Cumple |
| II. Datos | Prisma 7 + adapter-pg; nueva migración, entidades/campos nuevos en español; sin borrar órdenes ni reservas | Cumple, sujeto a revisión explícita de migración |
| III. API | Nuevos handlers con `asyncHandler`, `validateBody` más reglas de formato/rango, mapeo explícito de campos, incluidos los POST/PUT de productos, catálogo de inicio y talles modificados; `verificarToken`, `esCliente` para operaciones propias y `esAdmin` para administración | Cumple |
| IV. Seguridad/precios | Cookie httpOnly; subtotal y huella de resumen calculados otra vez en backend; normalizar correo | Cumple |
| V. Frontend | Server Components por defecto, tipos en `src/types`; `apiFetchInterna` para navegador → BFF y función de `src/lib/api.ts` que conserva `Response` para BFF → Express | Cumple |
| VI. Calidad | UTF-8, lint/build frontend, pruebas significativas para concurrencia y tiempo; declarar ausencia de scripts backend | Cumple con excepción heredada de tests |
| VII. SDD | Spec previa, este plan y después `tasks.md`; revisión explícita de esquema, precios y autorización antes de implementar | Aprobado para implementación local tras la invocación de `$speckit-implement`; migración pendiente de autorización específica |

**Gate**: No hay violación propuesta. La invocación de `$speckit-implement` tras las revisiones se registró como aprobación del diseño para cambios locales de código y esquema. Aplicar la migración o escribir en servicios externos requiere autorización específica posterior.

## Phase 0: Research decisions

Consultar [research.md](research.md). Decisiones principales: reservas como ledger no destructivo, bloqueo de variantes en orden estable, detalle histórico, huella de resumen recalculada, unicidad de confirmación, reloj de base de datos y comando programable separado. La opción de programador Render es una posibilidad documentada, no una configuración verificada de este proyecto.

## Phase 1: Design

- [data-model.md](data-model.md): entidades, reglas de disponibilidad, estados, movimientos y migración compatible con órdenes existentes.
- [contracts/checkout-ordenes.md](contracts/checkout-ordenes.md): API Express, BFF, formas de respuesta, errores y autorización.
- [quickstart.md](quickstart.md): guía de validación aislada, incluyendo concurrencia, vencimiento y recuperación.

### Transaction boundaries

1. **Resumen**: lectura actual de carrito y catálogo; calcular precios con Decimal y devolver huella de contenido, diferencias y errores por ítem. No reserva stock. Una confirmación nueva recalcula todo; un reintento idéntico de una orden ya creada devuelve esa orden tras comparar la huella de solicitud original.
2. **Confirmación**: verificar rol vigente `cliente` y buscar primero `(usuarioId, claveConfirmacion)`. Si ya existe, comparar la huella de la solicitud original y devolver la orden idéntica sin revalidar el carrito convertido ni el catálogo actual; una intención distinta responde 409. Solo para una creación nueva, exigir resumen y aceptación vigentes; en transacción bloquear carrito y filas `TalleProducto` ordenadas por ID, releer ítems/productos y sumar reservas efectivas. Carrito vacío responde 400; cantidades inválidas, producto retirado/no publicado, variante inactiva, stock insuficiente y `ProductoImprovisado` responden 409 con todos los ítems afectados, sin cerrar el carrito. Recalcular precio y exigir nueva aceptación si cambió. Crear `Orden` `pendiente_pago` con `metodoPago="manual"` y subtotal decimal calculado en backend. Crear `DetalleOrden` inmutable por línea con posición, nombre de producto, talle, color, cantidad entera positiva, precio unitario vigente, importe de línea `cantidad × precioUnitario` y referencias históricas opcionales; la suma de importes de línea debe igualar el subtotal. Agrupar las cantidades por `talleProductoId` antes de crear una `ReservaStock` activa por variante, con cantidad positiva y unicidad `(ordenId, talleProductoId)`; crear el evento inicial. Para `envio`, crear `DatosEnvio` con dirección, ciudad, código postal, teléfono y email normalizados, y persistir `costoEnvio=null` y `total=null` mientras sigue sin cotizar; para `retiro`, no crear `DatosEnvio`, persistir `costoEnvio=null` como no aplicable y `total=subtotal`. Cerrar carrito en la misma transacción. Unicidad de `(usuarioId, claveConfirmacion)` y de `carritoId`. Una colisión hace rollback; releer orden ganadora y devolverla solo si la huella de solicitud coincide. No realizar llamadas externas dentro de la transacción.
   **Validación por variante**: tanto el resumen como la confirmación suman las cantidades de todas las líneas con el mismo `talleProductoId` antes de comparar con stock disponible; la confirmación vuelve a hacerlo bajo bloqueo y, si falta stock, identifica todas las líneas de esa variante sin crear orden. La única reserva usa exactamente la cantidad agrupada validada.
3. **Cambio de estado**: crear en la base compartida la transición de vencimiento, antes de implementar pago o cancelación. Bloquear orden y variantes correspondientes, tomar hora de base de datos y validar transición. Pago y cancelación de pendiente exigen hora estrictamente anterior a `venceEn`; si ya venció, reutilizar la transición compartida `cancelada_vencimiento` con liberación lógica. Una cancelación administrativa de pendiente exige motivo y libera la reserva una vez, sin decisión de restitución ni devolución. Cancelación pagada registra decisión de restitución y motivo. Consumo de reserva en `enviada` (envío) o `entregada` (retiro); si no se restituye en cancelación pagada previa al consumo, reducir stock físico al liberar el compromiso; si se restituye tras consumo, incrementarlo. Movimiento y estado se guardan una vez.
4. **Vencimiento**: comando independiente selecciona pendientes con `venceEn <= reloj BD` en lotes, bloquea cada orden, aplica la misma transición de negocio y registra cuántas procesó/falló. Repeticiones y carreras son inocuas. La disponibilidad resta solo reservas aún vigentes; una pendiente vencida deja de bloquear compras exactamente al vencer aunque la tarea llegue tarde.
5. **Consultas y recuperación**: la respuesta de órdenes deriva `estadoVisible=reserva_vencida_en_proceso` cuando una pendiente ya venció según reloj BD pero todavía no fue procesada. La vista abierta refresca ese dato dentro de 60 segundos; no lo confunde con la fecha real de cancelación. Resumen e historial distinguen carga, demora de 10 segundos, error y vacío legítimo; el reintento del resumen invalida la aceptación anterior. El contrato comparte validaciones de envío entre resumen y confirmación. En el BFF, una función de `frontend/src/lib/api.ts` reenvía a la URL absoluta de Express y conserva cuerpo/estado/`Content-Type` sin interpretar errores; la reutilizan también las rutas administrativas modificadas. `apiFetchInterna` queda para navegador → BFF y expone los campos estructurados del error a la UI.

### Review points before implementation

- Inspeccionar con lectura autorizada si existen órdenes previas y migraciones aplicadas en **base aislada**, y diseñar backfill seguro: campos nuevos opcionales para filas heredadas; ninguna orden previa se presume `pendiente_pago` ni genera reserva retroactiva. No modificar migraciones antiguas.
- Validar semántica de `stock` con administración: mostrar existencias físicas y disponibles; los cambios manuales de stock, incluido DELETE que fija cero, deben bloquear la variante y no permitir existencias inferiores a compromisos vigentes. Catálogo de inicio, detalle, selector de variantes y carrito deben usar `stockDisponible` neto para no prometer unidades reservadas. Las rutas modificadas de productos, catálogo de inicio y talles validan y enumeran campos permitidos antes de escribir con Prisma.
- Comprobar versión de Node soportada por el entorno y programador real antes de configurar el comando. La programación es una dependencia de despliegue, no una suposición del repo.

## Project Structure

### Documentation (this feature)

```text
specs/002-checkout-ordenes/
├── spec.md
├── checklists/requirements.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/checkout-ordenes.md
├── tasks.md
└── verificacion.md          # se crea al ejecutar las tareas
```

### Source Code (repositorios separados; archivos previstos)

```text
backend/
├── prisma/schema.prisma
├── prisma/migrations/<nueva_migracion>/migration.sql
├── package.json
├── src/index.js
├── src/routes/checkout.routes.js
├── src/routes/ordenes.routes.js
├── src/routes/admin-ordenes.routes.js
├── src/middleware/es-cliente.js
├── src/services/checkout.js
├── src/services/ordenes.js
├── src/services/inventario.js
├── src/jobs/vencer-ordenes.js
├── src/routes/carrito.routes.js
├── src/routes/productos.routes.js
├── src/routes/catalogo-inicio.routes.js
├── src/routes/talle-producto.routes.js
├── test/checkout.test.js
├── test/ordenes-cliente.test.js
├── test/ordenes-admin.test.js
└── test/vencimiento.test.js
frontend/
├── src/app/carrito/page.tsx
├── src/app/checkout/page.tsx
├── src/app/cuenta/page.tsx
├── src/app/admin/page.tsx
├── src/app/admin/ordenes/page.tsx
├── src/app/api/checkout/resumen/route.ts
├── src/app/api/checkout/confirmacion/route.ts
├── src/app/api/ordenes/route.ts
├── src/app/api/ordenes/[id]/route.ts
├── src/app/api/ordenes/[id]/cancelacion/route.ts
├── src/app/api/admin/[...ruta]/route.ts
├── src/components/CarritoPanel.tsx
├── src/components/ProductCard.tsx
├── src/components/ProductVariants.tsx
├── src/components/CuentaPanel.tsx
├── src/components/CheckoutPanel.tsx
├── src/components/AdminOrdenes.tsx
├── src/lib/api.ts
├── src/types/talle-producto.ts
└── src/types/orden.ts
root/
└── docs/estado-actual/{02-modelo-de-datos,03-api-backend,04-frontend,05-autenticacion-y-autorizacion,06-flujos-de-negocio,08-deuda-y-riesgos}.md
```

**Structure Decision**: Mantener repos separados y lógica de dominio en servicios de backend; reutilizar BFF/cookie de sesión y proxy admin existente. La lista se ajustará en `tasks.md` si la investigación de implementación descubre archivos adicionales. Los cambios de catálogo/stock quedan limitados a mostrar y validar disponibilidad neta, no a refactor general.

## Complexity Tracking

No se proponen excepciones nuevas a la constitution. La ausencia de tests/scripts en backend es heredada; se documenta en `docs/estado-actual/08-deuda-y-riesgos.md` y se valida el flujo crítico con pruebas dirigidas en entorno aislado.

## Post-design Constitution Check

Se revisaron las decisiones de datos, contratos, flujo BFF y validación contra los siete principios. **Resultado: pasa para la fase de diseño**; implementación de esquema y precios queda sujeta a revisión explícita de este plan, migración nueva, entorno aislado y tareas aprobadas.
