-- Relaciones conservadoras por ejercicio. Folios/oficios ambiguos no se vinculan.
-- Mantiene IDs y columnas; no altera los registros importados ni su seguimiento.
BEGIN;
CREATE OR REPLACE VIEW public.seguimiento_siif
WITH (security_invoker = true)
AS
WITH requisiciones_claves AS (
  SELECT
    r.*,
    CASE WHEN trim(COALESCE(r.folio, '')) ~ '^[0-9]+$' THEN coalesce(nullif(ltrim(trim(r.folio),'0'),''),'0') ELSE upper(trim(COALESCE(r.folio, ''))) END AS folio_clave,
    upper(trim(COALESCE(r.oficio, ''))) AS oficio_clave,
    COALESCE(
      NULLIF(ltrim(regexp_replace(COALESCE(r.folio, ''), '\D', '', 'g'), '0'), ''),
      '0'
    ) AS folio_numerico
  FROM public.requis_siif AS r
),
requisiciones_base AS (
  SELECT r.*,
    count(*) OVER (PARTITION BY folio_clave,extract(year FROM fecha)) AS coincidencias_folio,
    count(*) OVER (PARTITION BY oficio_clave,extract(year FROM fecha)) AS coincidencias_oficio,
    count(*) OVER (PARTITION BY folio_numerico,extract(year FROM fecha)) AS coincidencias_numero
  FROM requisiciones_claves r
),
ordenes_base AS (
  SELECT
    o.*,
    CASE WHEN trim(COALESCE(o.numero_requisicion, '')) ~ '^[0-9]+$' THEN coalesce(nullif(ltrim(trim(o.numero_requisicion),'0'),''),'0') ELSE upper(trim(COALESCE(o.numero_requisicion, ''))) END AS numero_requisicion_clave,
    upper(trim(COALESCE(o.oficio_requisicion, ''))) AS oficio_requisicion_clave
  FROM public.oc_siif AS o
),
ordenes_relacionadas AS (
  SELECT
    r.id AS requisicion_id,
    o.*
  FROM requisiciones_base AS r
  JOIN ordenes_base AS o ON o.numero_requisicion_clave = r.folio_clave
  WHERE r.folio_clave <> '' AND extract(year FROM o.fecha)=extract(year FROM r.fecha) AND r.coincidencias_folio=1

  UNION

  SELECT
    r.id AS requisicion_id,
    o.*
  FROM requisiciones_base AS r
  JOIN ordenes_base AS o ON o.oficio_requisicion_clave = r.oficio_clave
  WHERE r.oficio_clave <> '' AND extract(year FROM o.fecha)=extract(year FROM r.fecha) AND r.coincidencias_oficio=1
    AND NOT EXISTS (SELECT 1 FROM requisiciones_base q WHERE q.folio_clave=o.numero_requisicion_clave AND q.folio_clave<>'' AND extract(year FROM q.fecha)=extract(year FROM o.fecha))
),
ordenes_agrupadas AS (
  SELECT
    requisicion_id,
    count(*)::INTEGER AS cantidad_oc,
    (array_agg(folio ORDER BY fecha DESC NULLS LAST, created_at DESC NULLS LAST))[1] AS numero_oc,
    (array_agg(fecha ORDER BY fecha DESC NULLS LAST, created_at DESC NULLS LAST))[1] AS fecha_oc,
    (array_agg(proveedor ORDER BY fecha DESC NULLS LAST, created_at DESC NULLS LAST))[1] AS proveedor,
    array_agg(DISTINCT proveedor) FILTER (WHERE proveedor IS NOT NULL) AS proveedores,
    (array_agg(estatus ORDER BY fecha DESC NULLS LAST, created_at DESC NULLS LAST))[1] AS estatus_oc,
    COALESCE(sum(importe), 0)::NUMERIC(14,2) AS importe_oc,
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'numero_oc', folio,
        'fecha', fecha,
        'estatus', estatus,
        'fecha_adjudicacion', fecha_adjudicacion,
        'importe', importe,
        'proveedor', proveedor,
        'tipo_procedimiento', tipo_procedimiento,
        'proceso', proceso,
        'precomprometido', precomprometido,
        'comprometido', comprometido
      )
      ORDER BY fecha DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS ordenes_compra
  FROM ordenes_relacionadas
  GROUP BY requisicion_id
),
solicitudes_base AS (
  SELECT
    s.*,
    upper(trim(COALESCE(s.referencia, ''))) AS referencia_clave,
    COALESCE(
      NULLIF(
        ltrim(
          substring(
            COALESCE(s.descripcion, '')
            FROM '(?i)(?:REQ|REQUISICI[ÓO]N)[^0-9]*0*([0-9]+)'
          ),
          '0'
        ),
        ''
      ),
      '0'
    ) AS requisicion_descripcion_clave
  FROM public.sp_siif AS s
),
solicitudes_relacionadas AS (
  SELECT
    r.id AS requisicion_id,
    s.*
  FROM requisiciones_base AS r
  JOIN solicitudes_base AS s ON s.referencia_clave = r.oficio_clave
  WHERE r.oficio_clave <> '' AND extract(year FROM s.fecha)=extract(year FROM r.fecha) AND r.coincidencias_oficio=1

  UNION

  SELECT
    r.id AS requisicion_id,
    s.*
  FROM requisiciones_base AS r
  JOIN solicitudes_base AS s ON s.requisicion_descripcion_clave = r.folio_numerico
  WHERE r.folio_numerico <> '0' AND extract(year FROM s.fecha)=extract(year FROM r.fecha) AND r.coincidencias_numero=1
    AND NOT EXISTS (SELECT 1 FROM requisiciones_base q WHERE q.oficio_clave=s.referencia_clave AND q.oficio_clave<>'' AND extract(year FROM q.fecha)=extract(year FROM s.fecha))
),
solicitudes_agrupadas AS (
  SELECT
    requisicion_id,
    count(*)::INTEGER AS cantidad_sp,
    (array_agg(numero_solicitud ORDER BY fecha DESC NULLS LAST, created_at DESC NULLS LAST))[1] AS numero_sp,
    (array_agg(fecha ORDER BY fecha DESC NULLS LAST, created_at DESC NULLS LAST))[1] AS fecha_sp,
    (array_agg(estatus ORDER BY fecha DESC NULLS LAST, created_at DESC NULLS LAST))[1] AS estatus_sp,
    (array_agg(beneficiario ORDER BY fecha DESC NULLS LAST, created_at DESC NULLS LAST))[1] AS beneficiario,
    COALESCE(sum(importe), 0)::NUMERIC(14,2) AS importe_sp,
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'numero_solicitud', numero_solicitud,
        'fecha', fecha,
        'tipo_solicitud', tipo_solicitud,
        'estatus', estatus,
        'beneficiario', beneficiario,
        'descripcion', descripcion,
        'importe', importe,
        'dependencia', dependencia,
        'fuente_financiamiento', fuente_financiamiento,
        'poliza_comprometido', poliza_comprometido,
        'referencia', referencia
      )
      ORDER BY fecha DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS solicitudes_pago
  FROM solicitudes_relacionadas
  GROUP BY requisicion_id
)
SELECT
  r.id,
  r.id AS requisicion_id,
  r.fecha AS fecha_req,
  r.folio AS numero_req,
  r.oficio AS oficio_req,
  r.estatus AS estatus_requisicion,
  o.fecha_oc,
  o.numero_oc,
  o.estatus_oc,
  s.fecha_sp,
  s.numero_sp,
  s.estatus_sp,
  CASE
    WHEN s.cantidad_sp > 0 THEN 'Solicitud de pago'
    WHEN o.cantidad_oc > 0 THEN 'Orden de compra'
    ELSE 'Requisición'
  END AS etapa_actual,
  CASE
    WHEN s.cantidad_sp > 0 THEN COALESCE(s.estatus_sp, 'Solicitud de pago')
    WHEN o.cantidad_oc > 0 THEN COALESCE(o.estatus_oc, 'Orden de compra')
    ELSE COALESCE(r.estatus, 'Requisición')
  END AS estatus,
  CASE
    WHEN upper(COALESCE(r.justificacion, '')) LIKE '%STOCK%' THEN 'STOCK'
    ELSE substring(
      COALESCE(r.justificacion, '')
      FROM '(?i)UNIDAD[^0-9A-Z]*([0-9A-Z-]+)'
    )
  END AS unidad,
  r.dependencia,
  r.justificacion AS concepto,
  o.proveedor,
  o.proveedores,
  r.importe::NUMERIC(14,2) AS monto,
  r.clasificacion,
  r.tipo_procedimiento,
  r.precomprometido,
  r.comprometido,
  COALESCE(o.cantidad_oc, 0) AS cantidad_oc,
  COALESCE(s.cantidad_sp, 0) AS cantidad_sp,
  COALESCE(o.importe_oc, 0)::NUMERIC(14,2) AS importe_oc,
  COALESCE(s.importe_sp, 0)::NUMERIC(14,2) AS importe_sp,
  o.ordenes_compra,
  s.solicitudes_pago,
  s.beneficiario,
  r.justificacion AS observaciones,
  r.origen,
  r.created_at
FROM requisiciones_base AS r
LEFT JOIN ordenes_agrupadas AS o ON o.requisicion_id = r.id
LEFT JOIN solicitudes_agrupadas AS s ON s.requisicion_id = r.id;

GRANT SELECT ON public.seguimiento_siif TO anon, authenticated;

COMMENT ON VIEW public.seguimiento_siif IS
  'Seguimiento unificado por requisición con órdenes de compra y solicitudes de pago relacionadas.';

NOTIFY pgrst,'reload schema';
COMMIT;
