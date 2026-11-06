# Quickstart: verificar la feature 008

## Preparación

Backend y frontend en la rama `008-ranking-estadisticas-admin`, con la API en el puerto habitual y el frontend en el 3001 (`npm run dev` en cada uno). Hace falta una cuenta de administrador y otra de vendedor.

## Recorrido

1. **Panel**: entrar como administrador. `/admin` muestra el total, la cantidad y el ticket de los últimos 30 días, con su variación, el detalle web/local, el gráfico diario y el top 5. Al cambiar a «7 días», todo se recalcula.
2. **Coherencia**: comparar el total del panel con `/admin/ventas` para el mismo período (SC-002). Deben coincidir al centavo.
3. **Venta en el local**: registrar una venta en el punto de venta con un producto y una venta rápida. Al volver al panel, el total sube por las dos líneas y el producto aparece en el ranking; la venta rápida no.
4. **Ranking**: en `/admin/ranking`, alternar entre «Cantidad» e «Importe» y aplicar un mínimo de unidades y otro de importe. Filtrar por canal local.
5. **Devolución**: registrar la devolución de una unidad desde la orden. En el ranking, las unidades netas bajan 1 y el importe neto baja el importe devuelto.
6. **Trazabilidad**: cambiar el precio de un producto y abrir «Estadísticas» desde Productos. El gráfico de precio muestra el escalón y abajo aparece el informe de costo y margen.
7. **Acceso**: entrar como vendedor a `/admin/ranking`. Debe redirigir, y la API debe responder 403.

## Comandos

- Backend: `npm test`, con la base descartable configurada por `PANDO_TEST_BRANCH_ID`.
- Frontend: `npm run lint` y `npm run build`.
