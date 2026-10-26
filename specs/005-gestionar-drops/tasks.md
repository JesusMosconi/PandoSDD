# Tasks: gestión administrativa de drops

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/drops-api.md](contracts/drops-api.md) y [quickstart.md](quickstart.md).

**Organización**: tareas agrupadas por historia. Los prefijos `backend/`, `frontend/` y `specs/` indican repositorios Git distintos. Completar una tarea por vez y revisar `git status` en los tres antes de cada cambio. `[P]` indica archivos independientes que podrían prepararse en paralelo; no autoriza delegar ni saltear dependencias.

**Límites**: no leer `.env`, ejecutar migraciones/seeds ni escribir servicios externos sin verificar destino y autorización. No hacer commit, push ni despliegue salvo pedido explícito. El catálogo destacado de Inicio está fuera de alcance.

## Phase 1: Setup y revisión de datos

**Objetivo**: fijar bases de trabajo y evitar convertir datos heredados en drops activos por accidente.

- [X] T001 Verificar rama, base y cambios locales en raíz, `backend/` y `frontend/`; crear ramas de feature correspondientes para implementación sin arrastrar ni sobrescribir cambios ajenos; registrar las bases en `specs/005-gestionar-drops/migration-audit.md`.
- [X] T002 Documentar en `specs/005-gestionar-drops/migration-audit.md` un inventario estático de `backend/prisma/schema.prisma`, migraciones versionadas y consumidores de `contadorActivo`/`ContenidoInicio.hero`; marcar cantidades/valores del entorno destino como `A VERIFICAR` sin leer `.env` ni consultar bases no autorizadas.
- [X] T003 Revisar explícitamente el cambio de esquema y la estrategia conservadora para datos heredados contra `specs/005-gestionar-drops/spec.md`, `plan.md` y `migration-audit.md` antes de modificar `backend/prisma/schema.prisma`.

## Phase 2: Fundamentos compartidos

**Objetivo**: establecer datos y reglas comunes sin cambiar aún las páginas públicas.

- [X] T004 Crear en `backend/prisma/schema.prisma` los campos de `Coleccion` previstos en `data-model.md`: `fechaFinalizacion` opcional y posterior al lanzamiento, `tituloInicio`/`textoBotonInicio` opcionales en borrador pero requeridos al programar, `fechaActivacion`/`fechaCierre`/`motivoCierre` opcionales y `activo` lógico predeterminado verdadero; añadir `ConfiguracionPortadaInicio` singleton `id=1`, `titulo`, `imagenUrl` y `fechaCompletada` opcional, preservando `ContenidoInicio.hero`.
- [X] T005 Crear una migración **nueva** y aditiva en `backend/prisma/migrations/` para campos y tabla de configuración, sin backfill basado en datos desconocidos; revisar SQL, reversibilidad operativa y compatibilidad temporal con `backend/prisma/schema.prisma` y el frontend actual. El mapeo de registros heredados se cierra antes de aplicarla al destino, no se inventa aquí.
- [X] T006 Implementar en `backend/src/services/drops.js` la función compartida que cuenta productos públicos disponibles reutilizando `backend/src/utils/visibilidad-producto.js` y `backend/src/services/inventario.js` (variante activa y `stockDisponible > 0` tras reservas); sin cambiar reglas de precios ni inventario.
- [X] T007 Implementar en `backend/src/services/drops.js` el cálculo determinista de estados y prioridades usando hora actual, fecha de inicio/fin, activación registrada, cierre manual/reemplazo, retiro y desempate por id; las funciones de lectura no escriben y un futuro sin fecha queda borrador.
- [X] T008 Implementar en `backend/src/jobs/activar-drops.js` y `backend/src/services/drops.js` un trabajo interno que evalúe al arranque y al menos cada 60 segundos, active el lanzamiento elegible y cierre al anterior en una transacción idempotente con bloqueo entre instancias; registrar errores y reintentar, sin escrituras desde GET públicos.
- [X] T009 Verificar con pruebas de servicio/trabajo en `backend/test/drops.test.js` disponibilidad con reservas, límites de fecha, desempate, activación tardía, reemplazo concurrente, reinicio y no reactivación de cierre manual; seguir el patrón de pruebas existente.

**Checkpoint**: datos y servicio listos. No aplicar migración al entorno destino en esta fase sin autorización y verificación específicas.

## Phase 3: US1 — Crear y programar drops (P1, MVP de gestión)

**Meta**: administrar drops y anunciar el futuro más próximo cuando no hay activo.

**Prueba independiente**: crear dos futuros desde el panel y comprobar que Inicio anuncia el más cercano con imagen, título y contador, sin enlace de compra.

- [X] T010 [US1] Crear listado completo y creación/edición administrativas en `backend/src/routes/admin-drops.routes.js` y registrar la ruta en `backend/src/index.js`, según `contracts/drops-api.md`; validar campos explícitos, fecha final mayor que lanzamiento, portada/título/botón al programar, ids y rol admin con `asyncHandler`.
- [X] T011 [US1] Añadir baja lógica de borradores/drops y carga de portada en `backend/src/routes/admin-drops.routes.js`; proteger también `POST/PUT/DELETE /colecciones` heredados en `backend/src/routes/colecciones.routes.js` con la misma validación y baja lógica, sin atajo de borrado físico o programación inválida.
- [X] T012 [US1] Exponer la selección de futuro y el contrato de lectura pura `GET /api/drops/inicio` en `backend/src/routes/drops.routes.js` y registrar la ruta en `backend/src/index.js`; iniciar allí también el trabajo interno de T008 fuera de las rutas; mantener compatibilidad de `/colecciones`.
- [X] T013 [P] [US1] Declarar tipos de listado administrativo y unión discriminada de Inicio en `frontend/src/types/coleccion.ts` y `frontend/src/types/drop.ts`, según `contracts/drops-api.md`.
- [X] T014 [US1] Crear entrada «Drops» y página administrativa en `frontend/src/app/admin/page.tsx` y `frontend/src/app/admin/drops/page.tsx`; usar `frontend/src/components/AdminDrops.tsx` para cargar listado autorizado por el BFF mediante `apiFetchAdmin`, sin hacer un fetch relativo desde un Server Component, y mostrar borradores/futuros/estado.
- [X] T015 [US1] Crear flujo de borrador → subir portada → programar con nombre, número, título, botón y fechas (hora de Buenos Aires indicada) en `frontend/src/components/AdminDrops.tsx`; mostrar validaciones, previsualización y fallos de guardado, enviando escrituras por `frontend/src/lib/api.ts`; añadir `drops` al mapeo administrativo de `frontend/src/app/api/admin/[...ruta]/route.ts` para preservar `/admin/drops` en Express.
- [X] T016 [US1] Cambiar solo el bloque principal de `frontend/src/app/page.tsx` para consumir `GET /api/drops/inicio`; anunciar futuro con `frontend/src/components/DropCountdown.tsx`, sin botón/enlace a la colección antes del lanzamiento; preservar la sección «CATÁLOGO» existente.
- [X] T017 [US1] Verificar compatibilidad original de `GET /colecciones`, `GET /colecciones/:id` y `frontend/src/app/colecciones/[id]/page.tsx` con consumidores existentes; el bloqueo posterior de URLs directas se incorpora en T036.
- [X] T018 [US1] Cubrir en `backend/test/drops.test.js` CRUD autorizado, validaciones, selección de futuro, 401/403 y compatibilidad de rutas actuales; verificar el recorrido de US1 en `specs/005-gestionar-drops/quickstart.md`.

## Phase 4: US2 — Activación y finalización (P1)

**Meta**: activar solo drops disponibles, cerrar el anterior y permitir fin automático o manual.

**Prueba independiente**: al alcanzar la fecha, el drop con producto disponible se muestra activo; otro sin disponibilidad permanece pendiente, luego se activa al recuperarla antes del fin; un cierre manual no revive.

- [X] T019 [US2] Exponer estado calculado, motivo de bloqueo y cantidad de productos disponibles en `backend/src/routes/admin-drops.routes.js` para el listado administrativo.
- [X] T020 [US2] Crear acción administrativa idempotente «Finalizar ahora» solo para drops ya lanzados en `backend/src/routes/admin-drops.routes.js`, con `verificarToken`, `esAdmin`, validación y rechazo de transiciones inválidas; borradores/futuros se cancelan mediante retiro lógico.
- [X] T021 [US2] Aplicar en `backend/src/services/drops.js` la prioridad del activo registrado sobre futuros, el fin por fecha en lectura, la recuperación de pendiente mediante el trabajo interno y la salida del estado activo por agotamiento, conservando cierre irreversible por reemplazo/manual.
- [X] T022 [US2] Mostrar estados, cantidad/motivo de falta de productos, enlace a la gestión existente de Productos para asignarlos, fecha de fin y acción «Finalizar ahora» en `frontend/src/components/AdminDrops.tsx`; pedir confirmación y no mostrar como guardado un fallo.
- [X] T023 [US2] Presentar en `frontend/src/app/page.tsx` el activo confirmado con enlace y texto de botón propios, sin cuenta regresiva; comprobar el cambio de futuro a activo dentro de 60 segundos con backend en servicio.
- [X] T024 [US2] Cubrir en `backend/test/drops.test.js` lanzamiento sin stock, recuperación con reserva liberada dentro de 60 segundos con proceso activo, fin programado/manual, reemplazo, agotamiento, reinicio y consultas simultáneas sin escrituras en GET; ejecutar escenarios US2 de `specs/005-gestionar-drops/quickstart.md`.

## Phase 5: US3 — Pieza de marca sin drop (P2)

**Meta**: configurar desde Drops el contenido de Inicio cuando no hay activo ni futuro con fecha.

**Prueba independiente**: sin candidato, Inicio muestra la imagen provista con su mensaje incorporado, sin título superpuesto, botón ni contador; el panel permite reemplazarla y previsualizarla.

- [X] T025 [US3] Crear lectura/edición administrativa única de `ConfiguracionPortadaInicio` en `backend/src/routes/admin-drops.routes.js`: imagen con autorización y título heredado opcional por compatibilidad; fijar `fechaCompletada` al configurar la imagen por primera vez, conservar `ContenidoInicio.hero` y rechazar su eliminación posterior sin reemplazo.
- [X] T026 [US3] Añadir el caso `tipo="marca"` en `backend/src/routes/drops.routes.js` y error 503 `CONFIGURACION_INCOMPLETA` si falta la imagen durante preparación; usar la imagen provista y exigir contenido completo antes de habilitar la funcionalidad en producción.
- [X] T027 [US3] Incorporar edición y previsualización de la pieza de marca en `frontend/src/components/AdminDrops.tsx`; retirar portadas de colecciones y `ContenidoInicio.hero` de `frontend/src/components/AdminImagenes.tsx`, conservar allí otras secciones, y actualizar descripción/carga en `frontend/src/app/admin/imagenes/page.tsx`.
- [X] T028 [US3] Mostrar la pieza de marca en `frontend/src/app/page.tsx`, sin título superpuesto, botón ni cuenta regresiva; usar el error de carga existente ante 503 de preparación y cubrir autorización, estado incompleto y bloqueo de borrado posterior en `backend/test/drops.test.js`.

## Phase 6: US4 — Categorías y colecciones recientes (P2)

**Meta**: destacar activo o último lanzado disponible, y listar tres lanzados recientes.

**Prueba independiente**: con futuros y cuatro lanzados, Categorías muestra solo tres lanzados en la lista; sin disponibles, el último muestra «AGOTADO».

- [X] T029 [US4] Exponer `GET /api/drops/categorias` en `backend/src/routes/drops.routes.js` usando el mismo servicio: activo primero; si no, último lanzado disponible; si ninguno, último lanzado agotado; lista de tres lanzados por fecha descendente con desempate por id.
- [X] T030 [US4] Consumir el contrato en `frontend/src/app/categorias/page.tsx`, mostrar «AGOTADO» sobre la tarjeta correspondiente y omitir tarjeta/lista ficticia cuando no hay lanzados; no mostrar futuros ni borradores en «Colecciones».
- [X] T031 [US4] Cubrir en `backend/test/drops.test.js` casos activo, histórico disponible, todos agotados, ningún lanzado, retirados, futuros y empates; verificar UI y enlaces con `specs/005-gestionar-drops/quickstart.md`.

## Phase 7: Cierre transversal

- [X] T032 Actualizar comportamiento realmente implementado en `docs/estado-actual/02-modelo-de-datos.md` y `docs/estado-actual/06-flujos-de-negocio.md`; registrar en `docs/estado-actual/08-deuda-y-riesgos.md` solo excepciones heredadas nuevas que se hayan verificado.
- [X] T033 Ejecutar `npm.cmd test` en `backend/` y `npm.cmd run lint` más `npm.cmd run build` en `frontend/`; registrar resultados en `specs/005-gestionar-drops/verificacion.md`, aclarando que backend carece de scripts lint/build.
- [X] T034 Antes de aplicar cualquier migración, verificar con autorización proyecto, rama, base, esquema, host, migraciones pendientes y valores heredados reales; completar mapeo por registro en `specs/005-gestionar-drops/migration-audit.md` y, si hace falta backfill, prepararlo como migración **nueva** en `backend/prisma/migrations/` para revisión previa. Después, ejecutar recorridos HTTP/visuales de `quickstart.md` en entorno aislado, migración solo si fue autorizada, comprobar trabajo activo/arranque y activación <60 s, medir consulta pública (<2 s), administrativa con 100 drops (<3 s) y creación <5 min; anotar resultados en `specs/005-gestionar-drops/verificacion.md`.
- [X] T035 Revisar `git diff --check` y `git status` en raíz, `backend/` y `frontend/`, contrastar `specs/005-gestionar-drops/spec.md`, `plan.md`, `contracts/drops-api.md` y `verificacion.md`; no hacer commit, push, migración de producción ni despliegue sin pedido explícito.
- [X] T036 [US1] Bloquear colección y productos de drops sin `fechaActivacion` en detalle público, listados/detalle de productos, catálogo, variantes e imágenes; impedir agregado al carrito y confirmación de checkout aun con ítems previos. Mantener la preparación administrativa, la disponibilidad interna para activar y el acceso a históricos lanzados. Actualizar pruebas, `docs/estado-actual/`, quickstart y verificación; validar backend y lint/build frontend.

## Dependencies & Execution Order

- T001 → T002 → T003 antes de T004/T005. El inventario estático basta para preparar código y migración aditiva; T034 exige inventario real autorizado y mapeo antes de aplicar cualquier migración al destino.
- T004 → T005 → T006 → T007 → T008 → T009 forman la base. T006 y partes del contrato tipado T013 pueden prepararse en archivos distintos una vez fijado el modelo.
- US1 (T010–T018) requiere la base; es el primer incremento administrable y comprobable.
- US2 (T019–T024) requiere US1 y añade activación/cierre reales. No considerar el MVP listo para publicación pública sin US2.
- US3 (T025–T028) usa la selección de Inicio de US1/US2; su configuración administrativa puede prepararse en paralelo con US2 si no se edita `AdminDrops.tsx` a la vez.
- US4 (T029–T031) usa el servicio compartido de la base y US2; la página de Categorías puede prepararse en paralelo con US3.
- Cierre (T032–T035) después de las historias incluidas. Migración de destino y despliegue tienen puertas de autorización separadas.

## Parallel Examples

- Tras T009, T013 (`frontend/src/types/`) puede prepararse mientras se define T010 (`backend/src/routes/`); no marcar otras tareas del mismo archivo como paralelas.
- Tras US2, T025 (`backend/src/routes/contenido-inicio.routes.js`) y T029 (`backend/src/routes/drops.routes.js`) afectan archivos distintos, pero deben integrarse secuencialmente con T026.
- T032 (docs raíz) puede redactarse mientras se completan verificaciones T033, siempre que describa solo comportamiento ya implementado.

## Implementation Strategy

1. Fundamentos y US1: crear/programar y anunciar futuros en entorno aislado; validar independientemente.
2. US2: completar reglas de activación, disponibilidad y finalización antes de tratar el resultado como listo para publicar.
3. US3 y US4: portada de marca y Categorías; validar cada escenario por separado.
4. Cierre: pruebas, comprobación visual, documentación y revisión de los tres repositorios. El contenido comercial final de marca se carga cuando el usuario lo proporcione.
