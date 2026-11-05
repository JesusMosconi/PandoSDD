// Solo conserva el identificador de orden; ningún parámetro acredita un pago.
const orden = new URLSearchParams(window.location.search).get("orden");
if (orden && /^[1-9]\d{0,9}$/.test(orden)) {
  document.getElementById("orden").textContent = `Orden de demostración #${orden}. Continuá desde el mismo equipo donde está abierta la aplicación local.`;
  document.getElementById("volver").href = `http://localhost:3003/cuenta?orden=${orden}`;
}
