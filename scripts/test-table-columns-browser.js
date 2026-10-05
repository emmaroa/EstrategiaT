const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),temp=path.join(root,'.tmp-textos');fs.mkdirSync(temp,{recursive:true});
const fixture=`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><script>localStorage.setItem('usuarioActivo',JSON.stringify({id:'columns-test'}));</script><script src="/js/core/table-columns.js"></script><script src="/js/services/export.service.js"></script><style>.et-page-hidden{display:none}table{width:100%}body{margin:8px}</style></head><body>
<table id="first"><thead><tr><th>Unidad</th><th>Descripción</th><th style="display:none">Privado</th><th>Acciones</th></tr></thead><tbody><tr><td>0012</td><td>Cruceta, filtro</td><td>SECRETO</td><td><button>Editar</button></td></tr><tr class="et-page-hidden"><td>0020</td><td>=SUM(1)</td><td>SECRETO</td><td></td></tr><tr hidden><td>0030</td><td>Filtrado</td><td>SECRETO</td><td></td></tr></tbody><tfoot><tr><td colspan="4">Total</td></tr></tfoot></table>
<table id="second"><thead><tr><th>Unidad</th><th>Descripción</th></tr></thead><tbody><tr><td>99</td><td>Otro</td></tr></tbody></table>
<table id="grouped"><thead><tr><th rowspan="2">Unidad</th><th colspan="2">Importes</th></tr><tr><th>Subtotal</th><th>Total</th></tr></thead><tbody><tr><td>12</td><td>100</td><td>116</td></tr></tbody></table>
</body></html>`;
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');if(url.pathname==='/fixture'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end(fixture);return;}
  const p=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!p.startsWith(root+path.sep)||!fs.existsSync(p)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/plain');res.end(fs.readFileSync(p));
});
let browser,socket;
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  const profile=fs.mkdtempSync(path.join(temp,'columns-'));browser=spawn(process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless','--no-sandbox','--disable-gpu','--no-first-run','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
  const portFile=path.join(profile,'DevToolsActivePort');for(let i=0;!fs.existsSync(portFile);i++){if(i>100)throw Error('Browser timeout');await new Promise(r=>setTimeout(r,100));}
  const port=fs.readFileSync(portFile,'utf8').split('\n')[0],targets=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());
  socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
  let id=0;const pending=new Map();socket.addEventListener('message',e=>{const v=JSON.parse(e.data);if(pending.has(v.id)){const [ok,no]=pending.get(v.id);pending.delete(v.id);v.error?no(Error(v.error.message)):ok(v.result);}});
  const send=(method,params={})=>new Promise((ok,no)=>{const key=++id;pending.set(key,[ok,no]);socket.send(JSON.stringify({id:key,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error('Timeout: '+expression);}
  const action=text=>evaluate(`[...document.querySelectorAll('dialog button')].find(b=>b.textContent===${JSON.stringify(text)}).click()`);
  await send('Page.enable');await send('Page.navigate',{url:origin+'/fixture'});await until('document.querySelectorAll(".et-column-toolbar").length===3');
  await evaluate(`document.querySelector('#first').previousElementSibling.querySelector('button').click()`);
  assert.equal(await evaluate('document.querySelectorAll("dialog input").length'),3,'Private column unavailable');
  await action('Ninguna');assert.equal(await evaluate('[...document.querySelectorAll("dialog button")].find(b=>b.textContent==="Aplicar").disabled'),true);
  await action('Todas');await evaluate('document.querySelectorAll("dialog input")[1].click()');await action('Aplicar');
  assert.equal(await evaluate('getComputedStyle(document.querySelector("#first tbody td:nth-child(2)")).display'),'none');
  assert.equal(await evaluate('document.querySelector("#first tfoot td").colSpan'),2,'Totals colspan adjusts');
  assert.notEqual(await evaluate('getComputedStyle(document.querySelector("#second tbody td:nth-child(2)")).display'),'none','Other tables unaffected');
  await evaluate(`document.querySelector('#first tbody').insertAdjacentHTML('beforeend','<tr><td>0040</td><td>Nuevo</td><td>SECRETO</td><td></td></tr>')`);
  await until('document.querySelector("#first tbody tr:last-child td:nth-child(2)").classList.contains("et-column-hidden")');
  await send('Page.reload');await until('document.querySelector("#first tbody td:nth-child(2)")?.classList.contains("et-column-hidden")');
  await evaluate(`localStorage.setItem('usuarioActivo',JSON.stringify({id:'another-user'}));ETTableColumns.scan()`);
  assert.notEqual(await evaluate('getComputedStyle(document.querySelector("#first tbody td:nth-child(2)")).display'),'none','Preferences isolated by user');
  await evaluate(`localStorage.setItem('usuarioActivo',JSON.stringify({id:'columns-test'}));ETTableColumns.scan();document.querySelector('#grouped').previousElementSibling.querySelector('button').click()`);
  await evaluate('document.querySelectorAll("dialog input")[1].click()');await action('Aplicar');
  assert.equal(await evaluate('document.querySelector("#grouped thead tr:first-child th:last-child").colSpan'),1);
  assert.equal(await evaluate('getComputedStyle(document.querySelector("#grouped tbody td:nth-child(2)")).display'),'none');
  const downloads=fs.mkdtempSync(path.join(temp,'column-downloads-'));await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  await evaluate(`document.querySelector('#first').previousElementSibling.querySelector('button:last-child').click()`);
  assert.equal(await evaluate('document.querySelectorAll("dialog input").length'),2,'No action or restricted columns in export');
  await action('Usar columnas visibles');assert.deepEqual(await evaluate('[...document.querySelectorAll("dialog input")].map(n=>n.checked)'),[true,false]);
  await action('Todas');await action('Aplicar');
  for(let i=0;i<100&&!fs.existsSync(path.join(downloads,'tabla-first.csv'));i++)await new Promise(r=>setTimeout(r,100));
  const csv=fs.readFileSync(path.join(downloads,'tabla-first.csv'),'utf8');assert.ok(csv.includes('0012')&&csv.includes('0020')&&!csv.includes('0030')&&!csv.includes('SECRETO'));assert.ok(csv.includes("'=SUM(1)"));
  assert.equal(await evaluate('getComputedStyle(document.querySelector("#first tbody td:nth-child(2)")).display'),'none','Export does not change view');
  await evaluate(`window.finished=false;void ETExport.exportarCSV('service',[{key:'unidad',label:'Unidad'},{key:'descripcion',label:'Descripción'}],[{unidad:'0077',descripcion:'Servicio'}]).then(()=>{finished=true;})`);
  await until('!!document.querySelector("dialog[open]")');await evaluate('document.querySelector("dialog input").click()');await action('Aplicar');await until('finished');
  for(let i=0;i<100&&!fs.existsSync(path.join(downloads,'service.csv'));i++)await new Promise(r=>setTimeout(r,100));
  assert.equal(fs.readFileSync(path.join(downloads,'service.csv'),'utf8').replace(/^\ufeff/,''),'Descripción\nServicio');
  await evaluate(`document.querySelector('#first').previousElementSibling.querySelector('button').click()`);await action('Todas');await action('Cancelar');
  assert.equal(await evaluate('getComputedStyle(document.querySelector("#first tbody td:nth-child(2)")).display'),'none','Cancel preserves preferences');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate(`document.querySelector('#first').previousElementSibling.querySelector('button').click()`);
  assert.equal(await evaluate('document.querySelector("dialog").getBoundingClientRect().width <= innerWidth'),true);
  console.log('Columnas: persistencia, aislamiento, filas dinámicas, permisos, encabezados agrupados, totales, cancelación, CSV real, paginación y móvil aprobados.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{socket?.close();browser?.kill();server.close();});
