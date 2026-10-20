# Checklist de requisitos: Compras, proveedores y costos

**Purpose**: Revisar claridad, integridad y coherencia de los requisitos antes de convertir el plan en tareas.
**Created**: 2026-10-17
**Feature**: [spec.md](../spec.md)

**Note**: Esta checklist personalizada fue generada por `$speckit-checklist` a partir de la spec y el plan.
**Review Ownership**: La revisión pertenece a quien evalúe los requisitos. Marcar `[x]` solo cuando determine que el criterio de calidad está satisfecho.
**Marker Semantics**: `[x]` indica calidad de requisitos revisada y aceptada; no significa que la funcionalidad esté implementada.

## Integridad del alcance

- [x] CHK001 ¿Están definidos los datos mínimos, la desactivación y la conservación de referencias históricas de proveedores, incluida la posibilidad de reactivación? [Completeness, Spec §FR-002]
- [x] CHK002 ¿Está especificado qué distingue una entrega completa de un borrador y cuándo una ficha de producto creada desde Compras puede publicarse? [Clarity, Spec §FR-003, §FR-005, §FR-006]
- [x] CHK003 ¿Quedan delimitados los gastos adicionales, el costo unitario y el total desembolsado sin confundirlos con costo de ventas o margen? [Consistency, Spec §FR-004, §FR-013, §FR-023]
- [x] CHK004 ¿Son coherentes el alcance de historial promocional condicionado a un mecanismo existente y la exclusión de crear promociones en esta feature? [Consistency, Spec §FR-014, §FR-025]

## Recepción, cantidades y FIFO

- [x] CHK005 ¿Están definidos los datos y condiciones de aceptación de una recepción, incluidos fecha de compra/recepción, variantes repetidas, cantidades y costos límite? [Completeness, Spec §FR-003, Edge Cases]
- [x] CHK006 ¿Se especifica el resultado de reintentos y confirmaciones concurrentes del mismo ingreso, incluso si la intención enviada difiere? [Coverage, Spec §FR-005, Edge Cases]
- [x] CHK007 ¿Se define cómo se evita que la recepción y una edición de stock en Productos contabilicen las mismas unidades dos veces? [Consistency, Spec §FR-008]
- [x] CHK008 ¿Se distingue con claridad stock físico, stock libre y unidades comprometidas antes y después del pago y del consumo físico? [Clarity, Spec §FR-009, §FR-011]
- [x] CHK009 ¿Está determinado el orden FIFO de existencias iniciales, recepciones con igual fecha y cargas tardías sin reabrir ventas pagadas? [Clarity, Spec §FR-010, Clarifications]
- [x] CHK010 ¿Se define la trazabilidad de una línea de venta que consume varias partidas y varios proveedores, incluida la conservación del costo ante cambios posteriores? [Completeness, Spec §FR-010, §FR-011]
- [x] CHK011 ¿Se describen las reglas para liberar exactamente las partidas asignadas cuando una reserva vence o la orden se cancela antes del pago? [Coverage, Spec §FR-011, Edge Cases]
- [x] CHK012 ¿Queda especificado qué ocurre si una variante carece de unidades libres suficientes aunque el saldo físico parezca positivo? [Edge Case, Spec §FR-011, Edge Cases]

## Corte inicial y recuperación

- [x] CHK013 ¿Está definido que el corte incorpora el saldo físico una sola vez sin aumentarlo y enlaza las reservas vigentes, incluso las de órdenes pagadas no consumidas? [Completeness, Spec §FR-009, Clarifications]
- [x] CHK014 ¿Se distingue costo desconocido de costo conocido igual a cero para existencias iniciales y ajustes positivos? [Clarity, Spec §FR-009, §FR-015]
- [x] CHK015 ¿Está definido el tratamiento de ventas pagadas antes de la activación, sin inventar compras, costos ni margen histórico? [Coverage, Spec §FR-009, Edge Cases]
- [x] CHK016 ¿Se especifican los criterios de detención y recuperación si el corte inicial encuentra un saldo inconciliable o se interrumpe parcialmente? [Gap, Spec §FR-009, Plan §Phase 1]
- [x] CHK017 ¿Se documenta cuándo deja de permitirse la edición directa de stock en relación con el corte, para evitar una ventana sin trazabilidad? [Dependency, Spec §FR-008, Plan §Phase 1]

## Ventas, precios e importes

- [x] CHK018 ¿Está fijado el momento único de reconocimiento de venta y costo frente a creación de orden, reserva, pago reiterado y consumo físico posterior? [Consistency, Spec §FR-011, §FR-012]
- [x] CHK019 ¿Se define qué importe de mercadería se usa tras descuentos y cómo se separa del envío cobrado y los gastos de compra? [Clarity, Spec §FR-013]
- [x] CHK020 ¿Se determina cómo atribuir exactamente el importe descontado a partidas/proveedores, incluido el residuo por redondeo y las unidades de origen desconocido? [Measurability, Spec §FR-022, Clarifications]
- [x] CHK021 ¿Queda claro desde qué instante empieza cada vigencia de precio y cómo se representa la ausencia de promoción sin inferir precios anteriores? [Clarity, Spec §FR-014, §FR-025]
- [x] CHK022 ¿Se mantienen separados precio publicado en una fecha, importe efectivamente vendido y costo FIFO de esa venta en requisitos y escenarios? [Consistency, Spec §FR-013, §FR-014, §FR-020]

## Correcciones, anulaciones y devoluciones

- [x] CHK023 ¿Se especifican actor, motivo, fecha, valores anteriores/nuevos y efecto visible para correcciones y anulaciones sin borrar el ingreso original? [Completeness, Spec §FR-016]
- [x] CHK024 ¿Se define cuándo una corrección o anulación se rechaza por ventas, reservas o stock incompatible y cómo se informa el conflicto? [Coverage, Spec §FR-016, Edge Cases]
- [x] CHK025 ¿Están diferenciadas una corrección de carga y una devolución real a proveedor en cantidades, importes y conservación del origen? [Clarity, Spec §FR-016, §FR-017]
- [x] CHK026 ¿Está fijado que aceptar una devolución de cliente revierte costo una sola vez, mientras reintegro y recepción física tienen momentos y efectos distintos? [Consistency, Spec §FR-018, §FR-019, Clarifications]
- [x] CHK027 ¿Son inequívocos los límites acumulados para devoluciones parciales, reintegros parciales o repetidos y recepciones aptas/dañadas? [Coverage, Spec §FR-018, §FR-019, §FR-026, Edge Cases]
- [x] CHK028 ¿Se concilia la cancelación pagada existente con la nueva devolución para impedir doble restitución de stock, costo o dinero? [Conflict, Spec §FR-019, Plan §Phase 1]
- [x] CHK029 ¿Se define qué muestra el margen cuando el costo ya fue revertido pero el reintegro sigue pendiente o se decide no reintegrar? [Clarity, Spec §FR-018, §FR-019]

## Consultas, calidad y dependencias

- [x] CHK030 ¿Están definidos los períodos y la fecha atribuida a compras, ventas, correcciones, devoluciones y reintegros para comparaciones coherentes? [Completeness, Spec §FR-021]
- [x] CHK031 ¿Se especifica cómo se señalan importes parciales y margen indeterminado cuando algunas unidades carecen de costo, también bajo filtros? [Clarity, Spec §FR-023, §SC-004]
- [x] CHK032 ¿Se definen resultados vacíos, errores y estados de espera para las consultas administrativas sin confundir ausencia de datos con falla? [Gap, Spec §FR-020, §FR-021]
- [x] CHK033 ¿Están cubiertos accesos administrativos, información sensible y rechazo de roles no autorizados para todas las consultas y escrituras nuevas? [Coverage, Spec §FR-001, Plan §Constitution Check]
- [x] CHK034 ¿Son medibles SC-005, SC-006 y SC-008 con condiciones de muestra, volumen, período y punto de inicio/fin suficientemente claros? [Acceptance Criteria, Spec §SC-005, §SC-006, §SC-008]
- [x] CHK035 ¿Se documentan las dependencias del corte, el mecanismo de promociones existente y la revisión explícita de esquema/precios antes de implementar? [Dependency, Spec §Assumptions, Plan §Review points before implementation]

## Notes

- Revisión inicial del 2026-10-17: 27/35. Corrección documental y reevaluación del 2026-10-18: 35/35 criterios de calidad de requisitos satisfechos. Las marcas no indican implementación ni pruebas ejecutadas.
- **CHK001/002**: `FR-002` define reactivación con motivo e identidad histórica; `FR-006` condiciona la publicación manual de fichas creadas desde Compras a la recepción confirmada.
- **CHK016/020**: `FR-009` y el plan fijan corte indivisible por variante, reanudación y recuperación; `FR-022` y el modelo fijan reparto exacto de centavos con desempate FIFO.
- **CHK027/028**: `FR-019` y `FR-026` fijan límites acumulados de reintegros/recepciones y una única transición para cancelación pagada antes de salida física; después exigen devolución.
- **CHK032/034**: `FR-020` distingue carga, vacío, error y acceso denegado; SC-005/006/008 fijan muestra, punto de medición y criterio de acierto.
- Marcar `[x]` solo tras revisar que la calidad del requisito correspondiente es suficiente.
- Dejar sin marcar los puntos que aún requieran aclaración, corrección o juicio del revisor.
- `$speckit-implement` lee el estado de esta checklist como puerta de revisión y no modifica marcadores.
- `checklists/requirements.md` tiene un ciclo separado administrado por `$speckit-specify` y `$speckit-clarify`.
- Registrar hallazgos junto al ítem y enlazar el requisito o artefacto corregido.
