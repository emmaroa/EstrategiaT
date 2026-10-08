// Navegador aislado: datos sintéticos, sin credenciales ni llamadas a producción.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),temp=path.join(root,'.tmp-textos');fs.mkdirSync(temp,{recursive:true});
function fixture() {
  localStorage.setItem('usuarioActivo',JSON.stringify({id:'00000000-0000-4000-8000-000000000100',rol:'SuperAdmin',flujo_token:'test-session',sesion_expira_en:Date.now()+3600000}));
  window.validarPermiso=()=>true;window.esSoloLectura=()=>false;
  window.mockRows=Array.from({length:65},(_,i)=>({id:'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),numero_req:String(i+1),oficio_req:'OF-'+(i+1),fecha_req:'2026-10-01',dependencia:i<35?'Servicios':'Seguridad',proveedor:'Proveedor Uno',proveedores:['Proveedor Uno'],concepto:'Refacciones',monto:100,cantidad_oc:1,cantidad_sp:0,numero_oc:'45',etapa_actual:'Orden de compra',ordenes_compra:[{numero_oc:'45',importe:100}],solicitudes_pago:[]}));
  window.mockStates=new Map();window.mockHistory=new Map();window.mockWrites=[];
  window.supabaseClient={from(table){let begin=0,end=999;const q=new Proxy({},{get(_,k){if(k==='then')return ok=>Promise.resolve({data:table==='seguimiento_siif'?mockRows.slice(begin,end+1):[],count:table==='seguimiento_siif'?65:0,error:null}).then(ok);if(k==='range')return(a,b)=>{begin=a;end=b;return q;};return()=>q;}});return q;},async rpc(name,args){
    if(name==='consultar_flujo_siif')return {data:args.p_ids.map(id=>mockStates.get(id)).filter(Boolean)};
    if(name==='historial_flujo_siif')return {data:mockHistory.get(args.p_requisicion)||[]};
    if(name==='mover_flujo_siif') {
      mockWrites.push(args);
      for(const item of args.p_tramites){const before=mockStates.get(item.id)||{etapa:0,ubicacion:'Sin registrar',responsable:'',revision:0};
        const after={requisicion_id:item.id,etapa:args.p_etapa,ubicacion:args.p_ubicacion,responsable:args.p_responsable,proveedor_espera:args.p_proveedor,acuse:args.p_acuse,nota:args.p_nota,revision:before.revision+1,desde:new Date().toISOString()};
        mockStates.set(item.id,after);mockHistory.set(item.id,[{id:1,antes:before,despues:after,usuario_nombre:'Compras',fecha:new Date().toISOString()}]);}
      return {data:args.p_tramites.length};
    }
    return {data:[]};
  }};
}
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  let body=fs.readFileSync(file);
  if(file.endsWith(path.join('core','licencia.js')))body=Buffer.from('// isolated test');
  if(file.endsWith('seguimiento-siif.html')) {
    body=body.toString().replace(/<script[^>]+src="[^\"]*core\/(?:supabase|auth|privacy|accessibility)\.js(?:\?[^\"]*)?"[^>]*><\/script>/g,'');
    body=body.replace('</head>','<script>('+fixture.toString()+')()</script></head>');
  }
  res.setHeader('Content-Type',file.endsWith('.html')?'text/html;charset=utf-8':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream');res.end(body);
});
let browser,socket;
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const profile=fs.mkdtempSync(path.join(temp,'flow-browser-'));
  browser=spawn(process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless','--no-sandbox','--disable-gpu','--no-first-run','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
  const portFile=path.join(profile,'DevToolsActivePort');
  for(let i=0;!fs.existsSync(portFile);i++){if(i>100)throw Error('Browser timeout');await new Promise(r=>setTimeout(r,100));}
  const port=fs.readFileSync(portFile,'utf8').split('\n')[0],targets=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());
  socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
  let seq=0;const pending=new Map();socket.addEventListener('message',e=>{const v=JSON.parse(e.data);if(pending.has(v.id)){const [ok,no]=pending.get(v.id);pending.delete(v.id);v.error?no(Error(v.error.message)):ok(v.result);}});
  const send=(method,params={})=>new Promise((ok,no)=>{const id=++seq;pending.set(id,[ok,no]);socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error('Timeout: '+expression+' / '+await evaluate('document.getElementById("flujoEstado")?.textContent'));}
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/modulos/seguimiento-siif.html'});
  await until('document.querySelectorAll("#tablaSeguimientoSiif tr[data-tramite]").length===30');
  await until('document.querySelectorAll("[data-flujo-check]").length===30');
  assert.equal(await evaluate('document.querySelector("#flujoClave")'),null);
  assert.equal(await evaluate('document.querySelectorAll("[data-flujo-check]").length'),30);
  await evaluate('document.querySelector("[data-flujo-check]").click();document.getElementById("btnSiifSiguiente").click()');
  assert.equal(await evaluate('document.getElementById("flujoSeleccion").textContent'),'1 seleccionados');
  await evaluate('document.getElementById("filtroDependenciaSiif").value="Servicios";document.getElementById("filtroDependenciaSiif").dispatchEvent(new Event("change"))');
  assert.equal(await evaluate('document.getElementById("flujoSeleccion").textContent'),'0 seleccionados');
  await evaluate('document.getElementById("flujoTodos").click();document.getElementById("flujoMover").click()');
  assert.equal(await evaluate('document.getElementById("flujoSeleccion").textContent'),'35 seleccionados');
  assert.equal(await evaluate('document.getElementById("flujoDialogo").open'),true);
  await evaluate('document.getElementById("flujoEtapa").value="3";document.getElementById("flujoEtapa").dispatchEvent(new Event("change"));document.getElementById("flujoPersona").value="<img src=x onerror=window.attack=1>";document.getElementById("flujoProveedor").value="Proveedor Uno";document.getElementById("flujoNota").value="=1+1";document.getElementById("flujoFormulario").requestSubmit()');
  await until('window.mockWrites.length===1 && !document.getElementById("flujoDialogo").open && document.getElementById("flujoCantidad0").textContent==="35"');
  assert.equal(await evaluate('mockWrites[0].p_tramites.length'),35);
  assert.equal(await evaluate('mockWrites[0].p_ubicacion'),'Compras');
  await evaluate('document.querySelector("#tablaSeguimientoSiif tr td:nth-child(3)").click()');
  await until('document.querySelectorAll(".flujo-historial li").length===1');
  assert.equal(await evaluate('Boolean(window.attack)||document.querySelectorAll(".flujo-detalle img").length>0'),false);
  assert.ok(await evaluate('document.querySelector(".flujo-detalle").textContent.includes("Proveedor Uno")'));
  await evaluate('cerrarDetalleSiif();window.exportBlob=null;URL.createObjectURL=b=>{window.exportBlob=b;return "blob:mock"};URL.revokeObjectURL=()=>{};HTMLAnchorElement.prototype.click=()=>{};ETTableColumns.selectExport=async h=>h.map((_,i)=>i);exportarSeguimientoSiif()');
  await until('window.exportBlob!==null');
  const csv=await evaluate('exportBlob.text()');assert.equal(csv.split('\r\n').length,36);assert.ok(csv.includes('"\'=1+1"'));assert.ok(csv.includes('Proveedor Uno'));
  await evaluate('document.querySelector("[data-flujo-avanzar]").click()');
  assert.equal(await evaluate('document.getElementById("flujoEtapa").value'),'4');
  assert.ok(await evaluate('document.getElementById("flujoPersona").value.includes("<img")'));
  await evaluate('document.querySelectorAll("[data-flujo-paso]")[7].click()');
  assert.equal(await evaluate('document.getElementById("flujoEtapa").value'),'8');
  assert.equal(await evaluate('document.getElementById("flujoLugar").value'),'Almacén');
  await evaluate('document.getElementById("flujoCancelar").click();document.querySelector("[data-flujo-check]").click();document.querySelectorAll("[data-flujo-destino]")[3].click()');
  assert.equal(await evaluate('document.getElementById("flujoEtapa").value'),'10');
  assert.equal(await evaluate('document.getElementById("flujoLugar").value'),'Enviado');
  assert.equal(await evaluate('mockWrites.length'),1,'Los accesos rápidos permiten revisar antes de guardar');
  await evaluate('document.getElementById("flujoCancelar").click()');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".flujo-lugares")).gridTemplateColumns.split(" ").length'),2);
  await evaluate('(()=>{const dt=new DataTransfer();dt.items.add(new File(["Requisición\\n60\\n61\\n61\\n999"],"requisiciones.csv",{type:"text/csv"}));document.getElementById("flujoCsvArchivo").files=dt.files;document.getElementById("flujoCsvArchivo").dispatchEvent(new Event("change"));})()');
  await until('document.getElementById("flujoCsvDialogo").open');
  assert.ok(await evaluate('document.getElementById("flujoCsvResumen").textContent.startsWith("2 requisiciones encontradas")'));
  assert.ok(await evaluate('document.getElementById("flujoCsvResultados").textContent.includes("Repetida en CSV")'));
  assert.equal(await evaluate('mockWrites.length'),1,'Cargar y revisar CSV no modifica datos');
  await evaluate('document.getElementById("flujoCsvContinuar").click()');
  assert.equal(await evaluate('document.getElementById("flujoDialogo").open'),true);
  assert.equal(await evaluate('document.getElementById("flujoLoteLista").textContent'),'REQ 60, REQ 61');
  await evaluate('document.querySelectorAll("[data-flujo-paso]")[7].click();document.getElementById("flujoPersona").value="Responsable CSV";document.getElementById("flujoFormulario").requestSubmit()');
  await until('mockWrites.length===2 && !document.getElementById("flujoDialogo").open');
  assert.equal(await evaluate('mockWrites[1].p_tramites.length'),2);
  assert.equal(await evaluate('mockWrites[1].p_etapa'),8);
  await evaluate("seguimientoSiif[0].solicitudes_pago=[{estatus:'Emitido'}];document.querySelector('[data-flujo-mover]').click();document.querySelectorAll('[data-flujo-paso]')[9].click()");
  await evaluate('document.getElementById("flujoLugar").value="Compras";document.getElementById("flujoPersona").value="Responsable libre";document.getElementById("flujoFormulario").requestSubmit()');
  await until('mockWrites.length===3 && !document.getElementById("flujoDialogo").open');
  assert.equal(await evaluate('mockWrites[2].p_ubicacion'),'Compras');
  assert.equal(await evaluate('mockWrites[2].p_etapa'),10);
  await evaluate('window.esSoloLectura=()=>true;renderizarSeguimientoSiif()');
  assert.equal(await evaluate('document.querySelectorAll("[data-flujo-check]").length'),0);
  assert.equal(await evaluate('document.getElementById("flujoCsvSubir").disabled'),true);
  console.log('Flujo SIIF navegador: activación, 65 registros, selección entre páginas, filtros, lote de 35, proveedor, historial, XSS, CSV filtrado, móvil y sólo lectura correctos.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{socket?.close();browser?.kill();server.close();});
