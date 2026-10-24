# Investigación: catálogo de Inicio

## D1. Reutilizar la selección existente

**Decisión**: usar `CatalogoInicio` y la lectura pública actual; añadir gestión administrativa.  
**Evidencia**: `backend/prisma/schema.prisma` guarda producto y orden; `backend/src/routes/catalogo-inicio.routes.js` ya filtra la lectura pública por `activo && web`; `frontend/src/app/page.tsx` separa el drop del catálogo. `frontend/src/app/admin/page.tsx` carece de módulo dedicado.  
**Alternativa descartada**: elegir automáticamente productos por colección o ID, ajeno al comportamiento y a la spec.

## D2. Escritura y concurrencia

**Decisión**: la pantalla envía una lista completa de IDs ordenados. El backend valida y cambia la selección como una operación atómica, con un bloqueo transaccional único para este recurso compartido por todas las rutas que escriben `CatalogoInicio`, incluidas las individuales heredadas. El bloqueo debe funcionar aun cuando la selección esté vacía.  
**Motivo**: múltiples PUT sucesivos pueden dejar órdenes parciales o exceder el cupo ante carreras.  
**Alternativa descartada**: confiar solo en restricciones de la interfaz.

## D3. Baja lógica

**Decisión**: añadir `CatalogoInicio.activo` y una unicidad persistente para `productoId`; quitar desactiva y volver a elegir reactiva la fila. Las selecciones activas cuyo producto no es público siguen contando.  
**Motivo**: cumple la constitution y evita duplicados.  
**Alternativa descartada**: repetir el borrado físico heredado.  
**Dependencia**: auditar datos heredados. Duplicados o más de cinco registros requieren conciliación revisada; no se descartan filas automáticamente.

## D4. Visibilidad y acceso

**Decisión**: lectura administrativa con `activo/web` del producto y motivos derivados; lectura pública filtra ambos estados y selección activa. Inicio compacta los visibles. Stock e imagen no redefinen la visibilidad. El navegador administrativo usa BFF y la API exige rol vigente.  
**Motivo**: corresponde a la spec aprobada y a la regla actual `whereProductoVisible`.  
**Alternativa descartada**: llamar a Express directamente desde el navegador con token.
