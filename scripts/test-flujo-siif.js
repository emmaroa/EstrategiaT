const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function main() {
  const db=new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; GRANT USAGE ON SCHEMA public TO anon,authenticated;
    CREATE TABLE usuarios(id uuid PRIMARY KEY,nombre text,usuario text,password text,activo boolean,rol text,modulos_permitidos jsonb);
    CREATE TABLE requis_siif(id uuid PRIMARY KEY,fecha date,folio text,oficio text,estatus text,justificacion text,dependencia text,importe numeric,clasificacion text,tipo_procedimiento text,precomprometido text,comprometido text,origen text,created_at timestamptz DEFAULT now());
    CREATE TABLE oc_siif(id uuid PRIMARY KEY,fecha date,folio text,numero_requisicion text,oficio_requisicion text,proveedor text,estatus text,importe numeric,fecha_adjudicacion date,tipo_procedimiento text,proceso text,precomprometido text,comprometido text,created_at timestamptz DEFAULT now());
    CREATE TABLE sp_siif(id uuid PRIMARY KEY,fecha date,numero_solicitud text,referencia text,descripcion text,estatus text,beneficiario text,importe numeric,tipo_solicitud text,dependencia text,fuente_financiamiento text,poliza_comprometido text,created_at timestamptz DEFAULT now());`);
  await db.query('INSERT INTO usuarios VALUES ($1,$2,$3,$4,true,$5,$6)',[uid(100),'Compras','compras','test-only','Compras',JSON.stringify([{modulo:'Seguimiento SIIF',permiso:'editar'}])]);
  await db.query('INSERT INTO usuarios VALUES ($1,$2,$3,$4,true,$5,$6)',[uid(101),'Consulta','consulta','test-only','Consulta',JSON.stringify([{modulo:'Seguimiento SIIF',permiso:'ver'}])]);
  for(const [n,year,folio,oficio] of [[1,2026,'000123','OF123'],[2,2025,'00123','OF123'],[3,2026,'789','AMB'],[4,2026,'789','AMB']]) {
    await db.query('INSERT INTO requis_siif(id,fecha,folio,oficio) VALUES($1,$2,$3,$4)',[uid(n),year+'-01-01',folio,oficio]);
  }
  await db.query('INSERT INTO oc_siif(id,fecha,folio,numero_requisicion,oficio_requisicion) VALUES($1,$2,$3,$4,$5)',[uid(10),'2026-02-01','456','123','OF123']);
  await db.query('INSERT INTO oc_siif(id,fecha,folio,numero_requisicion,oficio_requisicion) VALUES($1,$2,$3,$4,$5)',[uid(11),'2026-02-01','457','789','AMB']);
  await db.query('INSERT INTO sp_siif(id,fecha,numero_solicitud,referencia,descripcion) VALUES($1,$2,$3,$4,$5)',[uid(20),'2026-03-01','900','OF123','REQ 123']);
  await db.query('INSERT INTO sp_siif(id,fecha,numero_solicitud,referencia,descripcion) VALUES($1,$2,$3,$4,$5)',[uid(21),'2026-03-01','901','OF123','REQ 789']);
  await db.exec(fs.readFileSync('supabase/migrations/018_seguimiento_siif_unificado.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/060_flujo_tramites_siif.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/061_relaciones_siif_por_ejercicio.sql','utf8'));
  const related=(await db.query('SELECT id,cantidad_oc,cantidad_sp FROM seguimiento_siif ORDER BY id')).rows;
  assert.equal(related[0].cantidad_oc,1);assert.equal(related[0].cantidad_sp,2);
  for(const row of related.slice(1)){assert.equal(row.cantidad_oc,0);assert.equal(row.cantidad_sp,0);}
  const get=async()=> (await db.query('SELECT requisicion_id,etapa,revision,ubicacion,proveedor_espera FROM flujo_tramites_siif ORDER BY requisicion_id')).rows;
  async function move(items,stage=1,place='Compras',user=uid(100),password='test-only',provider='') {
    return db.query('SELECT mover_flujo_siif($1,$2,$3,$4,$5,$6,$7,$8,$9)',[user,password,JSON.stringify(items),stage,place,'Responsable de prueba','Nota','',provider]);
  }
  await db.exec('SET ROLE anon');
  await assert.rejects(db.query('SELECT * FROM flujo_tramites_siif'));
  await assert.rejects(move([{id:uid(1),revision:0}],1,'Compras',uid(100),'wrong'));
  await assert.rejects(move([{id:uid(1),revision:0}],1,'Compras',uid(101)));
  await assert.rejects(move([{id:uid(1),revision:0}],3,'Almacén',uid(100),'test-only','Proveedor'));
  await assert.rejects(move([{id:uid(1),revision:0}],3,'Compras'));
  await assert.rejects(move([{id:uid(1),revision:0}],10,'Compras'));
  await assert.rejects(move([{id:uid(1),revision:0},{id:uid(1),revision:0}]));
  await move([{id:uid(1),revision:0},{id:uid(2),revision:0}]);
  await db.exec('RESET ROLE');
  assert.deepEqual((await get()).map(r=>r.revision),[1,1]);
  // First row would change, but second row's stale revision rolls back the whole lot.
  await assert.rejects(move([{id:uid(1),revision:1},{id:uid(2),revision:0}],5,'Administrativo'));
  assert.deepEqual((await get()).map(r=>r.etapa),[1,1]);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM flujo_tramites_siif_historial')).rows[0].n,2);
  await move([{id:uid(1),revision:1}],3,'Compras',uid(100),'test-only','Proveedor Uno');
  assert.equal((await get())[0].proveedor_espera,'Proveedor Uno');
  for(let stage=4;stage<=10;stage++)await move([{id:uid(1),revision:stage-2}],stage,stage===10?'Enviado':'Compras',uid(100),'test-only',stage===6?'Proveedor Uno':'');
  assert.equal((await get())[0].etapa,10);
  const history=(await db.query('SELECT * FROM historial_flujo_siif($1,$2,$3)',[uid(101),'test-only',uid(1)])).rows;
  assert.equal(history.length,9);assert.equal(history[0].usuario_nombre,'Compras');
  // New SIIF imports update source data without resetting tracking or history.
  await db.query('UPDATE requis_siif SET importe=900 WHERE id=$1',[uid(1)]);
  assert.equal((await get())[0].etapa,10);
  await db.exec('SET ROLE anon');
  await assert.rejects(db.query('DELETE FROM flujo_tramites_siif_historial'));
  const readonly=await db.query('SELECT * FROM consultar_flujo_siif($1,$2,$3)',[uid(101),'test-only',[uid(1)]]);
  assert.equal(readonly.rows[0].etapa,10);
  await db.exec('RESET ROLE');
  await db.query('UPDATE usuarios SET activo=false WHERE id=$1',[uid(100)]);
  await assert.rejects(move([{id:uid(1),revision:9}]));
  // Actualización 062: el login normal entrega token; las contraseñas ya no
  // autorizan llamadas al seguimiento y el ID solo no identifica al usuario.
  await db.exec(fs.readFileSync('supabase/migrations/062_sesion_login_flujo_siif.sql','utf8'));
  await db.query('UPDATE usuarios SET activo=true WHERE id=$1',[uid(100)]);
  const session=(await db.query('SELECT iniciar_sesion_aplicacion($1,$2) AS s',['compras','test-only'])).rows[0].s;
  assert.equal(Object.hasOwn(session.usuario,'password'),false);
  assert.match(session.token,/^[0-9a-f]{64}$/);
  await assert.rejects(move([{id:uid(1),revision:9}]));
  await db.exec('SET ROLE anon');
  await assert.rejects(db.query('SELECT * FROM et_privado.sesiones_aplicacion'));
  const own=await db.query('SELECT * FROM consultar_flujo_siif($1,$2,$3)',[uid(100),session.token,[uid(1)]]);
  assert.equal(own.rows.length,1);
  await assert.rejects(db.query('SELECT * FROM consultar_flujo_siif($1,$2,$3)',[uid(101),session.token,[uid(1)]]));
  await move([{id:uid(1),revision:9}],8,'Almacén',uid(100),session.token);
  await db.query('SELECT cerrar_sesion_aplicacion($1)',[session.token]);
  await assert.rejects(db.query('SELECT * FROM consultar_flujo_siif($1,$2,$3)',[uid(100),session.token,[uid(1)]]));
  await db.exec('RESET ROLE');
  const expired=(await db.query('SELECT iniciar_sesion_aplicacion($1,$2) AS s',['compras','test-only'])).rows[0].s;
  await db.exec("UPDATE et_privado.sesiones_aplicacion SET expira_en=now()-interval '1 second'");
  await assert.rejects(db.query('SELECT * FROM consultar_flujo_siif($1,$2,$3)',[uid(100),expired.token,[uid(1)]]));
  await db.close();

  let user={id:uid(100),flujo_token:'test-session',sesion_expira_en:Date.now()+3600000},calls=[];
  const ctx={window:{addEventListener(){},supabaseClient:{rpc:async(name,args)=>{calls.push({name,args});return {data:[],error:null};}}},localStorage:{getItem:()=>JSON.stringify(user)}};
  vm.runInNewContext(fs.readFileSync('js/services/flujo-siif.js','utf8'),ctx);
  const api=ctx.window.ETFlujoSiif;
  await api.cargar(Array.from({length:1001},(_,i)=>uid(i+1)));
  assert.deepEqual(calls.map(c=>c.args.p_ids.length),[500,500,1]);
  assert.equal(api.etapas.length,11);assert.equal(api.etapas[3].area,'Compras');assert.equal(api.etapas[6].area,'Compras');
  assert.equal(calls[0].args.p_token,'test-session');assert.equal(Object.hasOwn(calls[0].args,'p_password'),false);
  user={...user,flujo_token:null};await assert.rejects(api.cargar([uid(1)]));
  console.log('Flujo SIIF: relaciones por ejercicio sin ambigüedad, permisos, lote atómico, concurrencia, historial, proveedor, importación estable y paginación verificados.');
}
main().catch(error=>{console.error(error);process.exit(1);});
