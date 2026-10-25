# Quickstart: validar notificaciones por correo (fase 1)

Guía de validación. Contratos en [contracts/notificaciones.md](contracts/notificaciones.md); reglas en [data-model.md](data-model.md).

## Prerrequisitos

- Backend y frontend en la rama `004-notificaciones-email`.
- Base de desarrollo o de prueba aislada; **nunca** la de producción.
- Para la parte con envío real: una cuenta de Resend y una API key. Sin dominio verificado, solo llegan los correos dirigidos al correo dueño de esa cuenta.
- Variables en el `.env` local del backend (por nombre; ver `.env.example`): `EMAIL_TOKEN_SECRET`, `FRONTEND_URL=http://localhost:3001`, `EMAIL_CONTACTO`; y `RESEND_API_KEY` solo en la parte B.

## 1. Tests automáticos

```powershell
cd backend
npm.cmd test
```

Esperado: pasan `test/notificaciones.test.js` (token, normalización, plantillas, envío con `fetch` simulado), `test/suscripciones.test.js` (creación, 409, reactivación, carrera, baja idempotente) y la suite existente sin regresiones. `suscripciones.test.js` exige la base de prueba de `exigirBasePrueba()`; si no está disponible, anotarlo en `verificacion.md`.

```powershell
cd frontend
npm.cmd run lint
npm.cmd run build
```

Backend: sin scripts de lint ni build (declararlo).

## 2. Parte A: modo registro (sin `RESEND_API_KEY`)

Levantar `npm run dev` en ambos repos.

| Paso | Esperado |
|---|---|
| Registrarse en `/login` con `Prueba@Ejemplo.com ` | Cuenta creada y sesión iniciada. En la consola del backend aparece `[email:modo-registro] tipo=bienvenida para=p***@ejemplo.com`. |
| Cerrar sesión y entrar con `Prueba@Ejemplo.com` | Login correcto (D6). |
| Registrarse otra vez con `prueba@ejemplo.com` | 409 «El email ya está registrado»; sin registro de correo. |
| Cambiar la contraseña en `/cuenta` | Confirmación como hoy; registro `tipo=cambio_password`. |
| Cambiar con contraseña actual incorrecta | 401 como hoy; sin registro de correo. |
| Suscribirse desde el footer | «¡Listo!…»; registro `tipo=suscripcion`. |
| Suscribirse otra vez con el mismo correo | «Este correo ya está suscripto»; sin registro de correo. |

## 3. Parte B: envío real con Resend

Configurar `RESEND_API_KEY` y usar como correo de prueba el **dueño de la cuenta de Resend**. Reiniciar el backend.

| Paso | Esperado |
|---|---|
| Registrarse | Llega «Bienvenido/a a PandoCBA» con el nombre; «Ver catálogo» abre `/categorias` y «Mi cuenta» abre `/cuenta`. |
| Cambiar la contraseña | Llega el aviso con fecha y hora de Córdoba y el contacto; no incluye contraseñas ni enlaces para cambiarla. |
| Suscribirse | Llega «Gracias por suscribirte»; el enlace abre `/newsletter/baja?token=…` **sin** dar de baja todavía. |
| Confirmar la baja | «Listo, ya no vas a recibir novedades.»; en la base, `activo = false`. |
| Confirmar otra vez (recargar) | El mismo mensaje de éxito. |
| Cambiar un carácter del token en la URL y confirmar | «El enlace de baja no es válido.»; sin cambios en la base. |
| Volver a suscribirse | Éxito, `activo = true`, nueva `fechaSuscripcion` y llega un nuevo correo. |
| Revisar la versión de texto plano en Resend (Emails → detalle) | Contiene las mismas URL y datos que el HTML. |

## 4. Fallas del proveedor

| Paso | Esperado |
|---|---|
| `RESEND_API_KEY` con un valor inválido y registrarse | Cuenta creada normalmente; el backend registra `tipo=bienvenida ok=false motivo=…401…`. |
| Registrarse con un correo distinto del dueño de la cuenta (sin dominio) | Cuenta creada; se registra el 403 de Resend. |
| Sin `EMAIL_TOKEN_SECRET`, suscribirse | Suscripción creada; se registra que no se pudo firmar el enlace y no se envía correo. |
| Sin `EMAIL_TOKEN_SECRET`, confirmar una baja | 503 «La baja no está disponible en este momento». |
| Nombre `<b>Ana</b>` al registrarse (parte B) | El correo muestra el texto literal `<b>Ana</b>`, sin negrita. |

## 5. Cierre

Registrar en `verificacion.md`: comandos ejecutados y su resultado real, qué pasos se hicieron con Resend real, y qué quedó sin verificar (por ejemplo, la entrega a terceros hasta tener dominio).
