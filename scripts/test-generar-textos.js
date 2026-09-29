const fs=require('node:fs'),assert=require('node:assert/strict');
global.ExcelJS=require('../js/vendor/exceljs.js');global.XLSX=require('../js/vendor/xlsx.js');
const api=require('../js/services/textos-tabulares.js');
const headers=['Folio Interno Factura','Artículo','Dependencia','Folio OC','No. Requisición','NO USAR ENCABEZADO','Num. Entrada Almacén','Procedimiento Web','Unidad'];
const row=['4587','Balatas delanteras','Servicios publicos','1724','2851','3351','963','T26-01458','UNIDAD INCORRECTA'];
const expected='3351: PAGO DE FACTURA 4587 POR ADQUISICION DE BALATAS DELANTERAS PARA UNIDAD 3351 DE SERVICIOS PUBLICOS.\nOC 1724 REQ 2851 963\nPROCEDIMIENTO EN PORTAL WEB DE COMPRAS: T26-01458';
function convert(book,header){const sheet=book.sheets[0],found=api.detect(sheet.rows);return api.convert(sheet,header??found.header,found.mapping,'prueba');}
function buffer(b){return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}
(async()=>{
  const ejemplo={unidad:'1234',factura:'5555',articulo:'CRUCETA',dependencia:'SERVICIOS PUBLICOS MUNICIPALES',oc:'12',requisicion:'58',entrada:'EA-000587',procedimiento:'T26-00058'};
  assert.equal(api.format(ejemplo).text,'1234: PAGO DE FACTURA 5555 POR ADQUISICION DE CRUCETA PARA UNIDAD 1234 DE SERVICIOS PUBLICOS MUNICIPALES.\nOC 12 REQ 58 EA-000587\nPROCEDIMIENTO EN PORTAL WEB DE COMPRAS: T26-00058');
  for(const unidad of ['', 'STOCK', 'SIN UNIDAD', 'N/A']) assert.match(api.format({...ejemplo,unidad}).text,/^UNIDADES: .* PARA UNIDADES DE /);
  for(const [input,out] of [['003351','003351'],['3351.0','3351'],['0003.0','0003'],['STOCK','STOCK'],['0','0'],['AB-01','AB-01'],['  2743.0  ','2743']])assert.equal(api.clean(input,true),out);
  for(const bad of [undefined,null,NaN,{},'undefined','null','NaN','[object Object]'])assert.equal(api.clean(bad,true),'');
  assert.equal(api.normalize(' NÚM.   Entrada-Almacén '),api.normalize('No Entrada Almacen'));
  let b=new ExcelJS.Workbook();const s=b.addWorksheet('Datos');s.addRow(['Reporte desplazado']);s.addRow([]);s.addRow(headers);s.addRow(row);s.addRow(['4587','Material','Area','001','002',35,'003','004']);s.getCell('F5').numFmt='000000';
  s.addRow(['4587','Material','Area','001','002','STOCK','003','004']);s.addRow(['4587','Material','Area','001','002','0','003','004']);s.addRow([]);s.addRow(['4587','Material','Area','001','002','','003','004']);
  b.addWorksheet('Segunda').addRows([headers,row]);
  const parsed=await api.readBuffer('prueba.xlsx',await b.xlsx.writeBuffer());assert.equal(parsed.sheets.length,2);
  const converted=convert(parsed);assert.equal(converted.omitted,1);assert.equal(converted.records[0].source.row,4);assert.equal(api.format(converted.records[0].values).text,expected);
  assert.equal(converted.records[1].values.unidad,'000035');assert.equal(converted.records[2].values.unidad,'UNIDADES');assert.equal(converted.records[3].values.unidad,'0');assert.equal(converted.records[4].values.unidad,'UNIDADES');
  assert.deepEqual(api.format(converted.records[4].values).missing,[]);
  assert.match(api.format(converted.records[4].values).text,/^UNIDADES: .* PARA UNIDADES DE /);
  assert.equal(api.format({...converted.records[4].values,unidad:'0007'}).text.split('\n').length,3);
  const csv=headers.join(';')+'\r\n'+row.join(';')+'\r\n'+['2743.0','Material, con "comillas"','Dependencia','OC-22','REQ-4','0012','EA-2','WEB-1'].map(v=>'"'+v.replace(/"/g,'""')+'"').join(';');
  const csvBook=await api.readBuffer('prueba.csv',buffer(Buffer.from('\ufeff'+csv)));assert.equal(api.format(convert(csvBook).records[0].values).text,expected);
  assert.equal(convert(csvBook).records[1].values.unidad,'0012');assert.equal(convert(csvBook).records[1].values.factura,'2743');assert.match(api.format(convert(csvBook).records[1].values).text,/MATERIAL, CON "COMILLAS"/);
  for(const format of ['biff8','biff5']){
    const legacyHeaders=format==='biff5'?headers.map(h=>h.normalize('NFD').replace(/[\u0300-\u036f]/g,'')):headers;
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([legacyHeaders,row]),'Datos');
    const result=await api.readBuffer('prueba.xls',buffer(XLSX.write(wb,{type:'buffer',bookType:format})));assert.equal(api.format(convert(result).records[0].values).text,expected);
  }
  const alternatives=['NÚMERO DE FACTURA','Materiales','ADSCRIPCIÓN','Orden de Compra','Req','Otro','Número de Entrada','Portal-Web'];
  assert.equal(api.detect([alternatives.map(text=>({text}))]).score,7);
  const repeated=[...headers];repeated.push('Factura');assert.equal(api.detect([repeated.map(text=>({text}))]).mapping.factura,-1,'Ambiguous columns require manual selection');
  const partial=api.convert({name:'CSV',rows:[row.map(text=>({text}))]},0,{unidad:0,factura:0,articulo:1,dependencia:2,oc:3,requisicion:4,entrada:6,procedimiento:7},'file');assert.equal(partial.records[0].values.unidad,'3351','Even a forged mapping cannot change F');
  for(const [name,data] of [['bad.xlsx','invalid'],['bad.xls','invalid'],['bad.csv','A,B\n"unclosed'],['bad.exe','text']])await assert.rejects(()=>api.readBuffer(name,buffer(Buffer.from(data))));
  assert.equal(api.cell({formula:'A1'}).text,'');assert.ok(api.cell({formula:'A1'}).error);assert.equal(api.cell({formula:'A1',result:35},'0000').text,'0035');
  const many=[headers.join(','),...Array.from({length:5000},(_,i)=>[...row.slice(0,5),String(i).padStart(5,'0'),...row.slice(6)].join(','))].join('\n');
  assert.equal(convert(await api.readBuffer('muchas.csv',buffer(Buffer.from(many)))).records.length,5000);
  const source=fs.readFileSync('modulos/generar-textos.html','utf8');assert.ok(source.includes('id="gtAgregar"')&&source.includes('id="tabla"'));
  console.log('Generar textos: XLSX/XLS/CSV, hojas, encabezados, columna F fija, ceros, decimales, formato exacto, incompletas, errores y 5,000 filas aprobados.');
})().catch(e=>{console.error(e);process.exitCode=1;});
