const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const issues = [];
const warnings = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function listFiles(directory, extensions) {
  const absolute = path.join(root, directory);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(relative, extensions);
    return extensions.includes(path.extname(entry.name)) ? [relative] : [];
  });
}

function normalizeRoute(route) {
  return route.split(/[?#]/)[0].replace(/\\/g, "/");
}

const requiredFiles = [
  "index.html", "dashboard.html", "login.js", "js/core/supabase.js",
  "js/core/permissions.js", "js/core/layout.js", "capacitor.config.json"
];

requiredFiles.forEach((file) => {
  if (!exists(file)) issues.push(`Falta el archivo requerido: ${file}`);
});

const permissions = read("js/core/permissions.js");
const routePattern = /:\s*["']([^"']+\.html(?:[?#][^"']*)?)["']/g;
let routeMatch;
while ((routeMatch = routePattern.exec(permissions)) !== null) {
  const route = normalizeRoute(routeMatch[1]);
  if (!exists(route)) warnings.push(`Ruta declarada sin pantalla disponible: ${route}`);
}

const htmlFiles = ["index.html", "dashboard.html", ...listFiles("modulos", [".html"])];
htmlFiles.forEach((file) => {
  const content = read(file);
  const scriptPattern = /<script[^>]+src=["']([^"']+)["']/gi;
  let scriptMatch;
  while ((scriptMatch = scriptPattern.exec(content)) !== null) {
    const source = scriptMatch[1];
    if (/^(https?:)?\/\//i.test(source)) continue;
    const resolved = path.normalize(path.join(path.dirname(file), normalizeRoute(source)));
    if (!exists(resolved)) issues.push(`${file}: referencia un script inexistente (${source})`);
  }
});

const sqlFiles = listFiles("supabase/migrations", [".sql"]);
sqlFiles.forEach((file) => {
  const content = read(file);
  if (/TO\s+anon[\s\S]{0,100}USING\s*\(true\)/i.test(content)) {
    warnings.push(`${file}: contiene una política anónima amplia; revisar antes de producción`);
  }
});

const login = read("login.js");
if (/\.eq\(["']password["']/i.test(login)) {
  warnings.push("login.js: el acceso todavía compara contraseñas desde el cliente; migrar a Supabase Auth");
}

const config = JSON.parse(read("capacitor.config.json"));
if (!config.appId || !config.appName || !config.webDir) {
  issues.push("capacitor.config.json: faltan appId, appName o webDir");
}

console.log("\nEstrategiaT — verificación de entrega\n");
console.log(`Interfaces revisadas: ${htmlFiles.length}`);
console.log(`Migraciones revisadas: ${sqlFiles.length}`);
console.log(`Errores: ${issues.length}`);
console.log(`Advertencias: ${warnings.length}\n`);
issues.forEach((message) => console.error(`ERROR: ${message}`));
warnings.forEach((message) => console.warn(`AVISO: ${message}`));

if (issues.length) {
  console.error("\nLa verificación falló. Corrige los errores antes de entregar.\n");
  process.exit(1);
}

console.log("\nVerificación estructural aprobada. Revisa las advertencias antes de producción.\n");
