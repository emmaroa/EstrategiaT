(function(root){
  'use strict';
  const acciones=['ver','crear','editar','eliminar','cambiar_estatus','autorizar','importar','generar_requisicion','exportar','imprimir','solicitar_cancelacion','aprobar_cancelacion'];
  const lectura=['ver','exportar','imprimir'];
  const trabajo=[...lectura,'crear','editar','cambiar_estatus','solicitar_cancelacion'];
  const operativos=['Dashboard','Buscador Seccional','Reporte MIR','Parque Vehicular','Peticiones','Peticiones de Coordinadores','Seguimiento Peticiones','Gestión de Cotizaciones','Crear cotización','Seguimiento SIIF','Requisiciones SIIF','Órdenes de Compra SIIF','Solicitudes de Pago SIIF','Acuerdos','Calendario','Control de Taller','Inventario','Vales','Tiempo Extra','Tramites Administrativos','Generar Textos'];
  const portal=['Portal Proveedor','Peticiones de almacén','Cotizaciones Proveedor','Seguimiento de trámites SIIF'];
  const modulos=[...operativos,'Importar SIIF','Usuarios','Roles','Auditoría','Licencias','Cancelaciones',...portal];
  const matriz={};
  function asignar(rol,lista,permisos){const perfil=matriz[rol] ||= {};for(const modulo of lista)perfil[modulo]=[...permisos];}
  asignar('superadmin',modulos,acciones);
  asignar('administradordelsistema',[...operativos,'Importar SIIF','Auditoría','Cancelaciones'],acciones);
  asignar('compras',['Dashboard','Parque Vehicular','Seguimiento SIIF','Requisiciones SIIF','Órdenes de Compra SIIF','Solicitudes de Pago SIIF','Peticiones','Gestión de Cotizaciones','Crear cotización','Generar Textos','Importar SIIF','Cancelaciones'],trabajo);
  matriz.compras['Importar SIIF'].push('importar');
  matriz.compras.Peticiones.push('generar_requisicion');
  for(const rol of ['jefedealmacen','almacen','encargadodealmacen']){
    asignar(rol,['Dashboard','Parque Vehicular','Seguimiento SIIF'],lectura);
    asignar(rol,['Peticiones','Vales','Inventario','Cancelaciones'],trabajo);
  }
  asignar('almacen',['Gestión de Cotizaciones'],trabajo);
  asignar('jefedealmacen',['Peticiones de Coordinadores'],[...trabajo,'autorizar']);
  matriz.jefedealmacen.Cancelaciones.push('aprobar_cancelacion');
  asignar('coordinador',['Dashboard','Parque Vehicular','Peticiones','Seguimiento Peticiones'],lectura);
  asignar('coordinador',['Peticiones de Coordinadores','Control de Taller','Calendario','Cancelaciones'],trabajo);
  asignar('coordinadorinfraestructura',['Dashboard','Peticiones'],lectura);
  asignar('coordinadorinfraestructura',['Peticiones de Coordinadores','Cancelaciones'],trabajo);
  asignar('tecnico',operativos,lectura);
  asignar('tecnico',['Peticiones','Vales','Cancelaciones'],trabajo);
  asignar('capturistaadministrativo',['Dashboard','Parque Vehicular','Peticiones','Seguimiento Peticiones'],lectura);
  asignar('capturistaadministrativo',['Tramites Administrativos','Tiempo Extra','Generar Textos','Cancelaciones'],trabajo);
  asignar('proveedor',portal,lectura);
  asignar('proveedor',['Cotizaciones Proveedor','Peticiones de almacén'],trabajo);
  for(const rol of ['consulta','sololectura','director'])asignar(rol,operativos,lectura);
  asignar('capturistapv',['Dashboard'],lectura);asignar('capturistapv',['Parque Vehicular','Cancelaciones'],trabajo);
  asignar('tecnicovales',['Dashboard'],lectura);asignar('tecnicovales',['Vales','Cancelaciones'],trabajo);
  asignar('moderadordeacuerdos',['Dashboard'],lectura);asignar('moderadordeacuerdos',['Acuerdos','Calendario','Cancelaciones'],trabajo);
  matriz.admin=JSON.parse(JSON.stringify(matriz.administradordelsistema));
  matriz.jefe=JSON.parse(JSON.stringify(matriz.administradordelsistema));
  const tablas={parque_vehicular:'Parque Vehicular',peticiones:'Peticiones',cotizaciones_almacen:'Gestión de Cotizaciones',requis_siif:'Requisiciones SIIF',oc_siif:'Órdenes de Compra SIIF',sp_siif:'Solicitudes de Pago SIIF',importaciones_siif:'Importar SIIF',acuerdos:'Acuerdos',eventos_calendario:'Calendario',ingresos_taller:'Control de Taller',ingresos_taller_pendientes:'Control de Taller',inventario:'Inventario',inventario_movimientos:'Inventario',vales:'Vales',tramites_administrativos:'Tramites Administrativos',empleados:'Tiempo Extra',periodos_tiempo_extra:'Tiempo Extra',tiempo_extra_empleados:'Tiempo Extra',tiempo_extra_detalles:'Tiempo Extra',usuarios:'Usuarios'};
  Object.assign(tablas,{ordenes_trabajo:'Control de Taller',proveedores:'Gestión de Cotizaciones',ubicaciones_inventario:'Inventario',feriados_administrativos:'Tramites Administrativos',requisiciones_siif:'Requisiciones SIIF',flujo_tramites_siif:'Seguimiento SIIF'});
  const normal=valor=>String(valor||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[ _-]/g,'');
  function base(u,m,a){return Boolean((u?.permisos_rol ?? matriz[normal(u?.rol)])?.[m]?.includes(a));}
  function limiteAnterior(u,m,a){
    let lista=u?.modulos_permitidos;
    if(typeof lista==='string'){try{lista=JSON.parse(lista);}catch(_){lista=lista.split(',').map(x=>x.trim()).filter(Boolean);}}
    if(!Array.isArray(lista)||!lista.length)return false;
    return lista.some(x=>{
      const nombre=String(typeof x==='string'?x:x?.modulo||x?.nombre||x?.module||'').trim();
      if((nombre==='Requisiciones'?'Seguimiento SIIF':nombre)!==m)return false;
      const nivel=typeof x==='string'?'editar':String(x?.permiso||x?.acceso||x?.nivel||'').trim().toLowerCase();
      const edita=['editar','edit','write','modificar'].includes(nivel);
      const ve=edita||['ver','vista','view','solo vista','moderar','moderador','moderate'].includes(nivel);
      return ['ver','exportar','imprimir'].includes(a)?ve:edita;
    });
  }
  function puede(u,m,a,registro){
    if(!u || u.activo===false)return false;
    if(m==='Roles')return normal(u.rol)==='superadmin';
    if(!limiteAnterior(u,m,'ver') || !limiteAnterior(u,m,a))return false;
    const rol=normal(u.rol);
    if(m==='Usuarios' && rol!=='superadmin')return false;
    if(m==='Licencias' && !(rol==='superadmin'&&String(u.usuario).toLowerCase()==='emma'))return false;
    if(a==='eliminar'&&!['superadmin','administradordelsistema'].includes(rol))return false;
    if(a==='aprobar_cancelacion'&&!['superadmin','administradordelsistema','jefedealmacen'].includes(rol))return false;
    const excepciones=u.permisos_excepciones||{};
    function permiso(accion){const valor=excepciones[m]?.[accion];return typeof valor==='boolean'?valor:base(u,m,accion)&&limiteAnterior(u,m,accion);}
    if(!permiso('ver') || !permiso(a))return false;
    if(registro?.rbac_cancelado && ['editar','cambiar_estatus','autorizar'].includes(a))return false;
    if(registro && ['editar','cambiar_estatus','autorizar','solicitar_cancelacion'].includes(a) && ['coordinador','coordinadorinfraestructura','tecnico'].includes(rol)){
      const autor=registro.rbac_creado_por || registro.creado_por || registro.creada_por_id || registro.usuario_id || registro.solicitante_id;
      if(!autor || String(autor)!==String(u.id))return false;
    }
    return true;
  }
  root.ETRbac={acciones,modulos,matriz,tablas,normal,base,puede,limiteAnterior};
  root.ETRbac.tablaUsuarios=function(){try{return Number(JSON.parse(root.localStorage.getItem('usuarioActivo')||'{}').permisos_version)===2?'directorio_usuarios':'usuarios';}catch(_){return 'usuarios';}};
  async function refrescarPerfil(){
    if(!root.supabaseClient||!root.localStorage)return;
    try{
      const previo=JSON.parse(root.localStorage.getItem('usuarioActivo')||'null');if(!previo?.flujo_token)return;
      const r=await root.supabaseClient.rpc('obtener_perfil_acceso');if(r.error||!r.data)return;
      const clave=u=>JSON.stringify([u.rol,u.activo,u.permisos_version,u.permisos_excepciones,u.modulos_permitidos,u.permisos_rol]);
      if(clave(previo)!==clave(r.data)){
        root.localStorage.setItem('usuarioActivo',JSON.stringify({...previo,...r.data}));
        root.location?.reload();
      }
    }catch(_){/* La validación de servidor sigue vigente si no hay conexión. */}
  }
  if(root.addEventListener){root.addEventListener('focus',refrescarPerfil);refrescarPerfil();}
  const p=root.ETPermissions;
  if(!p)return;
  p.MODULOS.CANCELACIONES='Cancelaciones';p.RUTAS.Cancelaciones='modulos/cancelaciones.html';
  p.MODULOS.ROLES='Roles';p.RUTAS.Roles='modulos/roles.html';p.DESCRIPCIONES.Roles='Administración de roles y módulos permitidos.';
  const v2=u=>Number(u?.permisos_version)===2;
  for(const nombre of ['obtenerModulosUsuario','obtenerPermisoModuloUsuario','puedeVerModulo','puedeEditarModulo','puedeAccion','puedeAcceder']){
    const anterior=p[nombre];
    p[nombre]=function(u,m,a,registro){
      if(!u || typeof u!=='object')return nombre==='obtenerModulosUsuario'?[]:false;
      if(nombre==='obtenerModulosUsuario')return modulos.filter(mod=>puede(u,mod,'ver'));
      if(nombre==='obtenerPermisoModuloUsuario')return puede(u,m,'editar')?'editar':puede(u,m,'ver')?'ver':'none';
      if(nombre==='puedeEditarModulo')return puede(u,m,'editar',a);
      if(nombre==='puedeAccion')return puede(u,m,a==='consultar'?'ver':a,registro);
      return puede(u,m,'ver');
    };
  }
})(typeof window!=='undefined'?window:globalThis);
