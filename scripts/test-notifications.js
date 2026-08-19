const fs = require("fs");

const layout = fs.readFileSync("js/core/layout.js", "utf8");
const styles = fs.readFileSync("css/design-system.css", "utf8");

const checks = [
  [layout.includes("grupoFecha"), "Falta agrupar notificaciones por fecha"],
  [layout.includes("tipoNotificacion"), "Falta diferenciar tipos de notificación"],
  [layout.includes("Marcar como leída"), "Falta la acción individual de lectura"],
  [layout.includes("Ver elemento"), "Falta la acción para abrir el elemento"],
  [layout.includes("data-close-notifications"), "Falta un cierre explícito"],
  [styles.includes(".et-notification-group"), "Faltan estilos para los grupos"],
  [styles.includes(".et-notification-actions"), "Faltan estilos para acciones"],
  [styles.includes("@media (max-width: 600px)"), "Falta la vista móvil del centro"]
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  failed.forEach(([, message]) => console.error("ERROR:", message));
  process.exit(1);
}

console.log("Notificaciones: fechas, tipos, acciones y vista móvil verificados.");
