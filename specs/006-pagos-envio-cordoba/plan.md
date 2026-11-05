# Implementation Plan: Pagos y envío Córdoba Capital

**Branch**: `codex/006-pagos-envio-cordoba` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Demostrar pagos de prueba con Mercado Pago de productos más $15.000 de envío simulado únicamente en Córdoba Capital, sin operaciones monetarias reales.

## Summary

El backend calculará cobertura, tarifa y total antes de crear la orden y los guardará como valores históricos. Checkout Pro de Mercado Pago simulará el pago del total usando exclusivamente credenciales y tarjetas de prueba cuando la función de demostración esté habilitada. Un intento persistido e idempotente vinculará cada operación externa de prueba con una orden local. La confirmación exige consultar el resultado remoto; un trabajo periódico conciliará intentos abiertos aunque el cliente no vuelva. Se preservan órdenes manuales y envíos heredados sin cotizar. Los reintegros de envío/incidencias complementan, sin duplicar, los reintegros de mercadería existentes y se representan como simulados.

## Technical Context

**Language/Version**: Node.js ESM/JavaScript en backend; TypeScript strict en frontend.

**Primary Dependencies**: Express 5, Prisma 7, PostgreSQL, Next.js 16.2, React 19; Orders API mediante `fetch` del runtime, sin instalar dependencias.

**Storage**: PostgreSQL existente; migración aditiva con intento, incidencia y reintegro de pago.

**Testing**: Backend `npm.cmd test` contra base aislada; frontend `npm.cmd run lint` y `npm.cmd run build`; compras de prueba en Mercado Pago.

**Target Platform**: Entorno aislado de demostración con backend y frontend accesibles por HTTPS; sin conectar credenciales ni datos de producción.

**Project Type**: Tres repositorios: raíz docs/specs, backend API, frontend web/BFF.

**Performance Goals**: Resumen sin llamada externa; inicio de pago con error recuperable; ejecución del conciliador cada cinco minutos como objetivo operativo, con medición del atraso real y alerta si no se ejecuta.

**Constraints**: ARS con centavos exactos; reserva de 24 horas desde creación; sin datos de tarjeta en PandoCBA; solo Córdoba Capital; preservar datos históricos.

**Scale/Scope**: Un comercio, una cuenta de Mercado Pago, una tarifa fija por orden, sin cálculo por distancia ni logística automática.

## Constitution Check

| Regla | Decisión |
|---|---|
| Arquitectura/BFF | Negocio en backend; navegador usa BFF autenticado. |
| Datos | Migración nueva aditiva, tras verificar destino y estado; migraciones aplicadas intactas. |
| Rutas de escritura | Cliente/admin usan `verificarToken` y autorización. No se crea webhook público de escritura; conciliación mediante trabajo interno. |
| Seguridad/importes | Total de servidor y orden persistida son autoridad; secretos solo en backend y variables documentadas por nombre. |
| Frontend | Contratos tipados y consulta de docs instaladas de Next 16 antes de APIs dudosas. |
| Calidad | Tests backend, lint/build frontend y compras simuladas de extremo a extremo. |
| SDD | Spec y plan revisados antes de tasks e implementación, incluidos esquema y precios. |

**Gate inicial y posterior al diseño**: pasan con la conciliación periódica. Un webhook público firmado reduciría latencia, pero exigiría aprobar una excepción o enmienda de la regla de `verificarToken`. La programación y supervisión del trabajo de conciliación son condiciones para demostrar el flujo completo.

## Project Structure

### Documentation (this feature)

```text
specs/006-pagos-envio-cordoba/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/pagos-envio.md
└── tasks.md                 # fase siguiente
```

### Source Code (three repositories)

```text
backend/prisma/schema.prisma
backend/prisma/migrations/<nueva_migracion>/
backend/src/services/{checkout,ordenes,devoluciones,pagos,cobertura-envio}.js
backend/src/services/mercado-pago.js
backend/src/services/{configuracion-pagos,administracion-pagos}.js
backend/src/routes/{checkout,ordenes,admin-ordenes,pagos}.routes.js
backend/src/jobs/{vencer-ordenes,conciliar-pagos}.js
backend/src/index.js
backend/.env.example
backend/scripts/entorno-tesis.mjs # ingreso local temporal de credenciales y prevalidación de solo lectura
backend/scripts/{acciones-tesis,verificar-proveedor-tesis,programar-conciliacion-tesis}.mjs
backend/scripts/prisma-tesis.config.ts
backend/test/{checkout,ordenes-admin,ordenes-cliente,vencimiento,devoluciones,inventario-fifo,pagos,pagos-conciliacion}.test.js
backend/test/{cobertura-envio,mercado-pago}.test.js # pruebas puras de cobertura y transporte, sin credenciales
backend/test/{checkout-cotizacion,pagos-integracion}.test.js
backend/test/soporte/escenario.js # par explícito de rama/host de tesis y limpieza de registros propios
frontend/src/components/{CheckoutPanel,MisOrdenes}.tsx
frontend/src/components/AdminOrdenes.tsx
frontend/src/components/PagoOrden.tsx
frontend/src/app/api/checkout/{resumen,confirmacion}/route.ts
frontend/src/app/api/ordenes/[id]/pagos/route.ts
frontend/src/app/api/ordenes/[id]/pago/route.ts
frontend/src/app/api/admin/[...ruta]/route.ts
frontend/src/types/orden.ts
root/docs/estado-actual/{02-modelo-de-datos,06-flujos-de-negocio,08-deuda-y-riesgos}.md
```

**Structure Decision**: Mantener tres repositorios y negocio en backend. `tasks.md` concretará archivos; no mezclar cambios locales ajenos de raíz/backend.

## Delivery Sequence

1. Verificar ramas y base aislada. Aplicar la decisión del 2026-10-29: selección expresa de Córdoba Capital, código postal solo como dato de dirección y revisión administrativa antes del envío simulado.
2. Añadir cobertura/tarifa a resumen, huella y confirmación tras una bandera de activación deshabilitada por defecto; persistir costo y total exactos solo al habilitar el flujo nuevo y mantener semántica manual mientras esté apagado.
3. Crear migración aditiva, intento e incidencia. Persistir intento y clave idempotente antes de llamar al proveedor; no mantener transacción de BD durante llamada externa.
4. Crear inicio autenticado y conciliación periódica. Verificar cuenta, referencia, moneda, importe y estado externos antes de reconocer venta FIFO una vez bajo bloqueo.
5. Adaptar vencimiento, cancelación, despacho y administración. A `venceEn`, cancelar y liberar como hoy aun si el proveedor no responde; después conciliar y tratar cualquier cobro como incidencia, sin reactivar stock. Bloquear pago manual sobre orden online, exigir revisión registrada del domicilio antes de `enviada` y registrar reintegro de dinero sin duplicar el de productos.
6. Adaptar BFF/UI para total, pagar/reintentar y estados; el retorno del proveedor solo abre la orden.
7. Validar tests, lint/build, carreras y compras de prueba. Preparar esquema, backend y frontend en entorno aislado; habilitar solo la demostración con credenciales de prueba tras verificar cobertura y conciliador. Bloquear credenciales de producción.

## Risks and Decisions

- La selección de Córdoba Capital es declarativa; administración debe revisar calle/altura antes de la transición de despacho simulado. El código postal no determina cobertura.
- La vigencia externa se deriva del tiempo restante de reserva; nunca se añaden 24 horas por reintento.
- Pago, vencimiento y cancelación compiten por orden y stock; se serializan con bloqueo y condiciones de estado.
- La consulta remota se hace fuera de transacciones de BD. A `venceEn`, la reserva deja de contar incluso si la red falla; un resultado desconocido se registra y se reconcilia, sin retención ficticia de stock.
- La cancelación local de una orden pendiente no espera al proveedor. Se intenta cancelar la orden externa; si luego se acredita, se abre incidencia y obligación de reintegro.
- El trabajo periódico requiere programación externa verificada y monitoreo; si falla, no debe confundirse pendiente con pagado.
- `devoluciones.js` hoy trata importes de productos. El nuevo registro cubre envío o pagos sin venta y se concilia con los reintegros de productos para mostrar un saldo monetario único. Antes de salida, una cancelación total incluye envío; después de salida, una devolución parcial usa el flujo de productos y cualquier reintegro de envío requiere decisión y motivo explícitos.
- El entorno de tesis exige credenciales de prueba, base aislada y migración autorizada solo en esa base. La aplicación rechaza credenciales de producción y no ejecuta cobros, reintegros ni despachos reales.

## Alcance obligatorio de tesis

Todos los estados de venta, salida, devolución y reintegro descritos representan operaciones simuladas en una base aislada. Se permite ensayar `enviada` sin efectuar un despacho físico. Se suprimen efectos externos de correo para las órdenes de demostración; la deduplicación de eventos se verifica con un transporte simulado. No se contratan servicios ni planes pagos: demostración local y recursos gratuitos existentes; si un recurso exige pago, se usa ejecución local equivalente y se documenta la limitación.

Las credenciales de prueba se verifican mediante el procedimiento oficial vigente y la identidad de la aplicación/cuenta de prueba. No se deduce su entorno por el prefijo del token. Ante imposibilidad de acreditar el entorno, el pago queda bloqueado. Las respuestas del proveedor deben identificarse como prueba antes de aplicar sus resultados.

### Archivos de soporte incorporados durante implementación

- `backend/.codex-006/scripts/probar-reintegros-tesis.mjs`: prepara/restaura la precondición sintética de inventario activo para las suites heredadas opcionales, con guarda de rama/host explícita. No ejecutarlo en paralelo con otras suites.
- `backend/.codex-006/.github/workflows/conciliar-pagos-prueba.yml`: disparo manual optativo, sin activación remota ni carga de secretos durante esta implementación.
- `backend/.codex-006/test/pagos-integracion.test.js`: concentra escenarios transaccionales de conciliación, vencimiento y reintegros en PostgreSQL aislado. El reconocimiento de venta admite una dependencia interna para inducir fallos locales sin alterar restricciones ni tablas; ninguna ruta admite esa dependencia desde la entrada HTTP.

La revisión visual incorporó `frontend/src/components/CarritoPanel.tsx` al alcance: sustituir la leyenda heredada que prometía coordinar el envío por una indicación de revisar entrega y costo en checkout. En checkout online incompleto se informa validación pendiente de Córdoba Capital; el texto manual de coordinación se conserva solo para órdenes del flujo heredado.

Se agregan al plan `backend/scripts/preparar-demo-tesis.mjs` y `specs/006-pagos-envio-cordoba/retorno-prueba/`: fixtures de UI exclusivos de la rama de tesis y puente estático de retorno para la demostración local. El puente solo conserva la orden solicitada; el BFF consulta dueño y estado real. Publicarlo requiere autorización separada; no contiene secretos ni acceso a datos.
