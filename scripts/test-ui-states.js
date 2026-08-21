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

checks.push(
  [styles.includes("body.et-detail-open"), "El visor debe conservar el tamaño del módulo"],
  [styles.includes("body.et-layout-ready.dashboard-body > main.main-content"), "El contenido principal debe conservar su ancho flexible"],
  [layout.includes("preventScroll: true"), "El visor debe devolver el foco sin desplazar el módulo"],
  [layout.includes("etScrollParents"), "El visor debe restaurar las tablas desplazables al cerrar"]
);

checks.push(
  [layout.includes('document.querySelector("main.main-content") || document.body'), "El visor debe montarse dentro del contenido y no como elemento flexible del body"],
  [layout.includes("host.appendChild(drawer)"), "La ficha lateral debe quedar fuera del flujo principal del body"]
);

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  failed.forEach(([, message]) => console.error("ERROR:", message));
  process.exit(1);
}

console.log("Estados UI: vacíos, carga, error, reintento y conexión verificados.");
