const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),temp=path.join(root,'.tmp-textos');fs.mkdirSync(temp,{recursive:true});
const fixture=fs.readFileSync(path.join(root,'www/index.html'),'utf8');
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');if(url.pathname==='/fixture'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end(fixture);return;}
  const p=path.resolve(root,'www','.'+decodeURIComponent(url.pathname));if(!p.startsWith(root+path.sep)||!fs.existsSync(p)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html;charset=utf-8':'text/plain');res.end(fs.readFileSync(p));
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

  socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')console.error(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});await send('Runtime.enable');const requests=new Map();socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Network.requestWillBeSent')requests.set(m.params.requestId,m.params.request.url);if(['Network.loadingFinished','Network.loadingFailed'].includes(m.method))requests.delete(m.params.requestId);});await send('Network.enable');await send('Network.setBlockedURLs',{urls:['*fonts.googleapis.com*','*fonts.gstatic.com*']});await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.Capacitor={isNativePlatform:()=>true,getPlatform:()=> 'android'};
  window.fetch=async function(url,config){const path=String(url?.url||url),bad=window.testLoginError;
   const user={id:'00000000-0000-4000-8000-000000000100',usuario:'mobile-test',nombre:'Prueba',rol:'SuperAdmin',activo:true,modulos_permitidos:['Dashboard','Vales'],permisos_version:2,permisos_excepciones:{}};
   let data=[];
   if(path.includes('iniciar_sesion_aplicacion')){if(bad)return new Response(JSON.stringify({code:'42501',message:'Credenciales incorrectas'}),{status:403,headers:{'Content-Type':'application/json'}});data={usuario:user,token:'mobile-test-session',expira_en:new Date(Date.now()+3600000).toISOString()};}
   else if(path.includes('obtener_perfil_acceso'))data=user;
   else if(path.includes('estado_licencia'))data={dias_restantes:30,vencida:false};
   return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
  };`});
  await send('Page.navigate',{url:origin+'/fixture'});await until('!!document.querySelector("[data-privacy-accept]")');
  await evaluate('document.querySelector("[data-privacy-accept]").click();document.getElementById("usuario").value="mobile-test";document.getElementById("password").value="test-only";window.testLoginError=true;document.getElementById("btnLogin").click()');
  await until('document.getElementById("mensajeError").textContent.includes("incorrectos")');
  assert.equal(await evaluate('document.getElementById("btnLogin").disabled'),false);
  assert.equal(await evaluate('document.documentElement.classList.contains("et-native-app")'),true);
  assert.ok(await evaluate('document.getElementById("btnLogin").getBoundingClientRect().height>=44'));
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
  let shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(temp,'android-login.png'),Buffer.from(shot.data,'base64'));
  await evaluate('window.testLoginError=false;document.getElementById("btnLogin").click()');await until('location.pathname.endsWith("dashboard.html")');
  try { await until('!!document.querySelector(".et-mobile-menu")'); } catch(e) { console.log([...requests.values()]);console.log(await evaluate('JSON.stringify({url:location.href,ready:document.readyState,layout:typeof ETLayout,permissions:typeof ETPermissions,body:document.body?.innerText.slice(0,250),session:!!localStorage.getItem("usuarioActivo")})'));throw e; }
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("usuarioActivo")).flujo_token'),'mobile-test-session');
  await evaluate('document.querySelector(".et-mobile-menu").click()');assert.equal(await evaluate('document.body.classList.contains("et-nav-open")'),true);
  await evaluate('ETLayout.cerrarMenuMovil()');assert.equal(await evaluate('document.body.classList.contains("et-nav-open")'),false);
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
  shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(temp,'android-dashboard.png'),Buffer.from(shot.data,'base64'));
  console.log('Paquete movil: login rechazado/aceptado, sesion, navegacion, menu y ancho de pantalla verificados con servidor simulado.');

})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{socket?.close();browser?.kill();server.close();});
