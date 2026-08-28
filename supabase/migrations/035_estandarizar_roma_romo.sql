-- Conserva la razón social exactamente como llega de SIIF (dos espacios antes de S.A.).
DO $$
DECLARE
  nombre_canonico CONSTANT TEXT := 'ROMA ROMO-MARQUEZ  S.A. DE C.V.';
  clave_canonica CONSTANT TEXT := 'roma romo-marquez s.a. de c.v.';
BEGIN
  UPDATE public.proveedores
  SET razon_social = nombre_canonico
  WHERE lower(regexp_replace(trim(razon_social), '\s+', ' ', 'g')) = clave_canonica;

  UPDATE public.peticiones
  SET proveedor = nombre_canonico
  WHERE lower(regexp_replace(trim(proveedor), '\s+', ' ', 'g')) = clave_canonica;

  UPDATE public.requisiciones_siif
  SET proveedor = nombre_canonico
  WHERE lower(regexp_replace(trim(proveedor), '\s+', ' ', 'g')) = clave_canonica;

  UPDATE public.cotizaciones_almacen
  SET proveedor = nombre_canonico
  WHERE lower(regexp_replace(trim(proveedor), '\s+', ' ', 'g')) = clave_canonica;

  UPDATE public.requis_siif
  SET proveedor = nombre_canonico
  WHERE lower(regexp_replace(trim(proveedor), '\s+', ' ', 'g')) = clave_canonica;

  UPDATE public.oc_siif
  SET proveedor = nombre_canonico
  WHERE lower(regexp_replace(trim(proveedor), '\s+', ' ', 'g')) = clave_canonica;

  UPDATE public.usuarios AS u
  SET
    proveedor = CASE
      WHEN lower(regexp_replace(trim(u.proveedor), '\s+', ' ', 'g')) = clave_canonica
        THEN nombre_canonico
      ELSE u.proveedor
    END,
    proveedores_permitidos = ARRAY(
      SELECT CASE
        WHEN lower(regexp_replace(trim(p), '\s+', ' ', 'g')) = clave_canonica
          THEN nombre_canonico
        ELSE p
      END
      FROM unnest(COALESCE(u.proveedores_permitidos, ARRAY[]::TEXT[])) AS p
    )
  WHERE lower(regexp_replace(trim(u.proveedor), '\s+', ' ', 'g')) = clave_canonica
     OR EXISTS (
       SELECT 1
       FROM unnest(COALESCE(u.proveedores_permitidos, ARRAY[]::TEXT[])) AS p
       WHERE lower(regexp_replace(trim(p), '\s+', ' ', 'g')) = clave_canonica
     );
END $$;
