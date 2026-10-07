const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
async function main() {
  const storage=new Map(),handlers={},calls=[];
  const profile={id:'00000000-0000-4000-8000-000000000100',nombre:'Compras',usuario:'compras',rol:'Compras',activo:true};
  const expires=new Date(Date.now()+8*3600000).toISOString();
  let response={data:{usuario:profile,token:'test-session-token',expira_en:expires},error:null},legacy=0;
  const elements={usuario:{value:'compras'},password:{value:'test-only'},mensajeError:{textContent:''},btnLogin:{dataset:{},innerHTML:'Entrar',classList:{add(){},remove(){}},setAttribute(){},removeAttribute(){}}};
  for(const [id,el] of Object.entries(elements))el.addEventListener=(event,fn)=>{handlers[id+':'+event]=fn;};
  const context={console,AbortSignal,setTimeout:()=>1,clearTimeout(){},addEventListener(){},alert(){},location:{pathname:'/index.html'},
    document:{getElementById:id=>elements[id]||null,addEventListener(){}},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,val)=>storage.set(key,val),removeItem:key=>storage.delete(key)},
    supabaseClient:{rpc(name,args){calls.push({name,args});const p=Promise.resolve(name==='iniciar_sesion_aplicacion'?response:{data:null,error:null});p.abortSignal=()=>p;return p;},
      from(){legacy++;return {select(){return this;},eq(){return this;},single:async()=>({data:profile,error:null})};}}
  };
  context.window=context;vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/core/auth.js','utf8'),context);
  context.registrarAuditoria=async()=>{};
  async function login(){handlers['btnLogin:click']();for(let i=0;i<20;i++)await Promise.resolve();}
  await login();
  let stored=JSON.parse(storage.get('usuarioActivo'));
  assert.equal(stored.flujo_token,'test-session-token');assert.equal(stored.sesion_expira_en,new Date(expires).getTime());
  assert.equal(Object.hasOwn(stored,'password'),false);assert.equal(legacy,0);
  assert.equal(context.location.href,'dashboard.html');
  await context.cerrarSesion();assert.equal(storage.has('usuarioActivo'),false);
  assert.ok(calls.some(c=>c.name==='cerrar_sesion_aplicacion'&&c.args.p_token==='test-session-token'));
  response={data:null,error:{code:'42501'}};await login();
  assert.equal(storage.has('usuarioActivo'),false);assert.equal(legacy,0,'No fallback after bad credentials');
  response={data:null,error:{code:'PGRST202'}};await login();
  stored=JSON.parse(storage.get('usuarioActivo'));assert.equal(legacy,1);assert.equal(stored.flujo_token,undefined);
  console.log('Login normal: token sin contraseña persistida, expiración de servidor, cierre/revocación, denegación y compatibilidad sin migración verificados.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
