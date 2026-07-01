
(function (global) {
  const SUPABASE_URL = "https://knjuevjxfyohcxrsldpb.supabase.co";
  const SUPABASE_KEY = "sb_publishable_f_1SKtetMWPSNmZ5eSRaOw_RYtHenaR";

  function createSupabaseClient() {
    if (typeof supabase === "undefined") {
      console.error("[Supabase] SDK no cargado. Incluir @supabase/supabase-js antes de este script.");
      return null;
    }
    return supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });
  }

  global.ETConfig = {
    SUPABASE_URL,
    SUPABASE_KEY,
    APP_NAME: "Administración de Talleres",
    APP_VERSION: "2.0.0",
    PALETTE: {
      primary: "#FC712B",
      secondary: "#FD9319",
      accent: "#FECD5A",
      teal: "#07B1BC",
      tealDark: "#2B8180"
    }
  };

  global.supabaseClient = createSupabaseClient();
})(window);
