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
  assert.equal(await evaluate('document.querySelectorAll("#tabla tbody tr").length'),5);
  const csv=[headings.join(','),values.join(','),['','Filtro','Area','3','4','','6','7'].join(','),'', ['8','<img src=x onerror=window.attacked=1>','Area','9','10','STOCK','11','12'].join(',')].join('\n');
  await upload('datos.csv',Buffer.from(csv));assert.equal(await evaluate('document.querySelector("select[data-mapping=unidad]").disabled'),true);
  assert.match(await evaluate('document.getElementById("gtPreview").textContent'),/003351/);
  await click('gtProcesar');assert.equal(await evaluate('document.querySelectorAll("#tabla tbody tr").length'),3);
  assert.equal(await evaluate('document.querySelector("#resultado pre").textContent'),expected);
  assert.equal(await evaluate('document.querySelectorAll("#resultado img").length'),0);assert.equal(await evaluate('!!window.attacked'),false);
  assert.match(await evaluate('document.getElementById("resultado").textContent'),/Falta Folio Interno Factura/);
  assert.equal(await evaluate('document.querySelectorAll("#tabla tbody tr")[1].querySelector("input[data-field=unidad]").value'),'UNIDADES');
  await evaluate(`document.querySelector('#resultado button').click()`);await until('copies.length===1');assert.equal(await evaluate('copies[0]'),expected);
  await click('gtCopiarTodos');await until('copies.length===2');assert.equal((await evaluate('copies[1]')).split('\n\n').length,2);
  await evaluate(`(()=>{const input=document.querySelectorAll('#tabla tbody tr')[1].querySelector('input[data-field=factura]');input.value='2';input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await until('document.querySelectorAll("#resultado pre").length===3');
  await evaluate(`(()=>{document.getElementById('gtFiltro').value='incompletos';document.getElementById('gtFiltro').dispatchEvent(new Event('change'));})()`);assert.equal(await evaluate('document.querySelectorAll("#resultado article").length'),0);
  await evaluate(`document.getElementById('gtFiltro').value='todos';document.getElementById('gtFiltro').dispatchEvent(new Event('change'));navigator.clipboard.writeText=async()=>{throw Error('denied')};document.execCommand=()=>{copies.push(document.activeElement.value);return true;};document.querySelector('#resultado button').click()`);
  await until('copies.length===3');assert.equal(await evaluate('copies[2]'),expected);assert.equal(await evaluate('document.getElementById("toast").textContent'),'Texto copiado al portapapeles');
  await click('gtLimpiar');assert.equal(await evaluate('document.querySelectorAll("#resultado pre").length'),0);assert.equal(await evaluate('document.querySelectorAll("#tabla tbody tr").length'),3);await click('gtGenerar');
  await click('gtAgregar');assert.equal(await evaluate('document.querySelectorAll("#tabla tbody tr").length'),4);await evaluate(`document.querySelector('#tabla tbody tr:last-child button').click()`);
  const book=new ExcelJS.Workbook();book.addWorksheet('Primera').addRows([headings,values]);book.addWorksheet('Segunda').addRows([['Titulo'],['Factura rara','Material','Area','OC','Req','Otra','Entrada','Portal Web'],values]);
  await upload('hojas.xlsx',await book.xlsx.writeBuffer());assert.equal(await evaluate('document.getElementById("gtHoja").options.length'),2);
  await evaluate(`document.getElementById('gtHoja').value='1';document.getElementById('gtHoja').dispatchEvent(new Event('change'));`);
  assert.equal(await evaluate('document.getElementById("gtEncabezado").value'),'2');
  await evaluate(`const select=document.querySelector('select[data-mapping=factura]');select.value='0';select.dispatchEvent(new Event('change'));`);
  await click('gtProcesar');assert.equal(await evaluate('document.querySelectorAll("#resultado pre").length'),4);
  await upload('invalid.xlsx',Buffer.from('bad'));assert.match(await evaluate('document.getElementById("gtEstado").textContent'),/no es un Excel XLSX/);assert.equal(await evaluate('document.querySelectorAll("#tabla tbody tr").length'),4);
  await upload('cancelar.csv',Buffer.from(csv));await click('gtCancelar');assert.equal(await evaluate('document.querySelectorAll("#tabla tbody tr").length'),4);
  const downloads=fs.mkdtempSync(path.join(temp,'downloads-'));
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});await click('gtDescargar');
  for(let i=0;i<100&&!fs.existsSync(path.join(downloads,'Textos_solicitudes_pago.txt'));i++)await new Promise(r=>setTimeout(r,100));
  const downloaded=fs.readFileSync(path.join(downloads,'Textos_solicitudes_pago.txt'),'utf8');assert.ok(downloaded.startsWith(expected));assert.equal(downloaded.split('\n\n').length,4);
  const many=[headings.join(','),...Array.from({length:1000},()=>values.join(','))].join('\n');await upload('muchas.csv',Buffer.from(many));await click('gtProcesar');
  assert.equal(await evaluate('document.querySelectorAll("#tabla tbody tr").length'),50);assert.match(await evaluate('document.getElementById("gtTablaPaginas").textContent'),/1004 filas/);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await new Promise(r=>setTimeout(r,500));
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true,'No horizontal overflow');
  await evaluate('document.getElementById("gtImportarTitulo").scrollIntoView()');
  await new Promise(r=>setTimeout(r,600));
  fs.writeFileSync(path.join(temp,'importacion-movil.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  console.log('Navegador: worker real, importación, edición, columna F, mapeo, hojas, incompletas, copia individual/total/fallback, TXT, captura manual, paginación y móvil aprobados.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{socket?.close();browser?.kill();server.close();});
