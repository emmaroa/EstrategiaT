const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');const temp=path.join(root,'.tmp-roles');fs.mkdirSync(temp,{recursive:true});
const mock=`window.usuarioPrueba={id:'00000000-0000-4000-8000-000000000001',usuario:'emma',flujo_token:'test-token',rol:'SuperAdmin',activo:true,modulos_permitidos:['Usuarios'],sesion_expira_en:Date.now()+3600000};
localStorage.setItem('usuarioActivo',JSON.stringify(usuarioPrueba));window.confirm=()=>true;window.alert=t=>{throw Error(t)};
window.ETLayout={inicializar(){}};window.validarPermiso=m=>ETRbac.puede(usuarioPrueba,m,'ver');
window.rolesPrueba=[{clave:'superadmin',nombre:'SuperAdmin',revision:1,usuarios:1,permisos:{Usuarios:['ver','crear','editar'],Roles:['ver']}}];window.llamadas=[];
window.supabaseClient={rpc:async(n,a)=>{llamadas.push({n,a});if(n==='obtener_perfil_acceso')return {data:structuredClone(usuarioPrueba)};if(n==='admin_listar_roles')return {data:structuredClone(rolesPrueba)};
if(n==='admin_guardar_rol'){let r=rolesPrueba.find(r=>r.clave===a.p_clave);if(!r){r={clave:a.p_clave,revision:0,usuarios:0};rolesPrueba.push(r);}Object.assign(r,{nombre:a.p_nombre,permisos:a.p_permisos,revision:r.revision+1});}
if(n==='admin_eliminar_rol')rolesPrueba=rolesPrueba.filter(r=>r.clave!==a.p_clave);return {data:null};}};`;
const server=http.createServer((req,res)=>{
 const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404).end();return;}
 let data=fs.readFileSync(p);
 if(p.endsWith('roles.html')){data=data.toString().replace(/<script[^>]+src="[^"]*(?:-supabase-supabase-js|core\/(?:supabase|layout|auth))\.js(?:\?[^"]*)?"[^>]*><\/script>/g,'');data=data.replace('<head>','<head><script>'+mock+'</script>');}
 res.setHeader('Content-Type',p.endsWith('.html')?'text/html;charset=utf-8':p.endsWith('.js')?'text/javascript;charset=utf-8':'text/css;charset=utf-8');res.end(data);
});
let browser,socket;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const profile=fs.mkdtempSync(path.join(temp,'browser-'));browser=spawn(process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless','--no-sandbox','--disable-gpu','--no-first-run','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
 const file=path.join(profile,'DevToolsActivePort');for(let i=0;!fs.existsSync(file);i++){if(i>100)throw Error('Browser timeout');await new Promise(r=>setTimeout(r,100));}
 const port=fs.readFileSync(file,'utf8').split('\n')[0];const targets=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());
 socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
 let id=0;const pending=new Map();socket.addEventListener('message',e=>{const v=JSON.parse(e.data);if(pending.has(v.id)){const [ok,no]=pending.get(v.id);pending.delete(v.id);v.error?no(Error(v.error.message)):ok(v.result);}});
 const send=(method,params={})=>new Promise((ok,no)=>{const key=++id;pending.set(key,[ok,no]);socket.send(JSON.stringify({id:key,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 const wait=async condition=>{for(let i=0;i<100;i++){if(await evaluate(condition))return;await new Promise(r=>setTimeout(r,100));}throw Error('Timeout: '+condition);};
 await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:origin+'/modulos/roles.html'});
 await wait('document.querySelectorAll("#rolEditar option").length===2');
 await evaluate(`document.getElementById('nuevoRol').click();document.getElementById('nombreRol').value='Auxiliar';document.getElementById('claveRol').value='auxiliar';const n=document.querySelector('[data-nivel="Vales"]');n.value='editar';n.dispatchEvent(new Event('change'));document.getElementById('formRol').dispatchEvent(new Event('submit',{cancelable:true}));`);
 await wait('document.getElementById("estadoRoles").textContent.startsWith("Rol guardado")');
 assert.equal(await evaluate('rolesPrueba.find(r=>r.clave==="auxiliar").permisos.Vales.includes("editar")'),true);
 await evaluate(`const c=document.createElement('div');c.id='testPermisos';document.body.append(c);ETRolesAdmin.permisosUsuario(c,{modulos_permitidos:[{modulo:'Vales',permiso:'ver'}]},()=> 'auxiliar');`);
 assert.equal(await evaluate('document.querySelector("#testPermisos [data-rbac-access=Vales]").value'),'ver');
 assert.equal(await evaluate('document.querySelectorAll("#testPermisos details[open]").length'),0);
 await evaluate('document.querySelector("#testPermisos button").click()');
 assert.equal(await evaluate('document.querySelector("#testPermisos [data-rbac-access=Vales]").value'),'editar');
 assert.equal(await evaluate('document.querySelector("#testPermisos [data-rbac-access=Peticiones]").value'),'none');
 await evaluate('document.getElementById("testPermisos").remove();document.getElementById("eliminarRol").click()');
 await wait('document.getElementById("estadoRoles").textContent==="Rol eliminado."');
 assert.equal(await evaluate('rolesPrueba.some(r=>r.clave==="auxiliar")'),false);
 await evaluate('document.getElementById("nuevoRol").click()');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
 fs.writeFileSync(path.join(temp,'roles-movil.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await evaluate(`document.body.innerHTML='<div class="et-header-actions"></div>';usuarioPrueba.modulos_permitidos=['Vales'];localStorage.setItem('usuarioActivo',JSON.stringify(usuarioPrueba));
 window.filaCancelacion={id:'00000000-0000-4000-8000-000000000100',folio:'VALE-100',rbac_cancelado:false};
 supabaseClient.from=()=>{const q={select(){return q},eq(){return q},order(){return q},range:async()=>({data:[filaCancelacion]})};return q};
 supabaseClient.rpc=async(n,a)=>{window.ultimaCancelacion={n,a};return {error:{message:'Rechazo de prueba'}}};
 ETCancelacionModulo.inicializar('Vales');document.getElementById('cancelacionEnModulo').click();`);
 await wait('document.querySelector("[data-registro] option")!==null');
 assert.equal(await evaluate('document.querySelector("[data-confirmar]").disabled'),false);
 await evaluate('document.querySelector("[data-confirmar]").click()');
 assert.equal(await evaluate('window.ultimaCancelacion===undefined'),true);
 await evaluate('document.querySelector("[data-motivo]").value="Registro duplicado";document.querySelector("[data-confirmar]").click()');
 await wait('window.ultimaCancelacion!==undefined');
 assert.equal(await evaluate('ultimaCancelacion.n'),'cancelar_registro_modulo');
 assert.equal(await evaluate('ultimaCancelacion.a.p_tabla'),'vales');
 assert.equal(await evaluate('ultimaCancelacion.a.p_registro'),'00000000-0000-4000-8000-000000000100');
 await evaluate("document.querySelector('dialog').close()");
 await wait('document.querySelector("dialog")===null');
 await evaluate(`usuarioPrueba.permisos_excepciones={Vales:{solicitar_cancelacion:false}};localStorage.setItem('usuarioActivo',JSON.stringify(usuarioPrueba));document.getElementById('cancelacionEnModulo').click();`);
 await wait('document.querySelector("[data-registro] option")!==null');
 assert.equal(await evaluate('document.querySelector("[data-confirmar]").disabled'),true);
 console.log('Navegador: roles, permisos, ancho móvil y cancelación contextual con motivo y permiso aprobados.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{socket?.close();browser?.kill();server.close();});
