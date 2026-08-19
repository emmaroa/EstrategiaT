const fs = require("fs");

const layout = fs.readFileSync("js/core/layout.js", "utf8");
const styles = fs.readFileSync("css/design-system.css", "utf8");

const checks = [
  [layout.includes("prepararEstructuraModulo"), "Falta la estructura común de módulos"],
  [layout.includes('moduloActivo === "Dashboard"'), "El dashboard debe conservar su estructura propia"],
  [layout.includes("et-module-eyebrow"), "Falta el contexto visual del módulo"],
  [layout.includes("et-section-label"), "Falta la jerarquía de indicadores"],
  [layout.includes("aria-labelledby"), "Falta relacionar los paneles con sus títulos"],
  [styles.includes(".et-module-header"), "Falta el encabezado visual uniforme"],
  [styles.includes(".et-module-content"), "Falta el estilo común del contenido"]
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  failed.forEach(([, message]) => console.error("ERROR:", message));
  process.exit(1);
}

console.log("Módulos: encabezado, KPIs, filtros y contenido verificados.");
