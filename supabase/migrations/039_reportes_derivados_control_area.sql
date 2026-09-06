-- Los reportes de Control de Área son vistas derivadas; no almacenan capturas independientes.
CREATE OR REPLACE VIEW public.reporte_control_area_unidades
WITH (security_invoker = true) AS
SELECT
  p.id AS vehiculo_id,
  CASE
    WHEN upper(COALESCE(p.combustible, '')) = 'ELECTRICO' THEN 'Electricas'
    WHEN lower(COALESCE(p.descripcion, '') || ' ' || COALESCE(p.unidad_patrulla, '') || ' ' || COALESCE(p.modelo, '')) LIKE '%colector%' THEN 'Colectores'
    WHEN lower(COALESCE(p.descripcion, '') || ' ' || COALESCE(p.unidad_patrulla, '') || ' ' || COALESCE(p.modelo, '')) LIKE '%barredora%' THEN 'Barredoras'
    WHEN lower(COALESCE(p.descripcion, '') || ' ' || COALESCE(p.unidad_patrulla, '') || ' ' || COALESCE(p.modelo, '')) ~ '(motocicleta|moto)' THEN 'Motocicletas'
    WHEN lower(COALESCE(p.grupo, '')) LIKE '%maquinaria pesada%' THEN 'Maquinaria Pesada'
    WHEN upper(COALESCE(p.combustible, '')) = 'GASOLINA' THEN 'Gasolina'
    WHEN upper(COALESCE(p.combustible, '')) = 'DIESEL' THEN 'Diesel'
    ELSE 'Sin área'
  END AS area,
  COALESCE(p.numero_economico, p.numero_inventario, p.unidad_patrulla) AS numero_economico,
  COALESCE(p.descripcion, p.modelo, p.unidad_patrulla) AS unidad_descripcion,
  COALESCE(p.dependencia, 'Sin dependencia') AS dependencia,
  p.modelo,
  i.id AS ingreso_id,
  i.tipo_movimiento,
  i.concepto,
  i.descripcion,
  i.refacciones,
  i.taller_ambito,
  i.taller_nombre,
  i.fecha_ingreso,
  i.fecha_salida,
  i.estatus,
  i.estatus_cotizacion,
  i.monto_cotizacion,
  CASE WHEN i.id IS NULL THEN true ELSE false END AS activa,
  CASE WHEN i.id IS NULL THEN 0 ELSE CURRENT_DATE - i.fecha_ingreso END AS tiempo_taller_dias
FROM public.parque_vehicular p
LEFT JOIN public.ingresos_taller i
  ON i.vehiculo_id = p.id AND i.estatus <> 'Terminado';

CREATE OR REPLACE VIEW public.reporte_control_area_dependencias
WITH (security_invoker = true) AS
SELECT
  area,
  dependencia,
  count(*)::integer AS total_unidades,
  count(*) FILTER (WHERE activa)::integer AS activas,
  count(*) FILTER (WHERE NOT activa)::integer AS en_taller,
  round(100.0 * count(*) FILTER (WHERE activa) / NULLIF(count(*), 0), 2) AS porcentaje_activas,
  round(100.0 * count(*) FILTER (WHERE NOT activa) / NULLIF(count(*), 0), 2) AS porcentaje_en_taller
FROM public.reporte_control_area_unidades
GROUP BY area, dependencia;

CREATE OR REPLACE VIEW public.reporte_control_area_talleres
WITH (security_invoker = true) AS
SELECT
  area,
  taller_ambito,
  taller_nombre,
  count(*)::integer AS unidades,
  round(100.0 * count(*) / NULLIF(sum(count(*)) OVER (PARTITION BY area), 0), 2) AS porcentaje_area
FROM public.reporte_control_area_unidades
WHERE ingreso_id IS NOT NULL
GROUP BY area, taller_ambito, taller_nombre;

CREATE OR REPLACE VIEW public.reporte_control_area_modelos
WITH (security_invoker = true) AS
SELECT area, COALESCE(modelo, unidad_descripcion, 'Sin modelo') AS modelo, count(*)::integer AS unidades
FROM public.reporte_control_area_unidades
WHERE ingreso_id IS NOT NULL
GROUP BY area, COALESCE(modelo, unidad_descripcion, 'Sin modelo');

GRANT SELECT ON public.reporte_control_area_unidades TO anon, authenticated;
GRANT SELECT ON public.reporte_control_area_dependencias TO anon, authenticated;
GRANT SELECT ON public.reporte_control_area_talleres TO anon, authenticated;
GRANT SELECT ON public.reporte_control_area_modelos TO anon, authenticated;
