# Cobertura de envío simulado

Decisión expresa del usuario, 2026-10-29: «Elegir Córdoba Capital y exigir revisión de la dirección por el administrador antes del envío simulado».

- Retiro: sin costo de envío ni dirección obligatoria.
- Envío: selección expresa de Córdoba Capital; tarifa fija ARS 15.000 por orden, sin diferencia por barrio o cantidad de artículos.
- Normalizar espacios, mayúsculas y acentos en la selección `Córdoba Capital`. `Córdoba` sola, otra localidad, otra provincia o un valor desconocido no equivalen a la selección expresa.
- El código postal se almacena y valida en formato, sin utilizar listas de códigos, prefijos ni afirmaciones geográficas automáticas.
- Administración revisa calle y altura y registra actor/fecha antes de permitir `enviada`. En la tesis esa transición es simulada y no implica envío físico.
- Una dirección fuera de Capital declarada incorrectamente no queda geográficamente validada por seleccionar Capital; la revisión administrativa debe impedir su despacho simulado.

Decisión del 2026-11-09: el checkout muestra Córdoba Capital como ciudad fija al elegir envío, sin selector de localidades ni entrada editable. El cliente ve antes de confirmar que el administrador verificará la dirección y que una dirección fuera de Capital requiere cancelar el pedido o coordinar retiro. El backend conserva la validación de cobertura para solicitudes directas. La conversión de una orden de envío ya creada a retiro no está implementada; para registrar retiro se cancela y se crea una orden nueva.

Se descartó la lista postal como condición automática por decisión del usuario. No se presenta el listado bancario encontrado durante la investigación como una fuente postal municipal completa.
