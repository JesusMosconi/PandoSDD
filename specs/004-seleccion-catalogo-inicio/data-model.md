# Modelo de datos: catálogo de Inicio

## Entidades

**Producto** (existente, sin cambios previstos): `id`, `activo`, `web`, `coleccionId`. Un producto es público si `activo && web`; la colección no restringe su elección.

**CatalogoInicio** (existente, extensión prevista): `id`, `productoId`, `orden` y nuevo `activo`. `productoId` identifica un producto de forma única entre filas activas e inactivas, para reactivar la misma entrada. `orden` representa la posición de una fila activa; la posición de una inactiva es histórica.

## Invariantes

1. Hay de cero a cinco filas `CatalogoInicio.activo=true`, incluidos productos no públicos.
2. Los productos activos no se repiten y las posiciones activas son 1..N sin empate. El backend valida estas reglas bajo la misma exclusión para todas las escrituras; unicidad de producto es defensa persistente.
3. Un cambio de `Producto.activo/web` no altera su selección. El motivo de ocultamiento se deriva al leer, sin duplicarlo en `CatalogoInicio`.
4. La consulta pública devuelve solo filas activas de productos públicos, en orden relativo; las tarjetas no reservan huecos.
5. La sustitución de la lista es indivisible: se conserva toda la selección previa o se confirma toda la nueva.

## Transiciones

- **Agregar**: crear o reactivar fila, asignar posición válida y comprobar límite.
- **Quitar**: marcar `activo=false` y compactar las restantes.
- **Reordenar**: mantener membresía y reasignar posiciones 1..N de forma atómica.
- **Ocultar/publicar producto**: cambia solo `Producto`; la selección se conserva y reaparece en su lugar cuando vuelve a ser público.

## Datos heredados

La migración nueva añade `activo` inicialmente verdadero y unicidad de `productoId`. Antes de aplicarla, verificar IDs repetidos, más de cinco filas y órdenes ambiguos en un destino autorizado. Si existen, detenerse y definir conciliación con la persona responsable; no inferir cuál conservar. No se editan migraciones aplicadas.
