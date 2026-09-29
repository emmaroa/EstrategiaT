// Browser integration with synthetic XML. No production account or network calls.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),temp=path.join(root,'.tmp-cotizacion');fs.mkdirSync(temp,{recursive:true});
const fixture=(version='4.0',count=1,tax=true)=>`<?xml version="1.0" encoding="UTF-8"?><x:Comprobante xmlns:x="http://www.sat.gob.mx/cfd/${version==='3.3'?'3':'4'}" Version="${version}" TipoDeComprobante="I" Fecha="2026-09-29T10:30:00" Moneda="MXN" SubTotal="${100*count}" Total="${(tax?116:100)*count}"><x:Emisor Rfc="AAA010101AAA" Nombre="Refacciones Álvarez" RegimenFiscal="601"/><x:Receptor Rfc="BBB010101BBB" Nombre="Taller"/><x:Conceptos>${Array.from({length:count},(_,i)=>`<x:Concepto ClaveProdServ="123" Cantidad="1" ClaveUnidad="H87" Unidad="Pieza" Descripcion="Concepto ${i+1} · Filtro de aceite y mantenimiento de la unidad" ValorUnitario="100" Importe="100">${tax?'<x:Impuestos><x:Traslados><x:Traslado Base="100" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="16"/></x:Traslados></x:Impuestos>':''}</x:Concepto>`).join('')}</x:Conceptos>${tax?`<x:Impuestos TotalImpuestosTrasladados="${16*count}"/>`:''}</x:Comprobante>`;
const server=http.createServer((req,res)=>{
  const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404).end();return;}
  let body=fs.readFileSync(p);
  if(p.endsWith(path.join('core','licencia.js')))body=Buffer.from('// License is not part of this isolated test.');
  if(p.endsWith('crear-cotizacion.html')){
    body=body.toString().replace(/<script[^>]+src="[^\"]*(?:-supabase-supabase-js|core\/(?:supabase|auth|privacy|accessibility))\.js"[^>]*><\/script>/g,'');
    body=body.replace('</head>',`<script>localStorage.setItem('usuarioActivo',JSON.stringify({id:'11111111-1111-4111-8111-111111111111',rol:'SuperAdmin',modulos_permitidos:[{modulo:'Dashboard',permiso:'editar'}],sesion_expira_en:Date.now()+3600000}));window.validarPermiso=()=>true;window.printCalls=0;window.print=()=>printCalls++;window.supabaseClient={from:()=>{let chain=new Proxy({},{get:(_,k)=>k==='then'?(ok=>Promise.resolve({data:[],error:null}).then(ok)):(()=>chain)});return chain;},rpc:async()=>({error:{code:'PGRST202',message:'Missing migration'}})};</script></head>`);
  }
  res.setHeader('Content-Type',p.endsWith('.html')?'text/html;charset=utf-8':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.ttf')?'font/ttf':'application/octet-stream');res.end(body);
});
let browser,socket;
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  const profile=fs.mkdtempSync(path.join(temp,'browser-'));browser=spawn(process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless','--no-sandbox','--disable-gpu','--no-first-run','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
  const portFile=path.join(profile,'DevToolsActivePort');for(let i=0;!fs.existsSync(portFile);i++){if(i>100)throw Error('Browser timeout');await new Promise(r=>setTimeout(r,100));}
  const port=fs.readFileSync(portFile,'utf8').split('\n')[0];const targets=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());
  socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
  let id=0;const pending=new Map();socket.addEventListener('message',e=>{const v=JSON.parse(e.data);if(pending.has(v.id)){const [ok,no]=pending.get(v.id);pending.delete(v.id);v.error?no(Error(v.error.message)):ok(v.result);}});
  const send=(method,params={})=>new Promise((ok,no)=>{const key=++id;pending.set(key,[ok,no]);socket.send(JSON.stringify({id:key,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:origin+'/modulos/crear-cotizacion.html'});
  for(let i=0;i<100;i++){if(await evaluate('!!window.ETCotizacionPDF'))break;await new Promise(r=>setTimeout(r,100));}
  assert.ok(await evaluate("!!document.querySelector('#etNav a[href*=\"crear-cotizacion.html\"]')"),'SuperAdmin con permisos antiguos ve el modulo en el sidebar');
  await evaluate('window.fixture='+fixture.toString());
  const result=await evaluate(`(async()=>{
    const tests=[]; const check=(v,n)=>{if(!v)throw Error(n);tests.push(n);};
    const api=ETCotizacionXML;
    for(const version of ['3.3','4.0'])for(const count of [1,5])for(const tax of [false,true]){
      const q=api.parse(fixture(version,count,tax),'prueba.xml');check(api.calculate(q).total===((tax?116:100)*count).toFixed(2),version+' / '+count+' / IVA '+tax);
    }
    const q=api.parse(fixture(),'test.xml');q.items[0].cantidad='2.5';q.items[0].precio='10.10';delete q.items[0].importeOriginal;q.items[0].taxes[0].manual=false;q.items[0].taxes[0].base='';
    check(api.calculate(q).total==='29.29','Edición decimal exacta');
    for(const [factor,rate,expected] of [['Tasa','0','100.00'],['Exento','0','100.00'],['Tasa','0.08','108.00']]) {
      const t=api.parse(fixture(),'tax.xml');t.items[0].taxes[0]={tipo:'Traslado',impuesto:'002',factor,tasa:rate,base:'',importe:'0',manual:false};
      check(api.calculate(t).total===expected,'Impuesto '+factor+' '+rate);
    }
    const retained=api.parse(fixture(),'ret.xml');retained.items[0].taxes.push({tipo:'Retencion',impuesto:'001',factor:'Tasa',tasa:'0.1',base:'',importe:'0',manual:false});
    check(api.calculate(retained).total==='106.00','Retenciones');
    const malicious=api.parse(fixture().replace('Concepto 1','&lt;script&gt;window.attack=1&lt;/script&gt;'),'safe.xml');
    const safe=await ETCotizacionPDF.build(malicious);check(!safe.svg.querySelector('script')&&!window.attack,'Contenido XML tratado como texto');
    for(const bad of ['<bad>',fixture().replace(/<x:Conceptos>[\\s\\S]*?<\\/x:Conceptos>/,''),'<!DOCTYPE a [<!ENTITY x SYSTEM "file:///etc/passwd">]>'+fixture()]){let rejected=false;try{api.parse(bad,'bad.xml');}catch(e){rejected=true;}check(rejected,'XML inválido rechazado');}
    q.folio='COT-XML-2099-9876';q.origen.Folio='ORIGEN-9876';
    const noNote=await ETCotizacionPDF.build(q);check(noNote.pdf.getNumberOfPages()===1,'PDF una página');check(!noNote.svg.textContent.includes('NOTA'),'Nota vacía no imprime bloque');
    check(!/folio/i.test(noNote.svg.textContent)&&!noNote.svg.textContent.includes(q.folio)&&!noNote.svg.textContent.includes(q.origen.Folio),'Documento sin folios');
    q.nota='Entrega en taller';const withNote=await ETCotizacionPDF.build(q);check(withNote.svg.textContent.includes('Entrega en taller'),'Nota visible');
    const long=api.parse(fixture('4.0',150),'long.xml');long.nota='Nota extensa '.repeat(300);const fit=await ETCotizacionPDF.build(long);
    check(fit.pdf.getNumberOfPages()===1&&fit.scale<.75,'150 conceptos y nota ajustados a una página');
    check(fit.svg.textContent.includes('Concepto 150'),'Último concepto conservado');
    check(Math.max(...Array.from(fit.svg.querySelectorAll('text'),n=>+n.getAttribute('y')))<=768,'Todos los textos dentro de carta');
    check(fit.pdf.internal.pageSize.getWidth()===612&&fit.pdf.internal.pageSize.getHeight()===792,'Carta vertical');
    for(const role of ['Compras','SuperAdmin'])check(ETPermissions.puedeVerModulo({rol:role},'Crear cotización'),'Acceso '+role);
    check(!ETPermissions.puedeVerModulo({rol:'Proveedor'},'Crear cotización'),'Proveedor denegado');
    check(!ETPermissions.puedeVerModulo({rol:'Consulta'},'Crear cotización'),'Consulta denegada');
    window.testPDF=fit.pdf.output('datauristring').split(',')[1];window.longPreview=fit.svg;return tests;
  })()`);
  fs.writeFileSync(path.join(temp,'cotizacion-150-conceptos.pdf'),Buffer.from(await evaluate('testPDF'),'base64'));
  await evaluate(`(()=>{const dt=new DataTransfer();dt.items.add(new File([fixture('3.3',1,false)],'uno.xml'));dt.items.add(new File([fixture('4.0',5,true)],'varios.xml'));dt.items.add(new File(['<bad>'],'roto.xml'));dt.items.add(new File([fixture('3.3',1,false)],'duplicado.xml'));document.getElementById('cqArchivos').files=dt.files;document.getElementById('cqArchivos').dispatchEvent(new Event('change'));})()`);
  for(let i=0;i<100;i++){if(await evaluate('!document.getElementById("cqArchivos").disabled && !!document.querySelector("#cqPreview svg")'))break;await new Promise(r=>setTimeout(r,100));}
  assert.match(await evaluate('document.getElementById("cqContador").textContent'),/4 archivo.*2 cotización/);
  assert.match(await evaluate('document.getElementById("cqLista").textContent'),/Archivo duplicado/);
  await evaluate(`(()=>{const labels=[...document.querySelectorAll('#cqFormulario label')];const input=labels.find(l=>l.firstChild.textContent==='Cantidad').querySelector('input');input.value='3';input.dispatchEvent(new Event('input',{bubbles:true}));const note=labels.find(l=>l.firstChild.textContent==='Nota opcional').querySelector('textarea');note.value='Nota de prueba desde editor';note.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  for(let i=0;i<100&&!(await evaluate('document.getElementById("cqTotales").textContent.includes("300.00")'));i++)await new Promise(r=>setTimeout(r,100));
  assert.match(await evaluate('document.getElementById("cqPreview").textContent'),/Nota de prueba desde editor/);
  assert.match(await evaluate('document.getElementById("cqTotales").textContent'),/300.00/);
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:temp});
  await evaluate('document.getElementById("cqPDF").click();document.getElementById("cqImprimir").click()');
  for(let i=0;i<100&&!(await evaluate('printCalls'));i++)await new Promise(r=>setTimeout(r,100));
  assert.equal(await evaluate('printCalls'),1);
  for(let i=0;i<100&&!fs.readdirSync(temp).some(f=>f.startsWith('Cotizacion_')&&f.endsWith('.pdf'));i++)await new Promise(r=>setTimeout(r,100));
  const download=fs.readdirSync(temp).find(f=>f.startsWith('Cotizacion_')&&f.endsWith('.pdf'));assert.ok(download,'PDF downloaded');assert.ok(fs.readFileSync(path.join(temp,download)).subarray(0,5).toString()==='%PDF-');
  const print=await send('Page.printToPDF',{preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false});
  const printed=Buffer.from(print.data,'base64');fs.writeFileSync(path.join(temp,'impresion.pdf'),printed);
  assert.equal((printed.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length,1,'Print exactly one page');
  await evaluate('window.previousPreview=document.querySelector("#cqPreview svg");document.getElementById("cqPreview").replaceChildren(longPreview)');
  const longPrint=Buffer.from((await send('Page.printToPDF',{preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false})).data,'base64');
  fs.writeFileSync(path.join(temp,'impresion-150-conceptos.pdf'),longPrint);
  assert.equal((longPrint.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length,1,'Print 150 concepts exactly one page');
  await evaluate('document.getElementById("cqPreview").replaceChildren(previousPreview)');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await new Promise(r=>setTimeout(r,450));
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true,'No horizontal overflow');
  fs.writeFileSync(path.join(temp,'movil.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  console.log(result.join('\n'));console.log('Lote, errores aislados, descarga PDF real, impresión de una página y móvil aprobados.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{socket?.close();browser?.kill();server.close();});
