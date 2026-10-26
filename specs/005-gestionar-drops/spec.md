# Feature Specification: gestión administrativa de drops

**Feature Branch**: `codex/005-gestionar-drops`
**Created**: 2026-10-24
**Status**: Implementación en curso; imagen de marca provista el 2026-10-24
**Input**: Crear y gestionar drops desde administración; definir su activación, finalización y presentación en Inicio y Categorías.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear y programar drops (Priority: P1)

El administrador prepara varios drops con sus productos, portada, textos y fecha de lanzamiento. Puede revisar los futuros y corregirlos antes de que se publiquen. El próximo lanzamiento se anuncia en Inicio cuando no hay uno activo.

Los productos se asignan a la colección desde la gestión de Productos ya existente. En Drops se ve cuántos productos públicos disponibles tiene cada colección y se ofrece acceso a esa gestión; no se duplica el editor de productos.

**Why this priority**: Permite programar lanzamientos sin cambiar manualmente la portada al llegar el día.

**Independent Test**: Crear dos drops futuros y comprobar que Inicio anuncia el de fecha más próxima, con su imagen, título y cuenta regresiva, sin ofrecer acceso a sus productos antes del lanzamiento.

**Acceptance Scenarios**:

1. **Given** dos drops futuros publicados para anuncio, **When** no existe un drop activo, **Then** Inicio muestra el de lanzamiento más cercano y su cuenta regresiva.
2. **Given** un drop sin activación registrada, **When** un visitante intenta abrir su colección o sus productos mediante enlaces o URLs directas, **Then** no accede a ellos ni puede agregarlos al carrito o confirmar su compra. El administrador conserva la gestión del contenido preparado.
3. **Given** un drop existente, **When** el administrador edita su portada, título o texto del botón, **Then** Inicio presenta los valores propios de ese drop en el estado que corresponda.
4. **Given** una persona sin rol administrativo, **When** intenta crear, editar o finalizar un drop o cambiar la pieza de marca, **Then** la operación se rechaza.

---

### User Story 2 - Activación y finalización automática o manual (Priority: P1)

Un drop se activa automáticamente dentro del minuto siguiente a su fecha de lanzamiento si tiene productos públicos disponibles. Puede tener una fecha de finalización opcional; el administrador también puede finalizarlo manualmente. Un lanzamiento nuevo que sí puede activarse reemplaza al anterior.

**Why this priority**: Evita presentar como vigente una colección sin artículos comprables y hace previsible el cambio de temporada.

**Independent Test**: Programar dos lanzamientos sucesivos, variar la disponibilidad de productos y verificar la transición automática y el cierre manual.

**Acceptance Scenarios**:

1. **Given** un drop futuro con al menos un producto público disponible, **When** llega su fecha de lanzamiento, **Then** se activa y el anterior, si lo había, queda finalizado.
2. **Given** un drop futuro sin productos públicos disponibles, **When** llega su fecha, **Then** no se activa, el administrador ve el motivo y el drop previamente activo conserva su lugar si sigue vigente.
3. **Given** un lanzamiento impedido por falta de productos, **When** recupera disponibilidad antes de su fecha de finalización, **Then** se activa automáticamente y reemplaza al activo anterior.
4. **Given** un drop activo con fecha de fin, **When** llega esa fecha, **Then** deja de estar activo. Si no tiene fecha de fin, continúa hasta su finalización manual o hasta ser reemplazado por un nuevo lanzamiento válido.
5. **Given** un drop finalizado manualmente, **When** vuelve a tener productos disponibles, **Then** no se reactiva automáticamente.

---

### User Story 3 - Presentación de Inicio sin drop vigente (Priority: P2)

Inicio presenta el drop activo; en su ausencia, anuncia el siguiente futuro. Si tampoco hay uno futuro con fecha, presenta una pieza de marca configurable desde el mismo panel de Drops.

**Why this priority**: Inicio conserva una portada intencional aun entre lanzamientos.

**Independent Test**: Pasar por los tres estados y comprobar que cambian imagen, título, botón y cuenta regresiva según corresponda.

**Acceptance Scenarios**:

1. **Given** un drop activo y otro futuro, **When** se abre Inicio, **Then** se presenta siempre el activo con enlace a sus productos y sin cuenta regresiva.
2. **Given** ningún drop activo y al menos uno futuro con fecha, **When** se abre Inicio, **Then** se anuncia el futuro más próximo con cuenta regresiva y sin enlace a sus productos.
3. **Given** ningún drop activo ni futuro con fecha, **When** se abre Inicio, **Then** se muestra la imagen de marca con el mensaje incorporado, sin título superpuesto, botón de colección ni cuenta regresiva.
4. **Given** un administrador, **When** edita la pieza de marca desde Drops, **Then** puede previsualizar y reemplazar su imagen, sin alterar los datos de los drops.

---

### User Story 4 - Mostrar drops relevantes en Categorías (Priority: P2)

Categorías destaca el drop activo o, si no lo hay, el último lanzado que aún tiene productos públicos disponibles. Su lista «Colecciones» muestra los tres drops ya lanzados más recientes.

**Why this priority**: La página evita anunciar lanzamientos futuros como colecciones disponibles y conserva acceso a colecciones anteriores.

**Independent Test**: Preparar drops futuros, activos, agotados y finalizados; verificar la tarjeta destacada y la lista.

**Acceptance Scenarios**:

1. **Given** un drop activo, **When** se abre Categorías, **Then** su tarjeta lo destaca.
2. **Given** ningún drop activo, **When** hay drops anteriores con productos disponibles, **Then** se destaca el lanzado más recientemente entre ellos.
3. **Given** ningún drop anterior con productos disponibles, **When** existe al menos uno lanzado, **Then** se destaca el último lanzado con la indicación «AGOTADO».
4. **Given** al menos cuatro drops lanzados y otros futuros, **When** se abre Categorías, **Then** «Colecciones» enumera los tres lanzados más recientes, sin futuros ni borradores.

### Edge Cases

- Un drop sin fecha de lanzamiento permanece como borrador y no participa en la selección pública ni en la lista de colecciones lanzadas.
- Un drop futuro puede anunciarse aunque aún no tenga productos disponibles; al llegar la fecha solo se activa si ya cumple la regla de disponibilidad.
- No se acepta una fecha de finalización igual o anterior a la de lanzamiento.
- Una activación fallida por falta de productos no finaliza al drop vigente; el panel informa que el lanzamiento está pendiente. Si ya pasó su fecha de fin, no se activa automáticamente.
- Si el drop activo pierde todos sus productos públicos disponibles, deja de presentarse como activo y el panel informa el motivo; puede volver a mostrarse al recuperar disponibilidad si su período sigue vigente y no fue finalizado manualmente.
- Si no existen drops lanzados, Categorías no presenta una tarjeta de drop ni entradas ficticias en «Colecciones».
- Las fechas y horas se muestran e ingresan según la zona horaria indicada en el panel; la comparación de lanzamiento y cierre debe ser consistente para visitantes y administradores.
- Los errores de carga o guardado se explican y no se muestran como cambios confirmados.
- Un proceso interno evalúa lanzamientos y recuperación de disponibilidad al iniciar el backend y al menos una vez por minuto mientras está en servicio; no depende de visitas públicas. Si el servicio estuvo detenido, evalúa pendientes al reiniciarse. Un drop que nunca reunió disponibilidad durante una evaluación no se considera activado históricamente.
- Si falta la imagen de marca, el panel muestra la configuración incompleta. Este estado impide habilitar la funcionalidad en producción hasta cargarla; una vez completa, no se permite eliminarla sin reemplazo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Solo el administrador puede crear, editar, programar y finalizar drops, y configurar la pieza de marca de Inicio.
- **FR-002**: El administrador puede ver en Drops los borradores, futuros, activos, pendientes por falta de productos y finalizados, con fecha, disponibilidad y motivo del estado.
- **FR-003**: Cada drop tiene nombre, portada, fecha de lanzamiento opcional mientras es borrador, fecha de finalización opcional, título de Inicio y texto de botón propios. El identificador o número de drop, cuando exista, se conserva para su presentación.
- **FR-004**: Un drop solo puede activarse si al menos un producto suyo es público y tiene disponibilidad efectiva positiva. La misma definición de disponibilidad se aplica al destacado de Categorías.
- **FR-005**: Con el backend en servicio, los lanzamientos elegibles y la recuperación de disponibilidad se activan sin intervención ni visitas públicas en un máximo de 60 segundos desde que cumplen las condiciones; al reiniciar el servicio se evalúan pendientes. El fin por fecha se refleja en la primera consulta posterior a la hora configurada.
- **FR-006**: La activación válida y registrada de un nuevo drop finaliza al anterior de forma duradera. En cualquier momento hay como máximo un drop activo. Un drop finalizado manualmente no se reactiva solo.
- **FR-007**: Un lanzamiento impedido por falta de productos permanece pendiente, con aviso administrativo, y se activa automáticamente si recupera disponibilidad antes de su fecha de fin y no fue finalizado manualmente.
- **FR-008**: Inicio muestra por prioridad el drop activo, el futuro con lanzamiento más próximo o la pieza de marca. Solo el activo ofrece enlace a su colección; solo el futuro presenta cuenta regresiva.
- **FR-009**: La pieza de marca se gestiona en Drops de forma independiente, con imagen editable y vista previa. La imagen provista incluye logo, mensaje y frase; Inicio no superpone un título visual. La imagen debe estar configurada antes de habilitar la funcionalidad en producción y no puede eliminarse después sin reemplazo.
- **FR-010**: Las portadas de drops y la imagen o logo de la pieza de marca se gestionan desde Drops y dejan de editarse desde el panel general de Imágenes.
- **FR-011**: Categorías muestra el activo o, si no existe, el último lanzado con productos públicos disponibles. Si no hay ninguno disponible, muestra el último lanzado con «AGOTADO»; si no hay lanzados, omite esa tarjeta.
- **FR-012**: La sección «Colecciones» de Categorías contiene como máximo los tres drops ya lanzados más recientes, ordenados por fecha de lanzamiento descendente, sin futuros ni borradores.
- **FR-013**: El administrador puede retirar un borrador o un drop mediante baja lógica, preservando el historial; un drop retirado deja de participar en la selección pública.
- **FR-014**: Las operaciones inválidas, las fechas incoherentes y los errores de guardado se rechazan sin confirmar cambios parciales y se explican en español.
- **FR-015**: La gestión del catálogo de productos destacados de Inicio conserva su funcionamiento actual y queda fuera de este alcance.
- **FR-016**: Drops muestra la cantidad de productos públicos disponibles por colección y un acceso a la gestión de Productos para asignarlos; la edición de fichas de producto se mantiene en su panel actual.
- **FR-017**: Una colección sin activación registrada y sus productos asignados no son accesibles en páginas, lecturas públicas de productos, variantes, imágenes ni catálogo destacado, aunque se conozcan sus URLs o IDs. El carrito y checkout rechazan incorporarlos o comprarlos. Los productos sin colección y las colecciones activadas anteriormente conservan el acceso público conforme a sus demás reglas de visibilidad; la administración puede seguir preparando drops.

### Key Entities

- **Drop**: colección editorial de productos con portada, número opcional, período programado, textos de Inicio, estado y cierre manual o automático.
- **Producto disponible**: producto asignado al drop que cumple las reglas públicas de visibilidad y tiene disponibilidad efectiva positiva.
- **Pieza de marca**: imagen con logo y mensaje incorporados que ocupa la portada de Inicio cuando no hay drop activo ni próximo con fecha.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con el backend en servicio, el 100 % de los lanzamientos elegibles y recuperaciones de disponibilidad de prueba se activan dentro de 60 segundos sin visitas públicas; el 100 % de las primeras consultas posteriores a una fecha de fin reflejan el cierre.
- **SC-002**: En los escenarios de disponibilidad, el 100 % de los drops sin productos públicos disponibles se impide activar y muestra el motivo en el panel.
- **SC-003**: Un administrador puede crear y programar un drop con portada y textos, y reconocer su estado de publicación, en menos de 5 minutos durante la prueba de uso.
- **SC-004**: En los escenarios de Inicio y Categorías, el 100 % de los estados activo, futuro, sin drops y agotado muestran el contenido y los enlaces previstos, sin exponer una colección futura como comprable.
- **SC-005**: En una prueba con al menos cuatro drops lanzados y dos futuros, «Colecciones» muestra exactamente los tres lanzados más recientes en orden correcto.

## Assumptions

- «Drop» y «colección» se refieren a la misma agrupación comercial para esta funcionalidad; la decisión sobre cambios de modelo corresponde al plan.
- El administrador puede preparar drops sin fecha como borradores. La imagen final de marca fue provista por la persona responsable el 2026-10-24.
- La asignación de productos a colecciones conserva la gestión de Productos existente; el panel Drops permite consultarla y acceder a ella.
- El texto «NEW DROP» y el número conservan su función como etiqueta; el título y texto del botón son propios de cada drop. La cuenta regresiva deriva de la fecha, no de un texto editable.
- La disponibilidad pública sigue las reglas vigentes de producto, publicación, variantes y existencias; esta feature no redefine esas reglas ni altera el catálogo destacado de Inicio.
- La baja lógica permite retirar contenido sin borrar su historial. No se necesita borrado físico de drops.

## Repositories and Expected Areas

- **Raíz**: `specs/005-gestionar-drops/`; al implementar, actualizar `docs/estado-actual/` para reflejar los flujos y modelos modificados.
- **`backend/`**: gestión de colecciones, contenido de Inicio, reglas de selección y disponibilidad; evaluar cambios de modelo y migración nueva en el plan. No modificar migraciones aplicadas.
- **`frontend/`**: panel administrativo de Drops, Inicio, Categorías, contratos de datos y paso administrativo autenticado. El plan precisará los archivos afectados.
