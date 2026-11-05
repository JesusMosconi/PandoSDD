# Quickstart: validar vendedor y venta en local

Guía para la fase de implementación y verificación. No autoriza migraciones, seeds ni despliegues. Ejecutar únicamente contra una **base descartable** (rama `Prueba` de Neon o PostgreSQL local), verificada por la persona responsable. El agente no lee ni escribe archivos `.env`.

## Preparación

1. Backend en la rama `007-vendedor-venta-local`, con `npm ci`. La persona responsable aplica la migración `20261029_vendedor_venta_local` en la base descartable después de revisarla.
2. Frontend en la rama `007-vendedor-venta-local`, con `npm ci`.
3. Levantar el backend con `npm run dev` (puerto 3000) y el frontend con `npm run dev` (puerto 3001).
4. Datos de prueba:
   - Un admin y un usuario de prueba para convertirlo en vendedor.
   - Un producto A con `web=true` y `local=true`, un producto B con `web=false` y `local=true` (solo local) y un producto C con `web=true` y `local=false` (solo web).
   - Variantes con stock conocido.

## Pruebas automáticas (backend)

```text
npm test   # incluye la suite existente y los nuevos archivos de venta local, caja y roles
```

Resultados esperados:

- Las suites 002, 003 y 005 siguen en verde, incluido el refactor de `reserva-fifo.js`.
- La venta local crea una orden `entregada` con asignaciones `vendida`, la reserva `consumida`, el stock físico decrementado una vez y movimientos `salida_venta`.
- En concurrencia web contra local por la última unidad, solo una operación tiene éxito (SC-002).
- Dos confirmaciones con la misma clave dan una sola orden y el mismo comprobante (SC-003).
- Una venta concurrente con el cierre de caja queda dentro de la caja o se rechaza con `CAJA_NO_ABIERTA`.
- Dos aperturas simultáneas dan una sola caja abierta.
- Asignar un segundo vendedor activo responde `409 VENDEDOR_EXISTENTE`.
- El resumen por canal suma exactamente el total (SC-004). El esperado de caja es igual al inicial más el efectivo (SC-005).

## Recorrido manual

1. **Admin**: en Clientes asigna el rol vendedor al usuario de prueba. Intenta asignarlo a otro y el sistema lo rechaza.
2. **Admin**: en Productos verifica la columna y el filtro Local, y deja B como «solo local».
3. **Vendedor**: inicia sesión y llega a `/vendedor`. Intenta entrar a `/admin` y lo redirige; intenta entrar a `/checkout` y lo rechaza (SC-006).
4. **Vendedor**: sin caja abierta, la confirmación está bloqueada con el aviso «Abrí la caja». Abre la caja con $10.000.
5. **Vendedor**: busca y ve A y B, pero no C (SC-007). Confirma que la tienda web no muestra B.
6. **Vendedor**: arma 2 × A, agrega una venta rápida «Pulsera» de $3.000 (dos toques más el importe), carga el nombre `Ana` y el teléfono `351 555-1234` (opcionales) y elige efectivo. Confirma, ve el comprobante n.º N y lo imprime. Mide el tiempo de una venta de 3 ítems (SC-001, menos de 90 s).
7. **Vendedor**: registra una venta con débito sin datos del cliente, que se confirma, y luego intenta una con teléfono `12`, que se rechaza.
8. **Vendedor**: en Ventas busca por nombre o teléfono y reimprime el comprobante con los mismos datos.
9. **Vendedor**: cierra la caja declarando el efectivo contado y verifica el esperado, la diferencia y los totales por medio. Con la caja cerrada, una nueva venta pide abrir caja.
10. **Admin**: en `/admin/ventas` ve el período separado web/local y por medio. En Órdenes filtra por canal local. Ve la caja cerrada en el historial.
11. **Admin**: registra la devolución de una venta del local con el flujo existente y verifica que el cierre de la caja no cambia.

## Cierre

- Frontend: `npm run lint` y `npm run build` sin errores.
- Backend: declarar que no tiene scripts de lint ni build.
- Registrar la evidencia en `specs/007-vendedor-venta-local/verificacion.md` y actualizar `docs/estado-actual/`.
