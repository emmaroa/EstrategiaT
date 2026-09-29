(function(global){
  'use strict';
  const scriptURL=document.currentScript.src;
  const api=global.ETTextosTabulares, $=id=>document.getElementById(id), pageSize=50;
  let rows=[], nextId=1, tablePage=1, resultPage=1, showing=false, pending=null, mapping={}, header=0, worker=null, epoch=0, toastTimer, lastImport=null, renderTimer;
  const element=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
  const button=(text,fn)=>{const el=element('button',text,'btn-secondary');el.type='button';el.addEventListener('click',fn);return el;};
  const blank=()=>Object.fromEntries(api.fields.map(f=>[f.key,'']));
  const isEmpty=r=>api.fields.every(f=>!api.clean(r.values[f.key])&&!r.errors[f.key]);
  const missing=r=>api.format(r.values).missing;
  const source=r=>r.source ? r.source.file+' · '+r.source.sheet+' · Fila '+r.source.row : 'Fila manual '+r.id;
  function mostrarToast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2400);}
  function copiarFallback(text){
    const active=document.activeElement,temporary=element('textarea');temporary.value=text;temporary.style.position='fixed';temporary.style.left='-10000px';document.body.append(temporary);temporary.select();
    let copied=false;try{copied=document.execCommand('copy');}finally{temporary.remove();active?.focus();}
    if(!copied)throw Error('No fue posible copiar. Selecciona el texto o usa Descargar textos.');
  }
  async function copiarTexto(text){
    if(!text)return;
    try{try{await navigator.clipboard.writeText(text);}catch(_){copiarFallback(text);}mostrarToast('Texto copiado al portapapeles');}
    catch(error){mostrarToast(error.message);}
  }
  function inicializarBiblioteca(){
    document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',()=>copiarTexto(b.dataset.copy)));
    $('buscarTexto').addEventListener('input',()=>{const search=api.normalize($('buscarTexto').value);document.querySelectorAll('[data-section]').forEach(card=>{card.hidden=!api.normalize(card.textContent).includes(search);});});
  }
  function pagination(host,page,total,change){
    const pages=Math.max(1,Math.ceil(total/pageSize));host.replaceChildren();
    const prev=button('Anterior',()=>change(page-1)),next=button('Siguiente',()=>change(page+1));prev.disabled=page<=1;next.disabled=page>=pages;
    host.append(prev,element('span','Página '+page+' de '+pages+' · '+total+' filas'),next);
  }
  function renderTable(){
    tablePage=Math.max(1,Math.min(tablePage,Math.ceil(rows.length/pageSize)||1));
    const tbody=document.querySelector('#tabla tbody');tbody.replaceChildren();
    rows.slice((tablePage-1)*pageSize,tablePage*pageSize).forEach(r=>{
      const tr=element('tr');tr.dataset.rowId=r.id;
      api.fields.forEach(f=>{
        const td=element('td');td.dataset.label=f.label;
        const input=element('input');input.type='text';input.value=r.values[f.key];input.dataset.field=f.key;
        input.setAttribute('aria-label',f.label+' · '+source(r));
        if(r.generated&&!isEmpty(r)&&!api.clean(input.value))input.classList.add('gt-empty-cell');
        input.addEventListener('input',()=>{
          r.values[f.key]=input.value;delete r.errors[f.key];input.classList.toggle('gt-empty-cell',r.generated&&!api.clean(input.value));
          clearTimeout(renderTimer);renderTimer=setTimeout(renderResults,120);
        });td.append(input);tr.append(td);
      });
      const actions=element('td');actions.dataset.label='Acciones';actions.append(element('small',source(r),'gt-source'),button('Eliminar',()=>{rows=rows.filter(x=>x!==r);renderTable();renderResults();}));tr.append(actions);tbody.append(tr);
    });
    pagination($('gtTablaPaginas'),tablePage,rows.length,p=>{tablePage=p;renderTable();});
  }
  function agregarFila(){if(rows.length>=api.MAX_ROWS){mostrarToast('El límite es de 10,000 filas.');return;}rows.push({id:nextId++,values:blank(),errors:{},generated:false});tablePage=Math.ceil(rows.length/pageSize);renderTable();document.querySelector('#tabla tbody tr:last-child input')?.focus();}
  function generar(){showing=true;rows.forEach(r=>{r.generated=!isEmpty(r);});resultPage=1;renderTable();renderResults();}
  function editRow(r){tablePage=Math.floor(rows.indexOf(r)/pageSize)+1;renderTable();const tr=document.querySelector('#tabla tr[data-row-id="'+r.id+'"]');tr?.scrollIntoView({behavior:'smooth',block:'center'});tr?.querySelector('input')?.focus();}
  function completeTexts(){return rows.filter(r=>r.generated&&!isEmpty(r)&&!missing(r).length&&!Object.keys(r.errors).length).map(r=>api.format(r.values).text);}
  function renderResults(){
    const host=$('resultado');host.replaceChildren();
    const generated=rows.filter(r=>r.generated&&!isEmpty(r)), search=api.clean($('gtBuscar').value).toUpperCase(), filter=$('gtFiltro').value;
    const visible=generated.filter(r=>{
      const complete=!missing(r).length&&!Object.keys(r.errors).length;
      return (!search||['unidad','factura','requisicion','oc'].some(key=>api.clean(r.values[key]).toUpperCase().includes(search)))&&(filter==='todos'||(filter==='completos'?complete:!complete));
    });
    resultPage=Math.max(1,Math.min(resultPage,Math.ceil(visible.length/pageSize)||1));
    visible.slice((resultPage-1)*pageSize,resultPage*pageSize).forEach(r=>{
      const output=api.format(r.values),complete=!output.missing.length&&!Object.keys(r.errors).length;
      const card=element('article',undefined,'result-card gt-result');card.dataset.rowId=r.id;
      card.append(element('strong',source(r)+' · Unidad: '+(api.clean(r.values.unidad,true)||'Sin unidad')));
      if(complete)card.append(element('pre',output.text));
      else{
        const notices=output.missing.map(key=>'Falta '+(key==='unidad'?'Unidad en la columna F':api.fields.find(f=>f.key===key).label)+'.');
        for(const [key,message] of Object.entries(r.errors))notices.push(api.fields.find(f=>f.key===key).label+': '+message+'.');
        card.append(element('p',notices.join(' '),'gt-warning'));
      }
      const actions=element('div',undefined,'gt-result-actions');const copy=button('Copiar',()=>copiarTexto(api.format(r.values).text));copy.disabled=!complete;
      actions.append(copy,button('Editar',()=>editRow(r)),button('Regenerar',()=>{r.generated=true;renderResults();}));card.append(actions);host.append(card);
    });
    if(!visible.length)host.append(element('div',showing?'No hay resultados que coincidan. Revisa la captura y los filtros.':'Captura una fila o importa un archivo para generar textos.','empty-result'));
    pagination($('gtResultadoPaginas'),resultPage,visible.length,p=>{resultPage=p;renderResults();});
    const totals=completeTexts();$('gtCopiarTodos').disabled=!totals.length;$('gtDescargar').disabled=!totals.length;
    const incomplete=generated.filter(r=>missing(r).length||Object.keys(r.errors).length).length;
    const errors=generated.reduce((n,r)=>n+Object.keys(r.errors).length,0);
    const omitted=rows.filter(isEmpty).length+(lastImport?.omitted||0);
    $('gtResumen').textContent=(lastImport?'Último archivo: '+lastImport.name+' · Total de filas encontradas: '+lastImport.total+' · Filas omitidas del archivo: '+lastImport.omitted+'. ':'')+
      'Captura actual: '+totals.length+' textos generados · '+incomplete+' filas incompletas · '+omitted+' filas vacías omitidas · '+errors+' errores detectados.';
  }
  function currentSheet(){return pending?.sheets[Number($('gtHoja').value)||0];}
  function columnName(index){let s='';for(let n=index+1;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
  function mappings(){
    const sheet=currentSheet();if(!sheet)return;
    const labels=header?sheet.rows[header-1]||[]:[];
    const count=Math.max(6,labels.length,...sheet.rows.slice(0,100).map(r=>r.length));
    $('gtColumnas').replaceChildren();
    api.fields.forEach(f=>{
      const label=element('label',f.label),select=element('select');select.dataset.mapping=f.key;select.setAttribute('aria-label','Columna para '+f.label);
      if(f.key==='unidad'){const option=element('option','F · Fija para Unidad');option.value=5;select.append(option);select.disabled=true;}
      else{
        const empty=element('option','Sin columna — corregir en la captura');empty.value=-1;select.append(empty);
        for(let i=0;i<count;i++){const opt=element('option',columnName(i)+' · '+(api.clean(labels[i]?.text)||'Sin encabezado'));opt.value=i;select.append(opt);}
        select.value=String(mapping[f.key]??-1);select.addEventListener('change',()=>{mapping[f.key]=Number(select.value);preview();});
      }label.append(select);$('gtColumnas').append(label);
    });preview();
  }
  function preview(){
    const sheet=currentSheet();if(!sheet)return;
    const host=$('gtPreview');host.replaceChildren();
    try{
      const result=api.convert(sheet,header,mapping,pending.name);
      const missingColumns=api.fields.slice(1).filter(f=>!(mapping[f.key]>=0));
      $('gtDeteccion').textContent=missingColumns.length?'Relaciona las columnas pendientes: '+missingColumns.map(f=>f.label).join(', ')+'. Si las dejas sin columna, podrás completarlas después.':'Columnas relacionadas. Revisa la vista previa antes de procesar.';
      result.records.slice(0,5).forEach(r=>{const card=element('article');card.append(element('strong','Fila original '+r.source.row));const dl=element('dl');api.fields.forEach(f=>dl.append(element('dt',f.label+(f.key==='unidad'?' (F)':'')),element('dd',r.errors[f.key]||r.values[f.key]||'Falta dato')));card.append(dl);host.append(card);});
      if(!result.records.length)host.append(element('p','No hay filas de datos después del encabezado.'));
      $('gtProcesar').disabled=!result.records.length;
    }catch(e){$('gtEstado').textContent=e.message;$('gtProcesar').disabled=true;}
  }
  function chooseSheet(){const sheet=currentSheet();if(!sheet)return;const detected=api.detect(sheet.rows);header=detected.header;mapping=detected.mapping;$('gtEncabezado').value=header;$('gtEncabezado').max=sheet.rows.length;mappings();}
  function cancel(){epoch++;worker?.terminate();worker=null;pending=null;$('gtConfiguracion').hidden=true;$('gtCancelar').hidden=true;$('gtArchivo').value='';$('gtSeleccionar').disabled=false;$('gtEstado').textContent='Importación cancelada. La captura y los resultados se conservan.';}
  async function loadFile(file){
    if(!file)return;
    epoch++;const token=epoch;worker?.terminate();pending=null;$('gtConfiguracion').hidden=true;$('gtCancelar').hidden=false;$('gtSeleccionar').disabled=true;$('gtEstado').textContent='Leyendo '+file.name+'…';
    try{
      if(!/\.(xlsx|xls|csv)$/i.test(file.name))throw Error('Selecciona un archivo .xlsx, .xls o .csv.');
      if(!file.size||file.size>api.MAX_SIZE)throw Error('El archivo está vacío o supera 10 MB.');
      const buffer=await file.arrayBuffer();if(token!==epoch)return;
      const data=await new Promise((resolve,reject)=>{
        const current=new Worker(new URL('textos-importacion.worker.js?v=2.0.108',scriptURL));worker=current;
        const timeout=setTimeout(()=>{current.terminate();reject(Error('El archivo tardó demasiado en procesarse. Divide el archivo e inténtalo de nuevo.'));},60000);
        current.onmessage=event=>{clearTimeout(timeout);current.terminate();event.data.error?reject(Error(event.data.error)):resolve(event.data.data);};
        current.onerror=()=>{clearTimeout(timeout);current.terminate();reject(Error('No se pudo iniciar el lector local. Abre el sistema mediante su servidor web.'));};
        current.postMessage({name:file.name,buffer},[buffer]);
      });
      if(token!==epoch)return;worker=null;pending={...data,name:file.name};$('gtHoja').replaceChildren();
      data.sheets.forEach((sheet,i)=>{const option=element('option',sheet.name);option.value=i;$('gtHoja').append(option);});
      $('gtHoja').disabled=data.sheets.length===1;$('gtConfiguracion').hidden=false;$('gtEstado').textContent='Archivo: '+file.name;chooseSheet();
    }catch(e){if(token===epoch){$('gtEstado').textContent='No se importó: '+e.message;mostrarToast(e.message);}}
    finally{if(token===epoch){$('gtSeleccionar').disabled=false;$('gtArchivo').value='';}}
  }
  function process(){
    if(!pending)return;
    try{
      const batch=api.convert(currentSheet(),header,mapping,pending.name);const existing=rows.filter(r=>!isEmpty(r));
      if(existing.length+batch.records.length>api.MAX_ROWS)throw Error('La captura admite hasta 10,000 filas. Elimina filas antes de importar otro archivo.');
      rows=existing.concat(batch.records.map(r=>({...r,id:nextId++,generated:true})));showing=true;tablePage=1;resultPage=1;
      lastImport={name:pending.name,total:batch.total,omitted:batch.omitted};
      const file=pending.name;pending=null;$('gtConfiguracion').hidden=true;$('gtCancelar').hidden=true;$('gtEstado').textContent=file+': '+batch.records.length+' filas cargadas en la tabla editable.';
      renderTable();renderResults();mostrarToast('Archivo procesado. Revisa las filas incompletas.');
    }catch(e){$('gtEstado').textContent=e.message;mostrarToast(e.message);}
  }
  function init(){
    if(typeof global.validarPermiso==='function'&&!global.validarPermiso('Generar Textos'))return;
    global.ETLayout?.inicializar('Generar Textos');inicializarBiblioteca();
    document.querySelectorAll('#tabla tbody tr').forEach(tr=>rows.push({id:nextId++,values:Object.fromEntries(api.fields.map((f,i)=>[f.key,tr.querySelectorAll('input')[i]?.value||''])),errors:{},generated:false}));
    const tablePagination=element('div',undefined,'gt-pagination');tablePagination.id='gtTablaPaginas';document.querySelector('#tabla').closest('.table-container').after(tablePagination);
    const resultPagination=element('div',undefined,'gt-pagination');resultPagination.id='gtResultadoPaginas';$('resultado').after(resultPagination);
    $('gtAgregar').addEventListener('click',agregarFila);$('gtGenerar').addEventListener('click',generar);
    $('gtSeleccionar').addEventListener('click',()=>$('gtArchivo').click());$('gtArchivo').addEventListener('change',e=>loadFile(e.target.files[0]));
    $('gtDrop').addEventListener('dragover',e=>{e.preventDefault();$('gtDrop').classList.add('dragging');});$('gtDrop').addEventListener('dragleave',()=>$('gtDrop').classList.remove('dragging'));
    $('gtDrop').addEventListener('drop',e=>{e.preventDefault();$('gtDrop').classList.remove('dragging');if(e.dataTransfer.files.length!==1){mostrarToast('Carga un solo archivo a la vez.');return;}loadFile(e.dataTransfer.files[0]);});
    $('gtCancelar').addEventListener('click',cancel);$('gtProcesar').addEventListener('click',process);$('gtHoja').addEventListener('change',chooseSheet);
    $('gtEncabezado').addEventListener('change',()=>{header=Number($('gtEncabezado').value);const sheet=currentSheet();if(!Number.isInteger(header)||header<0||header>sheet.rows.length){$('gtEstado').textContent='Selecciona una fila de encabezados válida.';$('gtProcesar').disabled=true;return;}mapping=header?api.detect([sheet.rows[header-1]]).mapping:{unidad:5};mappings();});
    for(const id of ['gtBuscar','gtFiltro'])$(id).addEventListener(id==='gtBuscar'?'input':'change',()=>{resultPage=1;renderResults();});
    $('gtCopiarTodos').addEventListener('click',()=>copiarTexto(completeTexts().join('\n\n')));
    $('gtDescargar').addEventListener('click',()=>{const text=completeTexts().join('\n\n');if(!text)return;const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=element('a');a.href=url;a.download='Textos_solicitudes_pago.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
    $('gtLimpiar').addEventListener('click',()=>{rows.forEach(r=>{r.generated=false;});showing=false;renderResults();mostrarToast('Resultados limpiados. Los datos permanecen en la tabla.');});
    renderTable();renderResults();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);
