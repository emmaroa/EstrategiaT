
(function (global) {
  const SUPABASE_URL = "https://knjuevjxfyohcxrsldpb.supabase.co";
  const SUPABASE_KEY = "sb_publishable_f_1SKtetMWPSNmZ5eSRaOw_RYtHenaR";

  function createSupabaseClient() {
    if (typeof supabase === "undefined") {
      console.error("[Supabase] SDK no cargado. Incluir @supabase/supabase-js antes de este script.");
      return null;
    }
    return supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
      global: {
        fetch: function (url, opciones) {
          const config = Object.assign({}, opciones);
          const headers = new Headers(typeof url === 'object' ? url.headers : undefined);
          new Headers(config.headers).forEach((valor, nombre) => headers.set(nombre, valor));
          const destino = typeof url === 'object' && url.url ? url.url : String(url);
          // Mantener las cabeceras de Request y asegurar la clave pública solo para este proyecto.
          if (new URL(destino, SUPABASE_URL).origin === SUPABASE_URL && !headers.get('apikey')) {
            headers.set('apikey', SUPABASE_KEY);
          }
          try {
            const usuario = JSON.parse(localStorage.getItem('usuarioActivo') || 'null');
            if (new URL(destino, SUPABASE_URL).origin === SUPABASE_URL &&
                usuario?.flujo_token && Number(usuario.sesion_expira_en) > Date.now()) {
              headers.set('x-et-session-token', usuario.flujo_token);
            }
            if (usuario && Number(usuario.sesion_expira_en) > Date.now() &&
              /^[0-9a-f-]{36}$/i.test(usuario.id || '')) headers.set('x-et-usuario-id', usuario.id);
          } catch (_) {}
          config.headers = headers;
          if(global.ETRbac){
            const usuario=JSON.parse(localStorage.getItem('usuarioActivo')||'null');
            const method=String(config.method || url?.method || 'GET').toUpperCase();
            const tabla=new URL(destino,SUPABASE_URL).pathname.match(/^\/rest\/v1\/([^/]+)$/)?.[1];
            let modulo=global.ETRbac.tablas[tabla];
            let datos;try{datos=JSON.parse(config.body||'null');}catch(_){}
            const fila=Array.isArray(datos)?datos[0]:datos;
            if(tabla==='peticiones'&&fila?.origen_peticion==='coordinador')modulo='Peticiones de Coordinadores';
            if(global.ETRbac.normal(usuario?.rol)==='proveedor'){
              if(tabla==='peticiones')modulo='Peticiones de almacén';
              if(tabla==='cotizaciones_almacen')modulo='Cotizaciones Proveedor';
            }
            if(Number(usuario?.permisos_version)===2 && modulo && ['POST','PATCH','DELETE'].includes(method)){
              const accion=tabla==='importaciones_siif'?'importar':method==='POST'?'crear':method==='DELETE'?'eliminar':'editar';
              const permitido=global.ETRbac.puede(usuario,modulo,accion)||(tabla==='peticiones'&&method==='PATCH'&&global.ETRbac.puede(usuario,'Peticiones de Coordinadores',accion));
              if(!permitido)return Promise.resolve(new Response(JSON.stringify({code:'42501',message:'No tienes permiso para '+accion+' en '+modulo+'. Usa Cancelar registro dentro del módulo si tienes permiso.'}),{status:403,headers:{'Content-Type':'application/json'}}));
            }
          }
          return global.fetch(url, config).then(function (response) {
            const method = String(config.method || url?.method || 'GET').toUpperCase();
            if (response.ok && !['GET', 'HEAD', 'OPTIONS'].includes(method) &&
                !/\/rest\/v1\/(notificaciones|auditoria)(?:\?|$)/.test(destino) &&
                typeof global.dispatchEvent === 'function') {
              global.dispatchEvent(new Event('et-data-changed'));
            }
            return response;
          });
        }
      }
    });
  }

  global.ETConfig = {
    SUPABASE_URL,
    SUPABASE_KEY,
    APP_NAME: "Administración de Talleres",
    APP_VERSION: "2.0.172",
    PALETTE: {
      primary: "#FC712B",
      secondary: "#FD9319",
      accent: "#FECD5A",
      teal: "#07B1BC",
      tealDark: "#2B8180"
    }
  };

  global.supabaseClient = global.supabaseClient || createSupabaseClient();
})(window);
