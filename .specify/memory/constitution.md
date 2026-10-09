# Constitution de PandoCBA

## Core Principles

### I. Arquitectura y separación de responsabilidades

- `backend/` DEBE mantener la API Express y `frontend/` DEBE mantener la aplicación Next.js como repositorios separados.
- La lógica de negocio y el acceso a datos DEBEN residir en el backend. El frontend DEBE presentar y delegar; NO DEBE acceder directamente a PostgreSQL ni usar Prisma.
- Toda operación autenticada nueva del navegador DEBE pasar por el BFF de Next.

Motivo: una sola capa debe decidir reglas de negocio, permisos y persistencia.

### II. Datos y migraciones

- El backend DEBE usar Prisma 7 con `@prisma/adapter-pg` para PostgreSQL.
- Todo cambio de `backend/prisma/schema.prisma` DEBE incluir una migración versionada en `backend/prisma/migrations/`.
- Los nombres nuevos de entidades y campos de dominio DEBEN estar en español.
- Toda baja nueva DEBE ser lógica mediante `activo: false`; una baja física solo se admite si la spec aprobada identifica la entidad y justifica esa decisión.

Motivo: el esquema debe poder evolucionar de forma reproducible sin perder datos por defecto.

### III. API Express

- Cada handler asíncrono nuevo o modificado DEBE envolverse en `asyncHandler` y entregar errores al manejador global; los errores previstos DEBEN responder con el código HTTP correspondiente y un mensaje en español.
- Las rutas nuevas o modificadas NO DEBEN pasar req.body directamente a Prisma; DEBEN construir el objeto de datos con los campos permitidos de forma explícita.
- Ninguna ruta nueva o modificada que escriba datos DEBE omitir `verificarToken`; las rutas administrativas DEBEN usar además `esAdmin`, que DEBE consultar el rol vigente en la base de datos.

Motivo: un manejo uniforme de errores, entradas y permisos reduce comportamientos divergentes.

### IV. Seguridad y cálculo confiable

- El JWT usado por el navegador DEBE permanecer en una cookie `httpOnly` administrada por el BFF de Next; NO DEBE exponerse a componentes cliente ni almacenarse en `localStorage` o `sessionStorage`.
- Los secretos DEBEN leerse de variables de entorno, nunca incorporarse al código; cada variable requerida DEBE figurar por nombre en el `.env.example` del repositorio correspondiente, sin valores secretos.
- Precios, subtotales y totales DEBEN calcularse o verificarse en el backend; NO DEBEN aceptarse valores enviados por el cliente como autoridad.
- Las entradas del usuario DEBEN validarse y normalizarse antes de consultar o persistir; por ejemplo, los emails DEBEN normalizarse a minúsculas.

Motivo: el servidor debe conservar el control de identidad, datos sensibles e importes.

### V. Frontend Next.js

- TypeScript DEBE permanecer en modo `strict`; `any` solo se admite con una justificación local que explique por qué no puede usarse un tipo específico o `unknown`.
- Las páginas y componentes DEBEN ser Server Components por defecto; `"use client"` solo se añade cuando el archivo necesita estado, efectos, eventos o APIs del navegador.
- Las solicitudes del frontend a la API DEBEN usar la capa `frontend/src/lib/api.ts`; los contratos compartidos de respuesta y entidades DEBEN declararse en `frontend/src/types/`.

Motivo: la UI conserva contratos revisables y envía al cliente solo la interactividad necesaria.

### VI. Calidad verificable

- Todo archivo nuevo o modificado DEBE guardarse en UTF-8 y NO DEBE introducir texto con caracteres rotos ni código muerto.
- Antes de cerrar una tarea que modifica un repositorio, su lint DEBE terminar sin errores; si el repositorio carece de script de lint, el cierre DEBE indicar esa limitación.
- La lógica de negocio nueva DEBE acompañarse de tests cuando el repositorio afectado ya cuente con infraestructura de tests. La ausencia actual de esa infraestructura DEBE registrarse como excepción heredada, sin exigir una suite inexistente para una tarea ajena a instalarla.

Motivo: las comprobaciones deben ser ejecutables con las herramientas realmente disponibles.

### VII. Flujo Spec-Driven

- Ninguna funcionalidad nueva DEBE implementarse sin una spec aprobada. El orden obligatorio es spec, plan, tasks e implementación.
- Cada spec DEBE identificar el repositorio y los archivos previstos; el plan DEBE actualizar esa lista si descubre dependencias adicionales.
- Los cambios de esquema, autenticación o precios DEBEN recibir revisión explícita de la spec y del plan antes de implementar.

Motivo: el alcance y las decisiones de mayor impacto deben revisarse antes de tocar código.

## Restricciones de aplicación

Esta constitution es normativa para código nuevo o modificado desde su ratificación. Un incumplimiento anterior NO DEBE provocar un refactor por sí solo: se corrige cuando una tarea autorizada toca esa zona o cuando una spec lo pide. La revisión de una tarea DEBE comprobar los principios aplicables al alcance modificado y registrar toda excepción nueva con justificación en su spec.

## Flujo de trabajo

La spec aprobada fija alcance y repositorios; el plan define decisiones técnicas; `tasks.md` ordena el trabajo; la implementación ejecuta esas tareas. Antes de cerrar, se DEBEN revisar los cambios contra esta constitution, ejecutar el lint disponible y documentar qué validaciones se realizaron y cuáles quedaron sin verificar.

## Governance

Esta constitution prevalece sobre guías de implementación cuando ambas se contradicen. Para enmendarla se DEBE proponer el texto y su motivo, revisar el impacto en specs y código afectado, obtener aprobación explícita y registrar versión y fecha de modificación. Se usa versionado semántico: MAJOR para eliminar o redefinir reglas de forma incompatible, MINOR para añadir reglas o secciones, PATCH para aclaraciones sin cambio normativo. Las excepciones heredadas no modifican la vigencia de estas reglas para trabajo nuevo.

**Version**: 1.0.0 | **Ratified**: 2026-10-09 | **Last Amended**: 2026-10-09

## Excepciones heredadas

Las diferencias preexistentes y la ausencia de infraestructura de tests están registradas únicamente en `docs/estado-actual/08-deuda-y-riesgos.md`.
