(function (global) {
  'use strict';
  if (!global.validarPermiso('Crear cotización')) return;
  global.ETLayout.inicializar('Crear cotización');
  const $ = id => document.getElementById(id), XML = global.ETCotizacionXML, API = global.ETCrearCotizacionAPI;
  const user = JSON.parse(localStorage.getItem('usuarioActivo') || 'null');
  const canEdit = global.ETPermissions.puedeEditarModulo(user, 'Crear cotización');
  let records = [], selected = null, preview = null, revision = 0, timer, busy = false, offset = 0;
  const status = text => { $('cqEstado').textContent = text; };
  const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
  function button(text, action) { const b = node('button', text, 'btn-secondary'); b.type = 'button'; b.addEventListener('click', action); return b; }
  function actionDisabled(value) { ['cqGuardar','cqPDF','cqImprimir'].forEach(id => { $(id).disabled = value || (id === 'cqGuardar' && !canEdit); }); }
  function list() {
    $('cqLista').replaceChildren();
    $('cqContador').textContent = records.length + ' archivo(s) · ' + records.filter(r => r.q).length + ' cotización(es) listas';
    records.forEach(r => {
      const li = node('li', undefined, 'cq-file'); li.append(node('span', r.name + ' · ' + r.state));
      if (r.q) li.append(button(canEdit ? 'Editar / vista previa' : 'Vista previa', () => select(r)), button('PDF', () => { select(r); output('download'); }), button('Imprimir', () => { select(r); output('print'); }));
      li.append(button('Quitar', () => { if (busy) return; records = records.filter(x => x !== r); if (selected === r) { selected = null; revision++; $('cqTrabajo').hidden = true; } list(); }));
      $('cqLista').append(li);
    });
  }
  async function load(files) {
    if (!canEdit || busy) return;
    if (files.length > 20) { status('Selecciona hasta 20 archivos por lote.'); return; }
    busy = true; $('cqArchivos').disabled = true;
    for (const file of files) {
      const r = { name:file.name, state:'Procesando…' }; records.push(r); list();
      try {
        if (!/\.xml$/i.test(file.name)) throw Error('Solo se aceptan archivos .xml.');
        if (!file.size || file.size > 5 * 1024 * 1024) throw Error('El archivo está vacío o supera 5 MB.');
        const buffer = await file.arrayBuffer();
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)), b => b.toString(16).padStart(2,'0')).join('');
        if (records.some(x => x !== r && x.q?.hash === hash)) throw Error('Archivo duplicado.');
        const start = new TextDecoder().decode(buffer.slice(0,180));
        const encoding = start.match(/encoding\s*=\s*["']([^"']+)/i)?.[1] || 'utf-8';
        const q = XML.parse(new TextDecoder(encoding, { fatal:true }).decode(buffer), file.name); q.hash = hash;
        if (q.uuid && records.some(x => x !== r && x.q?.uuid === q.uuid)) throw Error('UUID repetido en otro archivo.');
        r.q = q; r.state = 'Listo para revisar';
      } catch (e) { r.state = 'Error: ' + e.message; }
      list();
    }
    busy = false; $('cqArchivos').disabled = false; $('cqArchivos').value = '';
    if (!selected) { const first = records.find(r => r.q); if (first) select(first); }
    status('Procesamiento terminado. Cada archivo válido tiene su propia cotización.');
  }
  function field(parent, object, key, label, options = {}) {
    const wrap = node('label', label, options.wide ? 'cq-wide' : '');
    const input = node(options.values ? 'select' : options.multiline ? 'textarea' : 'input');
    if (options.values) for (const value of options.values) { const opt = node('option', value); opt.value = value; input.append(opt); }
    else if (!options.multiline) { input.type = options.type || 'text'; if (input.type === 'number') { input.step = '0.000001'; input.min = '0'; } }
    input.value = object[key] ?? ''; input.disabled = !canEdit;
    if (options.placeholder) input.placeholder = options.placeholder;
    input.addEventListener('input', () => {
      object[key] = input.value; options.change?.(); selected.state = 'Cambios sin guardar'; list(); schedule();
    });
    wrap.append(input); parent.append(wrap); return input;
  }
  function section(form, title) { const fs = node('fieldset'); fs.append(node('legend', title)); const grid = node('div', undefined, 'cq-grid'); fs.append(grid); form.append(fs); return grid; }
  function select(r) {
    selected = r; preview = null; $('cqTrabajo').hidden = false; $('cqTitulo').textContent = 'Editar · ' + r.name;
    $('cqAdvertencia').textContent = r.q.advertencia || '';
    const q = r.q, form = $('cqFormulario'); form.replaceChildren();
    let grid = section(form, 'Datos de la cotización');
    field(grid,q,'folio','Folio de cotización',{placeholder:'Automático al guardar'}); field(grid,q,'fecha','Fecha',{type:'date'});
    for (const [key,label] of [['Moneda','Moneda'],['TipoCambio','Tipo de cambio'],['FormaPago','Forma de pago'],['MetodoPago','Método de pago']]) field(grid,q.origen,key,label);
    grid = section(form,'Proveedor'); for (const [key,label] of [['Nombre','Nombre / razón social'],['Rfc','RFC'],['RegimenFiscal','Régimen fiscal']]) field(grid,q.emisor,key,label);
    grid = section(form,'Receptor'); for (const [key,label] of [['Nombre','Nombre / razón social'],['Rfc','RFC'],['DomicilioFiscalReceptor','Domicilio fiscal'],['RegimenFiscalReceptor','Régimen fiscal'],['UsoCFDI','Uso de referencia']]) field(grid,q.receptor,key,label);
    const concepts = node('fieldset'); concepts.append(node('legend','Conceptos (' + q.items.length + ')')); form.append(concepts);
    q.items.forEach((item, index) => {
      const details = node('details'); details.open = q.items.length === 1; details.append(node('summary',(index+1) + '. ' + item.descripcion));
      const fields = node('div',undefined,'cq-grid'); details.append(fields); concepts.append(details);
      const reset = () => { delete item.importeOriginal; item.taxes.forEach(t => { t.manual = false; if (t.factor !== 'Cuota') t.base = ''; }); };
      for (const [key,label] of [['descripcion','Descripción'],['cantidad','Cantidad'],['unidad','Unidad'],['precio','Precio unitario'],['descuento','Descuento'],['clave','Clave producto / servicio'],['claveUnidad','Clave unidad'],['identificacion','Identificación']]) {
        field(fields,item,key,label,{multiline:key==='descripcion',wide:key==='descripcion',type:['cantidad','precio','descuento'].includes(key)?'number':'text',change:['cantidad','precio','descuento'].includes(key)?reset:undefined});
      }
      item.taxes.forEach((tax, ti) => {
        const block = node('div',undefined,'cq-tax cq-grid'); details.append(block);
        field(block,tax,'tipo','Tipo',{values:['Traslado','Retencion']}); field(block,tax,'impuesto','Impuesto SAT (002 = IVA)');
        field(block,tax,'factor','Factor',{values:['Tasa','Cuota','Exento'],change:()=>{tax.manual=false;}});
        field(block,tax,'tasa','Tasa / cuota (0.16 = 16 %)',{type:'number',change:()=>{tax.manual=false;}});
        field(block,tax,'base','Base (vacía = importe menos descuento)',{type:'number',change:()=>{tax.manual=false;}});
        field(block,tax,'importe','Importe manual (editar sustituye el cálculo)',{type:'number',change:()=>{tax.manual=true;}});
        if(canEdit) block.append(button('Quitar impuesto',()=>{item.taxes.splice(ti,1);r.state='Cambios sin guardar';list();select(r);}));
      });
      if(canEdit) details.append(button('Agregar impuesto',()=>{item.taxes.push({tipo:'Traslado',impuesto:'002',factor:'Tasa',tasa:'0.16',base:'',importe:'0',manual:false}); r.state='Cambios sin guardar';list();select(r);}));
    });
    grid = section(form,'Ajustes y nota');
    field(grid,q,'trasladosExtra','Traslados globales adicionales',{type:'number'}); field(grid,q,'retencionesExtra','Retenciones globales adicionales',{type:'number'});
    field(grid,q,'nota','Nota opcional',{multiline:true,wide:true});
    grid = section(form,'Referencia de origen'); field(grid,q,'uuid','UUID de origen');
    for(const [key,label] of [['Serie','Serie de origen'],['Folio','Folio de origen'],['Fecha','Fecha de emisión de origen']]) field(grid,q.origen,key,label);
    schedule();
  }
  function schedule() { clearTimeout(timer); preview = null; revision++; actionDisabled(true); timer = setTimeout(refresh,180); }
  async function refresh() {
    if (!selected) return;
    const current = revision, record = selected;
    try {
      const result = await global.ETCotizacionPDF.build(structuredClone(record.q));
      if (current !== revision || record !== selected) return;
      preview = result; $('cqPreview').replaceChildren(result.svg);
      $('cqEscala').textContent = result.scale < .75 ? 'Contenido extenso: escala ' + Math.round(result.scale*100) + ' %. El texto se reduce para conservar todos los conceptos en una página.' : 'Documento completo · Una página carta';
      $('cqTotales').textContent = 'Subtotal: ' + result.totals.subtotal + ' · Descuentos: ' + result.totals.descuento + ' · Impuestos: ' + result.totals.traslados + ' · Retenciones: ' + result.totals.retenciones + ' · Total: ' + result.totals.total + ' ' + record.q.origen.Moneda;
      actionDisabled(false);
    } catch(e) { if (current === revision) { $('cqPreview').replaceChildren(); $('cqTotales').textContent = ''; $('cqEscala').textContent = e.message; actionDisabled(true); } }
  }
  async function output(kind) {
    if (!selected) return;
    try {
      const result = await global.ETCotizacionPDF.build(structuredClone(selected.q));
      if(kind === 'download') result.pdf.save(result.filename);
      else { await document.fonts.load('12px CotizacionNoto'); $('cqPreview').replaceChildren(result.svg); await new Promise(r=>requestAnimationFrame(r)); window.print(); }
    } catch(e) { status('No se pudo generar el PDF: ' + e.message); }
  }
  $('cqGuardar').addEventListener('click',async()=>{
    if(!selected || busy || !canEdit) return;
    const r = selected; busy = true; actionDisabled(true);
    $('cqFormulario').inert = true;
    try { XML.validate(r.q); r.q = await API.save(structuredClone(r.q)); r.state = 'Guardada · ' + r.q.folio; list(); if(selected===r) select(r); status('Cotización guardada en Supabase: ' + r.q.folio); }
    catch(e) { status('No se guardó: ' + e.message); $('cqConexion').open = true; }
    finally { busy=false; $('cqFormulario').inert=false; if(preview) actionDisabled(false); }
  });
  function savedList(data, clear) {
    if(clear) { $('cqGuardadas').replaceChildren(); offset=0; }
    offset += data.length; $('cqMas').hidden = data.length < 50;
    data.forEach(q=>{ const entry=node('div',undefined,'cq-file'); entry.append(node('span',q.folio+' · '+q.emisor.Nombre),button('Abrir',()=>{
      let r=records.find(x=>x.q?.id===q.id); if(!r){r={name:q.archivo,state:'Guardada · '+q.folio,q};records.push(r);} list();select(r);
    })); $('cqGuardadas').append(entry); });
    if(clear&&!data.length) $('cqGuardadas').append(node('p','Aún no hay cotizaciones guardadas.'));
  }
  $('cqAcceso').addEventListener('submit',async e=>{e.preventDefault(); const password=$('cqPassword').value; $('cqPassword').value=''; try{savedList(await API.connect(password),true);status('Guardado conectado durante 15 minutos.');}catch(error){status(error.message);}});
  $('cqBloquear').addEventListener('click',()=>{API.lock();$('cqGuardadas').replaceChildren();$('cqMas').hidden=true;status('Guardado desconectado.');});
  $('cqMas').addEventListener('click',async()=>{try{savedList(await API.list(offset),false);}catch(e){status(e.message);}});
  $('cqPDF').addEventListener('click',()=>output('download')); $('cqImprimir').addEventListener('click',()=>output('print'));
  $('cqArchivos').disabled = !canEdit; $('cqArchivos').addEventListener('change',e=>load(Array.from(e.target.files)));
  $('cqDrop').addEventListener('dragover',e=>{e.preventDefault();$('cqDrop').classList.add('dragging');});
  $('cqDrop').addEventListener('dragleave',()=>$('cqDrop').classList.remove('dragging'));
  $('cqDrop').addEventListener('drop',e=>{e.preventDefault();$('cqDrop').classList.remove('dragging');load(Array.from(e.dataTransfer.files));});
  global.addEventListener('beforeunload',e=>{if(records.some(r=>r.q&&(!r.q.id||r.state==='Cambios sin guardar'))){e.preventDefault();e.returnValue='';}});
})(window);
