const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const ctx={};vm.runInNewContext(fs.readFileSync('js/core/rbac.js','utf8'),ctx);
const r=ctx.ETRbac,uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const tecnico={id:uid(1),rol:'Técnico',activo:true,permisos_version:2,modulos_permitidos:r.modulos};
assert.equal(r.puede(tecnico,'Seguimiento SIIF','ver'),true);
assert.equal(r.puede(tecnico,'Usuarios','ver'),false);
assert.equal(r.puede(tecnico,'Peticiones','editar',{creada_por_id:uid(1)}),true);
assert.equal(r.puede(tecnico,'Peticiones','editar',{creada_por_id:uid(2)}),false);
assert.equal(r.puede({...tecnico,permisos_excepciones:{Peticiones:{eliminar:true}}},'Peticiones','eliminar'),false);
assert.equal(r.puede({...tecnico,permisos_excepciones:{Peticiones:{ver:false,editar:true}}},'Peticiones','editar'),false);
assert.equal(r.puede({rol:'Jefe de Almacen',activo:true,modulos_permitidos:r.modulos},'Cancelaciones','aprobar_cancelacion'),true);
(async()=>{
 const db=new PGlite();
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA et_privado;
 CREATE TABLE usuarios(id uuid PRIMARY KEY,usuario text,rol text,activo boolean,password text);
 CREATE TABLE et_privado.sesiones_aplicacion(token_hash bytea PRIMARY KEY,usuario_id uuid,expira_en timestamptz);
 CREATE TABLE peticiones(id uuid PRIMARY KEY,creada_por_id uuid,origen_peticion text,estatus text,estado_autorizacion text,peticion text);
 GRANT USAGE ON SCHEMA public TO anon;GRANT ALL ON usuarios,peticiones TO anon;
 ALTER TABLE peticiones ENABLE ROW LEVEL SECURITY;CREATE POLICY abierta ON peticiones FOR ALL TO anon USING(true) WITH CHECK(true);
 ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;CREATE POLICY abierta ON usuarios FOR ALL TO anon USING(true) WITH CHECK(true);`);
 for(const [n,rol] of [[1,'Técnico'],[2,'SuperAdmin'],[3,'Jefe de Almacen'],[4,'Coordinador'],[5,'Administrador del Sistema'],[6,'Proveedor']]){
  await db.query('INSERT INTO usuarios VALUES($1,$2,$3,true,$4)',[uid(n),'u'+n,rol,'test']);
  await db.query("INSERT INTO et_privado.sesiones_aplicacion VALUES(sha256(convert_to($1,'UTF8')),$2,now()+interval '1 hour')",['token'+n,uid(n)]);
 }
 await db.query("INSERT INTO peticiones VALUES($1,$2,'normal','Pendiente','pendiente','Original')",[uid(100),uid(1)]);
 await db.exec("ALTER TABLE usuarios ADD COLUMN proveedor text;ALTER TABLE peticiones ADD COLUMN proveedor text,ADD COLUMN nota_proveedor text;");
 await db.query("UPDATE usuarios SET proveedor='Proveedor A' WHERE id=$1",[uid(6)]);
 for(const [n,proveedor] of [[200,'Proveedor A'],[201,'Proveedor B']])await db.query("INSERT INTO peticiones(id,origen_peticion,proveedor) VALUES($1,'normal',$2)",[uid(n),proveedor]);
 await db.exec('ALTER TABLE usuarios ADD COLUMN modulos_permitidos jsonb');
 await db.query('UPDATE usuarios SET modulos_permitidos=$1::jsonb',[JSON.stringify(r.modulos)]);
 const sql=fs.readFileSync('supabase/migrations/070_roles_acciones_cancelaciones.sql','utf8');
 await db.exec(sql);await db.exec(sql);
 for(const rol of Object.keys(r.matriz))for(const lista of [undefined,null,[],['Vales']]){
  const cuenta={rol,activo:true,usuario:'emma',modulos_permitidos:lista,permisos_excepciones:{Usuarios:{ver:true},Dashboard:{ver:true}}};
  for(const modulo of ['Usuarios','Dashboard','Peticiones']){
   assert.equal(r.puede(cuenta,modulo,'ver'),false,rol+'/'+modulo);
   assert.equal((await db.query('SELECT et_privado.rbac_puede($1::jsonb,$2,\'ver\') ok',[JSON.stringify(cuenta),modulo])).rows[0].ok,false);
  }
 }
 const comparacion=await db.query(`SELECT b.rol,b.modulo,a.accion,et_privado.rbac_puede(jsonb_build_object('rol',b.rol,'activo',true,'usuario','emma','modulos_permitidos',jsonb_build_array(b.modulo)),b.modulo,a.accion) permitido FROM et_privado.rbac_base b CROSS JOIN jsonb_array_elements_text($1::jsonb) a(accion)`,[JSON.stringify(r.acciones)]);
 for(const fila of comparacion.rows)assert.equal(fila.permitido,r.puede({rol:fila.rol,activo:true,usuario:'emma',modulos_permitidos:[fila.modulo]},fila.modulo,fila.accion),fila.rol+'/'+fila.modulo+'/'+fila.accion);
 for(const lista of [['Vales'],JSON.stringify(['Vales']),'Vales', [{modulo:'Vales',permiso:'ver'}]]){
  const cuenta={rol:'Jefe de Almacen',activo:true,modulos_permitidos:lista};
  for(const [modulo,accion,esperado] of [['Vales','ver',true],['Peticiones','ver',false],['Vales','editar',typeof lista[0]==='object'?false:true]]){
   assert.equal(r.puede(cuenta,modulo,accion),esperado);
   const sqlPermiso=await db.query('SELECT et_privado.rbac_puede($1::jsonb,$2,$3) ok',[JSON.stringify(cuenta),modulo,accion]);
   assert.equal(sqlPermiso.rows[0].ok,esperado);
  }
  cuenta.permisos_excepciones={Peticiones:{ver:true}};
  assert.equal(r.puede(cuenta,'Peticiones','ver'),false);
   assert.equal((await db.query("SELECT et_privado.rbac_puede($1::jsonb,'Peticiones','ver') ok",[JSON.stringify(cuenta)])).rows[0].ok,false);
 }
 const actor=async n=>{await db.exec('RESET ROLE');await db.query("SELECT set_config('request.headers',$1,false)",[JSON.stringify({'x-et-session-token':'token'+n})]);await db.exec('SET ROLE anon');};
 await actor(1);
 await db.query("UPDATE peticiones SET peticion='Cambio propio' WHERE id=$1",[uid(100)]);
 await assert.rejects(db.query('DELETE FROM peticiones WHERE id=$1',[uid(100)]),/Sin permiso/);
 await assert.rejects(db.query("UPDATE usuarios SET rol='SuperAdmin' WHERE id=$1",[uid(1)]),/Sin permiso/);
 await actor(4);
 await assert.rejects(db.query("UPDATE peticiones SET peticion='Ajeno' WHERE id=$1",[uid(100)]),/Sin permiso/);
 await actor(1);
 const solicitud=(await db.query("SELECT solicitar_cancelacion('peticiones',$1,'Duplicado confirmado') id",[uid(100)])).rows[0].id;
 await assert.rejects(db.query('SELECT resolver_cancelacion($1,true,$2)',[solicitud,'Aprobacion']),/Sin permiso/);
 await actor(3);await db.query('SELECT resolver_cancelacion($1,true,$2)',[solicitud,'Duplicado revisado']);
 assert.equal((await db.query('SELECT rbac_cancelado FROM peticiones WHERE id=$1',[uid(100)])).rows[0].rbac_cancelado,true);
 await assert.rejects(db.query('SELECT resolver_cancelacion($1,true,$2)',[solicitud,'Otra decision']),/ya fue resuelta/);
 await actor(1);await assert.rejects(db.query("UPDATE peticiones SET peticion='Otra' WHERE id=$1",[uid(100)]),/cancelado/);
 await actor(2);await db.query('DELETE FROM peticiones WHERE id=$1',[uid(100)]);
 await actor(6);assert.equal((await db.query('SELECT id FROM peticiones')).rows.length,1);
 await db.query("UPDATE peticiones SET nota_proveedor='Entrega lista' WHERE id=$1",[uid(200)]);
 await assert.rejects(db.query("UPDATE peticiones SET proveedor='Proveedor B' WHERE id=$1",[uid(200)]),/otro proveedor/);
 await actor(999);assert.equal((await db.query('SELECT * FROM usuarios')).rows.length,0);
 await assert.rejects(db.query("INSERT INTO peticiones(id) VALUES($1)",[uid(101)]),/Sesión inválida/);
 await db.exec('RESET ROLE');
 const nueva=fs.readFileSync('supabase/migrations/078_cancelacion_desde_modulos.sql','utf8');
 await db.exec(nueva);await db.exec(nueva);await actor(1);
 await db.query("INSERT INTO peticiones(id,creada_por_id,origen_peticion,peticion) VALUES($1,$2,'normal','Prueba directa')",[uid(300),uid(1)]);
 await actor(4);await assert.rejects(db.query("SELECT cancelar_registro_modulo('peticiones',$1,'Motivo valido')",[uid(300)]),/Sin permiso/);
 await actor(6);await assert.rejects(db.query("SELECT cancelar_registro_modulo('peticiones',$1,'Motivo valido')",[uid(201)]),/Sin permiso/);
 await actor(1);
 await assert.rejects(db.query("SELECT solicitar_cancelacion('peticiones',$1,'Motivo valido')",[uid(300)]),/permission denied/);
 await assert.rejects(db.query("SELECT cancelar_registro_modulo('usuarios',$1,'Motivo valido')",[uid(1)]),/no admite/);
 await assert.rejects(db.query("SELECT cancelar_registro_modulo('peticiones',$1,'abc')",[uid(300)]),/motivo/);
 await assert.rejects(db.query("UPDATE peticiones SET rbac_motivo_cancelacion='Falso' WHERE id=$1",[uid(300)]),/Cancelar registro/);
 await db.query("SELECT cancelar_registro_modulo('peticiones',$1,'Registro duplicado')",[uid(300)]);
 const cancelado=(await db.query('SELECT * FROM peticiones WHERE id=$1',[uid(300)])).rows[0];
 assert.equal(cancelado.rbac_cancelado,true);assert.equal(cancelado.rbac_cancelado_por,uid(1));assert.equal(cancelado.rbac_motivo_cancelacion,'Registro duplicado');assert.ok(cancelado.rbac_cancelado_en);
 await assert.rejects(db.query("SELECT cancelar_registro_modulo('peticiones',$1,'Duplicado otra vez')",[uid(300)]),/ya est/);
 await assert.rejects(db.query("UPDATE peticiones SET peticion='Cambio prohibido' WHERE id=$1",[uid(300)]),/cancelado/);
 await actor(999);await assert.rejects(db.query("SELECT cancelar_registro_modulo('peticiones',$1,'Sin sesion')",[uid(200)]),/inv.lida/);
 await db.close();console.log('RBAC: matriz, excepciones, autoría, borrado, sesión, cancelaciones e idempotencia aprobados.');
})().catch(e=>{console.error(e);process.exitCode=1;});
