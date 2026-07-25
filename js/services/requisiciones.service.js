/**
 * Servicio CRUD — Requisiciones
 */
(function (global) {
  const TABLA_REQUISICIONES = "requisiciones_siif";

  function getClient() {
    return global.supabaseClient || null;
  }

  function getSupabaseRestUrl() {
    const baseUrl = (global.ETConfig && global.ETConfig.SUPABASE_URL) || "https://knjuevjxfyohcxrsldpb.supabase.co";
    return String(baseUrl).replace(/\/$/, "") + "/rest/v1/" + TABLA_REQUISICIONES;
  }

  function getSupabaseRestHeaders() {
    const key = (global.ETConfig && global.ETConfig.SUPABASE_KEY) || "sb_publishable_f_1SKtetMWPSNmZ5eSRaOw_RYtHenaR";
    return {
      apikey: key,
      Authorization: "Bearer " + key,
      Accept: "application/json",
      "Content-Type": "application/json"
    };
  }

  function mapearRegistro(payload) {
    return {
      fecha_req: payload.fecha_req || payload.fecha || null,
      numero_req: payload.numero_req || payload.numero || null,
      fecha_oc: payload.fecha_oc || null,
      numero_oc: payload.numero_oc || payload.oc || null,
      fecha_sp: payload.fecha_sp || null,
      numero_sp: payload.numero_sp || payload.solicitud_pago || payload.solicitudPago || null,
      unidad: payload.unidad || null,
      dependencia: payload.dependencia || null,
      concepto: payload.concepto || payload.Concepto || null,
      proveedor: payload.proveedor || null,
      monto: Number(payload.monto || 0),
      estatus: payload.estatus || "Por autorizar",
      xml: payload.xml || payload.factura || null,
      observaciones: payload.observaciones || null,
      peticion_id: payload.peticion_id || null
    };
  }

  function normalizarFecha(valor) {
    if (!valor) return null;
    return String(valor).split("T")[0];
  }

  function normalizar(row) {
    if (!row) return row;
    return Object.assign({}, row, {
      fecha: normalizarFecha(row.fecha_req || row.fecha),
      fecha_req: normalizarFecha(row.fecha_req || row.fecha),
      fecha_oc: normalizarFecha(row.fecha_oc),
      fecha_sp: normalizarFecha(row.fecha_sp),
      numero: row.numero_req || row.numero || null,
      oc: row.numero_oc || row.oc || null,
      xml: row.xml || row.factura || null,
      solicitudPago: row.numero_sp || row.solicitud_pago || row.solicitudPago || "",
      concepto: row.concepto || row.Concepto || "",
      unidad: row.unidad || "",
      dependencia: row.dependencia || "",
      estatus: row.estatus || "Por autorizar",
      monto: Number(row.monto || 0),
      proveedor: row.proveedor || null,
      observaciones: row.observaciones || null,
      peticion_id: row.peticion_id || null
    });
  }

  async function listar() {
    const client = getClient();

    if (client) {
      try {
        const result = await client
          .from(TABLA_REQUISICIONES)
          .select("*", { count: "exact" });

        if (!result.error) {
          const data = Array.isArray(result.data) ? result.data : [];
          return {
            ...result,
            data: data.map(normalizar),
            count: typeof result.count === "number" ? result.count : data.length
          };
        }
      } catch (error) {
        console.warn("[ETRequisiciones] Falló la consulta por cliente Supabase, intentando REST directo:", error);
      }
    }

    try {
      const response = await fetch(getSupabaseRestUrl() + "?select=*", {
        method: "GET",
        headers: getSupabaseRestHeaders()
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload && payload.message ? payload.message : "No se pudo consultar la tabla");
      }

      const data = Array.isArray(payload) ? payload : [];
      return {
        data: data.map(normalizar),
        count: data.length,
        error: null
      };
    } catch (error) {
      console.error("[ETRequisiciones] Error cargando requisiciones desde REST:", error);
      return { data: [], error: { message: error.message || "Sin conexión" } };
    }
  }

  async function crear(payload) {
    const client = getClient();
    if (!client) return { data: null, error: { message: "Sin conexión" } };

    const registro = Object.assign({}, mapearRegistro(payload), {
      numero_req: payload.numero_req || payload.numero || await generarNumero()
    });

    const result = await client.from("requisiciones_siif").insert(registro).select().single();

    if (result.error) {
      return { data: null, error: result.error };
    }

    if (result.data) {
      result.data = normalizar(result.data);
    }

    return result;
  }

  async function actualizar(id, payload) {
    const client = getClient();
    if (!client) return { data: null, error: { message: "Sin conexión" } };

    const registro = Object.assign({}, mapearRegistro(payload), {
      updated_at: new Date().toISOString()
    });

    const result = await client
      .from("requisiciones_siif")
      .update(registro)
      .eq("id", id)
      .select()
      .single();

    if (result.error) {
      return { data: null, error: result.error };
    }

    if (result.data) {
      result.data = normalizar(result.data);
    }

    return result;
  }

  async function eliminar(id) {
    const client = getClient();
    if (!client) return { error: { message: "Sin conexión" } };

    const result = await client.from("requisiciones_siif").delete().eq("id", id);
    if (result.error) {
      return { error: result.error };
    }
    return result;
  }

  async function generarNumero() {
    const client = getClient();
    const anio = new Date().getFullYear();
    const prefijo = "REQ-" + anio + "-";

    if (!client) return prefijo + "001";

    const { data: registros } = await client
      .from("requisiciones_siif")
      .select("numero_req,numero")
      .like("numero_req", prefijo + "%");

    const data = registros || [];

    let max = 0;
    (data || []).forEach(function (r) {
      const parte = parseInt((r.numero_req || "").replace(prefijo, ""), 10);
      if (!isNaN(parte) && parte > max) max = parte;
    });

    return prefijo + String(max + 1).padStart(3, "0");
  }

  async function buscarUnidadParque(valorUnidad) {
    const client = getClient();
    if (!client || !valorUnidad) return null;

    const { data, error } = await client
      .from("parque_vehicular")
      .select("*")
      .or("unidad_patrulla.ilike.%" + valorUnidad + "%,numero_inventario.ilike.%" + valorUnidad + "%")
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  }

  async function obtenerPrefillDesdePeticion(peticionId) {
    const client = getClient();
    if (!client || !peticionId) return null;

    const { data } = await client
      .from("peticiones")
      .select("*")
      .eq("id", peticionId)
      .maybeSingle();

    if (!data) return null;

    return {
      peticion_id: data.id,
      unidad: data.unidad,
      concepto: data.peticion,
      dependencia: data.dependencia || data.area,
      proveedor: data.proveedor,
      observaciones: "Generada desde petición de " + data.solicitante
    };
  }

  async function migrarDesdeLocalStorage() {
    if (localStorage.getItem("migracion_requisiciones_v3")) return { migrados: 0 };

    const local = JSON.parse(localStorage.getItem("requisiciones")) || [];
    if (!local.length) {
      localStorage.setItem("migracion_requisiciones_v3", "true");
      return { migrados: 0 };
    }

    const client = getClient();
    if (!client) return { migrados: 0, error: "Sin conexión" };

    const registros = local.map(function (r) {
      return Object.assign({}, mapearRegistro(r), {
        fecha_req: r.fecha_req || r.fecha || new Date().toISOString().slice(0, 10),
        numero_req: r.numero_req || r.numero
      });
    });

    const { error } = await client.from("requisiciones_siif").insert(registros);
    if (error) {
      return { migrados: 0, error: error.message };
    }

    return { migrados: registros.length };
  }

  global.ETRequisiciones = {
    listar,
    crear,
    actualizar,
    eliminar,
    generarNumero,
    buscarUnidadParque,
    obtenerPrefillDesdePeticion,
    migrarDesdeLocalStorage,
    normalizar
  };
})(window);
