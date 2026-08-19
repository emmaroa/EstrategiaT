const fs = require("fs");

const layout = fs.readFileSync("js/core/layout.js", "utf8");
const styles = fs.readFileSync("css/design-system.css", "utf8");

const checks = [
  [layout.includes("mostrarEstado"), "Falta el componente de estado de contenido"],
  [layout.includes("Intentar nuevamente"), "Falta la acción para reintentar"],
  [layout.includes("et-empty-reset"), "Falta limpiar filtros desde el estado vacío"],
  [layout.includes("prepararEstadoConexion"), "Falta el aviso de conexión"],
  [layout.includes('global.addEventListener("offline"'), "Falta detectar la pérdida de conexión"],
  [styles.includes(".et-content-state"), "Faltan estilos para carga y errores"],
  [styles.includes(".et-connection-status"), "Faltan estilos del aviso de conexión"]
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  failed.forEach(([, message]) => console.error("ERROR:", message));
  process.exit(1);
}

console.log("Estados UI: vacíos, carga, error, reintento y conexión verificados.");
