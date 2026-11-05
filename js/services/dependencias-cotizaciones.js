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
  function clasificarPartida(unidad, materiales) {
    const items = (materiales || []).map(m => normalizar(m.item)).filter(Boolean);
    const lubricantes = items.map(item => /\b(aceites?|aditivos?|lubricantes?|grasas?)\b/.test(item) && !/\b(filtros?|bombas?|reten(?:es)?|sellos?|sensores?|enfriadores?|tapas?|tubos?|mangueras?|empaques?|cambios?|servicios?)\b/.test(item));
    if (items.length && lubricantes.every(Boolean)) return { partida: "26102", motivo: "Aceites, aditivos y lubricantes." };
    if (lubricantes.some(Boolean)) return { partida: "", motivo: "La cotización mezcla lubricantes y refacciones. Revisa la partida antes de guardar." };
    const tipo = normalizar([unidad?.grupo, unidad?.descripcion, unidad?.modelo, unidad?.unidad_patrulla].join(" "));
    const combustible = normalizar(unidad?.combustible);
    if (/\bdiesel\b/.test(combustible) || /\b(colector(?:es)?|recolector(?:es)?|maquinaria pesada|retroexcavadora|excavadora|motoconformadora|cargador frontal|bulldozer|compactador|tractor|barredoras?)\b/.test(tipo)) return { partida: "29801", motivo: "Refacciones para unidades diésel, colectores y maquinaria pesada." };
    if (/\bgasolina\b/.test(combustible) || /\b(motos?|motocicletas?|sedan|carros? chicos?|vehiculos? ligeros?|tsuru|tsubame|spark|beat|sonic)\b/.test(tipo)) return { partida: "29601", motivo: "Refacciones para unidades de gasolina, carros chicos y motos." };
    return { partida: "", motivo: "No se pudo determinar la partida con los datos del parque vehicular. Revisa la clasificación." };
  }
  function clasificarCompleta(cotizacion, unidad) {
    const esStock = /^(0|stock)$/i.test(String(cotizacion.unidad || "").trim());
    const dependencia = esStock ? "" : resolver(unidad?.dependencia);
    const resultado = clasificarPartida(esStock ? null : unidad, cotizacion.materiales);
    const motivo = esStock ? "STOCK: dependencia pendiente." : dependencia ? "Dependencia del parque vehicular según la unidad." : "Verifica la dependencia de la unidad en el parque vehicular.";
    return { dependencia, partida: resultado.partida, motivo: motivo + " " + resultado.motivo };
  }
  function clasificarAsignacion(cotizacion, unidad) {
    const materiales = cotizacion.materiales || [];
    const texto = normalizar(materiales.map(m => m.item).join(" ") + " " + (cotizacion.observaciones || ""));
    const pesada = /\b(diesel|maquinaria pesada|colector(?:es)?|recolector(?:es)?|retroexcavadora|excavadora|motoconformadora|cargador frontal|bulldozer|compactador|tractor|barredoras?)\b/.test(texto);
    const ligera = /\b(gasolina|carros? chicos?|vehiculos? ligeros?|sedan|tsuru|tsubame|spark|beat|sonic)\b/.test(texto);
    const tipoUnidad = clasificarPartida(unidad, []).partida;
    const tipoTexto = pesada !== ligera ? (pesada ? '29801' : '29601') : '';
    const conflicto = (pesada && ligera) || (tipoUnidad && tipoTexto && tipoUnidad !== tipoTexto);
    const tipo = conflicto ? '' : tipoUnidad || tipoTexto;
    const resultado = clasificarPartida(tipo ? {combustible:tipo === '29801' ? 'Diesel' : 'Gasolina'} : null, materiales);
    const dependencia = String(cotizacion.dependencia || '').trim() ? '' : tipo ? resolver(tipo === '29801' ? '11' : '09') : '';
    return { ...resultado, dependencia, conflicto };
  }
  function completarFaltantes(cotizacion, unidad) {
    const resultado = clasificarAsignacion(cotizacion, unidad);
    const existente = String(cotizacion.partida || '').trim();
    const dependenciaExistente = String(cotizacion.dependencia || '').trim();
    const tipo = clasificarPartida(unidad, []).partida;
    const dependencia = dependenciaExistente || resultado.dependencia || resolver((existente || tipo) === '29601' ? '09' : '11');
    const partida = existente || resultado.partida || (resolver(dependencia) === resolver('09') ? '29601' : '29801');
    return {partida, dependencia, motivo: 'Completar campos vacíos: clasificación identificada; en ausencia de evidencia, regla general 11 / 29801.', reglaGeneral: (!existente && !resultado.partida) || (!dependenciaExistente && !resultado.dependencia && !tipo && existente !== '29601')};
  }
  root.ETDependenciasCotizaciones = { listado, resolver, clasificarPartida, clasificarCompleta, clasificarAsignacion, completarFaltantes };
  if (typeof module !== "undefined") module.exports = root.ETDependenciasCotizaciones;
})(typeof window !== "undefined" ? window : globalThis);
