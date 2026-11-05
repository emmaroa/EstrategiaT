const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('modulos/importar-siif.html','utf8');
for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(script[1]);
let calls=0,active=0,maxActive=0,result={error:null,status:201};
const client={from(){const run=async()=>{calls++;active++;maxActive=Math.max(maxActive,active);await new Promise(r=>setTimeout(r,1));active--;return result;};return {insert:run,update:()=>({eq:()=>({select:run})})};}};
const ctx=vm.createContext({supabaseClient:client,console});
vm.runInContext(html.slice(html.indexOf('    function detalleErrorImportacion('),html.indexOf('    let importacionEnCurso')),ctx);
const progreso=()=>({nuevos:0,actualizados:0,fallidos:0});
(async()=>{
  result={status:500,error:{code:'40P01',message:'deadlock detected',details:'detalle',hint:'pista'}};
  await assert.rejects(ctx.insertarEnBloques('requis_siif',Array(401).fill({}),progreso()),/40P01.*deadlock.*detalle.*pista/);
  assert.equal(calls,1,'Do not continue after a server failure');calls=0;
  const filas=Array.from({length:45},(_,i)=>({linea:i,existente:{id:i,importe:1},registro:{importe:2}}));
  await assert.rejects(ctx.actualizarEnBloques('requis_siif',filas,progreso()));assert.equal(calls,1);
  calls=0;result={status:200,error:null,data:[{id:1}]};const p=progreso();await ctx.actualizarEnBloques('requis_siif',filas,p);
  assert.equal(calls,45);assert.equal(maxActive,1);assert.equal(p.actualizados,45);
  calls=0;const sinCambios=progreso();await ctx.actualizarEnBloques('requis_siif',[{existente:{id:1,importe:'2'},registro:{importe:2,updated_at:'nuevo'}}],sinCambios);
  assert.equal(calls,0);assert.equal(sinCambios.sinCambios,1);
  result={status:200,error:null,data:[]};await assert.rejects(ctx.actualizarEnBloques('requis_siif',filas,progreso()),/No se confirmó/);
  vm.runInContext('cancelacionSolicitada = true',ctx);calls=0;
  await assert.rejects(ctx.insertarEnBloques('requis_siif',[{}],progreso()),/cancelada/);assert.equal(calls,0);
  vm.runInContext('cancelacionSolicitada = false',ctx);
  result={status:401,error:{message:'No API key found in request'}};calls=0;
  await assert.rejects(ctx.actualizarEnBloques('requis_siif',filas,progreso()),/No API key/);assert.equal(calls,1);
  result={status:400,error:{code:'22007',message:'invalid date'}};const bad=progreso();
  assert.equal((await ctx.insertarEnBloques('requis_siif',Array(201).fill({}),bad)).length,11);assert.equal(bad.fallidos,201);
  let wrapped,captured;
  const enviados=[],historias=[];
  const escenario=vm.createContext({
    filasAnalizadas:[{estado:'Omitido',clave:'viejo',registro:{folio:'viejo'}},{estado:'Nuevo',clave:'parcial',registro:{folio:'parcial'}},{estado:'Nuevo',clave:'nuevo',registro:{folio:'nuevo'}}],
    archivoActual:{name:'prueba.csv'},CONFIG_IMPORTACION:{requisicion:{tabla:'requis_siif'}},tipoImportacionSiif:{value:'requisicion'},
    obtenerExistentesImportacion:async()=>new Map([['viejo',{folio:'viejo'}],['parcial',{folio:'parcial'}]]),
    renderizarAnalisisImportacion(){},btnEjecutarImportacion:{},ETFeedback:{confirmar:async()=>true},
    localStorage:{getItem:()=>null},document:{getElementById:()=>({})},
    insertarEnBloques:async(tabla,registros,p)=>{enviados.push(...registros);p.nuevos+=registros.length;return [];},
    actualizarEnBloques:async(tabla,filas,p)=>{assert.equal(filas.length,0);return [];},
    supabaseClient:{from(tabla){assert.equal(tabla,'importaciones_siif');return {
      insert:()=>({select:()=>({single:async()=>({data:{id:'carga'}})})}),
      update(datos){historias.push(datos);return {eq:()=>({eq:async()=>({error:null})})};}
    };}},
    window:{},alert(){},cargarHistorialImportaciones:async()=>{},limpiarImportacion(){}
  });
  vm.runInContext(html.slice(html.indexOf('    function cambiosRegistroImportacion('),html.indexOf('    async function insertarEnBloques(')),escenario);
  vm.runInContext(html.slice(html.indexOf('    function seleccionarRecientesImportacion('),html.indexOf('    function renderizarAnalisisImportacion(')),escenario);
  vm.runInContext(html.slice(html.indexOf('    async function ejecutarImportacionInterna('),html.indexOf('    function actualizarAyudaImportacion(')),escenario);
  await escenario.ejecutarImportacionInterna();
  assert.deepEqual(enviados.map(r=>r.folio),['nuevo']);
  assert.equal(historias[0].registros_actualizados,0);
  assert.equal(historias[0].registros_nuevos,1);
  assert.equal(historias[0].detalle_errores[0].existentes_omitidos,2);
  enviados.length=0;historias.length=0;
  vm.runInContext("filasAnalizadas = [{estado:'Omitido',clave:'viejo',registro:{}}]",escenario);
  await escenario.ejecutarImportacionInterna();
  assert.equal(enviados.length,0);assert.equal(historias.length,0);
  const existentes = new Map();
  const recientes = Array.from({length:150},(_,i)=>{
    const fecha = new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10);
    existentes.set(String(i),{id:i,fecha,estatus:'Pendiente'});
    return {clave:String(i),estado:'Omitido',registro:{fecha,estatus:i===149?'Pendiente':'Pagado'}};
  });
  recientes.push({clave:'alta',estado:'Nuevo',registro:{fecha:'2025-01-01',estatus:'Nuevo'}});
  escenario.seleccionarRecientesImportacion(recientes,existentes);
  assert.equal(recientes.filter(f=>f.estado==='Actualizar').length,99);
  assert.equal(recientes[49].estado,'Omitido');assert.equal(recientes[50].estado,'Actualizar');
  assert.equal(recientes[149].estado,'Sin cambios');assert.equal(recientes[150].estado,'Nuevo');
  recientes.reverse();escenario.seleccionarRecientesImportacion(recientes,existentes);
  assert.equal(recientes.find(f=>f.clave==='49').estado,'Omitido');
  escenario.filasAnalizadas=recientes;
  escenario.obtenerExistentesImportacion=async()=>existentes;
  escenario.actualizarEnBloques=async(tabla,filas,p)=>{assert.equal(filas.length,99);assert.ok(filas.every(f=>Number(f.clave)>=50));p.actualizados+=filas.length;return [];};
  await escenario.ejecutarImportacionInterna();
  assert.equal(historias[0].registros_actualizados,99);assert.equal(historias[0].registros_nuevos,1);
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
