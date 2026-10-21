const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const storage = new Map();
const context = {localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}};
vm.runInNewContext(fs.readFileSync('js/core/notifications-feed.js','utf8'),context);
let rows = Array.from({length:1005},(_,i)=>({id:String(i),leida:i>600})), error=null;
const calls=[];
const client={from(table){assert.equal(table,'notificaciones');const q={
  select(){return q;},eq(k,v){assert.equal(k,'usuario_id');assert.equal(v,'user');return q;},order(){return q;},
  range(a,b){calls.push(a);return Promise.resolve({data:rows.slice(a,b+1),error});}
};return q;}};
(async()=>{
  const api=context.ETNotificationsFeed.create(client,{id:'user'});
  let result=await api.load();assert.equal(result.items.length,1005);assert.equal(result.fresh.length,601);
  assert.deepEqual(calls,[0,500,1000]);
  assert.equal((await api.load()).fresh.length,0);
  assert.equal((await context.ETNotificationsFeed.create(client,{id:'user'}).load()).fresh.length,0);
  rows.unshift({id:'new',leida:false});error=new Error('offline');await assert.rejects(api.load);
  error=null;assert.equal((await api.load()).fresh[0].id,'new','Failed loads do not consume alerts');
  for(const file of ['dashboard.html',...fs.readdirSync('modulos').filter(f=>f.endsWith('.html')).map(f=>'modulos/'+f)]) {
    const html=fs.readFileSync(file,'utf8');if(!html.includes('core/layout.js'))continue;
    assert.ok(html.includes('core/notifications-feed.js'),file);
    assert.ok(html.indexOf('core/notifications-feed.js')<html.indexOf('core/layout.js'),file);
  }
  console.log('Avisos: 1,005 registros, destinatario, paginación, lectura, navegación, fallos y recuperación aprobados.');
})().catch(error=>{console.error(error);process.exitCode=1;});
