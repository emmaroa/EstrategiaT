const fs = require("fs");

const layout = fs.readFileSync("js/core/layout.js", "utf8");
const styles = fs.readFileSync("css/design-system.css", "utf8");

const checks = [
  [layout.includes("Descartar cambios"), "Falta protección contra cambios sin guardar"],
  [layout.includes("document.querySelectorAll(\"input, select, textarea\").forEach(prepararControl)"), "La mejora no cubre todos los campos"],
  [layout.includes("observadorFormularios"), "Falta soporte para formularios dinámicos"],
  [layout.includes("et-character-count"), "Falta el contador de caracteres"],
  [styles.includes(".et-field-invalid"), "Faltan estilos de validación"],
  [styles.includes(".et-character-count"), "Faltan estilos del contador"],
  [styles.includes("position: sticky"), "Falta fijar elementos de las ventanas"]
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  failed.forEach(([, message]) => console.error("ERROR:", message));
  process.exit(1);
}

console.log("Formularios: validación, cambios pendientes y ventanas verificados.");
