const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const credentialPath = process.env.ET_CREDENTIAL_FILE || path.join(os.homedir(), '.estrategiat-supabase.env');

function readConfig() {
  const config = Object.fromEntries(fs.readFileSync(credentialPath, 'utf8').split(/\r?\n/)
    .map(line => line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/)).filter(Boolean)
    .map(match => [match[1], match[2].replace(/^['"]|['"]$/g, '')]));
  for (const key of ['SUPABASE_URL', 'SUPABASE_ACCESS_TOKEN']) {
    if (!config[key]) throw new Error('Falta ' + key + ' en el archivo de credenciales.');
  }
  config.PROJECT_REF = new URL(config.SUPABASE_URL).hostname.split('.')[0];
  return config;
}

async function query(config, sql, readOnly = false) {
  const response = await fetch('https://api.supabase.com/v1/projects/' + config.PROJECT_REF + '/database/query', {
    method: 'POST',
    headers: {Authorization: 'Bearer ' + config.SUPABASE_ACCESS_TOKEN, 'Content-Type': 'application/json'},
    body: JSON.stringify({query: sql, read_only: readOnly})
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.error || text);
  return Array.isArray(data) ? data : data?.data || data?.result || [];
}

async function inspect(config) {
  const rows = await query(config, `
    SELECT u.id::text, u.usuario,
      (SELECT count(*) FROM public.ingresos_taller i
       WHERE coalesce(i.rbac_creado_por,i.creado_por)=u.id) registros_propios,
      position('eliminar_control_taller_coordinador' in pg_get_functiondef('et_privado.rbac_puede(jsonb,text,text,jsonb)'::regprocedure)) > 0 instalada
    FROM public.usuarios u
    WHERE u.activo IS TRUE AND lower(regexp_replace(translate(u.rol,
      'ÁÉÍÓÚÜÑáéíóúüñ _-','AEIOUUNaeiouun'),'[^a-zA-Z0-9]','','g'))='coordinador'
      AND u.modulos_permitidos::text ILIKE '%Control de Taller%'
    ORDER BY u.usuario LIMIT 1
  `, true);
  if (!rows[0]) throw new Error('No hay un Coordinador activo para validar la política.');
  return rows[0];
}

async function testPolicy(config, coordinatorId) {
  if (!/^[0-9a-f-]{36}$/i.test(coordinatorId)) throw new Error('Identificador de Coordinador inválido.');
  const token = 'et_taller_' + crypto.randomBytes(24).toString('hex');
  await query(config, `
    BEGIN;
    INSERT INTO et_privado.sesiones_aplicacion(token_hash,usuario_id,expira_en)
    VALUES(sha256(convert_to('${token}','UTF8')),'${coordinatorId}'::uuid,now()+interval '5 minutes');
    SELECT set_config('request.headers','{"x-et-session-token":"${token}"}',true);
    SET LOCAL ROLE anon;
    DO $prueba$
    DECLARE u jsonb:=et_privado.rbac_actor();
    BEGIN
      IF u IS NULL THEN RAISE EXCEPTION 'No se obtuvo el actor de prueba'; END IF;
      IF NOT et_privado.rbac_puede(u,'Control de Taller','eliminar',
        jsonb_build_object('creado_por','${coordinatorId}','rbac_creado_por','${coordinatorId}')) THEN
        RAISE EXCEPTION 'El Coordinador no obtuvo permiso sobre su registro';
      END IF;
      IF et_privado.rbac_puede(u,'Control de Taller','eliminar',
        jsonb_build_object('creado_por','00000000-0000-4000-8000-000000000001',
          'rbac_creado_por','00000000-0000-4000-8000-000000000001')) THEN
        RAISE EXCEPTION 'El Coordinador obtuvo permiso sobre un registro ajeno';
      END IF;
    END $prueba$;
    ROLLBACK;
  `);
}

async function main() {
  const config = readConfig();
  await query(config, fs.readFileSync('supabase/migrations/083_eliminar_control_taller_coordinador.sql', 'utf8'));
  const result = await inspect(config);
  if (!result.instalada) throw new Error('La política no quedó instalada.');
  await testPolicy(config, result.id);
  console.log(JSON.stringify({ok: true, project: config.PROJECT_REF, coordinator: result.usuario,
    ownRecord: true, foreignRecord: false, ownWorkshopRecords: Number(result.registros_propios || 0)}, null, 2));
}

main().catch(error => {console.error(error.message); process.exit(1);});
