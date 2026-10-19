const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('modulos/buscador_seccional.html', 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
const nodes = new Map();
function element() { return {textContent:'',value:'',classList:{add(){},remove(){},toggle(){}},addEventListener(event,callback){this[event]=callback},click(){},focus(){}}; }
const get = id => { if(!nodes.has(id))nodes.set(id,element());return nodes.get(id); };
const handlers = {};
const labels = [];
const map = {setView(){return this},invalidateSize(){},removeLayer(){},fitBounds(){},on(event,fn){handlers[event]=fn}};
const L = {
  map:()=>map,
  tileLayer:()=>({addTo(){}}),
  marker:([lat,lng])=>({addTo(){return this},bindPopup(){return this},openPopup(){return this},getLatLng(){return {lat,lng}}}),
  geoJSON:(data,options)=>{for(const f of data.features||[])options.onEachFeature?.(f,{bindTooltip(node){labels.push(node.textContent)}});return {addTo(){return this},getBounds(){return {isValid:()=>true}}}}
};
const context={window:{L},L,document:{getElementById:get,createElement:element,createTextNode:text=>({textContent:text})},validarPermiso:()=>true,ETLayout:{inicializar(){}},ResizeObserver:class {observe(){}},console};
context.fetch=async url=>{
  assert.equal(url,'data/secciones-sonora.geojson?v=1');
  return {ok:true,json:async()=>JSON.parse(fs.readFileSync('modulos/data/secciones-sonora.geojson','utf8'))};
};
vm.runInNewContext(script,context);
const feature = properties => ({type:'Feature',properties,geometry:{type:'Polygon',coordinates:[[[-111,29],[-110,29],[-110,30],[-111,30],[-111,29]]]}});
async function upload(features) { await get('file').change({target:{files:[{name:'secciones.geojson',text:async()=>JSON.stringify({type:'FeatureCollection',features})}]}}); }
(async()=>{
  await new Promise(resolve=>setImmediate(resolve));
  handlers.click({latlng:{lat:29.07297,lng:-110.95592}});
  assert.equal(get('sectionNumber').textContent,'516');
  assert.match(get('fileStatus').textContent,/1,667 secciones listas/);
  assert.equal(get('searchBtn').disabled,false);
  console.log('Carga automatica: cartografia incluida disponible sin seleccionar archivos.');
  // GeoJSON must load even when the external SHP reader is unavailable.
  await upload([feature({CVE_SECC:'0042'})]);
  handlers.click({latlng:{lat:29.5,lng:-110.5}});
  assert.equal(get('sectionNumber').textContent,'0042');
  assert.equal(labels.at(-1),'Secci\u00f3n 0042');
  await upload([feature({'SECCI\u00d3N':123})]);
  handlers.click({latlng:{lat:29.5,lng:-110.5}});
  assert.equal(get('sectionNumber').textContent,'123');
  // Each polygon may use a different section field; empty values never render blank.
  const other=feature({SECCION:'9999'});other.geometry.coordinates=[[[-109,29],[-108,29],[-108,30],[-109,30],[-109,29]]];
  await upload([other,feature({NUM_SECCION:'0100'})]);
  handlers.click({latlng:{lat:29.5,lng:-110.5}});
  assert.equal(get('sectionNumber').textContent,'0100');
  await upload([feature({SECCION:''})]);
  assert.equal(get('sectionNumber').textContent,'Sin clave');
  handlers.click({latlng:{lat:28,lng:-112}});
  assert.equal(get('sectionNumber').textContent,'Sin coincidencia');
  // State and municipality polygons must never shadow a section in a multi-layer ZIP.
  context.shp = context.window.shp = async () => [
    {type:'FeatureCollection',features:[feature({entidad:26,nombre:'SONORA'})]},
    {type:'FeatureCollection',features:[feature({municipio:49})]},
    {type:'FeatureCollection',features:[feature({seccion:516})]}
  ];
  await get('file').change({target:{files:[{name:'26.zip',arrayBuffer:async()=>new ArrayBuffer(0)}]}});
  handlers.click({latlng:{lat:29.5,lng:-110.5}});
  assert.equal(get('sectionNumber').textContent,'516');
  assert.match(get('fileStatus').textContent,/1 secciones listas/);
  // Optional integration run with a real ZIP and the same shpjs bundle used by the page.
  if(process.argv[2] && process.argv[3]) {
    global.self=global;
    context.shp=context.window.shp=require(require('node:path').resolve(process.argv[3]));
    await get('file').change({target:{files:[{name:'26.zip',arrayBuffer:async()=>fs.readFileSync(process.argv[2])}]}});
    handlers.click({latlng:{lat:29.07297,lng:-110.95592}});
    assert.equal(get('sectionNumber').textContent,'516');
    assert.match(get('fileStatus').textContent,/1,667 secciones listas/);
    console.log('ZIP real: 1,667 secciones; punto central de Hermosillo = 516.');
  }
  console.log('Buscador: GeoJSON sin SHP, campos de seccion, etiquetas, ceros iniciales y consulta de puntos verificados.');
})().catch(error=>{console.error(error);process.exitCode=1});
