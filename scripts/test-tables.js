const fs = require("fs");

const layout = fs.readFileSync("js/core/layout.js", "utf8");
const styles = fs.readFileSync("css/design-system.css", "utf8");

const checks = [
  [layout.includes("prepararEstadosFila"), "Falta la mejora automática de estados"],
  [layout.includes("etTableDensity"), "Falta guardar la densidad elegida"],
  [layout.includes("Vista compacta"), "Falta el selector de vista compacta"],
  [layout.includes("prepararEstadosVisuales"), "Falta la normalización global de estados"],
  [layout.includes("et-state-danger"), "Falta la clasificación semántica de estados"],
  [styles.includes(".et-status-chip"), "Faltan los estilos de estados"],
  [styles.includes(".status-badge.et-state-success"), "Falta el color uniforme de estados satisfactorios"],
  [styles.includes(".status-badge.et-state-neutral"), "Falta el color uniforme de estados neutrales"],
  [styles.includes(".et-data-table.is-compact"), "Faltan los estilos compactos"]
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  failed.forEach(([, message]) => console.error("ERROR:", message));
  process.exit(1);
}

console.log("Tablas: densidad, estados visuales y preferencias verificados.");
