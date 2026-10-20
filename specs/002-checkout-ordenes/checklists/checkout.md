# Checkout Checklist: Calidad de requisitos de órdenes

**Purpose**: Revisar completitud, claridad y consistencia de las reglas de checkout antes de convertir el plan en tareas.
**Created**: 2026-10-11
**Feature**: [spec.md](../spec.md)

**Note**: Esta checklist personalizada fue generada por `$speckit-checklist` a partir de la spec y el plan.
**Review Ownership**: La evaluación pertenece al revisor. Marcar `[x]` solo cuando determine que el criterio de calidad de requisitos está satisfecho.
**Marker Semantics**: `[x]` indica que los requisitos fueron revisados y aprobados en ese aspecto; no significa que la funcionalidad esté implementada.

## Completitud del recorrido y los importes

- [x] CHK001 ¿Están definidos todos los pasos del cliente desde `/carrito` hasta revisión, aceptación, confirmación e historial en `/cuenta`, incluidos los retornos para corregir el carrito? [Completeness, Spec §FR-001, §FR-016]
- [x] CHK002 ¿Están diferenciados los datos obligatorios de `envio` y la ausencia de datos de envío para `retiro`, con criterios de validación suficientes para cada campo? [Completeness, Spec §FR-002]
- [x] CHK003 ¿Se distingue en todos los requisitos de importes entre subtotal de productos, costo de envío desconocido y total final desconocido, sin tratar un valor ausente como cero? [Consistency, Spec §FR-003, §FR-004]
- [x] CHK004 ¿Está definido qué precio se compara con el guardado en el carrito y qué diferencias debe ver el cliente por ítem y subtotal? [Clarity, Spec §FR-005]
- [x] CHK005 ¿Queda inequívoco cuándo se exige una nueva aceptación del precio vigente si cambia el resumen después de la revisión? [Clarity, Spec §FR-005, Edge Cases]
- [x] CHK006 ¿Son consistentes la confirmación manual del subtotal, el costo de envío sin cotizar y la constancia posterior de coordinación externa? [Consistency, Spec §FR-012, §FR-019, §FR-021]
- [x] CHK007 ¿Están especificados los datos históricos mínimos de cada línea para que cambios posteriores del catálogo o carrito no alteren una orden? [Completeness, Spec §FR-007]

## Disponibilidad, reservas y reintentos

- [x] CHK008 ¿Están enumeradas todas las causas que impiden confirmar, incluido carrito vacío, producto retirado, variante inactiva, stock insuficiente y `ProductoImprovisado`, y el tratamiento del carrito afectado? [Coverage, Spec §FR-006, Edge Cases]
- [x] CHK009 ¿Se expresa con precisión que una confirmación crea orden y reserva completas o no crea ninguna, incluso bajo compras simultáneas? [Clarity, Spec §FR-008]
- [x] CHK010 ¿Es consistente el significado de «stock disponible» entre carrito, catálogo, reserva vigente y ajuste administrativo de existencias? [Consistency, Spec §FR-008, Plan §Transaction boundaries, Data Model §TalleProducto]
- [x] CHK011 ¿Están definidos los resultados de doble clic, reintento idéntico, misma intención con datos distintos y nueva intención sobre carrito ya convertido? [Coverage, Spec §FR-009, Edge Cases]
- [x] CHK012 ¿Está especificada la recuperación cuando se pierde la respuesta después de confirmar sin permitir una segunda compra? [Recovery, Spec §FR-009, Edge Cases]
- [x] CHK013 ¿Es inequívoco cuándo un cambio de precio, ítems o entrega invalida la aceptación previa y cuándo un cambio de stock bloquea sin crear una orden parcial? [Clarity, Spec §FR-005, §FR-006, §FR-008]

## Vencimiento y ciclo de la orden

- [x] CHK014 ¿Queda definido que un día equivale a 24 horas exactas desde la creación de una orden nueva, incluido el límite en el instante de vencimiento y la conservación del `venceEn` de órdenes existentes? [Clarity, Spec §FR-010, §FR-012]
- [x] CHK015 ¿Es consistente la disponibilidad del stock al vencer con una tarea que se ejecuta tarde o se reintenta, sin prolongar la reserva? [Consistency, Spec §FR-010, §FR-011, Plan §Transaction boundaries]
- [x] CHK016 ¿Están definidos los resultados de una carrera entre confirmación de pago, cancelación voluntaria y vencimiento, incluida la acción que pierde? [Coverage, Spec §FR-012, §FR-014, Edge Cases]
- [x] CHK017 ¿Están enumerados estados terminales, transiciones permitidas y rutas distintas de retiro y envío sin saltos implícitos? [Completeness, Spec §FR-015]
- [x] CHK018 ¿Queda clara la condición previa para marcar `enviada`, la constancia visible y la persistencia de un total final desconocido? [Clarity, Spec §FR-015, §FR-021]
- [x] CHK019 ¿Son consistentes la elegibilidad de cancelación del cliente y administración antes del vencimiento, y la cancelación por vencimiento después? [Consistency, Spec §FR-011, §FR-013]
- [x] CHK020 ¿Están definidos motivo y decisión de restitución para cancelar una pagada, incluidos casos antes y después de que la mercadería salga del inventario? [Coverage, Spec §FR-013, Data Model §Transiciones y efectos]
- [x] CHK021 ¿Se distingue una orden cancelada tras pagar de una devolución efectivamente realizada en todas las vistas y criterios de éxito? [Consistency, Spec §FR-020, §SC-007]

## Permisos, errores y criterios de aceptación

- [x] CHK022 ¿Están especificados acceso y alcance de datos para cliente, administración y usuario sin sesión en listado, detalle y acciones? [Completeness, Spec §FR-016, §FR-017]
- [x] CHK023 ¿Están definidos los errores recuperables con suficiente información para corregir ítems o precio sin revelar datos de otras órdenes? [Coverage, Spec §FR-006, §FR-018, Contracts §Cliente: checkout]
- [x] CHK024 ¿Se explicita que los importes, roles y transiciones se deciden en el servidor y que el navegador no es fuente de autoridad? [Consistency, Spec §FR-003, §FR-018, Constitution §IV]
- [x] CHK025 ¿Son medibles los criterios de aceptación de simultaneidad, reintentos, vencimiento, permisos y envío sin total final? [Acceptance Criteria, Spec §SC-001–SC-005, §SC-008]
- [x] CHK026 ¿Se define una expectativa verificable para errores de carga, demora o interrupción de la consulta de órdenes y del resumen antes de confirmar? [Gap, Recovery]
- [x] CHK027 ¿Están definidas las condiciones de accesibilidad de la aceptación de precios, mensajes por ítem y acciones de cancelación para navegación por teclado y lectores de pantalla? [Gap, Non-Functional]
- [x] CHK028 ¿Se distingue el resultado de una tarea programada retrasada del tiempo máximo aceptable para reflejar visualmente la cancelación en el historial? [Ambiguity, Spec §FR-011, §SC-003]

## Dependencias y límites

- [x] CHK029 ¿Están documentados los límites de esta entrega respecto de pasarela, cálculo/cobro de envío, reembolso y `ProductoImprovisado` sin contradicciones entre spec y plan? [Consistency, Spec §FR-019–FR-021, Plan §Summary]
- [x] CHK030 ¿Están identificadas las decisiones de migración y compatibilidad con órdenes heredadas, y la necesidad de revisar el entorno aislado antes de aplicar cambios de esquema/precios? [Dependency, Spec §Scope and design decisions for plan, Plan §Review points before implementation]
- [x] CHK031 ¿Está documentada la dependencia de un programador externo y qué comportamiento de negocio debe mantenerse aunque falte o se retrase? [Dependency, Spec §FR-010–FR-011, Plan §Transaction boundaries]
- [x] CHK032 ¿Están identificadas las restricciones de rama y repositorios separados para que la aprobación del diseño no se confunda con autorización de implementación o migración? [Assumption, Plan §Constitution Check, §Project Structure]

## Notes

- Revisión 2026-10-11: CHK002, CHK026, CHK027 y CHK028 resueltos en FR-002, FR-022–FR-024 y SC-009–SC-012; el contrato y el plan distinguen vencimiento efectivo de cancelación registrada.

- Marcar `[x]` únicamente después de revisar la calidad del requisito citado.
- Dejar sin marcar los criterios que requieran aclaración, corrección o evaluación adicional del revisor.
- `$speckit-implement` lee el estado de esta checklist, pero no debe modificar sus marcadores.
- `checklists/requirements.md` tiene un ciclo separado mantenido por `$speckit-specify` y `$speckit-clarify`.
- Agregar hallazgos y referencias junto al ítem correspondiente; los ID son consecutivos para trazabilidad.
