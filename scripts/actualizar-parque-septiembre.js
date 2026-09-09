const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'imports', 'actualizacion-parque-20260907');
const source = process.argv.find(a => a.startsWith('--source='))?.slice(9);
const normal = v => String(v ?? '').trim().toUpperCase();
function csv(text) {
  const rows=[]; let row=[], value='', quoted=false;
  for(let i=0;i<text.length;i++) {
    const ch=text[i];
    if(ch==='"' && quoted && text[i+1]==='"'){value+='"';i++;}
    else if(ch==='"')quoted=!quoted;
    else if(ch===','&&!quoted){row.push(value);value='';}
    else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(v=>v.trim()))rows.push(row);row=[];value='';}
    else value+=ch;
  }
  if(quoted)throw Error('CSV con comillas sin cerrar');
  if(value||row.length){row.push(value);if(row.some(v=>v.trim()))rows.push(row);}
  const heads=rows.shift().map(v=>v.replace(/^\uFEFF/,'').trim());
  return rows.map((r,i)=>{if(r.length!==heads.length)throw Error('Columnas incorrectas en fila '+(i+2));return Object.fromEntries(heads.map((h,j)=>[h,r[j].trim()]));});
}
async function main(){
  const config=fs.readFileSync(path.join(root,'js/core/supabase.js'),'utf8');
  const url=config.match(/const SUPABASE_URL = "([^"]+)"/)[1],key=config.match(/const SUPABASE_KEY = "([^"]+)"/)[1];
  async function req(q,options={}){
    const r=await fetch(url+'/rest/v1/parque_vehicular'+q,{...options,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'}});
    if(!r.ok)throw Error('HTTP '+r.status+': '+await r.text());return r.json();
  }
  async function all(){const rows=[];for(let offset=0;;offset+=1000){const page=await req('?select=*&order=id&limit=1000&offset='+offset);rows.push(...page);if(page.length<1000)return rows;}}
  fs.mkdirSync(dir,{recursive:true});
  const current=await all();
  if(!process.argv.includes('--apply')){
    if(!source)throw Error('Falta --source');
    const input=csv(fs.readFileSync(source,'utf8'));
    const fields=['numero_inventario','grupo','descripcion','unidad_patrulla','combustible','uso','dependencia','marca','modelo','color','placa','serie','procedencia','numero_economico'];
    const columns=Object.keys(current[0]||{});
    if(fields.some(f=>!columns.includes(f)))throw Error('Campos ausentes: '+fields.filter(f=>!columns.includes(f)).join(','));
    const map=new Map();for(const r of current){const k=normal(r.numero_inventario);if(!map.has(k))map.set(k,[]);map.get(k).push(r);}
    const seen=new Set(),updates=[],inserts=[],conflicts=[];let same=0;
    for(const row of input){
      const k=normal(row.numero_inventario);if(!k||seen.has(k))throw Error('Inventario vacio o repetido: '+k);seen.add(k);
      const matches=map.get(k)||[];
      if(matches.length>1){conflicts.push({inventario:k,motivo:'Inventario duplicado en base',ids:matches.map(r=>r.id)});continue;}
      const values=Object.fromEntries(fields.filter(f=>row[f] && !['-','S/S','S/N','SIN DATO','N/A'].includes(normal(row[f]))).map(f=>[f,row[f]]));
      if(!matches.length){
        const related=current.filter(r=>(values.serie&&normal(r.serie)===normal(values.serie))||(values.unidad_patrulla&&normal(r.unidad_patrulla)===normal(values.unidad_patrulla)));
        if(related.length){conflicts.push({inventario:k,motivo:'Inventario nuevo con serie o patrulla existente',ids:related.map(r=>r.id)});continue;}
        inserts.push(values);continue;
      }
      const old=matches[0],changes={};
      for(const [f,v] of Object.entries(values))if(String(old[f]??'').trim()!==v)changes[f]=v;
      if(Object.keys(changes).length)updates.push({id:old.id,inventario:k,before:old,changes});else same++;
    }
    const plan={createdAt:new Date().toISOString(),source,input:input.length,beforeCount:current.length,same,updates,inserts,conflicts,missingFromCsv:current.filter(r=>!seen.has(normal(r.numero_inventario))).length};
    fs.writeFileSync(path.join(dir,'respaldo.json'),JSON.stringify(current,null,2),{flag:'wx'});
    fs.writeFileSync(path.join(dir,'plan.json'),JSON.stringify(plan,null,2));
    console.log(JSON.stringify({input:input.length,current:current.length,same,updates:updates.length,inserts:inserts.length,conflicts,missingFromCsv:plan.missingFromCsv,fields:[...new Set(updates.flatMap(r=>Object.keys(r.changes)))]}));return;
  }
  const plan=JSON.parse(fs.readFileSync(path.join(dir,'plan.json'),'utf8'));
  const journal=path.join(dir,'aplicados.jsonl');
  if(fs.existsSync(journal)&&!process.argv.includes('--resume'))throw Error('Ya existe bitacora de aplicacion; revisar antes de reintentar');
  const done=new Set(fs.existsSync(journal)?fs.readFileSync(journal,'utf8').trim().split('\n').filter(Boolean).map(s=>JSON.parse(s)).filter(r=>r.action==='update').map(r=>r.id):[]);
  // Validate the full plan before the first write; each PATCH also compares old fields.
  for(const item of plan.updates){const r=current.find(r=>r.id===item.id);if(!r||Object.keys(item.before).some(f=>JSON.stringify(r[f])!==JSON.stringify(done.has(item.id)&&Object.hasOwn(item.changes,f)?item.changes[f]:item.before[f])))throw Error('El registro cambio desde la comparacion: '+item.inventario);}
  for(const values of plan.inserts)if(current.some(r=>normal(r.numero_inventario)===normal(values.numero_inventario)))throw Error('Alta ya existente');
  let updated=done.size,added=0;
  for(const item of plan.updates){
    if(done.has(item.id))continue;
    const filters=new URLSearchParams({id:'eq.'+item.id});
    for(const f of Object.keys(item.changes))filters.set(f,item.before[f]==null?'is.null':'eq.'+item.before[f]);
    const result=await req('?'+filters,{method:'PATCH',body:JSON.stringify(item.changes)});
    if(result.length!==1)throw Error('No se actualizo exactamente una unidad: '+item.inventario);
    fs.appendFileSync(journal,JSON.stringify({action:'update',id:item.id})+'\n');updated++;
    if(updated%100===0)console.log('Actualizadas: '+updated);
  }
  if(plan.inserts.length){const result=await req('',{method:'POST',body:JSON.stringify(plan.inserts.map(row=>Object.fromEntries([...new Set(plan.inserts.flatMap(Object.keys))].map(f=>[f,row[f]??null]))))});fs.appendFileSync(journal,JSON.stringify({action:'insert',rows:result})+'\n');added=result.length;if(added!==plan.inserts.length)throw Error('Cantidad de altas inesperada');}
  const after=await all();
  for(const item of plan.updates){const r=after.find(r=>r.id===item.id);for(const [f,v] of Object.entries(item.changes))if(String(r?.[f]??'')!==v)throw Error('Verificacion fallida: '+item.inventario+' '+f);for(const [f,v] of Object.entries(item.before))if(!Object.hasOwn(item.changes,f)&&!['updated_at','actualizado_en'].includes(f)&&JSON.stringify(r[f])!==JSON.stringify(v))throw Error('Cambio no esperado: '+item.inventario+' '+f);}
  for(const values of plan.inserts){const matches=after.filter(r=>normal(r.numero_inventario)===normal(values.numero_inventario));if(matches.length!==1||Object.entries(values).some(([f,v])=>String(matches[0][f]??'')!==String(v)))throw Error('Alta no verificada');}
  const summary={updated,added,unchanged:plan.same,conflicts:plan.conflicts.length,preservedAbsent:plan.missingFromCsv,total:after.length,verifiedAt:new Date().toISOString()};
  fs.writeFileSync(path.join(dir,'resultado.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
