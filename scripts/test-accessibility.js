const fs = require("fs");

const layout = fs.readFileSync("js/core/layout.js", "utf8");
const styles = fs.readFileSync("css/design-system.css", "utf8");

const checks = [
  [layout.includes("prepararAccesibilidad"), "Falta el panel de accesibilidad"],
  [layout.includes("Saltar al contenido principal"), "Falta el enlace para saltar al contenido"],
  [layout.includes("etAccessibility_"), "Falta guardar preferencias por usuario"],
  [layout.includes('event.altKey && event.key.toLowerCase() === "a"'), "Falta el atajo Alt + A"],
  [styles.includes('[data-et-text-size="large"]'), "Falta ajustar el tamaño del texto"],
  [styles.includes('[data-et-contrast="high"]'), "Falta el modo de alto contraste"],
  [styles.includes('[data-et-density="compact"]'), "Falta la densidad compacta"],
  [styles.includes('[data-et-motion="reduced"]'), "Falta reducir el movimiento"]
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  failed.forEach(([, message]) => console.error("ERROR:", message));
  process.exit(1);
}

console.log("Accesibilidad: texto, contraste, densidad, movimiento y teclado verificados.");
