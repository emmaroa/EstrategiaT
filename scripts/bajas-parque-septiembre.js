const fs=require('fs');
async function main(){
 const dir='imports/actualizacion-parque-20260907/';
 const source=JSON.parse(fs.readFileSync(dir+'fuente.json','utf8').replace(/^\uFEFF/,''));
 const keys=new Set(source.map(r=>r.numero_inventario.trim().toUpperCase()));
 if(keys.size!==1218)throw Error('El archivo no contiene 1218 inventarios');
 const config=fs.readFileSync('js/core/supabase.js','utf8');
 const url=config.match(/const SUPABASE_URL = "([^"]+)"/)[1],key=config.match(/const SUPABASE_KEY = "([^"]+)"/)[1];
 async function req(q,opts={}){const r=await fetch(url+'/rest/v1/parque_vehicular'+q,{...opts,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'}});if(!r.ok)throw Error(await r.text());return r.json();}
 async function all(){const rows=[];for(let n=0;;n+=1000){const p=await req('?select=*&order=id&limit=1000&offset='+n);rows.push(...p);if(p.length<1000)return rows;}}
 const before=await all();
 const absent=before.filter(r=>!keys.has(String(r.numero_inventario).trim().toUpperCase()));
 if(absent.length!==2||absent.some(r=>!['VH0100003944','VH0100004422'].includes(r.numero_inventario)))throw Error('Las unidades ausentes cambiaron');
 fs.writeFileSync(dir+'respaldo-bajas.json',JSON.stringify(absent,null,2),{flag:'wx'});
 for(const row of absent){const updated=await req('?id=eq.'+row.id+'&numero_inventario=eq.'+row.numero_inventario,{method:'PATCH',body:JSON.stringify({estatus:'BAJA'})});if(updated.length!==1||updated[0].estatus!=='BAJA')throw Error('Baja no aplicada');}
 const after=await all();
 for(const row of absent){const actual=after.find(r=>r.id===row.id);if(actual?.estatus!=='BAJA')throw Error('Baja no verificada');for(const f of Object.keys(row))if(!['estatus','updated_at','actualizado_en'].includes(f)&&JSON.stringify(row[f])!==JSON.stringify(actual[f]))throw Error('Campo inesperado modificado: '+f);}
 const summary={totalRegistros:after.length,enCsv:after.filter(r=>keys.has(String(r.numero_inventario).trim().toUpperCase())).length,vigentes:after.filter(r=>String(r.estatus).toUpperCase()!=='BAJA').length,bajas:after.filter(r=>r.estatus==='BAJA').map(r=>r.numero_inventario)};
 fs.writeFileSync(dir+'resultado-bajas.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
