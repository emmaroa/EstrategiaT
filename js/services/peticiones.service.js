/**
 * Servicio CRUD — Peticiones a Almacén
 */
(function (global) {
  function getClient() {
    return global.supabaseClient || null;
  }

  const TAMANO_BLOQUE = 1000;
  const GDAVIS_ID = '827cb6d4-5879-4a85-9fdf-b325f37250e6';
  let propias = new Set();
  function usuarioActual() { try { return JSON.parse(localStorage.getItem('usuarioActivo') || 'null'); } catch (_) { return null; } }
  function edicionSoloPropias(usuario = usuarioActual()) {
    return usuario?.id === GDAVIS_ID;
  }
  function puedeEditarPropia(peticion) {
    const usuario = usuarioActual();
    return edicionSoloPropias(usuario) && usuario.activo !== false && Boolean(peticion?.id && propias.has(peticion.id));
  }
  async function consultarPropias(id) {
    const usuario = usuarioActual();
    if (!edicionSoloPropias(usuario) || usuario.activo === false) return {data:[],error:null};
    const ids = new Set();
    for(let offset=0;;offset+=TAMANO_BLOQUE) {
      let query=getClient().from('auditoria').select('entidad_id').eq('usuario_id',usuario.id).eq('entidad_tipo','peticiones')
        .or('metadata->>operacion.eq.INSERT,accion.eq.Creo nueva peticion').order('id',{ascending:true});
      if(id)query=query.eq('entidad_id',id);
      const response=await query.range(offset,offset+TAMANO_BLOQUE-1);
      if(response.error)return {data:[],error:response.error};
      (response.data||[]).forEach(row=>{if(row.entidad_id)ids.add(row.entidad_id);});
      if((response.data||[]).length<TAMANO_BLOQUE)break;
    }
    return {data:Array.from(ids),error:null};
  }
  async function cargarPropias() {
    propias=new Set();
    const response=await consultarPropias();
    if(!response.error)propias=new Set(response.data);
    return response;
  }

  async function listarEnBloques(configurarConsulta) {
    const client = getClient();
    if (!client) return { data: [], count: 0, error: { message: "Sin conexión" } };

    const registros = [];
    let total = null;
    let desde = 0;

    while (total == null || registros.length < total) {
      let consulta = client
        .from("peticiones")
        .select("*", { count: desde === 0 ? "exact" : undefined })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });

      if (typeof configurarConsulta === "function") {
        consulta = configurarConsulta(consulta);
      }

      const resultado = await consulta.range(desde, desde + TAMANO_BLOQUE - 1);
      if (resultado.error) {
        return { data: registros, count: total || registros.length, error: resultado.error };
      }

      const bloque = resultado.data || [];
      registros.push.apply(registros, bloque);
      if (desde === 0 && typeof resultado.count === "number") total = resultado.count;
      if (bloque.length < TAMANO_BLOQUE) break;
      desde += TAMANO_BLOQUE;
    }

    return {
      data: registros,
      count: typeof total === "number" ? total : registros.length,
      error: null
    };
  }

  async function listar() {
    let usuario = null;
    try {
      usuario = JSON.parse(localStorage.getItem("usuarioActivo") || "null");
    } catch (_) {}
    const rol = String(usuario && (usuario.rol || usuario.rol_original) || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");
    if (rol === "coordinadorinfraestructura") {
      return listarEnBloques(function (consulta) {
        return consulta.ilike("dependencia", "%Infraestructura%");
      });
    }
    return listarEnBloques();
  }

  async function listarPorAreas(areas) {
    const client = getClient();
    if (!client) return { data: [], count: 0, error: { message: "Sin conexiÃ³n" } };

    const areasValidas = Array.isArray(areas)
      ? areas.map(function (area) { return String(area || "").trim(); }).filter(Boolean)
      : [];

    if (!areasValidas.length) {
      return { data: [], count: 0, error: null };
    }

    return listarEnBloques(function (consulta) {
      return consulta.in("area", areasValidas);
    });
  }

  async function crear(payload) {
    const client = getClient();
    if (!client) return { data: null, error: { message: "Sin conexión" } };

    return client
      .from("peticiones")
      .insert(payload)
      .select()
      .single();
  }

  async function actualizar(id, payload) {
    const client = getClient();
    if (!client) return { data: null, error: { message: "Sin conexión" } };
    if(edicionSoloPropias()) {
      const ownership=await consultarPropias(id);
      if(ownership.error || !ownership.data.includes(id))return {data:null,error:{message:'Solo puedes editar las peticiones que tú creaste. No se pudo confirmar tu autoría.'}};
    }

    return client
      .from("peticiones")
      .update(Object.assign({}, payload, { updated_at: new Date().toISOString() }))
      .eq("id", id)
      .select()
      .single();
  }

  async function eliminar(id) {
    const client = getClient();
    if (!client) return { error: { message: "Sin conexión" } };

    return client.from("peticiones").delete().eq("id", id);
  }

  async function buscarUnidadParque(valorUnidad) {
    const client = getClient();
    if (!client || !valorUnidad) return null;

    const limpio = String(valorUnidad || "").trim();
    const digitos = limpio.replace(/\D/g, "");
    const sufijo = (digitos || limpio).slice(-4);
    const filtro = ["numero_economico", "numero_inventario", "unidad_patrulla"]
      .map(function (campo) { return campo + ".ilike.%" + sufijo; })
      .join(",");
    const { data, error } = await client
      .from("parque_vehicular")
      .select("*")
      .or(filtro)
      .order("numero_consecutivo", { ascending: true })
      .limit(1)
      .maybeSingle();

    return error ? null : data;
  }

  async function migrarDesdeLocalStorage() {
    if (localStorage.getItem("migracion_peticiones_v3")) return { migrados: 0 };

    const local = JSON.parse(localStorage.getItem("peticiones")) || [];
    if (!local.length) {
      localStorage.setItem("migracion_peticiones_v3", "true");
      return { migrados: 0 };
    }

    const client = getClient();
    if (!client) return { migrados: 0, error: "Sin conexión" };

    const registros = local.map(function (p) {
      return {
        fecha: p.fecha || new Date().toISOString().slice(0, 10),
        unidad: p.unidad,
        peticion: p.peticion,
        solicitante: p.solicitante,
        area: p.area,
        dependencia: p.dependencia || null,
        proveedor: p.proveedor || null,
        estatus: p.estatus || "Pendiente",
        observaciones: p.observaciones || null
      };
    });

    const { error } = await client.from("peticiones").insert(registros);
    if (error) return { migrados: 0, error: error.message };

    localStorage.removeItem("peticiones");
    localStorage.setItem("migracion_peticiones_v3", "true");
    return { migrados: registros.length };
  }

  global.ETPeticiones = {
    edicionSoloPropias,
    puedeEditarPropia,
    cargarPropias,
    listar,
    listarPorAreas,
    crear,
    actualizar,
    eliminar,
    buscarUnidadParque,
    migrarDesdeLocalStorage
  };
})(window);
