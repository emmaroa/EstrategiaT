// Usa el mismo analizador y flujo del navegador. Sin --apply solo prepara respaldo y plan.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const archivo=process.argv[2];
if (!archivo) throw new Error('Indica la ruta del CSV de SP.');
const html=fs.readFileSync(path.join(root,'modulos/importar-siif.html'),'utf8');
const config=fs.readFileSync(path.join(root,'js/core/supabase.js'),'utf8');
const url=config.match(/const SUPABASE_URL = "([^"]+)"/)[1],key=config.match(/const SUPABASE_KEY = "([^"]+)"/)[1];
const dir=path.join(root,'imports','recuperacion-sp-'+new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(dir,{recursive:true});
const save=(nombre,datos)=>fs.writeFileSync(path.join(dir,nombre+'.json'),JSON.stringify(datos,null,2));
const lecturas=[],escrituras=[];
class Query {
  constructor(tabla){this.tabla=tabla;this.params=new URLSearchParams();this.method='GET';}
  select(campos='*'){this.params.set('select',campos);return this;}
  order(campo,opts={}){this.params.set('order',campo+(opts.ascending===false?'.desc':'.asc'));return this;}
  range(desde,hasta){this.params.set('offset',desde);this.params.set('limit',hasta-desde+1);return this;}
  limit(n){this.params.set('limit',n);return this;}
  eq(campo,valor){this.params.set(campo,'eq.'+valor);return this;}
  in(campo,valores){this.params.set(campo,'in.('+valores.join(',')+')');return this;}
  insert(datos){this.method='POST';this.body=datos;return this;}
  update(datos){this.method='PATCH';this.body=datos;return this;}
  single(){this.unico=true;return this;}
  then(resolve,reject){return this.run().then(resolve,reject);}
  async run(){
    if(this.method!=='GET'&&!process.argv.includes('--apply'))throw new Error('Escritura sin --apply');
    const r=await fetch(url+'/rest/v1/'+this.tabla+'?'+this.params,{method:this.method,
      headers:{apikey:key,'Content-Type':'application/json',Prefer:'return=representation'},
      body:this.body?JSON.stringify(this.body):undefined,signal:AbortSignal.timeout(60000)});
    const data=await r.json();
    const registro={tabla:this.tabla,query:String(this.params),status:r.status,data};
    if(this.method==='GET'){lecturas.push(registro);save('lecturas',lecturas);}
    else {escrituras.push({...registro,method:this.method,body:this.body});save('escrituras',escrituras);}
    return {status:r.status,error:r.ok?null:data,data:r.ok?(this.unico?data[0]:data):null};
  }
}
const elementos=new Map();
const ctx=vm.createContext({console,Date,Map,Set,
  document:{getElementById(id){if(!elementos.has(id))elementos.set(id,{value:id==='tipoImportacionSiif'?'sp':'',disabled:false});return elementos.get(id);}},
  localStorage:{getItem:()=>null},window:{},alert:message=>console.log(message),
  ETFeedback:{confirmar:async()=>true},supabaseClient:{from:tabla=>new Query(tabla)}
});
vm.runInContext(html.slice(html.indexOf('    const CONFIG_IMPORTACION'),html.indexOf('    archivoImportacionSiif.addEventListener')),ctx);
ctx.file={name:path.basename(archivo),text:async()=>fs.readFileSync(archivo,'utf8')};
(async()=>{
  await vm.runInContext('archivoActual=file; analizarArchivoImportacion(file)',ctx);
  const plan=vm.runInContext('filasAnalizadas',ctx);save('plan',plan);
  const resumen={total:plan.length,nuevos:plan.filter(f=>f.estado==='Nuevo').length,actualizar:plan.filter(f=>f.estado==='Actualizar').length,errores:plan.filter(f=>f.estado==='Error').length,directorio:dir};
  save('resumen',resumen);console.log(JSON.stringify(resumen));
  if(process.argv.includes('--apply')){
    await ctx.ejecutarImportacionInterna();
    if(escrituras.some(e=>e.status>=400))throw new Error('La carga tuvo errores; consulta el respaldo.');
    const cambios=escrituras.filter(e=>e.tabla==='sp_siif').flatMap(e=>e.data);
    for(let i=0;i<cambios.length;i+=100){
      const lote=cambios.slice(i,i+100);
      const r=await new Query('sp_siif').select('*').in('id',lote.map(f=>f.id));
      if(r.error)throw new Error(JSON.stringify(r.error));
      for(const esperado of lote){const actual=r.data.find(f=>f.id===esperado.id);if(!actual||Object.keys(esperado).some(k=>JSON.stringify(actual[k])!==JSON.stringify(esperado[k])))throw new Error('Verificación fallida: '+esperado.id);}
    }
    console.log(JSON.stringify({guardadosVerificados:cambios.length}));
  }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
