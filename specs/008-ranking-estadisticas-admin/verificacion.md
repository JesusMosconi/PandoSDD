# Verificación: feature 008

## Bases

- Ramas `008-ranking-estadisticas-admin` creadas el 2026-11-06:
  - backend desde `main` (`ff7e3c3`, con la 007 integrada);
  - frontend desde `master` (`ef1e1be`);
  - PandoSDD desde `master` (`b31f8d4`).
- Spec, plan y tareas aprobados en conversación el 2026-11-06 (constitution VII).

## Backend

- `node --test test/estadisticas.test.js`: 3 pruebas de validación pasan (filtros, ranking y período anterior). Las 4 de base se omiten porque `PANDO_TEST_BRANCH_ID` no está configurado en este entorno.
- `npm test` completo, con y sin los cambios: los mismos 37 fallos preexistentes. Son pruebas que llaman a `exigirBasePrueba()` sin estar condicionadas, y `DATABASE_URL` no apunta a una base de prueba. Ninguna falla nueva.
- 2026-11-06, contra la base de prueba `ep-fancy-queen-acudbg1e` (datos ficticios, con `PANDO_TEST_BRANCH_ID=ep-fancy-queen-acudbg1e`):
  - Antes se regeneró el cliente Prisma (`prisma generate`) y, con autorización, se aplicó la migración pendiente `20261029_pagos_envio_tesis` (de la 006, solo agrega estructura).
  - `test/estadisticas.test.js`: **7/7 pasan**. Quedan validadas las consultas SQL de ranking, panel, serie diaria y trazabilidad.
  - Suite completa: 143 tests, 102 pasan, 28 fallan y 13 se omiten. Ninguna falla toca la 008. Todas son del entorno:
    - 25 por el corte de inventario sin activar en esa base (`VARIANTE_SIN_CORTE`, `VARIANTE_HEREDADA`);
    - 2 de checkout y pagos de la tesis, que exigen la rama `br-holy-flower-achmzkpy`;
    - 1 de checkout concurrente (`checkout.test.js:84`): ninguna de las dos compras se confirma. Es probable que también sea por el corte de inventario.

## Frontend

- `npm run lint`: 0 errores. Las 13 advertencias son preexistentes (`no-img-element` en otros archivos).
- `npm run build` (Turbopack): correcto. Genera `/admin/ranking` y `/admin/productos/[id]`.
- Paleta de los gráficos (`#2a78d6`, `#eb6834`) validada en modo claro: separación para daltonismo ΔE 24,7, visión normal ΔE 33,6 y contraste ≥ 3:1.
- Menú lateral (US4): `tsc`, lint (0 errores) y build correctos.
- Rediseño del Inicio (T015): `tsc`, lint (0 errores) y build correctos. Backend: `test/estadisticas.test.js` 8/8 contra `ep-fancy-queen-acudbg1e`, con el test nuevo de pendientes.

## Recorrido visual (2026-11-06)

Se hizo con Chrome automatizado (puppeteer-core, fuera del repo), con backend y frontend locales contra `ep-fancy-queen-acudbg1e`. Se usó un admin temporal (`recorrido-008@example.invalid`) que al final quedó desactivado, sin rol admin y con una contraseña inválida. No se pudo borrar por registros relacionados. Las capturas no se versionan.

- **Sin sesión**: `/admin/ranking` redirige a `/login`.
- **Escritorio (1440 × 900)**:
  - El Inicio aparece a ancho completo, con el menú lateral, «Para atender» (tarjetas con contador y «Al día», caja y stock crítico) y las ventas: indicadores, barras apiladas, reparto por canal, devoluciones y más vendidos. El período «7 días» recarga los datos.
  - Ranking: filtros, top en barras y tabla con «Estadísticas».
  - Trazabilidad: totales, gráficos, canal, variante, historial de precios e informe de costo.
  - Órdenes: atajos, estados con nombre y color, total en cada fila. «Ver y gestionar» despliega el detalle bajo la fila y desplaza la vista hasta ella. `?estado=pago_confirmado` aplica el filtro y muestra el estado vacío con «Ver todas».
  - Cuenta: el ojo cambia el campo a texto.
- **Celular (390 × 844)**: el menú plegable abre y cierra. Inicio, Órdenes, Ranking, Trazabilidad, Ventas, Productos y Compras no se desbordan horizontalmente: las tablas anchas se desplazan dentro de su contenedor.
- **Consola**: 0 errores de página.

Correcciones hechas durante el recorrido:
1. **Gráfico de precios**: el eje Y repetía «$10 k» con un precio estable. Ahora el eje arranca en 0, y el promedio cobrado se muestra como puntos que no tapan el precio publicado.
2. **Abreviatura de importes**: Intl mezclaba «k» y «K». Ahora `dineroCompacto` es propia: «$7,5 k», «$1,2 M».
3. **Órdenes**: el desplazamiento iba al detalle y dejaba la fila de la orden bajo el encabezado. Ahora va a la fila.
4. **Inicio y Trazabilidad en celular**: había desborde horizontal porque las grillas no tenían columnas definidas y las tablas o nombres largos las estiraban. Se agregó `grid-cols-1` y `min-w-0`.
5. **Inicio en celular**: las tarjetas de pendientes van de a dos por fila, y las que están en cero se compactan.
