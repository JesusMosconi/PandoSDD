# Modelo de datos propuesto

## Coleccion / Drop

La entidad `Coleccion` existente sigue siendo la agrupación de productos. Campos actuales relevantes: `id`, `nombre`, `imagenUrl`, `fechaLanzamiento`, `numeroDrop`, `contadorActivo`, `fechaCreado`, `productos`.

| Dato nuevo | Tipo conceptual | Regla |
| --- | --- | --- |
| `fechaFinalizacion` | instante opcional | Mayor que `fechaLanzamiento`; nula significa fin abierto. |
| `tituloInicio` | texto opcional en borrador | Requerido para anunciar/publicar el drop. |
| `textoBotonInicio` | texto opcional en borrador | Requerido para mostrar botón al estar activo. |
| `fechaCierre` | instante opcional | Marca cierre manual o por reemplazo; no se revierte automáticamente. |
| `fechaActivacion` | instante opcional | Se registra una sola vez cuando el trabajo interno activa un lanzamiento elegible. |
| `motivoCierre` | manual/reemplazo, opcional | Distingue cierre definitivo de fin por fecha. |
| `activo` | booleano, predeterminado true | Baja lógica; si false, queda fuera de selección pública. |

`contadorActivo` se descontinúa como fuente de verdad. El plan de migración determinará cómo mapearlo sin atribuir estados falsos a registros existentes; no eliminarlo hasta verificar consumidores y datos.

## Estado derivado

| Estado | Condición principal |
| --- | --- |
| Retirado | `activo=false` (prioridad máxima). |
| Finalizado | Cerrado manualmente/reemplazado o alcanzó `fechaFinalizacion`. |
| Borrador | Sin `fechaLanzamiento`. |
| Futuro | Fecha de lanzamiento posterior al instante actual. |
| Pendiente | Lanzamiento alcanzado, dentro de período, sin producto público disponible. |
| Activo | `fechaActivacion` registrada, dentro de período, disponible y sin cierre. |

El trabajo interno elige el lanzamiento elegible más reciente y, en la misma transacción, registra su activación y cierra al activo anterior por reemplazo. El cierre queda persistido para que no reaparezca si el nuevo se agota. Un drop pendiente puede pasar a activo al recuperar disponibilidad antes de su fin, salvo cierre manual o retiro. En un empate de fecha de lanzamiento, gana el identificador mayor para mantener orden determinista. Las consultas públicas no escriben.

## Pieza de marca

La entidad nueva `ConfiguracionPortadaInicio` tiene un único registro con `id=1`, `titulo` heredado opcional y sin uso visual, `imagenUrl`, `fechaCompletada` opcional y momento de actualización. Se mantiene separada de `Coleccion` y de `ContenidoInicio`, para no asumir unicidad de `seccionNombre="hero"` ni modificar registros heredados sin inventario. Solo se usa públicamente cuando no hay drop activo ni futuro con fecha. La nueva migración `20261024_portada_sin_drops` registra la imagen provista si no hay otra configurada. La presencia de imagen completa la pieza; desde entonces no se permite eliminarla sin reemplazo.

## Producto disponible

Producto asociado a una colección, con `activo=true`, `web=true` y al menos una variante activa cuyo stock efectivo después de reservas sea positivo. La elegibilidad del drop se recalcula con esa misma regla, sin almacenar un contador que pueda quedar desactualizado.

## Integridad y migración

- Una migración nueva añade campos sin borrar `Coleccion`, productos o imágenes actuales.
- Validar fechas, textos, pertenencia de productos y transiciones tanto en la API como en la base cuando corresponda.
- Para datos existentes, inventariar fechas nulas, `contadorActivo`, imagen y contenido hero; definir mapeo por registro antes de aplicar la migración en el entorno destino.
- La imagen inicial de marca fue provista por el usuario y queda versionada en `frontend/public/drops/sin-drops.png`. La habilitación pública exige que la ruta configurada responda con esa imagen o una sustituta gestionada desde Drops.
