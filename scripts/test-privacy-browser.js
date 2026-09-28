// Isolated browser audit: renders real markup without account/network/business scripts.
// Optional AXE_PATH points to a local axe-core bundle. No production data is loaded.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const temp = path.join(root, '.tmp-privacy');
fs.mkdirSync(temp, { recursive: true });
const pages = ['index.html','dashboard.html','buscador-unidades.html','privacidad.html','terminos.html','cookies.html', ...fs.readdirSync(path.join(root,'modulos')).filter(p=>p.endsWith('.html') && fs.readFileSync(path.join(root,'modulos',p),'utf8').includes('privacy.js')).map(p=>'modulos/'+p)];
const axe = process.env.AXE_PATH || path.join(temp, 'axe.min.js');
const server = http.createServer((request,response) => {
  const url = new URL(request.url, 'http://localhost');
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404).end(); return; }
  let body = fs.readFileSync(file);
  if (file.endsWith('.html')) {
    body = body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
    body = body.replace('</head>', '<script src="/js/core/theme.js" defer></script><script src="/js/core/privacy.js" defer></script><script src="/js/core/accessibility.js" defer></script>' + (fs.existsSync(axe)?'<script src="/.tmp-privacy/axe.min.js"></script>':'') + '</head>');
    // Strip inline business handlers too; all controls and labels remain intact.
    body = body.replace(/\s+on(?:click|submit|change|keydown)="[^"]*"/gi,'');
  }
  response.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'application/octet-stream');
  response.end(body);
});
let browser, socket;
async function run() {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const profile = fs.mkdtempSync(path.join(temp,'browser-'));
  const executable = process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  browser = spawn(executable,['--headless','--no-sandbox','--disable-gpu','--no-first-run','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
  browser.on('error',error=>{throw error;});
  const portFile = path.join(profile,'DevToolsActivePort');
  for(let i=0;!fs.existsSync(portFile);i++){if(i>100)throw Error('Browser startup timeout');await new Promise(r=>setTimeout(r,100));}
  const port=fs.readFileSync(portFile,'utf8').split('\n')[0];
  const targets=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());
  socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
  let id=0;const pending=new Map();
  socket.addEventListener('message',event=>{const result=JSON.parse(event.data);if(pending.has(result.id)){const [ok,fail]=pending.get(result.id);pending.delete(result.id);result.error?fail(Error(result.error.message)):ok(result.result);}});
  const send=(method,params={})=>new Promise((ok,fail)=>{const key=++id;pending.set(key,[ok,fail]);socket.send(JSON.stringify({id:key,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+' '+r.exceptionDetails.exception?.description);return r.result.value;};
  async function navigate(page){await send('Page.navigate',{url:origin+'/'+page});await new Promise(r=>setTimeout(r,350));await evaluate('new Promise(r=>document.readyState === "complete" ? r() : window.addEventListener("load",r,{once:true}))');}
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await navigate('index.html');
  assert.equal(await evaluate('ETPrivacy.allows("external")'),false);
  assert.equal(await evaluate('document.querySelector("[data-privacy-accept]").checked'),false);
  assert.equal(await evaluate('window.calls=0;document.getElementById("btnLogin").addEventListener("click",()=>calls++);document.getElementById("btnLogin").click();calls'),0);
  assert.equal(await evaluate('document.activeElement.hasAttribute("data-privacy-accept")'),true);
  assert.equal(await evaluate('document.querySelector("[data-privacy-accept]").checked=true;document.getElementById("btnLogin").click();calls'),1);
  await evaluate('document.querySelector("[data-choice=reject]").click()');
  assert.equal(await evaluate('ETPrivacy.allows("external")'),false);
  await evaluate('ETPrivacy.configure();document.getElementById("etExternalConsent").checked=true;document.querySelector("[data-choice=save]").click()');
  assert.equal(await evaluate('ETPrivacy.allows("external")'),true);
  await navigate('index.html');
  assert.equal(await evaluate('ETPrivacy.allows("external")'),true);
  assert.equal(await evaluate('document.querySelector("[data-privacy-accept]").checked'),false);
  await evaluate('ETPrivacy.configure();document.querySelector("dialog [data-choice=reject]").click()');
  assert.equal(await evaluate('ETPrivacy.allows("external")'),false);
  await evaluate('localStorage.setItem("et_privacy_choices",JSON.stringify({version:ETPrivacy.version,at:Date.now()-181*86400000,external:true}))');
  assert.equal(await evaluate('ETPrivacy.allows("external")'),false);
  await evaluate('localStorage.removeItem("et_privacy_choices")');
  const reports=[];
  for(const page of pages){
    await navigate(page);
    const report=await evaluate(`(async()=>({
      unlabeled:[...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(e=>!e.labels?.length&&!e.hasAttribute('aria-label')&&!e.hasAttribute('aria-labelledby')).map(e=>e.outerHTML),
      checked:[...document.querySelectorAll('[data-privacy-accept]')].filter(e=>e.checked).length,
      unprotected:[...document.querySelectorAll('[data-privacy-submit]')].filter(e=>!e.closest('[data-privacy-scope]')).map(e=>e.outerHTML),
      violations:window.axe?(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})):[]
    }))()`);
    reports.push({page,...report});
    console.log(page+': unlabeled='+report.unlabeled.length+', violations='+report.violations.length);
  }
  await navigate('privacidad.html');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true,'Legal page reflow at 390px');
  await evaluate('ETPrivacy.configure()');
  const screenshot=await send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync(path.join(temp,'privacy-mobile.png'),Buffer.from(screenshot.data,'base64'));
  fs.writeFileSync(path.join(temp,'browser-audit.json'),JSON.stringify(reports,null,2));
  assert.ok(reports.every(r=>!r.unlabeled.length&&!r.checked&&!r.unprotected.length),'Review browser-audit.json');
  console.log('Consent blocking, opt-in, withdrawal, expiration, no prechecked forms, and mobile reflow passed.');
  const violations=reports.reduce((n,r)=>n+r.violations.length,0);
  if(violations)throw Error(violations+' accessibility findings; see .tmp-privacy/browser-audit.json');
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{socket?.close();browser?.kill();server.close();});
