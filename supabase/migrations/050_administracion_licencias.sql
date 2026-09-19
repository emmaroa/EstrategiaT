BEGIN;

-- El registro comercial y las credenciales de Brote Labs no se incluyen en
-- el respaldo global del esquema public ni son accesibles por REST directo.
CREATE TABLE et_privado.licencias_administrador (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  clave_sha256 bytea NOT NULL CHECK (octet_length(clave_sha256) = 32)
);
CREATE TABLE et_privado.licencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE CHECK (codigo ~ '^[A-Z0-9][A-Z0-9_-]{2,39}$'),
  cliente text NOT NULL CHECK (length(btrim(cliente)) BETWEEN 1 AND 200),
  inicia_el date,
  valida_hasta timestamptz,
  notas text NOT NULL DEFAULT '' CHECK (length(notas) <= 2000),
  es_actual boolean NOT NULL DEFAULT false,
  revision integer NOT NULL DEFAULT 1,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CHECK (inicia_el IS NULL OR valida_hasta IS NULL OR
    valida_hasta > (inicia_el::timestamp AT TIME ZONE 'America/Hermosillo'))
);
CREATE UNIQUE INDEX licencias_una_actual ON et_privado.licencias (es_actual) WHERE es_actual;
CREATE TABLE et_privado.licencias_historial (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  licencia_id uuid NOT NULL REFERENCES et_privado.licencias(id),
  usuario_id uuid NOT NULL,
  fecha timestamptz NOT NULL DEFAULT now(),
  anterior jsonb,
  nuevo jsonb NOT NULL
);
REVOKE ALL ON ALL TABLES IN SCHEMA et_privado FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA et_privado FROM PUBLIC, anon, authenticated;

INSERT INTO et_privado.licencias (codigo, cliente, valida_hasta, es_actual)
SELECT 'ET-HMO-001', coalesce(nullif(btrim(cliente), ''), 'Municipio de Hermosillo - Talleres'),
  valida_hasta, true FROM public.licencia_uso WHERE id;

CREATE FUNCTION et_privado.validar_admin_licencias(p_usuario_id uuid, p_clave text)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF p_clave IS NULL OR length(p_clave) < 32 OR length(p_clave) > 256 OR NOT EXISTS (
    SELECT 1 FROM et_privado.licencias_administrador a
    JOIN public.usuarios u ON u.id = a.usuario_id
    WHERE a.id AND a.usuario_id = p_usuario_id AND u.activo IS TRUE
      AND lower(btrim(u.usuario)) = 'emma'
      AND regexp_replace(lower(btrim(u.rol)), '[ _-]', '', 'g') = 'superadmin'
      AND a.clave_sha256 = sha256(convert_to(p_clave, 'UTF8'))
  ) THEN
    RAISE EXCEPTION 'Acceso exclusivo del SuperAdmin propietario. Verifica tu cuenta y clave privada.'
      USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION et_privado.validar_admin_licencias(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.admin_listar_licencias(p_usuario_id uuid, p_clave text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE resultado jsonb;
BEGIN
  PERFORM et_privado.validar_admin_licencias(p_usuario_id, p_clave);
  SELECT coalesce(jsonb_agg(to_jsonb(l) || jsonb_build_object(
    'estado', CASE
      WHEN l.valida_hasta <= now() THEN 'Vencida'
      WHEN l.inicia_el > (now() AT TIME ZONE 'America/Hermosillo')::date THEN 'Programada'
      WHEN l.valida_hasta IS NULL THEN 'Sin vigencia'
      ELSE 'Vigente' END,
    'dias_restantes', CASE WHEN l.valida_hasta IS NULL THEN NULL
      ELSE greatest(0, ceil(extract(epoch FROM (l.valida_hasta - now())) / 86400)) END
  ) ORDER BY l.es_actual DESC, l.cliente, l.id), '[]'::jsonb)
  INTO resultado FROM et_privado.licencias l;
  RETURN resultado;
END;
$$;

CREATE FUNCTION public.admin_guardar_licencia(
  p_usuario_id uuid, p_clave text, p_id uuid, p_revision integer,
  p_codigo text, p_cliente text, p_inicia_el date, p_vence_el date, p_notas text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  anterior et_privado.licencias;
  nuevo et_privado.licencias;
  vencimiento timestamptz;
BEGIN
  PERFORM et_privado.validar_admin_licencias(p_usuario_id, p_clave);
  IF p_codigo IS NULL OR upper(btrim(p_codigo)) !~ '^[A-Z0-9][A-Z0-9_-]{2,39}$'
    OR p_cliente IS NULL OR length(btrim(p_cliente)) NOT BETWEEN 1 AND 200
    OR length(coalesce(p_notas, '')) > 2000
    OR (p_inicia_el IS NOT NULL AND p_vence_el IS NOT NULL AND p_vence_el < p_inicia_el)
    OR (p_inicia_el IS NOT NULL AND NOT isfinite(p_inicia_el))
    OR (p_vence_el IS NOT NULL AND NOT isfinite(p_vence_el)) THEN
    RAISE EXCEPTION 'Revisa código, cliente y fechas de la licencia.' USING ERRCODE = '22023';
  END IF;
  -- El día seleccionado incluye todo el día de Hermosillo; expiración exclusiva.
  vencimiento := (p_vence_el::timestamp + interval '1 day') AT TIME ZONE 'America/Hermosillo';
  IF p_id IS NULL THEN
    INSERT INTO et_privado.licencias (codigo, cliente, inicia_el, valida_hasta, notas)
    VALUES (upper(btrim(p_codigo)), btrim(p_cliente), p_inicia_el, vencimiento, coalesce(p_notas, ''))
    RETURNING * INTO nuevo;
  ELSE
    SELECT * INTO anterior FROM et_privado.licencias WHERE id = p_id FOR UPDATE;
    IF NOT FOUND OR p_revision IS DISTINCT FROM anterior.revision THEN
      RAISE EXCEPTION 'La licencia cambió o ya no existe. Actualiza la lista antes de guardar.' USING ERRCODE = '40001';
    END IF;
    UPDATE et_privado.licencias SET
      codigo = upper(btrim(p_codigo)), cliente = btrim(p_cliente), inicia_el = p_inicia_el,
      valida_hasta = vencimiento, notas = coalesce(p_notas, ''),
      revision = revision + 1, actualizado_en = now()
    WHERE id = p_id RETURNING * INTO nuevo;
  END IF;
  IF nuevo.es_actual THEN
    UPDATE public.licencia_uso SET titular = 'Brote Labs', cliente = nuevo.cliente,
      valida_hasta = nuevo.valida_hasta WHERE id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Falta la licencia de esta instalación.'; END IF;
  END IF;
  INSERT INTO et_privado.licencias_historial (licencia_id, usuario_id, anterior, nuevo)
  VALUES (nuevo.id, p_usuario_id, CASE WHEN p_id IS NULL THEN NULL ELSE to_jsonb(anterior) END, to_jsonb(nuevo));
  RETURN nuevo.id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_listar_licencias(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_guardar_licencia(uuid, text, uuid, integer, text, text, date, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_listar_licencias(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_guardar_licencia(uuid, text, uuid, integer, text, text, date, date, text) TO anon, authenticated;

-- La cuenta propietaria y su clave se habilitan después, exclusivamente desde SQL
-- administrativo. Sin esa configuración todas las llamadas fallan cerradas.
NOTIFY pgrst, 'reload schema';
COMMIT;
