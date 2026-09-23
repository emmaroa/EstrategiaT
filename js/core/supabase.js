
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
          const headers = new Headers(config.headers);
          try {
            const usuario = JSON.parse(localStorage.getItem('usuarioActivo') || 'null');
            if (usuario && Number(usuario.sesion_expira_en) > Date.now() &&
              /^[0-9a-f-]{36}$/i.test(usuario.id || '')) headers.set('x-et-usuario-id', usuario.id);
          } catch (_) {}
          config.headers = headers;
          return global.fetch(url, config);
        }
      }
    });
  }

  global.ETConfig = {
    SUPABASE_URL,
    SUPABASE_KEY,
    APP_NAME: "Administración de Talleres",
    APP_VERSION: "2.0.91",
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
