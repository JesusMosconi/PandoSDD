# Guía operativa para agentes — PandoCBA

PandoCBA es un e-commerce de ropa organizado en drops.
`backend/` contiene la API Express y Prisma; `frontend/` contiene la aplicación Next.js y su BFF.
La descripción del comportamiento actual está en `docs/estado-actual/`; las reglas para cambios nuevos están en `.specify/memory/constitution.md`.

## Mapa y precedencia

- `backend/`: API, reglas de negocio, Prisma y migraciones.
- `frontend/`: páginas, componentes y rutas BFF de Next.
- `docs/`: estado actual y decisiones documentadas.
- `specs/`: destino de las specs de Spec-Kit
- `.specify/`: plantillas, scripts y constitution de Spec-Kit.
- Antes de editar un repo, leer sus `AGENTS.md` y `CLAUDE.md` si existen. Hoy existen `frontend/AGENTS.md` y `frontend/CLAUDE.md`; este archivo los complementa. Antes de usar APIs de Next 16 cuya disponibilidad sea dudosa, consultar la guía pertinente en `frontend/node_modules/next/dist/docs/`.

## Comandos verificados

Ejecutar cada comando desde la carpeta indicada. En PowerShell usar `npm.cmd` si `npm.ps1` está bloqueado.

| Repo | Instalar | Desarrollo | Build | Lint | Migraciones |
|---|---|---|---|---|---|
| `backend/` | `npm ci` | `npm run dev` (puerto 3000 por defecto) | Sin script | Sin script | Sin script; `postinstall` ejecuta `prisma generate` |
| `frontend/` | `npm ci` | `npm run dev` (puerto 3001) | `npm run build` | `npm run lint` | No aplica |

Para levantar ambos, abrir dos terminales: en una, `cd backend` y `npm run dev`; en otra, `cd frontend` y `npm run dev`. El puerto del backend puede cambiar con `PORT`. Los comandos listados provienen de `backend/package.json`, `frontend/package.json` y `backend/src/index.js`.

## Convenciones para cambios nuevos

- Usar nombres de dominio en español y archivos UTF-8 sin caracteres rotos.
- En Express, envolver handlers asíncronos con `asyncHandler`, validar entradas con `utils/validate.js` y aplicar los middleware de autorización exigidos por la constitution.
- Hacer bajas lógicas con `activo: false`; una baja física requiere justificación en la spec.
- Mantener TypeScript `strict` en frontend; usar Server Components por defecto y `"use client"` solo si hace falta interactividad.
- Aplicar `.specify/memory/constitution.md` al código nuevo o modificado; las diferencias heredadas no autorizan repetirlas.

## Límites estrictos

- Nunca leer ni escribir archivos `.env`; usar únicamente nombres de variables documentados y `.env.example` cuando corresponda. Nunca commitear secretos.
- Nunca editar migraciones ya aplicadas. Para un cambio de esquema autorizado, crear una migración nueva; verificar primero su destino y estado de aplicación.
- No instalar dependencias salvo que la spec lo pida.
- No tocar `backend/prisma/schema.prisma`, autenticación ni cálculo de precios salvo indicación expresa de la tarea y revisión de spec y plan.
- No ejecutar migraciones, seeds ni escrituras sobre servicios externos sin verificar el entorno y la autorización de la tarea.
- No hacer commit ni push salvo pedido explícito, y trabajar siempre en una rama de feature. Hoy dice cómo se organizan los commits, pero no que el agente deba esperar la orden.

## Trabajo con Spec-Kit y tres repositorios

1. Para funcionalidad nueva, seguir `spec` aprobada → `plan` → `tasks` → implementación. Trabajar una tarea por vez.
2. Indicar en cada tarea qué repo y archivos se modifican. Revisar `git status` por separado en `backend/`, `frontend/` y el repo raiz, donde van los cambios de docs y specs; los commits y PRs son por repo.
3. Antes de cerrar cambios de código, correr lint y build del repo afectado si existen como scripts. En frontend: `npm run lint` y `npm run build`. En backend: declarar que no hay scripts de lint ni build; no inventar sustitutos.
4. Si un cambio altera rutas, modelos o flujos ya descritos, actualizar los archivos correspondientes de `docs/estado-actual/` en la misma tarea.

## Puntos delicados

Consultar `docs/estado-actual/08-deuda-y-riesgos.md` antes de tocar autenticación, carrito, catálogo, imágenes o validaciones. Registrar allí las nuevas excepciones heredadas verificadas; no refactorizar código ajeno al alcance solo para cumplir la constitution.
