const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('modulos/importar-siif.html','utf8');
for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(script[1]);
let calls=0,active=0,maxActive=0,result={error:null,status:201};
const client={from(){const run=async()=>{calls++;active++;maxActive=Math.max(maxActive,active);await new Promise(r=>setTimeout(r,1));active--;return result;};return {insert:run,update:()=>({eq:run})};}};
const ctx=vm.createContext({supabaseClient:client,console});
vm.runInContext(html.slice(html.indexOf('    function detalleErrorImportacion('),html.indexOf('    let importacionEnCurso')),ctx);
const progreso=()=>({nuevos:0,actualizados:0,fallidos:0});
(async()=>{
  result={status:500,error:{code:'40P01',message:'deadlock detected',details:'detalle',hint:'pista'}};
  await assert.rejects(ctx.insertarEnBloques('requis_siif',Array(401).fill({}),progreso()),/40P01.*deadlock.*detalle.*pista/);
  assert.equal(calls,1,'Do not continue after a server failure');calls=0;
  const filas=Array.from({length:45},(_,i)=>({linea:i,existente:{id:i},registro:{}}));
  await assert.rejects(ctx.actualizarEnBloques('requis_siif',filas,progreso()));assert.equal(calls,1);
  calls=0;result={status:200,error:null};const p=progreso();await ctx.actualizarEnBloques('requis_siif',filas,p);
  assert.equal(calls,45);assert.equal(maxActive,1);assert.equal(p.actualizados,45);
  result={status:401,error:{message:'No API key found in request'}};calls=0;
  await assert.rejects(ctx.actualizarEnBloques('requis_siif',filas,progreso()),/No API key/);assert.equal(calls,1);
  result={status:400,error:{code:'22007',message:'invalid date'}};const bad=progreso();
  assert.equal((await ctx.insertarEnBloques('requis_siif',Array(201).fill({}),bad)).length,2);assert.equal(bad.fallidos,201);
  let wrapped,captured;
  const context={Headers,URL,localStorage:{getItem:()=>null},console,
    window:{fetch:async(url,options)=>{captured=options;return {ok:true};}},
    supabase:{createClient:(url,key,options)=>{wrapped=options.global.fetch;return {};}}};
  vm.runInNewContext(fs.readFileSync('js/core/supabase.js','utf8'),context);
  const url=context.window.ETConfig.SUPABASE_URL+'/rest/v1/requis_siif';
  await wrapped(url,{method:'POST'});assert.equal(captured.headers.get('apikey'),context.window.ETConfig.SUPABASE_KEY);
  await wrapped(new Request(url,{headers:{Authorization:'Bearer test',apikey:'existing','Content-Type':'application/json'}}),{headers:{Prefer:'return=representation'}});
  assert.equal(captured.headers.get('Authorization'),'Bearer test');assert.equal(captured.headers.get('apikey'),'existing');assert.equal(captured.headers.get('Prefer'),'return=representation');
  await wrapped('https://example.org/',{});assert.equal(captured.headers.has('apikey'),false);
  console.log('Importación: corte en 500/401, error completo, escrituras secuenciales, conteo real y cabeceras verificadas.');
})().catch(error=>{console.error(error);process.exitCode=1;});
