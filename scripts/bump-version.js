const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const versionFile = path.join(root, "VERSION.json");
const current = JSON.parse(fs.readFileSync(versionFile, "utf8"));
const parts = String(current.version).split(".").map(Number);

if (parts.length !== 3 || parts.some(Number.isNaN) || parts[0] !== 2) {
  throw new Error("VERSION.json debe usar el formato 2.x.x");
}

const version = [parts[0], parts[1], parts[2] + 1].join(".");
const versionCode = parts[0] * 10000 + parts[1] * 100 + parts[2] + 1;

function writeJson(relativePath, transform) {
  const file = path.join(root, relativePath);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  transform(data);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

writeJson("VERSION.json", data => {
  data.version = version;
  data.versionCode = versionCode;
});
writeJson("package.json", data => { data.version = version; });
writeJson("package-lock.json", data => {
  data.version = version;
  if (data.packages && data.packages[""]) data.packages[""].version = version;
});

const configPath = path.join(root, "js", "core", "supabase.js");
const config = fs.readFileSync(configPath, "utf8").replace(/APP_VERSION:\s*"[^"]+"/, `APP_VERSION: "${version}"`);
fs.writeFileSync(configPath, config);

const gradlePath = path.join(root, "android", "app", "build.gradle");
const gradle = fs.readFileSync(gradlePath, "utf8")
  .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
  .replace(/versionName\s+"[^"]+"/, `versionName "${version}"`);
fs.writeFileSync(gradlePath, gradle);

console.log(`Versión actualizada: ${current.version} -> ${version} (Android ${versionCode})`);
