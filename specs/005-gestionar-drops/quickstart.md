# Guía de validación de la funcionalidad

Esta guía se usa **después** de implementar y preparar un entorno aislado. No autoriza ejecutar migraciones, seeds ni escrituras externas durante el plan.

## Preparación

1. Verificar por separado `git status` y rama de raíz, `backend/` y `frontend/`; usar ramas de feature correspondientes y preservar cambios ajenos.
2. Confirmar nombre del proyecto, rama, base, esquema y host del entorno de prueba; revisar todas las migraciones pendientes. No usar datos de producción para fixtures.
3. Proveer en el entorno aislado administrador y productos/variantes con disponibilidad controlable. Verificar que la imagen de marca provista por el usuario esté accesible en `/drops/sin-drops.png` y configurada en el singleton.
4. En terminales separadas, ejecutar `npm.cmd run dev` desde `backend/` y `frontend/`. Abrir `http://localhost:3001/admin/drops`, Inicio y Categorías.

## Recorridos de aceptación

| Caso | Preparación/acción | Resultado esperado |
| --- | --- | --- |
| Futuros | Crear dos drops con fechas futuras | Inicio anuncia el más próximo, cuenta regresiva positiva y sin enlace a productos. Categorías no los lista. |
| Activación | Llegar a fecha de drop con producto público disponible y backend en servicio | El trabajo interno lo activa sin visita en hasta 60 s; Inicio/Categorías muestran el activo con acceso a la colección. |
| Bloqueo | Llegar a fecha sin productos disponibles | Estado pendiente y motivo en panel; el activo previo continúa si corresponde. |
| Recuperación | Dar disponibilidad antes del fin con backend en servicio | El pendiente se activa en hasta 60 s y cierra al anterior. |
| Agotamiento | Agotar variantes considerando reservas | Inicio deja de destacarlo como activo; Categorías prioriza uno anterior disponible o señala AGOTADO en el último. |
| Fin | Alcanzar fecha de fin o finalizar manualmente | Drop deja de ser activo; el manual no se reactiva por recuperar stock. |
| Estado de marca | No dejar activo ni futuro con fecha | Inicio presenta completa la imagen provista con su mensaje incorporado; sin título superpuesto, botón ni contador. |
| Categorías | Tener cuatro lanzados y dos futuros | Se muestran exactamente tres lanzados recientes, sin futuros. |
| Seguridad | Intentar escrituras sin sesión o sin rol admin | 401/403 y ningún cambio confirmado. |
| Concurrencia | Consultar desde dos clientes en transición/reiniciar API | Un solo activo; cierres idempotentes; anterior no reaparece. |
| Proceso interno | Mantener backend activo y luego reiniciarlo con un pendiente | Ejecuta evaluaciones periódicas y al arrancar; GET públicos no escriben datos. |
| Acceso previo al lanzamiento | Abrir URL directa de una colección futura, su producto y endpoints públicos; intentar agregarlo al carrito y confirmar un ítem previo | Detalle y productos no accesibles hasta la activación; carrito y checkout impiden la compra. El administrador puede seguir editando el drop y sus productos. Tras activarse, las URLs funcionan; el histórico lanzado permanece accesible. |

## Comprobaciones de cierre

- Backend: `npm.cmd test`; no hay scripts de lint o build, registrarlo expresamente.
- Frontend: `npm.cmd run lint` y `npm.cmd run build`.
- Revisar `git diff --check` en los tres repositorios y contrastar rutas/contratos con [drops-api.md](contracts/drops-api.md).
- Verificar Inicio, Categorías, panel y detalle en navegador contra el servidor local efectivo; una compilación sola no valida el resultado visual.
- Comprobar que `docs/estado-actual/` refleje los cambios implementados. Detenerse antes de aplicar migraciones o desplegar sin autorización y verificación del destino.
