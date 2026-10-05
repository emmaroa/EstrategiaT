const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),ExcelJS=require('../js/vendor/exceljs.js');
const root=path.resolve(__dirname,'..'),temp=path.join(root,'.tmp-textos');fs.mkdirSync(temp,{recursive:true});
const headings=['Factura','Material','Area','OC','Req','Cualquier encabezado','Entrada','Portal Web','Unidad'];
const values=['4587','Balatas delanteras','Servicios publicos','1724','2851','003351','963','01458','OTRA'];
const expected='003351: PAGO DE FACTURA 4587 POR ADQUISICION DE BALATAS DELANTERAS PARA UNIDAD 003351 DE SERVICIOS PUBLICOS.\nOC 1724 REQ 2851 963\nPROCEDIMIENTO EN PORTAL WEB DE COMPRAS: 01458';
const server=http.createServer((req,res)=>{
  const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404).end();return;}
  let body=fs.readFileSync(p);
  if(p.endsWith(path.join('core','licencia.js')))body=Buffer.from('// Isolated browser test');
  if(p.endsWith('generar-textos.html')){
    body=body.toString().replace(/<script[^>]+src="[^\"]*(?:-supabase-supabase-js|core\/(?:supabase|auth|privacy|accessibility))\.js(?:\?[^\"]*)?"[^>]*><\/script>/g,'');
    body=body.replace('</head>',`<script>localStorage.setItem('usuarioActivo',JSON.stringify({id:'11111111-1111-4111-8111-111111111111',rol:'SuperAdmin',sesion_expira_en:Date.now()+3600000}));window.validarPermiso=()=>true;window.copies=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>copies.push(text)}});window.supabaseClient={from:()=>{let chain=new Proxy({},{get:(_,k)=>k==='then'?(ok=>Promise.resolve({data:[],error:null}).then(ok)):(()=>chain)});return chain;},rpc:async()=>({data:null,error:null})};</script></head>`);
  }
  res.setHeader('Content-Type',p.endsWith('.html')?'text/html;charset=utf-8':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'application/octet-stream');res.end(body);
});
let browser,socket;
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  const profile=fs.mkdtempSync(path.join(temp,'browser-'));browser=spawn(process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless','--no-sandbox','--disable-gpu','--no-first-run','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
  const portFile=path.join(profile,'DevToolsActivePort');for(let i=0;!fs.existsSync(portFile);i++){if(i>100)throw Error('Browser timeout');await new Promise(r=>setTimeout(r,100));}
  const port=fs.readFileSync(portFile,'utf8').split('\n')[0],targets=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());
  socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
  let id=0;const pending=new Map();socket.addEventListener('message',e=>{const v=JSON.parse(e.data);if(pending.has(v.id)){const [ok,no]=pending.get(v.id);pending.delete(v.id);v.error?no(Error(v.error.message)):ok(v.result);}});
  const send=(method,params={})=>new Promise((ok,no)=>{const key=++id;pending.set(key,[ok,no]);socket.send(JSON.stringify({id:key,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  async function until(expression){for(let i=0;i<150;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error('Timeout: '+expression+' · '+await evaluate('document.getElementById("gtEstado")?.textContent'));}
  const click=id=>evaluate('document.getElementById('+JSON.stringify(id)+').click()');
  const upload=async(name,buffer)=>{
    await evaluate(`(()=>{const bytes=Uint8Array.from(atob(${JSON.stringify(Buffer.from(buffer).toString('base64'))}),c=>c.charCodeAt(0));const dt=new DataTransfer();dt.items.add(new File([bytes],${JSON.stringify(name)}));const input=document.getElementById('gtArchivo');input.files=dt.files;input.dispatchEvent(new Event('change'));})()`);
    await until('!document.getElementById("gtSeleccionar").disabled');
  };
  await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:origin+'/modulos/generar-textos.html'});await until('!!document.getElementById("gtTablaPaginas")');

  await evaluate(`window.calendarRows=[];window.notificationUpdates=0;window.notificationLoads=0;supabaseClient.from=table=>{let update=false;const chain=new Proxy({},{get:(_,key)=>key==='then'?(resolve=>{if(update)notificationUpdates++;if(table==='eventos_calendario')notificationLoads++;return Promise.resolve({data:table==='eventos_calendario'?calendarRows:[],error:null}).then(resolve)}):(...args)=>{if(key==='update')update=true;return chain;}});return chain;};calendarRows=[{id:'11111111-1111-4111-8111-111111111112',titulo:'Reunion prueba',alcance:'Seleccionados',destinatarios:['11111111-1111-4111-8111-111111111111'],creado_por:'other',fecha_inicio:new Date(Date.now()+20*60000).toISOString(),fecha_fin:new Date(Date.now()+80*60000).toISOString(),creado_en:new Date().toISOString()}];window.dispatchEvent(new Event('et-calendar-changed'));`);
  await until('document.querySelectorAll(".et-notification-item").length===2');
  assert.equal(await evaluate('document.querySelector(".et-notifications-badge").textContent'),'2');
  await evaluate('document.querySelector(".et-notifications-trigger").click()');
  await until('!document.querySelector(".et-notifications-panel").hidden');
  await evaluate('document.querySelector("[data-read-one]").click()');
  await until('document.querySelectorAll(".et-notification-item.is-new").length===1');
  assert.equal(await evaluate('notificationUpdates'),0,'Calendar read does not update database IDs');
  await evaluate('document.querySelector("[data-read-one]").click()');
  await until('document.querySelectorAll(".et-notification-item.is-new").length===0');
  await evaluate('window.dispatchEvent(new Event("focus"))');
  await until('notificationLoads>=2');
  assert.equal(await evaluate('document.querySelectorAll(".et-notification-item.is-new").length'),0);
  await evaluate('calendarRows=[];window.dispatchEvent(new Event("et-calendar-changed"))');
  await until('document.querySelectorAll(".et-notification-item").length===0');
  console.log('Calendario en navegador: campana, contador, actualizacion, lectura local y retirada de eventos aprobados.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{socket?.close();browser?.kill();server.close();});
