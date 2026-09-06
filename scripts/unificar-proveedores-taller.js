const fs=require('fs'),path=require('path');
const nombres={
 'adrian ramirez':'ADRIAN RAMIREZ','bejarano':'ISAAC BEJARANO','isac bejarano':'ISAAC BEJARANO',
 'byd':'BYD','carlos liera':'CARLOS LIERA','de carroceria':'CARROCERIA','del valle':'DEL VALLE',
 'dilop':'DILOP','internmo':'INTERNO','interno':'INTERNO','jac':'JAC','jac integra':'JAC INTEGRA',
 'maztro':'MAZTRO','meineke integra':'MEINEKE INTEGRA','motor al 100':'MOTOR AL 100','raley':'RALEY','sufle integra':'SUFLE INTEGRA'
};
const normal=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/^taller\s+/,'');
async function main(){
 const c=fs.readFileSync(path.join(__dirname,'../js/core/supabase.js'),'utf8');
 const url=c.match(/const SUPABASE_URL = "([^"]+)"/)[1],key=c.match(/const SUPABASE_KEY = "([^"]+)"/)[1];
 async function req(t,q='',opts={}){const r=await fetch(url+'/rest/v1/'+t+q,{headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=representation'},...opts});if(!r.ok)throw Error(await r.text());const s=await r.text();return s?JSON.parse(s):[];}
 async function all(t){const a=[];for(let n=0;;n+=1000){const p=await req(t,`?select=*&order=id&offset=${n}&limit=1000`);a.push(...p);if(p.length<1000)return a;}}
 const dir=path.join(__dirname,'../imports/proveedores-ffff');fs.mkdirSync(dir,{recursive:true});
 for(const t of ['ingresos_taller','ingresos_taller_pendientes']){
  const rows=await all(t),changes=rows.filter(r=>nombres[normal(r.taller_nombre)]&&r.taller_nombre!==nombres[normal(r.taller_nombre)]);
  const backup=path.join(dir,'before-'+t+'.json');if(!fs.existsSync(backup))fs.writeFileSync(backup,JSON.stringify(rows,null,2));
  console.log(t+': '+changes.length+' nombres por unificar');
  if(process.argv.includes('--apply')){
   for(const old of new Set(changes.map(r=>r.taller_nombre))){const expected=changes.filter(r=>r.taller_nombre===old).length;const updated=await req(t,'?taller_nombre=eq.'+encodeURIComponent(old),{method:'PATCH',body:JSON.stringify({taller_nombre:nombres[normal(old)]})});if(updated.length!==expected)throw Error('Cambió el conjunto de registros: '+old);}
   const after=await all(t);for(const r of changes){if(after.find(x=>x.id===r.id)?.taller_nombre!==nombres[normal(r.taller_nombre)])throw Error('Verificación incorrecta');}
   console.log(t+': cambios verificados');
  }
 }
 const catalogo=await all('proveedores');
 const faltan=[...new Set(Object.values(nombres))].filter(n=>!catalogo.some(p=>normal(p.razon_social)===normal(n)));
 console.log('Catálogo de talleres: '+faltan.length+' nombres nuevos');
 if(process.argv.includes('--apply')&&faltan.length){const saved=await req('proveedores','',{method:'POST',body:JSON.stringify(faltan.map(razon_social=>({razon_social,activo:true,notas:'Catalogo Control de Taller'})))});if(saved.length!==faltan.length)throw Error('Catálogo incompleto');}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
