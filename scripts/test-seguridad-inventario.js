// Prueba contra una reconstrucción estructural, sin datos de producción.
// node scripts/test-seguridad-inventario.js inventario.json detalle.json
const fs=require('node:fs'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const inv=read(process.argv[2]),detalle=read(process.argv[3]);
const q=s=>'"'+s.replaceAll('"','""')+'"';
const uid='00000000-0000-4000-8000-000000000001';
(async()=>{
 const db=new PGlite();
 try{
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA et_privado; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
 SET check_function_bodies=false;`);
 for(const t of inv.tablas){
  const cols=detalle.columnas.filter(c=>c.schema===t.schema&&c.tabla===t.tabla);
  await db.exec(`CREATE TABLE ${q(t.schema)}.${q(t.tabla)} (${cols.map(c=>q(c.columna)+' '+(c.tipo.startsWith('_')?q(c.tipo.slice(1))+'[]':q(c.tipo))+(c.columna==='id'?' PRIMARY KEY':'')).join(',')});`);
 }
 // El inventario no incluye defaults: emular UUID de PK para los triggers de auditoría.
 for(const c of detalle.columnas.filter(c=>c.columna==='id'&&c.tipo==='uuid'&&inv.tablas.some(t=>t.schema===c.schema&&t.tabla===c.tabla)))
  await db.exec(`ALTER TABLE ${q(c.schema)}.${q(c.tabla)} ALTER COLUMN id SET DEFAULT gen_random_uuid()`);
 for(const f of detalle.funciones)await db.exec(f.definicion);
 for(const v of inv.vistas)await db.exec(`CREATE VIEW public.${q(v.nombre)} AS ${v.definicion}`);
 for(const t of inv.tablas){
  if(t.rls)await db.exec(`ALTER TABLE ${q(t.schema)}.${q(t.tabla)} ENABLE ROW LEVEL SECURITY`);
  for(const p of t.politicas||[])await db.exec(`CREATE POLICY ${q(p.policyname)} ON ${q(t.schema)}.${q(t.tabla)} AS ${p.permissive} FOR ${p.cmd} TO ${p.roles.map(q).join(',')} ${p.qual?'USING ('+p.qual+')':''} ${p.with_check?'WITH CHECK ('+p.with_check+')':''}`);
 }
 for(const t of detalle.triggers)await db.exec(t.definicion);
 // Permisos máximos de cliente para probar que RLS resiste incluso grants abiertos.
 await db.exec(`GRANT USAGE ON SCHEMA public,et_privado TO anon,authenticated;
 GRANT ALL ON ALL TABLES IN SCHEMA public,et_privado TO anon,authenticated;`);
 const paquete=fs.readFileSync('supabase/INSTALAR_SEGURIDAD.sql','utf8');
 await db.exec(paquete); await db.exec(paquete);
 // Semilla por administrador sin disparadores operativos: no representa datos reales.
 await db.exec('SET session_replication_role=replica');
 await db.query("INSERT INTO usuarios(id,usuario,nombre,rol,activo,password) VALUES($1,'prueba','Prueba','SuperAdmin',true,'passwordprueba')",[uid]);
 await db.query("INSERT INTO et_privado.sesiones_aplicacion(token_hash,usuario_id,expira_en) VALUES(sha256(convert_to('test-token','UTF8')),$1,now()+interval '1 hour')",[uid]);
 await db.query("INSERT INTO inventario(id,nombre,stock_actual,costo_unitario) VALUES($1,'Prueba',10,5)",[uid]);
 await db.query("INSERT INTO notificaciones(id,usuario_id,leida,created_at) SELECT gen_random_uuid(),$1,false,now()-n*interval '1 second' FROM generate_series(1,6000) n",[uid]);
 await db.exec('SET session_replication_role=origin');
 const session=async(role,token)=>{
  await db.exec('RESET ROLE');await db.query("SELECT set_config('request.headers',$1,false)",[JSON.stringify({'x-et-session-token':token})]);await db.exec('SET ROLE '+role);
 };
 for(const role of ['anon','authenticated']){
  await session(role,'invalid');
  for(const t of inv.tablas.filter(t=>t.schema==='public')){
   const r=await db.query(`SELECT * FROM public.${q(t.tabla)} LIMIT 1`);
   assert.equal(r.rows.length,0,t.tabla+' sin sesión');
  }
  await assert.rejects(db.exec('SELECT listar_usuarios_turnables_acuerdos()'),/Sesión o permiso/);
  await assert.rejects(db.query("SELECT registrar_movimiento_inventario($1,'entrada',1)",[uid]),/Sesión o permiso/);
  await assert.rejects(db.exec("SELECT generar_folio('TEST')"),/permission denied/);
  await session(role,'test-token');
  assert.equal((await db.query('SELECT * FROM listar_usuarios_turnables_acuerdos()')).rows.length,1);
  assert.equal((await db.query('SELECT * FROM usuarios')).rows.length,1);
  const pagina=await db.query('SELECT id FROM notificaciones WHERE usuario_id=$1 ORDER BY leida,created_at DESC,id DESC OFFSET 3000 LIMIT 500',[uid]);
  assert.equal(pagina.rows.length,500);
  const plan=(await db.query('EXPLAIN (ANALYZE, FORMAT JSON) SELECT id FROM notificaciones WHERE usuario_id=$1 ORDER BY leida,created_at DESC,id DESC OFFSET 3000 LIMIT 500',[uid])).rows[0]['QUERY PLAN'][0];
  const nodos=[]; const visitar=p=>{nodos.push(p);for(const child of p.Plans||[])visitar(child);};visitar(plan.Plan);
  assert.ok(nodos.some(p=>p['Parent Relationship']==='InitPlan'&&p['Actual Loops']===1),'Sesión validada una sola vez');
  console.log(role+': página 3000/6000, 500 filas, '+plan['Execution Time']+' ms; InitPlan una vez.');
  const stock=Number((await db.query('SELECT stock_actual FROM inventario WHERE id=$1',[uid])).rows[0].stock_actual);
  await db.query("SELECT registrar_movimiento_inventario($1,'entrada',1)",[uid]);
  assert.equal(Number((await db.query('SELECT stock_actual FROM inventario WHERE id=$1',[uid])).rows[0].stock_actual),stock+1);
  await assert.rejects(db.query("SELECT registrar_movimiento_inventario($1,'salida',1000)",[uid]),/negativo/);
  await assert.rejects(db.query("SELECT registrar_movimiento_inventario($1,'entrada',1,NULL,NULL,$2)",[uid,'00000000-0000-4000-8000-000000000002']),/Sesión o permiso/);
 }
 await db.exec('RESET ROLE; SET session_replication_role=replica');
 for(const rol of ['SuperAdmin','Consulta','Proveedor','Coordinador']){
  await db.query('UPDATE usuarios SET rol=$1 WHERE id=$2',[rol,uid]);
  const comparacion=await db.query(`SELECT t.tabla,
    et_privado.rbac_lectura(t.tabla,r.dato) anterior,
    et_privado.lectura_con_contexto(t.tabla,r.dato,(SELECT et_privado.contexto_lectura())) nueva
    FROM et_privado.rbac_tablas t CROSS JOIN (VALUES
      (jsonb_build_object('id',$1::text,'origen_peticion','normal')),
      (jsonb_build_object('id',$1::text,'origen_peticion','coordinador','proveedor','A'))
    ) r(dato)`,[uid]);
  for(const fila of comparacion.rows)assert.equal(fila.nueva,fila.anterior,rol+'/'+fila.tabla);
 }
 await db.query("UPDATE usuarios SET rol='Consulta' WHERE id=$1",[uid]);
 await db.exec('SET session_replication_role=origin');
 await session('anon','test-token');
 await db.query("UPDATE usuarios SET password='nuevo-password' WHERE id=$1",[uid]);
 await assert.rejects(db.query("UPDATE usuarios SET rol='SuperAdmin' WHERE id=$1",[uid]),/Sin permiso/);
 await assert.rejects(db.query("SELECT registrar_movimiento_inventario($1,'entrada',1)",[uid]),/Sesión o permiso/);
 console.log(`Inventario real reconstruido: ${inv.tablas.length} tablas, funciones y triggers; migraciones, anonimato, RPC, suplantación y perfil aprobados.`);
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
