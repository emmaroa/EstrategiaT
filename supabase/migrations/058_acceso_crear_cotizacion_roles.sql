BEGIN;
-- Compatibilidad de permisos previos para SuperAdmin y Compras.
CREATE OR REPLACE FUNCTION et_privado.autorizar_cotizacion_xml(p_usuario uuid, p_password text, p_editar boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE u jsonb; permisos jsonb; permiso text; rol text;
BEGIN
  SELECT to_jsonb(t) INTO u FROM public.usuarios t WHERE t.id = p_usuario AND t.activo IS TRUE AND t.password = p_password AND length(p_password) > 0;
  IF u IS NULL THEN RAISE EXCEPTION 'Credenciales inválidas o cuenta inactiva' USING ERRCODE='42501'; END IF;
  rol := regexp_replace(lower(u->>'rol'), '[ _-]', '', 'g');
  IF rol = 'proveedor' THEN RAISE EXCEPTION 'Sin acceso a Crear cotización' USING ERRCODE='42501'; END IF;
  permisos := coalesce(u->'modulos_permitidos', '[]'::jsonb);
  IF jsonb_typeof(permisos) = 'string' THEN
    BEGIN permisos := (permisos #>> '{}')::jsonb;
    EXCEPTION WHEN OTHERS THEN
      SELECT jsonb_agg(btrim(x)) INTO permisos FROM unnest(string_to_array(u->>'modulos_permitidos', ',')) x;
    END;
  END IF;
  IF jsonb_typeof(permisos) = 'array' AND jsonb_array_length(permisos) > 0 THEN
    SELECT CASE WHEN jsonb_typeof(x)='string' THEN 'editar' ELSE lower(btrim(coalesce(x->>'permiso',x->>'acceso',x->>'nivel','none'))) END INTO permiso
      FROM jsonb_array_elements(permisos) x WHERE
      (jsonb_typeof(x)='string' AND btrim(x #>> '{}') = 'Crear cotización') OR btrim(coalesce(x->>'modulo',x->>'nombre',x->>'module')) = 'Crear cotización' LIMIT 1;
  ELSIF rol IN ('superadmin', 'admin', 'administradordelsistema', 'jefe', 'compras') THEN permiso := 'editar';
  END IF;
  -- Las listas anteriores a este módulo heredan su acceso por rol; una denegación explícita prevalece.
  IF permiso IS NULL AND rol IN ('superadmin','compras') THEN permiso := 'editar'; END IF;
  permiso := CASE WHEN permiso IN ('vista','view','solo vista') THEN 'ver' WHEN permiso IN ('edit','write','modificar') THEN 'editar' WHEN permiso IN ('moderador','moderate') THEN 'moderar' ELSE permiso END;
  IF coalesce(permiso,'none') NOT IN ('ver','editar','moderar') OR (p_editar AND permiso <> 'editar') THEN
    RAISE EXCEPTION 'Sin permiso para esta acción en Crear cotización' USING ERRCODE='42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION et_privado.autorizar_cotizacion_xml(uuid,text,boolean) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst,'reload schema';
COMMIT;
