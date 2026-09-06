const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const input = path.join(root, "imports", "supabase", "01_ingresos_taller_electricas_vinculados.csv");

function parseCsv(text) {
  const rows = []; let row = []; let value = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(value); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value); if (row.some(cell => cell !== "")) rows.push(row); row = []; value = "";
    } else value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  const headers = rows.shift().map(header => header.replace(/^\uFEFF/, ""));
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || null])));
}

async function main() {
  const config = fs.readFileSync(path.join(root, "js", "core", "supabase.js"), "utf8");
  const url = config.match(/const SUPABASE_URL = "([^"]+)"/)?.[1];
  const key = config.match(/const SUPABASE_KEY = "([^"]+)"/)?.[1];
  if (!url || !key) throw new Error("No se encontró la configuración de Supabase.");
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const response = await fetch(`${url}/rest/v1/ingresos_taller?select=vehiculo_id,fecha_ingreso&limit=5000`, { headers });
  if (!response.ok) throw new Error(`No se pudo consultar ingresos_taller (${response.status}): ${await response.text()}`);
  const existing = await response.json();
  const existingKeys = new Set(existing.map(row => `${row.vehiculo_id}|${row.fecha_ingreso}`));
  const rows = parseCsv(fs.readFileSync(input, "utf8"));
  const pending = rows.filter(row => !existingKeys.has(`${row.vehiculo_id}|${row.fecha_ingreso}`));
  const summary = { csv: rows.length, existentes: rows.length - pending.length, pendientes: pending.length };
  if (!process.argv.includes("--apply") || !pending.length) return console.log(JSON.stringify(summary));
  const insert = await fetch(`${url}/rest/v1/ingresos_taller`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(pending)
  });
  if (!insert.ok) throw new Error(`No se pudieron insertar los registros (${insert.status}): ${await insert.text()}`);
  const inserted = await insert.json();
  console.log(JSON.stringify({ ...summary, insertados: inserted.length }));
}

main().catch(error => { console.error(error.message); process.exit(1); });
