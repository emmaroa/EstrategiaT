// Navegador aislado: datos sintéticos, sin credenciales ni llamadas a producción.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),temp=path.join(root,'.tmp-textos');fs.mkdirSync(temp,{recursive:true});
function fixture() {
  localStorage.setItem('usuarioActivo',JSON.stringify({id:'test',usuario:'emma',nombre:'Prueba',rol:'SuperAdmin',modulos_permitidos:[{modulo:'Dashboard',permiso:'editar'}]}));
  window.validarPermiso=()=>true;window.esSoloLectura=()=>false;
  window.supabaseClient={from(){const q=new Proxy({},{get(_,k){if(k==='then')return ok=>Promise.resolve({data:[],error:null}).then(ok);return()=>q;}});return q;},rpc:async()=>({data:[],error:null})};
}
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  let body=fs.readFileSync(file);
  if(file.endsWith(path.join('core','licencia.js')))body=Buffer.from('// isolated test');
  if(file.endsWith('reporte-mir.html')) {
    body=body.toString().replace(/<script[^>]+src="[^\"]*core\/(?:supabase|auth|privacy|accessibility)\.js(?:\?[^\"]*)?"[^>]*><\/script>/g,'');
    body=body.replace('</head>','<script>('+fixture.toString()+')()</script></head>');
  }
  res.setHeader('Content-Type',file.endsWith('.html')?'text/html;charset=utf-8':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream');res.end(body);
});
let browser,socket;
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const profile=fs.mkdtempSync(path.join(temp,'mir-browser-'));
  browser=spawn(process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless','--no-sandbox','--disable-gpu','--no-first-run','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
  const portFile=path.join(profile,'DevToolsActivePort');
  for(let i=0;!fs.existsSync(portFile);i++){if(i>100)throw Error('Browser timeout');await new Promise(r=>setTimeout(r,100));}
  const port=fs.readFileSync(portFile,'utf8').split('\n')[0],targets=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());
  socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
  let seq=0;const pending=new Map();socket.addEventListener('message',e=>{const v=JSON.parse(e.data);if(pending.has(v.id)){const [ok,no]=pending.get(v.id);pending.delete(v.id);v.error?no(Error(v.error.message)):ok(v.result);}});
  const send=(method,params={})=>new Promise((ok,no)=>{const id=++seq;pending.set(id,[ok,no]);socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error('Timeout: '+expression+' / '+await evaluate('document.title'));}
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/modulos/reporte-mir.html'});
  await until('!!document.querySelector("#etNav a[href*=reporte-mir]")');
  assert.equal(await evaluate('ETPermissions.obtenerPermisoModuloUsuario({rol:"SuperAdmin",modulos_permitidos:[{modulo:"Reporte MIR",permiso:"none"}]},"Reporte MIR")'),'none');
  await evaluate(String.raw`(()=>{const dt=new DataTransfer();dt.items.add(new File(['Folio Sol. Manto,Folio Orden,Descripci\u00f3n Corta,Dependencia,Tipo Manto,Costo Total\n1,10,JAC E10X,Servicios,Preventivo,100\n2,,Camion,Seguridad,Correctivo,200\n3,11,<img src=x onerror=alert(1)>,Servicios,Preventivo,50'],"mir.csv",{type:"text/csv"}));const input=document.getElementById('csvFileInput');input.files=dt.files;input.dispatchEvent(new Event('change'));})()`);
  await until('document.querySelectorAll("#tableBody tr").length===3');
  assert.equal(await evaluate('document.getElementById("cardTotalFolios").textContent'),'3');
  assert.equal(await evaluate('document.querySelectorAll("#tableBody img").length'),0);
  assert.equal(await evaluate('!!Chart.getChart("chartComparison")'),true);
  await evaluate('document.getElementById("dependenciaFilter").value="Servicios";document.getElementById("dependenciaFilter").dispatchEvent(new Event("change"))');
  assert.equal(await evaluate('document.querySelectorAll("#tableBody tr").length'),2);
  await evaluate('ETTableColumns.selectExport=async headers=>headers.map((_,i)=>i);window.exportBlob=null;URL.createObjectURL=b=>{window.exportBlob=b;return "blob:mock"};URL.revokeObjectURL=()=>{};HTMLAnchorElement.prototype.click=()=>{};document.getElementById("exportCsvBtn").click()');
  await until('window.exportBlob!==null');
  const csv=await evaluate('exportBlob.text()');assert.ok(csv.includes('Servicios'));assert.ok(!csv.includes('Seguridad'));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".mir-charts")).gridTemplateColumns.split(" ").length'),1);
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(temp,'mir-preview.png'),Buffer.from(shot.data,'base64'));
  console.log('MIR: menu, permisos, CSV, indicadores, graficas, filtros, exportacion, escape de texto y vista movil aprobados.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{socket?.close();browser?.kill();server.close();});
