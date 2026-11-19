const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const credentialPath = process.env.ET_CREDENTIAL_FILE || path.join(os.homedir(), '.estrategiat-supabase.env');

function readConfig() {
  return Object.fromEntries(fs.readFileSync(credentialPath, 'utf8').split(/\r?\n/)
    .map(line => line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/)).filter(Boolean)
    .map(match => [match[1], match[2].replace(/^['"]|['"]$/g, '')]));
}

async function main() {
  const search = String(process.argv[2] || '').trim();
  if (!search) throw new Error('Indica el usuario o nombre a consultar.');
  const config = readConfig();
  const url = new URL(config.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/usuarios');
  url.searchParams.set('select', 'id,nombre,usuario,rol,activo,modulos_permitidos,permisos_version,permisos_excepciones');
  url.searchParams.set('or', '(usuario.ilike.*' + search + '*,nombre.ilike.*' + search + '*)');
  const response = await fetch(url, {headers: {
    apikey: config.SUPABASE_SECRET_KEY,
    Authorization: 'Bearer ' + config.SUPABASE_SECRET_KEY,
    'User-Agent': 'EstrategiaT-permission-diagnostic/2.0'
  }});
  if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + await response.text());
  console.log(JSON.stringify(await response.json(), null, 2));
}

main().catch(error => { console.error(error.message); process.exit(1); });
