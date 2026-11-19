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
  if (!/^[a-z0-9]{20}$/.test(config.PROJECT_REF)) throw new Error('No se pudo obtener el identificador del proyecto.');
  return config;
}

async function query(config, sql, readOnly) {
  const response = await fetch('https://api.supabase.com/v1/projects/' + config.PROJECT_REF + '/database/query', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + config.SUPABASE_ACCESS_TOKEN,
      'Content-Type': 'application/json',
      'User-Agent': 'EstrategiaT-migration/2.0'
    },
    body: JSON.stringify({query: sql, read_only: Boolean(readOnly)})
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch (_) { data = text; }
  }
  if (!response.ok) throw new Error('Management API HTTP ' + response.status + ': ' + (data?.message || data?.error || text));
  return data;
}

function firstRow(result) {
  if (Array.isArray(result)) return result[0] || null;
  if (Array.isArray(result?.data)) return result.data[0] || null;
  if (Array.isArray(result?.result)) return result.result[0] || null;
  return result && typeof result === 'object' ? result : null;
}

async function inspect(config) {
  const result = await query(config, `
    SELECT
      position('estatus_vales_tecnicos' in pg_get_functiondef('et_privado.rbac_puede(jsonb,text,text,jsonb)'::regprocedure)) > 0 AS permiso_instalado,
      position('estatus_vales_tecnicos' in pg_get_functiondef('et_privado.rbac_escritura()'::regprocedure)) > 0 AS escritura_instalada,
      position('estatus_vales_tecnicos_rls' in pg_get_functiondef('et_privado.seguridad_fila(text,jsonb,text)'::regprocedure)) > 0 AS rls_instalada,
      (SELECT id::text FROM public.usuarios WHERE lower(usuario)='ramon' AND activo IS TRUE LIMIT 1) AS ramon_id,
      (SELECT coalesce(jsonb_object_agg(coalesce(estatus,'Sin estatus'),cantidad),'{}'::jsonb)
       FROM (SELECT estatus,count(*) AS cantidad FROM public.vales
             WHERE NOT coalesce(rbac_cancelado,false) GROUP BY estatus) conteos) AS estatus_activos,
      (SELECT count(*) FROM public.vales v JOIN public.usuarios u ON lower(u.usuario)='ramon'
       WHERE NOT coalesce(v.rbac_cancelado,false) AND v.rbac_creado_por IS DISTINCT FROM u.id) AS vales_ajenos_activos,
      (SELECT count(*) FROM public.vales v JOIN public.usuarios u ON lower(u.usuario)='ramon'
       WHERE NOT coalesce(v.rbac_cancelado,false) AND v.estatus='Entregado'
         AND v.rbac_creado_por IS DISTINCT FROM u.id) AS entregados_ajenos
  `, true);
  const row = firstRow(result);
  if (!row || !row.ramon_id) throw new Error('No se pudo confirmar la cuenta activa de ramon.');
  return row;
}

async function transactionalTest(config, ramonId) {
  if (!/^[0-9a-f-]{36}$/i.test(ramonId)) throw new Error('Identificador de ramon inválido.');
  const token = 'et_test_' + crypto.randomBytes(24).toString('hex');
  const sql = `
    BEGIN;
    INSERT INTO et_privado.sesiones_aplicacion(token_hash,usuario_id,expira_en)
    VALUES(sha256(convert_to('${token}','UTF8')),'${ramonId}'::uuid,now()+interval '5 minutes');
    SELECT set_config('request.headers','{"x-et-session-token":"${token}"}',true);
    SET LOCAL ROLE anon;
    DO $prueba$
    DECLARE vale_id uuid; estado text; actor jsonb; visibles bigint; entregados bigint;
    BEGIN
      actor:=et_privado.rbac_actor();
      SELECT count(*),count(*) FILTER (WHERE estatus='Entregado') INTO visibles,entregados FROM public.vales;
      IF actor IS NULL THEN RAISE EXCEPTION 'La sesión de prueba no produjo actor RBAC'; END IF;
      SELECT id,estatus INTO vale_id,estado FROM public.vales
      WHERE estatus='Entregado' AND NOT coalesce(rbac_cancelado,false)
        AND rbac_creado_por IS DISTINCT FROM '${ramonId}'::uuid
      ORDER BY created_at DESC NULLS LAST,id LIMIT 1 FOR UPDATE;
      IF vale_id IS NULL THEN RAISE EXCEPTION 'No hay vale Entregado ajeno; rol %, visibles %, entregados %',actor->>'rol',visibles,entregados; END IF;
      UPDATE public.vales SET estatus='Solventado' WHERE id=vale_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'El Técnico no pudo actualizar el vale'; END IF;
      IF (SELECT estatus FROM public.vales WHERE id=vale_id)<>'Solventado' THEN
        RAISE EXCEPTION 'El estatus no quedó Solventado dentro de la prueba';
      END IF;
      BEGIN
        UPDATE public.vales SET refaccion=coalesce(refaccion,'') || ' CAMBIO_NO_PERMITIDO' WHERE id=vale_id;
        RAISE EXCEPTION 'La prueba detectó edición indebida de otros campos';
      EXCEPTION WHEN insufficient_privilege THEN NULL;
        WHEN OTHERS THEN
          IF position('Sin permiso' in SQLERRM)=0 AND position('cancelado' in SQLERRM)=0 THEN RAISE; END IF;
      END;
    END $prueba$;
    ROLLBACK;
  `;
  await query(config, sql, false);
}

async function main() {
  const config = readConfig();
  const before = await inspect(config);
  console.log(JSON.stringify({project: config.PROJECT_REF, before: {
    permisoInstalado: Boolean(before.permiso_instalado), escrituraInstalada: Boolean(before.escritura_instalada),
    rlsInstalada: Boolean(before.rls_instalada),
    estatusActivos: before.estatus_activos, valesAjenosActivos: Number(before.vales_ajenos_activos || 0),
    entregadosAjenos: Number(before.entregados_ajenos || 0)
  }}, null, 2));
  if (process.argv.includes('--check')) return;

  const permissionMigration = fs.readFileSync('supabase/migrations/081_estatus_vales_tecnicos.sql', 'utf8');
  const rlsMigration = fs.readFileSync('supabase/migrations/082_estatus_vales_tecnicos_rls.sql', 'utf8');
  await query(config, permissionMigration, false);
  await query(config, rlsMigration, false);
  const after = await inspect(config);
  if (!after.permiso_instalado || !after.escritura_instalada || !after.rls_instalada) {
    throw new Error('La migración respondió correctamente, pero las tres reglas no quedaron instaladas.');
  }
  await transactionalTest(config, after.ramon_id);
  console.log(JSON.stringify({ok: true, permissionRule: true, writeRule: true, rlsRule: true,
    testedTransition: 'Entregado -> Solventado', otherFieldsRemainProtected: true,
    persistedTestChanges: false}, null, 2));
}

main().catch(error => { console.error(error.message); process.exit(1); });
