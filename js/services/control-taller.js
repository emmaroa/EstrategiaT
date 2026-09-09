const tallerDb=window.supabaseClient||window.supabase?.client||window.SupabaseClient;let ingresosTaller=[],unidadesTaller=[],pendientesTaller=[],ingresoEditando=null,pendienteEditando=null;
let areasControl=[];let accesoGlobalControl=false;
document.addEventListener("DOMContentLoaded",()=>{if(typeof validarPermiso==="function")validarPermiso("Control de Taller");if(window.ETLayout)ETLayout.inicializar("Control de Taller");enlazarTaller();cargarControlTaller()});
function enlazarTaller(){iniciarSalidaTaller();iniciarReporteTaller();document.getElementById("btnNuevoProveedorTaller").addEventListener("click",mostrarNuevoProveedorTaller);document.getElementById("guardarProveedorTaller").addEventListener("click",agregarProveedorTaller);document.getElementById("cancelarProveedorTaller").addEventListener("click",()=>{document.getElementById("nuevoProveedorTaller").hidden=true;});document.getElementById("unidadTaller")?.addEventListener("input",actualizarDetalleUnidadTaller);["buscarTaller","filtroMovimiento","filtroAmbito","filtroEstatus","filtroProveedor"].forEach(id=>document.getElementById(id)?.addEventListener(id==="buscarTaller"?"input":"change",renderizarTaller));document.getElementById("btnNuevoIngreso")?.addEventListener("click",()=>abrirIngreso());document.getElementById("btnReporteDirector")?.addEventListener("click",()=>document.getElementById("reporteDirector")?.scrollIntoView({behavior:"smooth"}));document.getElementById("cerrarIngreso")?.addEventListener("click",cerrarIngreso);document.getElementById("cancelarIngreso")?.addEventListener("click",cerrarIngreso);document.getElementById("guardarIngreso")?.addEventListener("click",guardarIngreso);document.getElementById("exportarDependencias")?.addEventListener("click",exportarDependencias);document.getElementById("exportarDetalle")?.addEventListener("click",exportarDetalle);document.getElementById("modalIngreso")?.addEventListener("click",e=>{if(e.target.id==="modalIngreso")cerrarIngreso()})}
function usuarioTaller(){try{return JSON.parse(localStorage.getItem("usuarioActivo")||"null")}catch(_){return null}}
function obtenerAreasControl(usuario){let valor=usuario?.areas_permitidas;if(typeof valor==="string"){try{valor=JSON.parse(valor)}catch(_){valor=valor.split(",")}}return Array.isArray(valor)?valor.map(v=>String(v||"").trim()).filter(Boolean):[]}
function rolGlobalControl(usuario){return ["superadmin","super admin","super_admin","admin","administrador del sistema","jefe","director"].includes(normalizarTaller(usuario?.rol))}
function areaDeUnidad(u){const combustible=normalizarTaller(u.combustible),grupo=normalizarTaller(u.grupo),texto=normalizarTaller([u.grupo,u.descripcion,u.unidad_patrulla,u.modelo].join(" "));if(/colector/.test(texto))return"Colectores";if(/barredora/.test(texto))return"Barredoras";if(combustible==="electrico"||combustible==="hibrido")return"Electricas";if(/motocicleta|moto\b/.test(texto))return"Motocicletas";if(grupo.includes("maquinaria pesada"))return"Maquinaria Pesada";if(combustible==="gasolina")return"Gasolina";if(combustible==="diesel")return"Diesel";return"Sin área"}
function configurarIdentidadArea(){const usuario=usuarioTaller();areasControl=obtenerAreasControl(usuario);accesoGlobalControl=rolGlobalControl(usuario);const etiqueta=accesoGlobalControl?"Áreas":areasControl.length===1?"Área "+areasControl[0]:"Áreas "+areasControl.join(" / ");document.getElementById("tituloControlArea").textContent="Control "+etiqueta;document.getElementById("etModuleName").textContent="Control "+etiqueta;document.getElementById("subtituloControlArea").textContent=accesoGlobalControl?"Vista general de entradas, salidas y seguimiento por área.":"Datos exclusivos de "+(areasControl.join(", ")||"las áreas asignadas")+".";document.getElementById("btnReporteDirector").style.display=accesoGlobalControl?"":"none"}
function normalizarTaller(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim()}
function escTaller(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function fechaIsoLocal(){const d=new Date();return[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
function diasEnTaller(i){if(i.estatus==="Terminado"&&!i.fecha_salida)return null;const fin=i.fecha_salida?new Date(i.fecha_salida+"T00:00:00"):new Date();const ini=new Date(i.fecha_ingreso+"T00:00:00");return Math.max(0,Math.floor((fin-ini)/86400000))}
function unidadPorId(id){return unidadesTaller.find(u=>u.id===id)||{}}
function numeroUnidad(u){return u.numero_economico||u.numero_inventario||u.unidad_patrulla||"Sin número"}
async function cargarTodosTaller(tabla,columnas,orden){const data=[];for(let desde=0;;desde+=1000){let consulta=tallerDb.from(tabla).select(columnas).range(desde,desde+999);if(orden)consulta=consulta.order(orden.columna,{ascending:orden.ascendente});const pagina=await consulta;if(pagina.error)return{data:[],error:pagina.error};data.push(...(pagina.data||[]));if((pagina.data||[]).length<1000)break}return{data,error:null}}
async function cargarControlTaller(){if(!tallerDb?.from)return;configurarIdentidadArea();const [ingresos,unidades,pendientes]=await Promise.all([cargarTodosTaller("ingresos_taller","*",{columna:"fecha_ingreso",ascendente:false}),cargarTodosTaller("parque_vehicular","id,numero_economico,numero_inventario,unidad_patrulla,descripcion,marca,modelo,grupo,combustible,dependencia,disponibilidad",{columna:"id",ascendente:true}),cargarTodosTaller("ingresos_taller_pendientes","*",{columna:"creado_en",ascendente:true})]);if(ingresos.error||unidades.error){console.error(ingresos.error||unidades.error);alert("No se pudo cargar Control de Área. Verifica que las migraciones estén aplicadas.");return}if(pendientes.error)console.warn("Pendientes de taller no disponibles:",pendientes.error.message);const todasUnidades=unidades.data||[];unidadesTaller=accesoGlobalControl?todasUnidades:todasUnidades.filter(u=>areasControl.includes(areaDeUnidad(u)));const ids=new Set(unidadesTaller.map(u=>u.id));ingresosTaller=(ingresos.data||[]).filter(i=>accesoGlobalControl||ids.has(i.vehiculo_id));pendientesTaller=((pendientes.error?[]:pendientes.data)||[]).filter(i=>accesoGlobalControl||areasControl.includes(areaPendienteControl(i,todasUnidades)));await cargarProveedoresCapturaTaller();opcionesReporteTaller();poblarProveedoresTaller();actualizarDetalleUnidadTaller();renderizarTaller();renderizarPendientesTaller()}
function claveUnidad(v){return normalizarTaller(v).replace(/[^a-z0-9]/g,"")}
function buscarUnidadEscrita(valor){const clave=claveUnidad(valor);if(!clave)return null;const coincidencias=unidadesTaller.filter(u=>[u.numero_economico,u.numero_inventario,u.unidad_patrulla].some(campo=>claveUnidad(campo)===clave));return coincidencias.length===1?coincidencias[0]:null}
function poblarProveedoresTaller() {
  const filtro = document.getElementById("filtroProveedor");
  if (!filtro) return;
  const seleccion = filtro.value;
  const proveedores = new Map();
  ingresosTaller.forEach(i => {
    const nombre = String(i.taller_nombre || "").trim();
    const clave = normalizarTaller(nombre);
    if (clave && !proveedores.has(clave)) proveedores.set(clave, nombre);
  });
  filtro.innerHTML = '<option value="">Todos los proveedores</option>';
  Array.from(proveedores).sort((a, b) => a[1].localeCompare(b[1], "es")).forEach(([clave, nombre]) => {
    const opcion = document.createElement("option");
    opcion.value = clave;
    opcion.textContent = nombre;
    filtro.appendChild(opcion);
  });
  filtro.value = proveedores.has(seleccion) ? seleccion : "";
}
function incluyeMovimientoTaller(valor, tipo) {
  return valor === tipo || (valor === "Ambos" && ["Preventivo", "Correctivo"].includes(tipo));
}
function nombreMovimientoTaller(valor) { return valor === "Ambos" ? "Preventivo y correctivo" : valor; }
function filtradosTaller() {
  const q = normalizarTaller(document.getElementById("buscarTaller")?.value);
  const mov = document.getElementById("filtroMovimiento")?.value || "";
  const amb = document.getElementById("filtroAmbito")?.value || "";
  const est = document.getElementById("filtroEstatus")?.value || "";
  const proveedor = document.getElementById("filtroProveedor")?.value || "";
  return ingresosTaller.filter(i =>
    (!q || normalizarTaller([i.numero_economico,i.unidad_descripcion,i.dependencia,i.concepto,i.descripcion,i.taller_nombre,i.refacciones].join(" ")).includes(q)) &&
    (!mov || incluyeMovimientoTaller(i.tipo_movimiento, mov)) &&
    (!amb || i.taller_ambito === amb) &&
    (!est || i.estatus === est) &&
    (!proveedor || normalizarTaller(i.taller_nombre) === proveedor)
  );
}
function estadoVisualTaller(i) {
  const notas = normalizarTaller([i.motivo_revision,i.observaciones,i.descripcion].filter(Boolean).join(" "));
  if (normalizarTaller(i.estatus) === "posible baja" || /\bposible baja\b/.test(notas)) return {clase:"baja",etiqueta:"Posible baja"};
  const estados = {"en curso":{clase:"curso",etiqueta:"En curso"},"terminado":{clase:"terminado",etiqueta:"Terminado"},"en espera":{clase:"espera",etiqueta:"En espera"}};
  return estados[normalizarTaller(i.estatus)] || {clase:"sin-estado",etiqueta:i.estatus || "Sin estatus"};
}
function etiquetaEstadoTaller(i) {
  const estado=estadoVisualTaller(i);
  return '<span class="taller-estado taller-estado-'+estado.clase+'">'+escTaller(estado.etiqueta)+'</span>';
}
function renderizarTaller(){const lista=filtradosTaller(),tbody=document.getElementById("tablaTaller");tbody.innerHTML=lista.length?"":'<tr><td colspan="11" class="estado-vacio">No hay ingresos con estos filtros.</td></tr>';lista.forEach(i=>{const tr=document.createElement("tr"),dias=diasEnTaller(i),cot=i.estatus_cotizacion||"No requerida";tr.className="taller-fila-"+estadoVisualTaller(i).clase;tr.innerHTML=`<td>${escTaller(i.numero_economico)}</td><td>${escTaller(i.unidad_descripcion)}</td><td>${escTaller(i.dependencia)}</td><td>${escTaller(nombreMovimientoTaller(i.tipo_movimiento))}</td><td title="${escTaller(i.descripcion)}">${escTaller(i.concepto)}</td><td>${escTaller(i.taller_ambito+" · "+i.taller_nombre)}</td><td>${formatearFechaTaller(i.fecha_ingreso)}</td><td class="${dias>30&&i.estatus!=="Terminado"?"estado-alerta":""}">${dias===null?"Sin fecha de salida":dias}</td><td>${etiquetaEstadoTaller(i)}</td><td class="monto">${escTaller(cot)}${i.monto_cotizacion?" · "+monedaTaller(i.monto_cotizacion):""}</td><td><div class="acciones-taller"><button type="button" class="action-btn icon-only edit" title="Editar" aria-label="Editar">${ETLayout.icono("editar")}</button>${i.estatus!=="Terminado"?'<button type="button" class="action-btn icon-only blue" data-salida-taller title="Registrar salida" aria-label="Registrar salida">'+ETLayout.icono('avanzar')+'</button>':""}${puedeEliminarIngresoTaller(i)?'<button type="button" class="action-btn icon-only delete" data-eliminar-taller title="Eliminar registro" aria-label="Eliminar registro">'+ETLayout.icono('eliminar')+'</button>':""}</div></td>`;const botones=tr.querySelectorAll("button");botones[0].addEventListener("click",()=>abrirIngreso(i));tr.querySelector("[data-salida-taller]")?.addEventListener("click",()=>registrarSalida(i));tr.querySelector("[data-eliminar-taller]")?.addEventListener("click",()=>eliminarIngresoTaller(i));tbody.appendChild(tr)});actualizarKpisTaller();renderizarIndicadoresTaller();renderizarReporteDirector();aplicarSoloLectura()}
function aplicarSoloLectura(){const solo=typeof esSoloLectura==="function"&&esSoloLectura();if(solo){document.getElementById("btnNuevoIngreso").style.display="none";document.querySelectorAll(".acciones-taller").forEach(e=>e.style.display="none")}}
function actualizarKpisTaller(){const abiertos=ingresosTaller.filter(i=>i.estatus!=="Terminado");document.getElementById("kpiEnTaller").textContent=abiertos.length;document.getElementById("kpiPreventivos").textContent=abiertos.filter(i=>incluyeMovimientoTaller(i.tipo_movimiento,"Preventivo")).length;document.getElementById("kpiCorrectivos").textContent=abiertos.filter(i=>incluyeMovimientoTaller(i.tipo_movimiento,"Correctivo")).length;document.getElementById("kpiAtrasados").textContent=abiertos.filter(i=>diasEnTaller(i)>30).length;document.getElementById("kpiCotizaciones").textContent=abiertos.filter(i=>["Pendiente","Solicitada"].includes(i.estatus_cotizacion)).length}
function resumenDependencias() {
  const enTaller = new Set(ingresosTaller.filter(i => i.estatus !== "Terminado").map(i => i.vehiculo_id));
  const grupos = new Map();
  unidadesTaller.forEach(u => {
    const dependencia = u.dependencia || "Sin dependencia";
    if (!grupos.has(dependencia)) grupos.set(dependencia, {dependencia, total:0, taller:0});
    const grupo = grupos.get(dependencia);
    grupo.total++;
    if (enTaller.has(u.id)) grupo.taller++;
  });
  return Array.from(grupos.values()).map(r => ({...r, activas:r.total-r.taller})).sort((a,b)=>b.total-a.total);
}
function renderizarGraficaDependencias() {
  const contenedor=document.getElementById('graficaDependencias');
  if(!contenedor)return;
  const datos=resumenDependencias().filter(d=>d.taller>0).sort((a,b)=>b.taller-a.taller||b.total-a.total||a.dependencia.localeCompare(b.dependencia,'es'));
  if(!datos.length){contenedor.innerHTML='<li>No hay unidades en taller en las áreas seleccionadas.</li>';return;}
  const maximo=Math.max(1,...datos.map(d=>d.taller));
  contenedor.innerHTML=datos.map(d=>`<li class="dependencia-grafica-fila">
    <div class="dependencia-grafica-titulo"><strong>${escTaller(d.dependencia)}</strong><span><b>${d.taller}</b> en taller de ${d.total} · ${porcentaje(d.taller,d.total)}</span></div>
    <div class="dependencia-grafica-pista" aria-hidden="true"><div class="dependencia-grafica-barra dependencia-segmento-taller" style="width:${100*d.taller/maximo}%"></div></div>
  </li>`).join('');
}
function areaPendienteControl(pendiente, unidades) {
  const clave = claveUnidad(pendiente.numero_economico);
  const coincidencias = clave ? unidades.filter(u => [u.numero_economico,u.numero_inventario,u.unidad_patrulla].some(v => claveUnidad(v) === clave)) : [];
  if (coincidencias.length === 1) return areaDeUnidad(coincidencias[0]);
  const texto = normalizarTaller(pendiente.unidad_descripcion);
  if (/colector/.test(texto)) return "Colectores";
  if (/barredora/.test(texto)) return "Barredoras";
  return pendiente.area;
}
function renderizarReporteDirector(){renderizarGraficaDependencias();document.getElementById("reporteCorte").textContent="Corte al "+new Date().toLocaleDateString("es-MX")+" · datos del parque vehicular y Control de Taller";const dep=document.getElementById("tablaDependencias");dep.innerHTML="";resumenDependencias().forEach(r=>{const tr=document.createElement("tr");tr.innerHTML=`<td>${escTaller(r.dependencia)}</td><td>${r.total}</td><td>${r.activas}</td><td>${r.taller}</td><td>${porcentaje(r.activas,r.total)}</td><td>${porcentaje(r.taller,r.total)}</td>`;dep.appendChild(tr)});const abiertos=ingresosTaller.filter(i=>i.estatus!=="Terminado"),conteo={};abiertos.forEach(i=>{const n=i.taller_nombre||"Sin taller";conteo[n]=(conteo[n]||0)+1});const dist=document.getElementById("tablaDistribucion");dist.innerHTML="";Object.entries(conteo).sort((a,b)=>b[1]-a[1]).forEach(([n,c])=>{const tr=document.createElement("tr");tr.innerHTML=`<td>${escTaller(n)}</td><td>${c}</td><td>${porcentaje(c,abiertos.length)}</td>`;dist.appendChild(tr)});if(!abiertos.length)dist.innerHTML='<tr><td colspan="3">Sin unidades en taller</td></tr>'}
function porcentaje(n,d){return d?(n/d*100).toFixed(1)+"%":"0.0%"}function monedaTaller(n){return Number(n||0).toLocaleString("es-MX",{style:"currency",currency:"MXN"})}function formatearFechaTaller(f){if(!f)return"—";const p=String(f).slice(0,10).split("-");return p.length===3?p[2]+"/"+p[1]+"/"+p[0]:f}
function abrirIngreso(i){if(typeof esSoloLectura==="function"&&esSoloLectura())return;ingresoEditando=i?.id||null;document.getElementById("tituloModalIngreso").textContent=i?"Editar seguimiento":"Registrar ingreso";document.getElementById("unidadTaller").value=i?.numero_economico||"";document.getElementById("unidadTaller").disabled=false;document.getElementById("tipoMovimiento").value=i?.tipo_movimiento||"Correctivo";document.getElementById("ambitoTaller").value=i?.taller_ambito||"Interno";seleccionarProveedorTaller(i?.taller_nombre||"INTERNO");document.getElementById("nuevoProveedorTaller").hidden=true;document.getElementById("fechaIngreso").value=i?.fecha_ingreso||fechaIsoLocal();document.getElementById("estatusTaller").value=i?.estatus||"En curso";document.getElementById("tiempoEntregaTaller").value=i?.tiempo_entrega_aproximado||"";document.getElementById("fechaSalida").value=i?.fecha_salida||"";document.getElementById("conceptoTaller").value=i?.concepto||"";document.getElementById("descripcionTaller").value=i?.descripcion||"";document.getElementById("refaccionesTaller").value=i?.refacciones||"";document.getElementById("estatusCotizacion").value=i?.estatus_cotizacion||"No requerida";document.getElementById("montoCotizacion").value=i?.monto_cotizacion||"";actualizarDetalleUnidadTaller();document.getElementById("modalIngreso").classList.add("show");document.getElementById("modalIngreso").setAttribute("aria-hidden","false")}
function cerrarIngreso(){ingresoEditando=null;pendienteEditando=null;document.getElementById("unidadTaller").disabled=false;document.getElementById("modalIngreso").classList.remove("show");document.getElementById("modalIngreso").setAttribute("aria-hidden","true")}
async function guardarIngreso(){
  const numeroEscrito=document.getElementById("unidadTaller").value.trim(),u=buscarUnidadEscrita(numeroEscrito),usuario=usuarioTaller();
  if(!u){alert("La unidad todavía no coincide con Parque Vehicular. Regístrala o corrige el número económico antes de completar este ingreso.");document.getElementById("unidadTaller").focus();return}
  if(!document.getElementById("nombreTaller").value.trim()||!document.getElementById("conceptoTaller").value.trim()||!document.getElementById("fechaIngreso").value){alert("Completa taller, concepto y fecha de ingreso.");return}
  const datos={vehiculo_id:u.id,numero_economico:numeroEscrito,unidad_descripcion:u.descripcion||u.modelo||u.unidad_patrulla||"Unidad",dependencia:u.dependencia||"Sin dependencia",tipo_movimiento:document.getElementById("tipoMovimiento").value,taller_ambito:document.getElementById("ambitoTaller").value,taller_nombre:document.getElementById("nombreTaller").value.trim(),fecha_ingreso:document.getElementById("fechaIngreso").value,estatus:document.getElementById("estatusTaller").value,fecha_salida:document.getElementById("fechaSalida").value||null,concepto:document.getElementById("conceptoTaller").value.trim(),descripcion:document.getElementById("descripcionTaller").value.trim()||null,refacciones:document.getElementById("refaccionesTaller").value.trim()||null,estatus_cotizacion:document.getElementById("estatusCotizacion").value,monto_cotizacion:Number(document.getElementById("montoCotizacion").value)||null,actualizado_en:new Date().toISOString()};
  const tiempoEntrega = document.getElementById("tiempoEntregaTaller").value.trim();
  if(tiempoEntrega.length > 80){alert("El tiempo de entrega debe tener como máximo 80 caracteres.");return}
  if(tiempoEntrega || ingresosTaller.some(i=>i.id===ingresoEditando && Object.hasOwn(i,"tiempo_entrega_aproximado"))) datos.tiempo_entrega_aproximado=tiempoEntrega||null;
  if(datos.estatus==="Terminado"&&!datos.fecha_salida)datos.fecha_salida=fechaIsoLocal();
  let res;if(ingresoEditando)res=await tallerDb.from("ingresos_taller").update(datos).eq("id",ingresoEditando);else res=await tallerDb.from("ingresos_taller").insert(Object.assign(datos,{creado_por:usuario?.id||null,creado_por_nombre:usuario?.nombre||usuario?.usuario||"Usuario"}));
  if(res.error){alert("No se pudo guardar el ingreso. "+res.error.message);return}
  if(pendienteEditando){const eliminado=await tallerDb.from("ingresos_taller_pendientes").delete().eq("id",pendienteEditando);if(eliminado.error){alert("El ingreso se guardó, pero no se pudo retirar de pendientes.");return}}
  cerrarIngreso();await cargarControlTaller()
}
let ingresoSalidaTaller = null, guardandoSalidaTaller = false;
function iniciarSalidaTaller() {
  const dialogo = document.getElementById("dialogoSalidaTaller");
  document.getElementById("formSalidaTaller").addEventListener("submit", guardarSalidaTaller);
  document.getElementById("cancelarSalidaTaller").addEventListener("click", () => {
    if (!guardandoSalidaTaller) dialogo.close();
  });
  dialogo.addEventListener("cancel", e => { if (guardandoSalidaTaller) e.preventDefault(); });
  dialogo.addEventListener("close", () => {
    ingresoSalidaTaller = null;
    document.getElementById("formSalidaTaller").reset();
  });
}
function registrarSalida(i) {
  if (guardandoSalidaTaller || i.estatus === "Terminado" ||
      (typeof esSoloLectura === "function" && esSoloLectura())) return;
  ingresoSalidaTaller = i;
  document.getElementById("unidadSalidaTaller").textContent = "Unidad " + i.numero_economico;
  const fecha = document.getElementById("fechaSalidaTaller");
  fecha.min = i.fecha_ingreso || "";
  fecha.max = fechaIsoLocal();
  fecha.value = fechaIsoLocal();
  document.getElementById("notasSalidaTaller").value = "";
  document.getElementById("errorSalidaTaller").textContent = "";
  document.getElementById("dialogoSalidaTaller").showModal();
  fecha.focus();
}
async function guardarSalidaTaller(event) {
  event.preventDefault();
  if (!ingresoSalidaTaller || guardandoSalidaTaller ||
      (typeof esSoloLectura === "function" && esSoloLectura())) return;
  const form = document.getElementById("formSalidaTaller");
  if (!form.reportValidity()) return;
  const ingreso = ingresoSalidaTaller;
  const fecha = document.getElementById("fechaSalidaTaller").value;
  const notas = document.getElementById("notasSalidaTaller").value.trim();
  const error = document.getElementById("errorSalidaTaller");
  error.textContent = "";
  if (!fecha || fecha < ingreso.fecha_ingreso || fecha > fechaIsoLocal()) {
    error.textContent = "La salida debe estar entre la fecha de ingreso y hoy.";
    return;
  }
  // Conservar las notas en la descripción, visible en seguimiento y exportaciones.
  const descripcion = [ingreso.descripcion, notas ? "Notas de salida (" + fecha + "): " + notas : ""].filter(Boolean).join("\n\n");
  if (descripcion.length > 2000) {
    error.textContent = "La descripción y las notas juntas no pueden superar 2000 caracteres. Reduce las notas.";
    return;
  }
  guardandoSalidaTaller = true;
  const guardar = document.getElementById("guardarSalidaTaller");
  const cancelar = document.getElementById("cancelarSalidaTaller");
  guardar.disabled = cancelar.disabled = true;
  try {
    const datos = {estatus:"Terminado", fecha_salida:fecha, actualizado_en:new Date().toISOString()};
    if (notas) datos.descripcion = descripcion;
    let consulta = tallerDb.from("ingresos_taller").update(datos).eq("id", ingreso.id).eq("estatus", ingreso.estatus);
    if (ingreso.actualizado_en) consulta = consulta.eq("actualizado_en", ingreso.actualizado_en);
    const res = await consulta.select("id");
    if (res.error) { error.textContent = "No se pudo guardar la salida. Intenta de nuevo."; return; }
    if (!res.data?.length) {
      error.textContent = "El registro cambió. Cancela y actualiza el listado antes de registrar la salida.";
      return;
    }
    document.getElementById("dialogoSalidaTaller").close();
    await cargarControlTaller();
  } catch (_) {
    error.textContent = "No se pudo completar la operación. Actualiza el listado para comprobar el estado.";
  } finally {
    guardandoSalidaTaller = false;
    guardar.disabled = cancelar.disabled = false;
  }
}
function csvTaller(nombre,encabezados,filas){const proteger=v=>'"'+String(v??"").replace(/\r?\n/g," ").replace(/"/g,'""')+'"',contenido=[encabezados,...filas].map(f=>f.map(proteger).join(",")).join("\r\n"),blob=new Blob(["\ufeff"+contenido],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=nombre;a.click();URL.revokeObjectURL(a.href)}
function exportarDependencias(){csvTaller("reporte-director-unidades-por-dependencia.csv",["Dependencia","Total de Unidades Asignadas","Activas","En Taller","% Activas","% En Taller"],resumenDependencias().map(r=>[r.dependencia,r.total,r.activas,r.taller,porcentaje(r.activas,r.total),porcentaje(r.taller,r.total)]))}
function exportarDetalle(){csvTaller("reporte-director-detalle-taller.csv",["No. Económico","Tipo de unidad","Dirección","Tipo de Movimiento","Concepto","Descripción","Refacciones necesarias","Taller","Ámbito","Ingreso","Tiempo en Taller (días)","Estatus","Salida","Estatus cotización","Monto cotizado"],filtradosTaller().map(i=>[i.numero_economico,i.unidad_descripcion,i.dependencia,nombreMovimientoTaller(i.tipo_movimiento),i.concepto,i.descripcion,i.refacciones,i.taller_nombre,i.taller_ambito,i.fecha_ingreso,diasEnTaller(i)??"Sin fecha de salida",i.estatus,i.fecha_salida,i.estatus_cotizacion,i.monto_cotizacion]))}
function puedeCompletarPendientes(){const usuario=usuarioTaller();return !(typeof esSoloLectura==="function"&&esSoloLectura(usuario))&&normalizarTaller(usuario?.rol)!=="director"}
function renderizarPendientesTaller(){const tbody=document.getElementById("tablaPendientesTaller"),contador=document.getElementById("contadorPendientes");if(!tbody)return;contador.textContent=pendientesTaller.length+" pendiente"+(pendientesTaller.length===1?"":"s");tbody.innerHTML=pendientesTaller.length?"":'<tr><td colspan="9" class="estado-vacio">No hay registros pendientes.</td></tr>';pendientesTaller.forEach(i=>{const tr=document.createElement("tr");tr.className="fila-pendiente taller-fila-"+estadoVisualTaller(i).clase;tr.innerHTML=`<td>${escTaller(i.numero_economico||"Pendiente")}</td><td>${escTaller(i.unidad_descripcion||"—")}</td><td>${escTaller(i.dependencia||"—")}</td><td>${escTaller(i.tipo_movimiento||"—")}</td><td>${escTaller(i.concepto||"—")}</td><td>${escTaller(i.taller_nombre||"—")}</td><td>${formatearFechaTaller(i.fecha_ingreso)}</td><td class="motivo-pendiente">${etiquetaEstadoTaller(i)}<div>${escTaller(i.motivo_revision)}</div></td><td>${puedeCompletarPendientes()?'<button type="button" class="action-btn icon-only edit" title="Completar registro" aria-label="Completar registro">'+ETLayout.icono('revision')+'</button>':"Solo lectura"}</td>`;tr.querySelector("button")?.addEventListener("click",()=>abrirPendienteTaller(i));tbody.appendChild(tr)})}
function abrirPendienteTaller(i){pendienteEditando=i.id;ingresoEditando=null;document.getElementById("tituloModalIngreso").textContent="Completar registro pendiente";document.getElementById("unidadTaller").value=i.numero_economico||"";document.getElementById("unidadTaller").disabled=false;document.getElementById("tipoMovimiento").value=i.tipo_movimiento||"Correctivo";document.getElementById("ambitoTaller").value=normalizarTaller(i.taller_nombre).includes("interno")?"Interno":"Foráneo";seleccionarProveedorTaller(i.taller_nombre||"");document.getElementById("nuevoProveedorTaller").hidden=true;document.getElementById("fechaIngreso").value=i.fecha_ingreso||"";document.getElementById("estatusTaller").value=i.estatus||"En curso";document.getElementById("tiempoEntregaTaller").value=i.tiempo_entrega_aproximado||"";document.getElementById("fechaSalida").value=i.fecha_salida||"";document.getElementById("conceptoTaller").value=i.concepto||"";document.getElementById("descripcionTaller").value=[i.descripcion,i.observaciones].filter(Boolean).join(" · ");document.getElementById("refaccionesTaller").value="";document.getElementById("estatusCotizacion").value="No requerida";document.getElementById("montoCotizacion").value="";actualizarDetalleUnidadTaller();document.getElementById("modalIngreso").classList.add("show");document.getElementById("modalIngreso").setAttribute("aria-hidden","false")}

function puedeEliminarIngresoTaller(ingreso) {
  const usuario = usuarioTaller();
  return Boolean(usuario?.id && ingreso?.creado_por &&
    String(usuario.id) === String(ingreso.creado_por) &&
    !(typeof esSoloLectura === "function" && esSoloLectura()));
}

const eliminacionesTaller = new Set();
async function eliminarIngresoTaller(ingreso) {
  if (!puedeEliminarIngresoTaller(ingreso)) {
    alert("Solo quien capturó el registro puede eliminarlo.");
    return;
  }
  if (eliminacionesTaller.has(ingreso.id)) return;
  eliminacionesTaller.add(ingreso.id);
  try {
    const usuario = usuarioTaller();
    const password = await ETLayout.seleccionar({
      title: "Eliminar registro de taller",
      message: "Se eliminará el ingreso de la unidad " + ingreso.numero_economico +
        " del " + formatearFechaTaller(ingreso.fecha_ingreso) +
        ". Esta acción no se puede deshacer. Confirma con tu contraseña de acceso.",
      input: true, inputType: "password", placeholder: "Contraseña",
      confirmLabel: "Eliminar registro", danger: true
    });
    if (password === null) return;
    if (!password.trim()) { alert("Escribe tu contraseña para confirmar."); return; }
    if (!puedeEliminarIngresoTaller(ingreso) || usuarioTaller()?.id !== usuario.id) return;
    const resultado = await tallerDb.rpc("eliminar_ingreso_taller", {
      p_ingreso_id: ingreso.id, p_usuario_id: usuario.id, p_password: password.trim()
    });
    if (resultado.error) {
      alert(["PGRST202", "42883"].includes(resultado.error.code)
        ? "Falta aplicar la actualización de Control de Taller en la base de datos."
        : "No se pudo eliminar. Verifica tu contraseña y que seas quien capturó el registro.");
      return;
    }
    if (resultado.data !== true) { alert("El registro no se eliminó. Actualiza el listado."); return; }
    await cargarControlTaller();
  } catch (_) {
    alert("No se pudo completar la operación. Actualiza el listado antes de intentar de nuevo.");
  } finally {
    eliminacionesTaller.delete(ingreso.id);
  }
}

function actualizarDetalleUnidadTaller() {
  const contenedor = document.getElementById("detalleUnidadTaller");
  if (!contenedor) return;
  const valor = document.getElementById("unidadTaller").value.trim();
  const dependencia = document.getElementById("dependenciaUnidadTaller");
  dependencia.textContent = "Escribe el número de la unidad";
  contenedor.hidden = !valor;
  contenedor.innerHTML = "";
  if (!valor) return;
  const unidad = buscarUnidadEscrita(valor);
  dependencia.textContent = unidad ? (unidad.dependencia || "Sin dependencia") : "Unidad no identificada";
  if (!unidad) {
    contenedor.textContent = "No se identifica una unidad única con ese número. Completa o revisa el número económico o de patrulla.";
    return;
  }
  const datos = [
    ["Número económico", unidad.numero_economico || unidad.numero_inventario],
    ["Número de patrulla", unidad.unidad_patrulla],
    ["Descripción", unidad.descripcion || unidad.unidad_patrulla],
    ["Marca", unidad.marca],
    ["Modelo", unidad.modelo],
    ["Dependencia", unidad.dependencia],
    ["Área", areaDeUnidad(unidad)],
    ["Combustible", unidad.combustible],
    ["Disponibilidad", unidad.disponibilidad]
  ];
  contenedor.innerHTML = '<h3>Datos de la unidad</h3><dl>' + datos.map(([etiqueta, dato]) =>
    '<div><dt>' + escTaller(etiqueta) + '</dt><dd>' + escTaller(dato || "Sin información") + '</dd></div>'
  ).join("") + '</dl>';
}
