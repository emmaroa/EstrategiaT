let catalogoProveedoresTaller=[];
async function cargarProveedoresCapturaTaller(){
  const res=await cargarTodosTaller('proveedores','id,razon_social,activo,notas',{columna:'razon_social',ascendente:true});
  if(res.error){console.error(res.error);return;}
  catalogoProveedoresTaller=res.data.filter(p=>p.activo&&p.notas==='Catalogo Control de Taller');
  seleccionarProveedorTaller(document.getElementById('nombreTaller').value);
}
function seleccionarProveedorTaller(nombre=''){
  const select=document.getElementById('nombreTaller');
  const opciones=new Map();
  [...catalogoProveedoresTaller.map(p=>p.razon_social),...ingresosTaller.map(i=>i.taller_nombre),...pendientesTaller.map(i=>i.taller_nombre),nombre].forEach(n=>{
    const limpio=String(n||'').trim();if(limpio&&!opciones.has(normalizarTaller(limpio)))opciones.set(normalizarTaller(limpio),limpio);
  });
  select.innerHTML='<option value="">Selecciona un proveedor</option>';
  Array.from(opciones.values()).sort((a,b)=>a.localeCompare(b,'es')).forEach(n=>{const option=document.createElement('option');option.value=n;option.textContent=n;select.appendChild(option);});
  select.value=opciones.get(normalizarTaller(nombre))||'';
}
function mostrarNuevoProveedorTaller(){
  if(typeof esSoloLectura==='function'&&esSoloLectura())return;
  document.getElementById('nuevoProveedorTaller').hidden=false;
  document.getElementById('nombreNuevoProveedorTaller').focus();
}
async function agregarProveedorTaller(){
  if(typeof esSoloLectura==='function'&&esSoloLectura())return;
  const input=document.getElementById('nombreNuevoProveedorTaller'),nombre=input.value.trim().replace(/\s+/g,' ').toLocaleUpperCase('es-MX');
  const mensaje=document.getElementById('mensajeNuevoProveedorTaller');
  if(!nombre||nombre.length>150){mensaje.textContent='Escribe un nombre de hasta 150 caracteres.';return;}
  const boton=document.getElementById('guardarProveedorTaller');boton.disabled=true;
  try{
    const res=await cargarTodosTaller('proveedores','id,razon_social,activo,notas',{columna:'razon_social',ascendente:true});
    if(res.error)throw res.error;
    const existente=res.data.find(p=>normalizarTaller(p.razon_social)===normalizarTaller(nombre));
    if(existente&&!existente.activo){mensaje.textContent='Ese proveedor ya existe y está inactivo. Revisa su registro antes de usarlo.';return;}
    let proveedor=existente;
    if(!proveedor){const guardado=await tallerDb.from('proveedores').insert({razon_social:nombre,activo:true,notas:'Catalogo Control de Taller'}).select('id,razon_social,activo,notas').single();if(guardado.error)throw guardado.error;proveedor=guardado.data;}
    catalogoProveedoresTaller.push(proveedor);
    seleccionarProveedorTaller(proveedor.razon_social);
    input.value='';mensaje.textContent='';document.getElementById('nuevoProveedorTaller').hidden=true;
    document.getElementById('nombreTaller').focus();
  }catch(error){mensaje.textContent='No se pudo guardar el proveedor. '+error.message;}
  finally{boton.disabled=false;}
}
