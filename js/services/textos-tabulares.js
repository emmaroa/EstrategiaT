(function (root) {
  'use strict';
  const fields = [
    { key:'unidad', label:'Unidad', aliases:[] },
    { key:'factura', label:'Folio Interno Factura', aliases:['folio interno factura','folio factura','factura','no factura','numero de factura','num factura'] },
    { key:'articulo', label:'Artículo', aliases:['articulo','material','materiales','descripcion','concepto'] },
    { key:'dependencia', label:'Dependencia', aliases:['dependencia','area','adscripcion'] },
    { key:'oc', label:'Folio OC', aliases:['folio oc','oc','orden de compra','no oc','numero oc','numero de orden de compra'] },
    { key:'requisicion', label:'No. Requisición', aliases:['no requisicion','requisicion','numero de requisicion','req','no req','folio requisicion'] },
    { key:'entrada', label:'Entrada de Almacén', aliases:['num entrada almacen','entrada almacen','entrada','no entrada','numero de entrada','folio entrada','entrada de almacen'] },
    { key:'procedimiento', label:'Procedimiento Web', aliases:['procedimiento web','folio web','procedimiento','portal web','procedimiento en portal web de compras'] }
  ];
  const MAX_ROWS = 10000, MAX_COLUMNS = 100, MAX_SIZE = 10 * 1024 * 1024;
  function clean(value, identifier = false) {
    if (value == null || typeof value === 'object' || (typeof value === 'number' && !Number.isFinite(value))) return '';
    let s = String(value).replace(/\s+/g,' ').trim();
    if (/^(undefined|null|nan|\[object object\])$/i.test(s)) return '';
    if (identifier) s = s.replace(/^([+-]?\d+)[.,]0+$/, '$1');
    return s;
  }
  function normalize(value) {
    return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
      .replace(/\b(numero|num|nro|nº|n°)\b/g,'no').replace(/\bde\b/g,'').replace(/[^a-z0-9]/g,'');
  }
  function format(values) {
    const v = Object.fromEntries(fields.map(f => [f.key,clean(values[f.key], !['articulo','dependencia'].includes(f.key))]));
    if (!/\d/.test(v.unidad)) v.unidad = 'UNIDADES';
    const missing = fields.filter(f=>!v[f.key]).map(f=>f.key);
    if(missing.length) return { text:'', missing, values:v };
    const destino = v.unidad === 'UNIDADES' ? 'UNIDADES' : 'UNIDAD ' + v.unidad;
    const text = `${v.unidad}: PAGO DE FACTURA ${v.factura} POR ADQUISICION DE ${v.articulo} PARA ${destino} DE ${v.dependencia}.\nOC ${v.oc} REQ ${v.requisicion} ${v.entrada}\nPROCEDIMIENTO EN PORTAL WEB DE COMPRAS: ${v.procedimiento}`.toUpperCase();
    return {text,missing,values:v};
  }
  function cell(raw, numberFormat) {
    if(raw && typeof raw === 'object') {
      if(raw.error) return {text:'',error:'Error de celda: '+raw.error};
      if(raw.richText) return {text:raw.richText.map(r=>r.text||'').join('')};
      if(raw.formula || raw.sharedFormula) return raw.result == null ? {text:'',error:'Fórmula sin resultado guardado'} : cell(raw.result,numberFormat);
      if(raw.text !== undefined) return {text:clean(raw.text)};
      if(raw instanceof Date) return {text:raw.toISOString().slice(0,10)};
      return {text:'',error:'Valor de celda no compatible'};
    }
    if(typeof raw === 'number') {
      if(!Number.isFinite(raw) || (Number.isInteger(raw) && !Number.isSafeInteger(raw))) return {text:'',error:'Identificador numérico fuera de la precisión de Excel; corrígelo como texto'};
      // Conservar máscaras como 000000 sin introducir separadores de miles ni decimales.
      const mask = (numberFormat || '').split(';')[0];
      if (/^0{2,}(?:\.0+)?$/.test(mask) && Number.isInteger(raw) && raw>=0) return {text:String(raw).padStart(mask.split('.')[0].length,'0')};
    }
    return {text:clean(raw)};
  }
  function parseCSV(text, delimiter) {
    text=text.replace(/^\ufeff/,'');
    if(text.includes('\0')) throw Error('El CSV contiene datos binarios o una codificación no compatible.');
    let records=[], row=[], value='', quoted=false, closed=false;
    for(let i=0;i<text.length;i++) {
      const ch=text[i];
      if(quoted) { if(ch==='"') {if(text[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else value+=ch;continue; }
      if(ch==='"' && !value && !closed) {quoted=true;continue;}
      if(ch===delimiter) {row.push({text:value});value='';closed=false;continue;}
      if(ch==='\r'||ch==='\n') {if(ch==='\r'&&text[i+1]==='\n')i++;row.push({text:value});records.push(row);row=[];value='';closed=false;if(records.length>MAX_ROWS+100)throw Error('El archivo supera 10,000 filas de datos.');continue;}
      if(closed && ch.trim()) throw Error('CSV dañado: caracteres después de una celda entre comillas.');
      if(ch==='"') throw Error('CSV dañado: comillas sin escapar.');
      value+=ch;
    }
    if(quoted) throw Error('CSV dañado: una celda tiene comillas sin cerrar.');
    if(value||row.length||closed) {row.push({text:value});records.push(row);}
    if(records.some(r=>r.length>MAX_COLUMNS))throw Error('El archivo supera 100 columnas.');
    return records;
  }
  function detect(rows) {
    let best = { header:0, score:0, mapping:{unidad:5} };
    rows.slice(0,100).forEach((row,index)=>{
      const mapping={unidad:5};let score=0;
      for(const f of fields.slice(1)) {
        const matches=row.map((c,i)=>f.aliases.some(a=>normalize(a)===normalize(c.text))?i:-1).filter(i=>i>=0);
        mapping[f.key]=matches.length===1?matches[0]:-1;
        if(matches.length===1)score++;
      }
      if(score>best.score)best={header:index+1,score,mapping};
    });
    return best.score>=3?best:{header:0,score:0,mapping:Object.fromEntries(fields.map(f=>[f.key,f.key==='unidad'?5:-1]))};
  }
  async function readBuffer(name, buffer) {
    if(!buffer.byteLength||buffer.byteLength>MAX_SIZE) throw Error('El archivo está vacío o supera 10 MB.');
    const ext=name.split('.').pop().toLowerCase(), bytes=new Uint8Array(buffer);
    if(!['xlsx','xls','csv'].includes(ext)) throw Error('Selecciona un archivo .xlsx, .xls o .csv.');
    if(ext==='csv') {
      let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}catch(_){text=new TextDecoder('windows-1252').decode(buffer);}
      let delimiter=',', skip=0;const sep=text.replace(/^\ufeff/,'').match(/^sep=([,;\t])\r?\n/i);
      if(sep){delimiter=sep[1];text=text.replace(/^\ufeff/,'').slice(sep[0].length);skip=1;}
      else {
        // Evaluar registros completos respeta delimitadores dentro de comillas y encabezados desplazados.
        let best=-1;
        for(const d of [',',';','\t'])try{const r=parseCSV(text,d);const score=detect(r).score*100+Math.min(99,Math.max(0,...r.slice(0,100).map(x=>x.length)));if(score>best){best=score;delimiter=d;}}catch(_){}
      }
      const rows=parseCSV(text,delimiter);if(!rows.some(r=>r.some(c=>clean(c.text))))throw Error('El archivo no contiene datos.');
      return {sheets:[{name:'CSV',rows,offset:skip}]};
    }
    let sheets;
    if(ext==='xlsx') {
      if(bytes[0]!==0x50||bytes[1]!==0x4b)throw Error('El archivo no es un Excel XLSX válido.');
      const book=new root.ExcelJS.Workbook();
      try{await book.xlsx.load(buffer);}catch(_){throw Error('Excel dañado, protegido o ilegible.');}
      sheets=book.worksheets.map(sheet=>{
        if(sheet.rowCount>MAX_ROWS+100||sheet.columnCount>MAX_COLUMNS)throw Error('La hoja supera 10,000 filas de datos o 100 columnas.');
        const rows=[];for(let r=1;r<=sheet.rowCount;r++){const row=[];for(let c=1;c<=Math.max(6,sheet.columnCount);c++){const v=sheet.getRow(r).getCell(c);row.push(cell(v.value,v.numFmt));}rows.push(row);}
        return {name:sheet.name,rows,offset:0};
      });
    } else {
      if(!((bytes[0]===0xd0&&bytes[1]===0xcf)||(bytes[0]===0x09&&[0x00,0x02,0x04,0x08].includes(bytes[1]))))throw Error('El archivo no es un Excel XLS válido.');
      let book;try{book=root.XLSX.read(buffer,{type:'array',cellNF:true,cellText:false});}catch(_){throw Error('Excel XLS dañado, protegido o ilegible.');}
      sheets=book.SheetNames.map(name=>{
        const sheet=book.Sheets[name];if(!sheet['!ref'])return {name,rows:[],offset:0};
        const range=root.XLSX.utils.decode_range(sheet['!ref']);
        if(range.e.r>=MAX_ROWS+100||range.e.c>=MAX_COLUMNS)throw Error('La hoja supera 10,000 filas de datos o 100 columnas.');
        const rows=[];for(let r=0;r<=range.e.r;r++){const row=[];for(let c=0;c<=Math.max(5,range.e.c);c++){const v=sheet[root.XLSX.utils.encode_cell({r,c})];row.push(v?.t==='e'?{text:'',error:'Error de celda Excel'}:v?.f&&v.v==null?{text:'',error:'Fórmula sin resultado guardado'}:cell(v?.v,v?.z));}rows.push(row);}return {name,rows,offset:0};
      });
    }
    if(!sheets.length||!sheets.some(s=>s.rows.some(r=>r.some(c=>clean(c.text)||c.error))))throw Error('El libro no contiene datos.');
    return {sheets};
  }
  function convert(sheet, header, mapping, fileName) {
    if(!Number.isInteger(header)||header<0||header>sheet.rows.length)throw Error('La fila de encabezados no es válida.');
    const rows=sheet.rows.slice(header);if(rows.length>MAX_ROWS)throw Error('El límite es de 10,000 filas de datos.');
    let omitted=0;const records=[];
    rows.forEach((row,index)=>{
      if(!row.some(c=>clean(c?.text)||c?.error)){omitted++;return;}
      const values={},errors={};
      fields.forEach(f=>{const c=row[f.key==='unidad'?5:mapping[f.key]];values[f.key]=clean(c?.text,!['articulo','dependencia'].includes(f.key));if(c?.error)errors[f.key]=c.error;});
      if (!/\d/.test(values.unidad) && !errors.unidad) values.unidad = 'UNIDADES';
      records.push({values,errors,source:{file:fileName,sheet:sheet.name,row:header+index+1+(sheet.offset||0)}});
    });
    return {records,total:rows.length,omitted};
  }
  const api={fields,clean,normalize,format,cell,parseCSV,detect,readBuffer,convert,MAX_ROWS,MAX_SIZE};
  root.ETTextosTabulares=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
