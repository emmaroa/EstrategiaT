BEGIN;

CREATE TABLE public.licencia_uso (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  titular text NOT NULL DEFAULT '',
  cliente text NOT NULL DEFAULT '',
  valida_hasta timestamptz,
  renovacion_url text NOT NULL DEFAULT '' CHECK (
    renovacion_url = '' OR renovacion_url ~ '^(https://|mailto:)'
  )
);
INSERT INTO public.licencia_uso (id, renovacion_url)
VALUES (true, 'https://wa.me/526629379505?text=Hola%2C%20quiero%20renovar%20la%20licencia%20de%20Administracion%20de%20Talleres.');
ALTER TABLE public.licencia_uso ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.licencia_uso FROM PUBLIC, anon, authenticated;

-- La clave de respaldo no se publica a través de la API.
CREATE SCHEMA IF NOT EXISTS et_privado;
REVOKE ALL ON SCHEMA et_privado FROM PUBLIC, anon, authenticated;
CREATE TABLE et_privado.respaldo_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  clave_sha256 bytea NOT NULL
);
REVOKE ALL ON et_privado.respaldo_config FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.estado_licencia()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT to_jsonb(l) - 'id' || jsonb_build_object(
    'hora_servidor', now(),
    'dias_restantes', CASE WHEN l.valida_hasta IS NULL THEN NULL
      ELSE greatest(0, ceil(extract(epoch FROM (l.valida_hasta - now())) / 86400)) END,
    'vencida', coalesce(l.valida_hasta <= now(), false)
  ) FROM public.licencia_uso l WHERE id;
$$;
REVOKE ALL ON FUNCTION public.estado_licencia() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estado_licencia() TO anon, authenticated;

-- Un solo statement proporciona una instantánea consistente de todas las tablas.
-- No depende del límite de 1,000 filas de PostgREST.
CREATE FUNCTION public.respaldo_tablas(p_clave text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  tabla record;
  columnas jsonb;
  filas jsonb;
  resultado jsonb := '[]'::jsonb;
  omitir text[] := ARRAY['password', 'password_hash', 'contrasena', 'contraseña',
    'clave_sha256', 'access_token', 'refresh_token', 'api_key', 'secret'];
BEGIN
  IF p_clave IS NULL OR length(p_clave) < 32 OR NOT EXISTS (
    SELECT 1 FROM et_privado.respaldo_config
    WHERE id AND clave_sha256 = sha256(convert_to(p_clave, 'UTF8'))
  ) THEN
    RAISE EXCEPTION 'Clave de respaldo incorrecta o no configurada' USING ERRCODE = '42501';
  END IF;

  FOR tabla IN
    SELECT c.oid, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relispartition
    ORDER BY c.relname
  LOOP
    SELECT coalesce(jsonb_agg(a.attname ORDER BY a.attnum), '[]'::jsonb)
    INTO columnas FROM pg_attribute a
    WHERE a.attrelid = tabla.oid AND a.attnum > 0 AND NOT a.attisdropped
      AND NOT (a.attname = ANY(omitir));
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t) - $1), ''[]''::jsonb) FROM public.%I t', tabla.relname)
      INTO filas USING omitir;
    resultado := resultado || jsonb_build_array(jsonb_build_object(
      'nombre', tabla.relname, 'columnas', columnas, 'filas', filas));
  END LOOP;
  RETURN resultado;
END;
$$;
REVOKE ALL ON FUNCTION public.respaldo_tablas(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respaldo_tablas(text) TO anon, authenticated;

COMMIT;
