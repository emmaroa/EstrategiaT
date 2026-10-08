(function (global) {
  'use strict';
  const etapas = [
    {nombre:'Sin seguimiento', area:'Sin registrar'},
    {nombre:'Elaboración de requisición', area:'Compras'},
    {nombre:'Carga en portal web de compras', area:'Compras'},
    {nombre:'Espera de cotización del proveedor', area:'Compras', espera:'Proveedor'},
    {nombre:'Asignación de orden de compra', area:'Compras'},
    {nombre:'Autorización de orden de compra', area:'Administrativo'},
    {nombre:'Espera de facturación del proveedor', area:'Compras', espera:'Proveedor'},
    {nombre:'Recepción de factura y comprometido SIIF', area:'Compras'},
    {nombre:'Firmas de Almacén', area:'Almacén'},
    {nombre:'Firmas de Administrativo', area:'Administrativo'},
    {nombre:'Acuse y envío a Oficialía Mayor', area:'Enviado', ejecuta:'Compras'}
  ];

  function usuario() {
    const u=JSON.parse(localStorage.getItem('usuarioActivo') || 'null');
    if (!u?.id || !Number.isFinite(Number(u.sesion_expira_en)) || Number(u.sesion_expira_en)<=Date.now()) {
      throw Error('La sesión expiró. Inicia sesión nuevamente.');
    }
    if (!u.flujo_token) throw Error('Cierra e inicia sesi\u00f3n una vez para actualizar tu acceso. Si persiste, falta instalar la actualizaci\u00f3n del servidor.');
    return u;
  }

  async function rpc(nombre, datos={}) {
    const u=usuario();
    const {data,error}=await global.supabaseClient.rpc(nombre,{p_usuario:u.id,p_token:u.flujo_token,...datos});
    if(error) {

      if(['PGRST202','42883','42P01'].includes(error.code)) throw Error('El seguimiento aún no está instalado en la base de datos. Contacta a la administración.');
      throw Error(error.message || 'No fue posible completar la operación.');
    }
    return data;
  }
  const api={etapas,
    solicitudesQueExigenEnvio(fila) {
      return (fila.solicitudes_pago||[]).filter(s=>{
        const estado=String(s.estatus||'').trim().toLowerCase();
        return estado && !['emitida','emitido'].includes(estado);
      });
    },
    ubicacionLibre(fila) {
      const estados=(fila.solicitudes_pago||[]).map(s=>String(s.estatus||'').trim().toLowerCase()).filter(Boolean);
      return estados.length>0&&estados.every(e=>['emitida','emitido'].includes(e));
    },
    async cargar(ids) {
      usuario();
      const rows=[];
      for(let i=0;i<ids.length;i+=500) rows.push(...await rpc('consultar_flujo_siif',{p_ids:ids.slice(i,i+500)}));
      return rows;
    },
    historial:(id,antes=null)=>rpc('historial_flujo_siif',{p_requisicion:id,p_antes:antes}),
    mover:(seleccion,datos)=>rpc('mover_flujo_siif',{p_tramites:seleccion,...datos}),
    estado:fila=>fila.flujo || {etapa:0,ubicacion:'Sin registrar',responsable:'',revision:0,acuse:'',nota:'',desde:null},
    dias(desde) { return desde ? Math.max(0,Math.floor((Date.now()-new Date(desde).getTime())/86400000)) : null; }
  };
  global.ETFlujoSiif=api;


})(window);
