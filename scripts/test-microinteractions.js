const fs = require("fs");

const layout = fs.readFileSync("js/core/layout.js", "utf8");
const styles = fs.readFileSync("css/design-system.css", "utf8");

const checks = [
  [layout.includes("prepararAyudasIconos"), "Faltan ayudas automáticas en iconos"],
  [layout.includes("et-control-pressed"), "Falta respuesta al pulsar controles"],
  [layout.includes("et-field-confirmed"), "Falta confirmación visual de campos"],
  [layout.includes("resaltarActualizacion"), "Falta el resaltado reutilizable de registros"],
  [layout.includes("et-action-success"), "Falta confirmar acciones exitosas"],
  [styles.includes("[data-et-tooltip]"), "Faltan estilos de ayudas"],
  [styles.includes(".et-record-updated"), "Faltan estilos de actualización"],
  [styles.includes("prefers-reduced-motion"), "Falta respetar movimiento reducido"]
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  failed.forEach(([, message]) => console.error("ERROR:", message));
  process.exit(1);
}

console.log("Microinteracciones: controles, campos, guardado, registros y ayudas verificados.");
