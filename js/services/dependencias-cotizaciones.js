(function (root) {
  "use strict";
  // Fuente: listado dependencias.csv proporcionado por el usuario.
  const listado = Object.freeze([
  "01-H. Ayuntamiento",
  "02-Sindicatura Municipal",
  "03-Jefatura de Oficina de la Presidencia Municipal",
  "04-Órgano de Control y Evaluación Gubernamental",
  "05-Dirección General de Comunicación Social",
  "07-Secretaría del Ayuntamiento",
  "08-Tesorería Municipal",
  "09-Jefatura de Policía Preventiva y Tránsito Municipal",
  "10-Dirección General de Desarrollo de Infraestructura",
  "11-Dirección General de Servicios Públicos Municipales",
  "12-Oficialía Mayor",
  "13-Dirección General de Participación Ciudadana",
  "14-Consejo Municipal de Concertación para la Obra Pública del Ayuntamiento de Hermosillo",
  "17-Instituto del Deporte de Hermosillo",
  "18-Sistema para el Desarrollo Integral de la Familia del Municipio de Hermosillo",
  "19-Coordinación General Jurídica",
  "21-Comisaría de Bahía de Kino",
  "22-Comisaría del Poblado Miguel Alemán",
  "23-Instituto Municipal de Planeación Urbana, Movilidad y del Espacio Público",
  "24-Agencia Municipal de Energía y Cambio Climático",
  "25-Promotora Inmobiliaria del Municipio de Hermosillo",
  "26-Agua de Hermosillo",
  "28-Instituto Municipal de Cultura y Arte",
  "29-Agencia Municipal de Desarrollo Económico",
  "33-Secretaría Técnica Municipal",
  "34-Dirección General de Atención a la Mujer",
  "35-Dirección General de Prevención del Delito",
  "37-Dirección General de Transformación Social",
  "39-Unidad de Transparencia",
  "40-Dirección General de Atención Ciudadana",
  "41-Dirección General de Salud Pública",
  "42-Unidad de Transparencia Municipal",
  "43-Unidad de Ciudad Inteligente",
  "44-Sistema Municipal de Parques de Hermosillo",
  "45-Dirección de Inspección y Vigilancia",
  "46-Dirección General de Ordenamiento y Desarrollo Urbano",
  "47-Coordinación Municipal de Protección Civil",
  "48-Departamento de Bomberas y Bomberos",
  "49-Unidad Municipal de Prevención y Protección a Menores",
  "50-Instituto Municipal de Protección y Bienestar Animal",
  "51-Instituto Municipal de la Juventud del Municipio de Hermosillo"
]);
  const normalizar = valor => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  function resolver(valor) {
    const texto = normalizar(valor);
    const codigo = texto.match(/^(\d{2})(?:\s*[-–:]|\s|$)/)?.[1];
    const exacta = listado.find(item => normalizar(item) === texto || normalizar(item.slice(3)) === texto || item.slice(0, 2) === codigo);
    if (exacta) return exacta;
    const coincidencias = texto.length >= 8 ? listado.filter(item => normalizar(item.slice(3)).includes(texto)) : [];
    return coincidencias.length === 1 ? coincidencias[0] : "";
  }
  function reglaServiciosPublicos(cotizacion) {
    const texto = normalizar([cotizacion?.unidad, cotizacion?.observaciones, ...(cotizacion?.materiales || []).map(m => m.item)].join(" ")).replace(/\s+/g, " ");
    const termino = texto.match(/\b(international|reten(?:es)? stemco|tambor(?:es)? (?:traseros?|delanteros?)|para camio(?:n|nes)|diesel|cepillos?|zapatas?|fibra de acero)\b/);
    return termino ? { dependencia: resolver("11"), partida: "29801", motivo: "Regla de Servicios Públicos: " + termino[0] + "." } : null;
  }
  function clasificarPartida(unidad, materiales) {
    const regla = reglaServiciosPublicos({materiales});
    if (regla) return regla;
    const items = (materiales || []).map(m => normalizar(m.item)).filter(Boolean);
    const lubricantes = items.map(item => /\b(aceites?|lubricantes?|grasas?)\b/.test(item) && !/\b(filtros?|bombas?|retenes?|sellos?|sensores?|enfriadores?|tapas?|tubos?|mangueras?|cambios?|servicios?)\b/.test(item));
    if (items.length && lubricantes.every(Boolean)) return { partida: "26102", motivo: "Aceites y lubricantes." };
    if (lubricantes.some(Boolean)) return { partida: "", motivo: "La cotización mezcla lubricantes y otros conceptos. Revisa la partida antes de guardar." };
    const tipo = normalizar([unidad?.grupo, unidad?.descripcion, unidad?.modelo, unidad?.unidad_patrulla].join(" "));
    if (/\b(colector(?:es)?|recolector(?:es)?|maquinaria pesada|retroexcavadora|excavadora|motoconformadora|cargador frontal|bulldozer|compactador|tractor)\b/.test(tipo)) return { partida: "29801", motivo: "Maquinaria pesada o colector." };
    if (normalizar(unidad?.combustible) === "gasolina" || /\b(vehiculos? (ligeros?|chicos?)|carros? chicos?|sedan|automovil|compacto|pickup|pick up|pick-up|suv)\b/.test(tipo)) return { partida: "29601", motivo: "Unidad de gasolina o vehículo pequeño." };
    return { partida: "", motivo: "El tipo de unidad no permite determinar la partida. Selecciona una de las tres opciones." };
  }
  function clasificarCompleta(cotizacion, unidad) {
    const items = (cotizacion.materiales || []).filter(m => String(m.item || "").trim());
    const texto = normalizar([cotizacion.unidad, cotizacion.observaciones, ...items.map(m=>m.item), unidad?.grupo, unidad?.descripcion, unidad?.modelo, unidad?.combustible].join(" ")).replace(/https?:\/\/\S+/g, "");
    const pesado = /\b(international|diesel|colector(?:es)?|recolector(?:es)?|camion(?:es)?|maquinaria|retroexcavadora|excavadora|barredora|tractor|dompe|trailer|toma de fuerza|stemco|meritor|cummins|hino|allison|cepillos?|zapatas?|fibra de acero)\b|\b(?:11|12)\s*r\s*(?:22|24)\.5\b/.test(texto);
    const ligero = /\b(gasolina|sedan|automovil|carros? chicos?|vehiculos? ligeros?|tsuru|spark|beat|sonic|sentra|versa|cherokee|frontier|np300|hilux|silverado|cheyenne|suburban|caravan|ranger|pick[ -]?up|buji[ao]s?|motocicleta|moto)\b|\b\d{3}\s*\/\s*\d{2}\s*r\s*(?:1[3-8])\b/.test(texto);
    const existente = resolver(cotizacion.dependencia);
    const codigo = pesado ? "11" : ligero ? "09" : existente?.startsWith("09-") ? "09" : "11";
    const base = codigo === "09" ? "29601" : "29801";
    const totales = {"26102":0,"29801":0,"29601":0};
    const usarImportes = items.every(m=>Number(m.cantidad)>0 && Number(m.precio_unitario)>0);
    for (const m of items) {
      const t = normalizar(m.item);
      const aceite = /\b(aceites?|lubricantes?|grasas?|aditivos?|urea|anticongelante|atf|wd40|afloja todo)\b/.test(t) && !/\b(filtros?|bombas?|reten(?:es)?|sellos?|sensores?|enfriadores?|tapas?|tubos?|mangueras?|empaques?|servicios?)\b/.test(t);
      const electrico = /\b(electric[oa]s?|acumulador(?:es)?|acum(?:u)?lador|baterias?|alternador(?:es)?|arranque|focos?|faros?|leds?|lamparas?|cables?|fusibles?|portafusibles?|porta fusible|interruptor(?:es)?|switch|relevador(?:es)?|relay|reles?|conmutador|bobinas?|bujias?|solenoide|selenoide|soquet\w*|conector(?:es)?|terminal(?:es)? instalacion|terminal(?:es)? (?:cobre|bateria)|termofill|termofil|cinta aislante)\b/.test(t) && !/\b(hidraulic[oa]|presomatic|push lock|parker|cable de acero|cable acerado)\b/.test(t);
      const partida = aceite ? "26102" : electrico ? "29801" : base;
      totales[partida] += usarImportes ? Number(m.cantidad)*Number(m.precio_unitario) : 1;
    }
    const partida = items.length ? Object.keys(totales).sort((a,b)=>totales[b]-totales[a] || (a===base?-1:b===base?1:a.localeCompare(b)))[0] : base;
    const motivoDependencia = pesado ? "Indicios de camión o maquinaria pesada" : ligero ? "Indicios de gasolina o vehículo ligero" : codigo === "09" ? "Dependencia 09 existente" : "Asignación general a 11 por falta de tipo específico";
    const esStock = /^(0|stock)$/i.test(String(cotizacion.unidad || "").trim());
    const dependencia = esStock ? resolver(codigo) : resolver(unidad?.dependencia);
    const motivo = esStock ? motivoDependencia : dependencia ? "Dependencia del parque vehicular según la unidad" : "Consulta el número económico y verifica su dependencia en el parque vehicular";
    return {dependencia, partida, motivo:motivo + "; partida " + partida + (Object.values(totales).filter(n=>n>0).length > 1 ? " por categoría predominante " + (usarImportes ? "en importe" : "en número de conceptos") : " por tipo de material"), inferenciaGeneral:esStock&&!pesado&&!ligero&&codigo!=="09"};
  }
  root.ETDependenciasCotizaciones = { listado, resolver, clasificarPartida, reglaServiciosPublicos, clasificarCompleta };
  if (typeof module !== "undefined") module.exports = root.ETDependenciasCotizaciones;
})(typeof window !== "undefined" ? window : globalThis);
