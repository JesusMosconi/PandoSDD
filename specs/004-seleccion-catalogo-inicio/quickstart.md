# Validación: catálogo de Inicio

Implementación en las ramas `codex/004-seleccion-catalogo-inicio` de raíz, backend y frontend. Los cambios locales previos permanecen en sus checkouts originales.

## Preparación

1. Aislar 004 en ramas de raíz, backend y frontend, conservando cambios locales previos.
2. Revisar migración nueva. En base aislada autorizada, verificar destino, esquema, estado de migraciones y filas heredadas antes de aplicar. Si hay duplicados, más de cinco filas u órdenes ambiguos, detenerse para conciliar.
3. Configurar el entorno sin leer ni publicar secretos. Levantar los servidores según `AGENTS.md` solo con destino autorizado.

## Recorrido

1. Seleccionar productos de distintas colecciones; comprobar orden y que el drop no determina la selección.
2. Reordenar, quitar y reincorporar. Verificar primera tarjeta grande, siguientes pequeñas y ausencia de duplicados.
3. Llenar cinco cupos; probar sexto, duplicado e IDs inválidos. Confirmar mensaje y estado previo intacto.
4. Ocultar por `activo=false`, `web=false` y ambos. Administración conserva la entrada con motivo y cupo; Inicio la omite y compacta. Restaurar visibilidad y comprobar posición original.
5. Probar lista vacía, todos ocultos, fallo de carga y de guardado, y reintento sin éxito falso.
6. Probar lectura/escritura sin sesión y sin rol administrador (401/403), más escrituras concurrentes: nunca más de cinco ni orden ambiguo.

## Comprobaciones al implementar

- Backend: `node --test test/catalogo-inicio.test.js` con `PANDO_TEST_CATALOGO=1`, `PANDO_TEST_BRANCH_ID=br-snowy-glitter-acxy36q0` y la conexión autorizada a Prueba. La prueba crea datos ficticios, restaura la selección original y limpia sus filas. No hay scripts de lint ni build.
- Frontend: `npm.cmd run lint` y `npm.cmd run build` desde `frontend/`.
- `git diff --check` y `git status` en raíz, backend y frontend. Registrar resultados reales; lint/build no sustituyen el recorrido visual.

## Resultado del 23 y 24/10/2026

- Destino verificado en Neon: proyecto `PandoCba` (`frosty-surf-47961615`), rama `Prueba` (`br-snowy-glitter-acxy36q0`), compute `ep-floral-dust-acglee71`, base `neondb`, esquema `public`. La rama predeterminada es `production`, distinta de Prueba.
- Preflight: 12 migraciones aplicadas, ninguna incompleta; 2 filas de `CatalogoInicio`, con `productoId` distintos y órdenes 1 y 2. La única migración pendiente era `20261023_catalogo_inicio_seleccion`.
- `prisma migrate deploy` aplicó esa migración en Prueba y `prisma migrate status` confirmó 13 migraciones al día. Se regeneró Prisma Client.
- La prueba específica pasó: 0/1/5, colecciones distintas, orden, baja y reactivación, duplicados, sexto producto, entradas inválidas, 401/403, rutas individuales, visibilidad por `activo` y `web`, recuperación del orden y escrituras simultáneas. La selección original quedó restaurada.
- Frontend: `npm.cmd run lint` pasó con 9 advertencias heredadas de `<img>`; `npx.cmd tsc --noEmit` pasó; `npm.cmd run build -- --webpack` pasó. Se usó Webpack porque Turbopack no admite los `node_modules` enlazados del worktree aislado.
- Recorrido en navegador local: Inicio cargó desde la API conectada a Prueba, mostró la sección CATÁLOGO y la primera selección visible como tarjeta grande. En el panel administrativo, una sesión local temporal permitió comprobar la selección 2/5, el aviso del producto inactivo, el reordenamiento y la incorporación de otro producto oculto al borrador. Se descartó el borrador sin guardar cambios.
- Una ejecución fallida de la prueba había dejado seis productos y una colección ficticios antes de corregir la consulta de bloqueo. Se eliminaron exactamente esos registros temporales y se reforzó la limpieza de la prueba. La consulta final en Prueba dio 0 productos temporales, 0 colecciones temporales y selección activa original `1:1,14:2`.
- La prueba final añadió el caso de elegir un producto que ya estaba oculto y pasó (1 prueba, 0 fallos). La prueba vuelve a restaurar la selección y limpiar sus datos temporales.
- `git diff --check` pasó en los tres repositorios. Durante esta validación no se hicieron commits, push ni despliegues.

## Migración de producción — 24/10/2026

- Destino confirmado en Neon: proyecto `PandoCba` (`frosty-surf-47961615`), rama `production` (`br-bitter-firefly-acgi1ey3`), compute `ep-raspy-breeze-aclw045d`, base `neondb`, esquema `public`.
- Preflight de solo lectura: 12 migraciones aplicadas, ninguna incompleta, `CatalogoInicio` con 0 filas y sin columna `activo`. La lista de migraciones coincidía con las 12 anteriores a la 004; Prisma confirmó que `20261023_catalogo_inicio_seleccion` era la única pendiente.
- Con autorización expresa para producción, `prisma migrate deploy` aplicó la 004. `prisma migrate status` confirmó 13 migraciones al día. Una consulta de solo lectura verificó la migración registrada, la columna `activo`, el índice `CatalogoInicio_productoId_key` y 0 filas en el catálogo.
- No se ejecutaron seeds, selección de productos, despliegues, commits ni push. El catálogo público de producción continuará vacío hasta que se publique el código y un administrador seleccione productos.
