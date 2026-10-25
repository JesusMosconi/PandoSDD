# Tareas: selección administrativa del catálogo de Inicio

**Entrada**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/catalogo-inicio.md](contracts/catalogo-inicio.md), [quickstart.md](quickstart.md).  
**Estado**: tareas T001–T020 implementadas y verificadas en ramas de feature aisladas. Las rutas son relativas al repositorio raíz.

## Fase 1 — Preparación

- [X] T001 Verificar `git status` y las ramas de raíz, `backend/` y `frontend/`; aislar 004 en ramas de feature de los repositorios afectados sin incorporar ni perder cambios locales previos, siguiendo `specs/004-seleccion-catalogo-inicio/plan.md`.
- [X] T002 Revisar expresamente el cambio previsto de `CatalogoInicio` y la migración propuesta frente a `specs/004-seleccion-catalogo-inicio/spec.md`, `specs/004-seleccion-catalogo-inicio/plan.md`, `.specify/memory/constitution.md` y `backend/prisma/schema.prisma`; registrar cualquier discrepancia antes de editar esquema.

## Fase 2 — Fundamentos comunes

**Puerta**: terminar esta fase antes de las historias. La inspección de una base exige verificar su destino exacto; ninguna escritura externa se infiere de estas tareas.

- [X] T003 En `backend/`, verificar en un destino aislado autorizado el estado de migraciones y consultar de solo lectura las filas de `CatalogoInicio` para detectar `productoId` duplicados, más de cinco selecciones u órdenes ambiguos; registrar el resultado en `specs/004-seleccion-catalogo-inicio/quickstart.md` y detener la migración si hay datos que requieren conciliación.
- [X] T004 En `backend/prisma/schema.prisma` y una nueva carpeta de `backend/prisma/migrations/`, preparar `CatalogoInicio.activo` inicialmente verdadero y unicidad de `productoId`, sin editar migraciones aplicadas ni tocar `Producto`, autenticación o precios.
- [X] T005 Aplicar la nueva migración únicamente a una base aislada cuyo host, base, esquema, rama y autorización se hayan verificado; comprobar el resultado contra `backend/prisma/schema.prisma` y registrar la validación en `specs/004-seleccion-catalogo-inicio/quickstart.md`.

## Fase 3 — Historia 1: elegir y ordenar (P1, MVP)

**Objetivo**: el administrador elige de cero a cinco productos únicos, los ordena y puede quitar/reincorporar; Inicio refleja la selección visible.  
**Prueba independiente**: agregar productos de varias colecciones, reordenar, quitar y reincorporar; verificar posiciones 1..N, primera tarjeta grande, límite de cinco y rechazo de duplicados sin cambios parciales.

- [X] T006 [US1] Implementar en `backend/src/services/catalogo-inicio.js` la validación de cero a cinco IDs enteros positivos distintos y existentes, la exclusión transaccional aun con lista vacía, el reemplazo atómico con posiciones activas 1..N y la desactivación/reactivación de filas; rechazar fallos sin alterar la selección confirmada.
- [X] T007 [US1] Adaptar `backend/src/routes/catalogo-inicio.routes.js` para `GET` y `PUT /catalogo-inicio/seleccion` administrativos con `verificarToken`, `esAdmin`, `asyncHandler`, validación y campos permitidos; resolver `/seleccion` antes de `/:id` y usar el servicio de T006.
- [X] T008 [US1] Llevar `POST`, `PUT /:id` y `DELETE /:id` de `backend/src/routes/catalogo-inicio.routes.js` al mismo control transaccional y validaciones; `DELETE` desactiva, `PUT` no deja órdenes ambiguos, y ninguna ruta permite sexto producto o duplicado.
- [X] T009 [US1] Ajustar `GET /catalogo-inicio` y `GET /catalogo-inicio/:id` en `backend/src/routes/catalogo-inicio.routes.js` para excluir selecciones inactivas y mantener el filtro público `Producto.activo && Producto.web`, orden estable y 404 para detalle no visible.
- [X] T010 [US1] Declarar las respuestas pública y administrativa en `frontend/src/types/catalogo-inicio.ts`, sin `any`, y comprobar que `frontend/src/lib/api.ts` y `frontend/src/app/api/admin/[...ruta]/route.ts` ya reenvían lectura y escritura administrativas; cambiar estos dos últimos archivos solo si el contrato no funciona.
- [X] T011 [US1] Crear `frontend/src/app/admin/catalogo-inicio/page.tsx` con control de administrador, carga de selección completa y productos existentes mediante el BFF, más estados de carga, vacío y error recuperable.
- [X] T012 [US1] Crear `frontend/src/components/AdminCatalogoInicio.tsx` con agregar, quitar, subir/bajar y guardar la lista completa por `apiFetchAdmin`; impedir localmente sexto y duplicado, y reflejar éxito solo tras respuesta confirmada.
- [X] T013 [US1] Añadir acceso a la gestión de Inicio en `frontend/src/app/admin/page.tsx`, sin mezclarla con el módulo de productos ni con el drop.
- [X] T014 [US1] Añadir en `backend/test/catalogo-inicio.test.js` pruebas pertinentes para lista vacía, 1 y 5 productos, distintas colecciones, orden, baja/reactivación lógica, sexto, duplicado, entrada inválida, 401/403, rutas individuales y dos escrituras simultáneas; ejecutar solo con base aislada verificada.

## Fase 4 — Historia 2: conservar selecciones no visibles (P2)

**Objetivo**: el administrador ve y puede elegir productos ya ocultos; la selección permanece al cambiar visibilidad y el público solo ve los que siguen públicos.  
**Prueba independiente**: elegir un producto ya inactivo o no publicado; comprobar aviso y cupo, ocultamiento público, compactación de tarjetas y regreso al mismo orden al publicarlo.

- [X] T015 [US2] Extender `GET /catalogo-inicio/seleccion` en `backend/src/routes/catalogo-inicio.routes.js` para devolver `Producto.activo`, `Producto.web` y motivos `inactivo`/`no_publicado` sin filtrar los seleccionados ocultos; permitir la elección de productos existentes ya ocultos en `backend/src/services/catalogo-inicio.js`.
- [X] T016 [US2] Mostrar en `frontend/src/components/AdminCatalogoInicio.tsx` el motivo de cada producto oculto, incluir productos ocultos en el selector, contar su cupo y distinguir oculto de quitado; ampliar `frontend/src/types/catalogo-inicio.ts` según el contrato.
- [X] T017 [US2] Verificar en `frontend/src/app/page.tsx` que el primer producto visible recibe tarjeta grande, los demás pequeñas y el vacío conserva su mensaje cuando todos están ocultos; ajustar la página solo si falla alguno de esos casos.
- [X] T018 [US2] Ampliar `backend/test/catalogo-inicio.test.js` para selección inicialmente oculta, cambio de `activo` y `web` por separado y juntos, persistencia administrativa, cupo ocupado, filtro público y reaparición sin reselección; usar base aislada verificada.

## Fase 5 — Documentación y cierre

- [X] T019 Actualizar en raíz `docs/estado-actual/02-modelo-de-datos.md`, `03-api-backend.md`, `04-frontend.md` y `06-flujos-de-negocio.md` con el comportamiento implementado; tocar `08-deuda-y-riesgos.md` solo para una nueva excepción heredada verificada.
- [X] T020 Ejecutar y registrar en `specs/004-seleccion-catalogo-inicio/quickstart.md` los casos de aceptación, errores y recorrido visual; ejecutar `npm.cmd run lint` y `npm.cmd run build` en `frontend/`, pruebas backend pertinentes solo en destino aislado verificado, y `git diff --check` más `git status` en raíz, backend y frontend. Indicar que backend no tiene scripts de lint/build.

## Dependencias y orden

`T001 → T002 → T003 → T004 → T005 → T006 → … → T014 (US1) → T015 → … → T018 (US2) → T019 → T020`. T005 puede quedar en espera hasta que el destino aislado esté verificado y autorizado; no avanzar con pruebas que escriben base sin esa puerta. US1 entrega el MVP y se valida antes de US2. US2 reutiliza la lectura y la selección de US1, pero sus casos de visibilidad se comprueban por separado.

## Paralelismo e implementación incremental

No se marcan tareas `[P]`: la guía del proyecto pide trabajar una tarea por vez y los tres repositorios tienen cambios locales de otras funcionalidades. Dentro de US1, la documentación de tipos (T010) podría prepararse mientras se revisa el contrato backend, pero no debe fusionarse ni probarse antes de confirmar T006–T009. Dentro de US2, T016 depende del contrato de T015. Completar y validar US1 como MVP; después añadir US2 y finalmente cerrar documentación y pruebas integrales. No hacer commit, push, deploy ni aplicar migraciones fuera del entorno autorizado por el hecho de existir esta lista.
