const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),temp=path.join(root,'.tmp-textos');fs.mkdirSync(temp,{recursive:true});
const fixture=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/css/design-system.css"><script src="/js/core/layout.js"></script></head><body><main><div class="table-container"><table><thead><tr><th>Folio</th></tr></thead><tbody>${Array.from({length:2401},(_,i)=>'<tr><td>'+ (i+1) +'</td></tr>').join('')}</tbody></table></div><hr><div id="custom" class="pagination-bar"></div></main><script>ETLayout.prepararTablas();window.changes=[];ETLayout.actualizarSaltoPagina(document.getElementById('custom'),1,150,p=>changes.push(p));</script></body></html>`;
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

  await send('Page.enable');await send('Page.navigate',{url:origin+'/fixture'});
  await until('!!document.querySelector(".et-auto-pagination .et-page-jump")');
  const jump=async (value,enter=false,host='.et-auto-pagination')=>evaluate(`(()=>{const c=document.querySelector('${host} .et-page-jump'),i=c.querySelector('input');i.value=${JSON.stringify(value)};${enter?"i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))":"c.querySelector('button').click()"};return true;})()`);
  await jump('110',true);
  assert.equal(await evaluate('document.querySelector("tbody tr:not(.et-page-hidden)").textContent'),'2181');
  await jump('121');
  assert.equal(await evaluate('document.querySelectorAll("tbody tr:not(.et-page-hidden)").length'),1);
  for(const bad of ['','0','122','1.5','-1']){await jump(bad);assert.equal(await evaluate('document.querySelector("tbody tr:not(.et-page-hidden)").textContent'),'2401');}
  await jump('1');assert.equal(await evaluate('document.querySelector("tbody tr:not(.et-page-hidden)").textContent'),'1');
  await jump('100',true,'#custom');assert.deepEqual(await evaluate('changes'),[100]);
  await evaluate("ETLayout.actualizarSaltoPagina(document.getElementById('custom'),1,2,p=>changes.push(p))");
  await jump('100',false,'#custom');assert.deepEqual(await evaluate('changes'),[100]);
  await jump('2',false,'#custom');assert.deepEqual(await evaluate('changes'),[100,2]);
  assert.equal(await evaluate('document.querySelectorAll("#custom .et-page-jump").length'),1);
  await evaluate("ETLayout.actualizarSaltoPagina(document.getElementById('custom'),1,1,()=>{})");
  assert.equal(await evaluate('document.querySelector("#custom input").disabled'),true);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await evaluate('document.querySelector(".et-auto-pagination .et-page-jump").getBoundingClientRect().right <= innerWidth'),true);
  console.log('Salto de página: 121 páginas, Enter, botón, límites, aislamiento, actualización del rango y móvil aprobados.');

})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{socket?.close();browser?.kill();server.close();});
