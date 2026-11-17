const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('js/core/rbac.js','utf8');
async function caso(respuesta,token='token'){
 let valor=JSON.stringify({flujo_token:token}),destino=null,intervalo;const eventos={};
 const ctx={localStorage:{getItem:()=>valor,removeItem:()=>valor=null,setItem:(k,v)=>valor=v},
  location:{pathname:'/modulos/peticiones.html',replace:v=>destino=v,reload(){}},document:{hidden:false},
  addEventListener:(k,f)=>eventos[k]=f,setInterval:(f,ms)=>{assert.equal(ms,30000);intervalo=f;},
  supabaseClient:{rpc:async()=>respuesta}};
 ctx.window=ctx;vm.runInNewContext(code,ctx);await new Promise(r=>setImmediate(r));
 return {ctx,eventos,intervalo,get valor(){return valor;},get destino(){return destino;},set valor(v){valor=v;}};
}
(async()=>{
 const revocada=await caso({data:null});assert.equal(revocada.valor,null);assert.equal(revocada.destino,'../index.html');
 const error=await caso({error:{code:'57014'}});assert.ok(error.valor);assert.equal(error.destino,null);
 const antigua=await caso({},null);assert.equal(antigua.valor,null);
 let resolve;const pendiente=new Promise(r=>resolve=r);const race=await caso(pendiente);
 race.valor=JSON.stringify({flujo_token:'nuevo'});resolve({data:null});await new Promise(r=>setImmediate(r));
 assert.equal(JSON.parse(race.valor).flujo_token,'nuevo');assert.equal(race.destino,null);
 const valida=await caso({data:{id:'u',rol:'Consulta',activo:true}});assert.ok(valida.valor);
 valida.ctx.supabaseClient.rpc=async()=>({data:null});valida.intervalo();await new Promise(r=>setImmediate(r));assert.equal(valida.valor,null);
 console.log('Revocación: cierre, sesión heredada, red, carrera con nuevo login y comprobación periódica aprobados.');
})().catch(e=>{console.error(e);process.exitCode=1;});
