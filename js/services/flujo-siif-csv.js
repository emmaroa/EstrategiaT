(function(global) {
  'use strict';
  const normalizar=s=>String(s??'').replace(/^\uFEFF/,'').trim().toUpperCase();
  const clave=s=>{const t=normalizar(s);return /^\d+$/.test(t)?t.replace(/^0+(?=\d)/,''):t;};
  const encabezado=s=>/^(REQ|REQUISICION|REQUISICIONES|NUMERO REQUISICION|NUMERO DE REQUISICION|NUMERO REQ|NO REQUISICION|FOLIO)$/.test(normalizar(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[_.]/g,' ').replace(/\s+/g,' '));
  function parse(text) {
    text=text.replace(/^\uFEFF/,'');
    if(text.length>1024*1024)throw Error('El CSV debe ser menor a 1 MB.');
    let quoted=false;const counts={',':0,';':0,'\t':0};
    for(let i=0;i<text.length;i++) {
      if(text[i]==='"'){if(quoted&&text[i+1]==='"'){i++;continue;}quoted=!quoted;}
      if(!quoted&&/[\r\n]/.test(text[i]))break;
      if(!quoted&&Object.hasOwn(counts,text[i]))counts[text[i]]++;
    }
    const sep=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
    let rows=[],row=[],cell='',inside=false,closed=false;
    function pushCell(){row.push(cell);cell='';closed=false;if(row.length>100)throw Error('Máximo 100 columnas.');}
    function pushRow(){pushCell();if(row.some(c=>c.trim()))rows.push(row);row=[];if(rows.length>5001)throw Error('Máximo 5,000 filas de datos.');}
    for(let i=0;i<text.length;i++) {
      const ch=text[i];
      if(inside){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{inside=false;closed=true;}}else cell+=ch;continue;}
      if(ch===sep){pushCell();continue;}
      if(ch==='\r'||ch==='\n'){if(ch==='\r'&&text[i+1]==='\n')i++;pushRow();continue;}
      if(closed){if(ch===' '||ch==='\t')continue;throw Error('Hay texto después de una celda entre comillas.');}
      if(ch==='"'){if(cell.length)throw Error('Comillas inválidas en el CSV.');inside=true;}else cell+=ch;
    }
    if(inside)throw Error('El CSV tiene comillas sin cerrar.');
    if(cell.length||row.length||closed)pushRow();
    if(!rows.length)throw Error('El archivo no contiene requisiciones.');
    return rows;
  }
  function match(rows,registros,{columna=0,header=false,year=''}={}) {
    if(rows.length-(header?1:0)>5000)throw Error('Máximo 5,000 filas de datos. Marca el encabezado si corresponde.');
    const index=new Map();
    for(const r of registros){if(year&&String(r.fecha_req||'').slice(0,4)!==year)continue;const k=clave(r.numero_req);if(!k)continue;if(!index.has(k))index.set(k,[]);index.get(k).push(r);}
    const seen=new Set(),ids=[],detalles=[];
    rows.slice(header?1:0).forEach((r,i)=>{
      const numero=String(r[columna]??'').trim(),k=clave(numero);let estado;
      if(!k)estado='Sin número';else if(seen.has(k))estado='Repetida en CSV';
      else {seen.add(k);const found=index.get(k)||[];if(found.length===1){estado='Encontrada';ids.push(found[0].id);}else estado=found.length?'Ambigua: elige el año o revisa el folio':'No encontrada';}
      detalles.push({fila:i+1+(header?1:0),numero,estado});
    });
    return {ids,detalles};
  }
  global.ETFlujoCSV={parse,match,encabezado,clave};
})(typeof window==='undefined'?globalThis:window);
