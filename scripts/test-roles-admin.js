const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const {PGlite}=require('@electric-sql/pglite');
const ctx={};vm.runInNewContext(fs.readFileSync('js/core/rbac.js','utf8'),ctx);
const r=ctx.ETRbac,id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
(async()=>{const db=new PGlite();try{
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA et_privado;
 CREATE TABLE usuarios(id uuid PRIMARY KEY,usuario text,rol text,activo boolean,password text,modulos_permitidos jsonb);
 CREATE TABLE et_privado.sesiones_aplicacion(token_hash bytea PRIMARY KEY,usuario_id uuid,expira_en timestamptz);
 GRANT ALL ON usuarios TO anon,authenticated; ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
 CREATE POLICY abierta ON usuarios USING(true) WITH CHECK(true);`);
 for(const [n,rol] of [[1,'SuperAdmin'],[2,'Consulta']]){
  await db.query('INSERT INTO usuarios VALUES($1,$2,$3,true,$4,$5)',[id(n),'u'+n,rol,'test',JSON.stringify(r.modulos)]);
  await db.query("INSERT INTO et_privado.sesiones_aplicacion VALUES(sha256(convert_to($1,'UTF8')),$2,now()+interval '1 hour')",['token'+n,id(n)]);
 }
 await db.exec(fs.readFileSync('supabase/migrations/070_roles_acciones_cancelaciones.sql','utf8'));
 const migration=fs.readFileSync('supabase/migrations/077_administracion_roles.sql','utf8');
 await db.exec(migration);await db.exec(migration);
 const actor=async n=>{await db.exec('RESET ROLE');await db.query("SELECT set_config('request.headers',$1,false)",[JSON.stringify({'x-et-session-token':'token'+n})]);await db.exec('SET ROLE anon');};
 for(const n of [999,2]){await actor(n);await assert.rejects(db.query('SELECT admin_listar_roles()'),/Solo SuperAdmin/);await assert.rejects(db.query("SELECT admin_guardar_rol('ataque','Ataque','{}',0)"),/Solo SuperAdmin/);}
 await actor(1);
 assert.ok((await db.query('SELECT admin_listar_roles() roles')).rows[0].roles.length>0);
 await db.query("SELECT admin_guardar_rol('auxiliar','Auxiliar',$1,0)",[JSON.stringify({Vales:['ver','editar']})]);
 await assert.rejects(db.query("SELECT admin_guardar_rol('auxiliar','Auxiliar','{}',0)"),/cambió/);
 await assert.rejects(db.query("SELECT admin_guardar_rol('peligroso','Peligroso',$1,0)",[JSON.stringify({Usuarios:['ver']})]),/reservado/);
 await assert.rejects(db.query("SELECT admin_guardar_rol('invalido','Inválido',$1,0)",[JSON.stringify({Inexistente:['ver']})]),/inválidos/);
 await db.query("UPDATE usuarios SET rol='auxiliar' WHERE id=$1",[id(2)]);
 await assert.rejects(db.query("SELECT admin_eliminar_rol('auxiliar',1)"),/Reasigne/);
 await actor(2);
 const perfil=(await db.query('SELECT obtener_perfil_acceso() perfil')).rows[0].perfil;
 assert.deepEqual(perfil.permisos_rol,{Vales:['ver','editar']});
 assert.equal(r.puede(perfil,'Vales','editar'),true);assert.equal(r.puede(perfil,'Peticiones','ver'),false);assert.equal(r.puede(perfil,'Roles','ver'),false);
 await assert.rejects(db.query("SELECT admin_eliminar_rol('superadmin',1)"),/Solo SuperAdmin/);
 await actor(1);
 await db.query("SELECT admin_guardar_rol('auxiliar','Auxiliar lectura',$1,1)",[JSON.stringify({Vales:['ver']})]);
 await actor(2);const nuevo=(await db.query('SELECT obtener_perfil_acceso() perfil')).rows[0].perfil;assert.equal(r.puede(nuevo,'Vales','editar'),false);
 assert.equal((await db.query("SELECT et_privado.rbac_puede(et_privado.rbac_actor(),'Vales','editar') ok")).rows[0].ok,false);
 await actor(1);
 await db.query("UPDATE usuarios SET rol='Consulta' WHERE id=$1",[id(2)]);
 await assert.rejects(db.query("SELECT admin_eliminar_rol('auxiliar',1)"),/cambió/);
 await db.query("SELECT admin_eliminar_rol('auxiliar',2)");
 await assert.rejects(db.query("UPDATE usuarios SET rol='auxiliar' WHERE id=$1",[id(2)]),/existente/);
 await assert.rejects(db.query("SELECT admin_eliminar_rol('superadmin',1)"),/no se puede/);
 await assert.rejects(db.query("SELECT admin_guardar_rol('superadmin','SuperAdmin','{}',1)"),/conservar/);
 await db.exec('RESET ROLE');assert.equal((await db.query("SELECT count(*)::int n FROM et_privado.roles_historial WHERE rol='auxiliar'")).rows[0].n,3);
 console.log('Roles: acceso exclusivo, CRUD, revisión, roles en uso, asignación válida, auditoría y permisos dinámicos JS/SQL aprobados.');
}finally{await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
