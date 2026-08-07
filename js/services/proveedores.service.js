(function (global) {
  let catalogoPromise = null;

  function limpiar(valor) {
    return String(valor || "").trim().replace(/\s+/g, " ");
  }

  async function listarActivos(forzar) {
    if (!catalogoPromise || forzar) {
      catalogoPromise = global.supabaseClient
        .from("proveedores")
        .select("id,razon_social,activo")
        .eq("activo", true)
        .order("razon_social", { ascending: true })
        .then(function (resultado) {
          if (resultado.error) throw resultado.error;
          return resultado.data || [];
        });
    }
    return catalogoPromise;
  }

  function seleccionar(select, valor) {
    if (!select) return;
    const nombres = (Array.isArray(valor) ? valor : [valor]).map(limpiar).filter(Boolean);
    nombres.forEach(function (nombre) {
      if (!Array.from(select.options).some(function (opcion) { return opcion.value === nombre; })) {
        select.add(new Option(nombre + " (histórico)", nombre));
      }
    });
    Array.from(select.options).forEach(function (opcion) {
      opcion.selected = nombres.includes(opcion.value);
    });
  }

  async function poblarSelect(select, valor) {
    if (!select) return;
    const placeholder = select.dataset.proveedorPlaceholder || "Selecciona proveedor";
    const actual = valor === undefined ? select.value : valor;
    try {
      const proveedores = await listarActivos();
      select.innerHTML = "";
      if (!select.multiple) select.add(new Option(placeholder, ""));
      proveedores.forEach(function (proveedor) {
        const nombre = limpiar(proveedor.razon_social);
        if (nombre) select.add(new Option(nombre, nombre));
      });
      seleccionar(select, actual);
    } catch (error) {
      console.error("No se pudo cargar el catálogo de proveedores:", error);
      select.innerHTML = "";
      select.add(new Option("No se pudo cargar el catálogo", ""));
    }
  }

  function inicializar() {
    document.querySelectorAll("select[data-proveedor-select]").forEach(function (select) {
      poblarSelect(select);
    });
  }

  global.ETProveedores = {
    listarActivos: listarActivos,
    poblarSelect: poblarSelect,
    seleccionar: seleccionar,
    recargar: function () {
      catalogoPromise = null;
      return Promise.all(Array.from(document.querySelectorAll("select[data-proveedor-select]"))
        .map(function (select) { return poblarSelect(select); }));
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializar);
  } else {
    inicializar();
  }
})(window);
