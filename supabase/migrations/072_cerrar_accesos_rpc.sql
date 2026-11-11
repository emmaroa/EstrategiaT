-- Requiere 070 y 071. Definiciones revisadas del inventario del 11-11-2026.
BEGIN;
REVOKE CREATE ON SCHEMA public FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION et_privado.exigir_permiso(m text,a text,identidad uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor();
BEGIN
 IF u IS NULL OR (identidad IS NOT NULL AND identidad::text<>u->>'id')
   OR NOT coalesce(et_privado.rbac_puede(u,m,a),false) THEN
   RAISE EXCEPTION 'Sesión o permiso inválido' USING ERRCODE='42501';
 END IF;
 RETURN (u->>'id')::uuid;
END $$;
REVOKE ALL ON FUNCTION et_privado.exigir_permiso(text,text,uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.registrar_movimiento_inventario(p_inventario_id uuid, p_tipo character varying, p_cantidad numeric, p_referencia character varying DEFAULT NULL::character varying, p_notas text DEFAULT NULL::text, p_usuario_id uuid DEFAULT NULL::uuid)
 RETURNS inventario_movimientos
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item public.inventario;
  v_mov public.inventario_movimientos;
  v_delta NUMERIC;
BEGIN
  p_usuario_id := et_privado.exigir_permiso('Inventario','editar',p_usuario_id);
  PERFORM et_privado.exigir_permiso('Inventario','crear');
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor que cero';
  END IF;
  IF p_tipo NOT IN ('entrada', 'salida', 'ajuste', 'devolucion') THEN
    RAISE EXCEPTION 'Tipo de movimiento no válido';
  END IF;

  SELECT * INTO v_item FROM public.inventario WHERE id = p_inventario_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Artículo de inventario no encontrado'; END IF;

  v_delta := CASE
    WHEN p_tipo IN ('entrada', 'devolucion') THEN p_cantidad
    WHEN p_tipo = 'salida' THEN -p_cantidad
    ELSE p_cantidad - v_item.stock_actual
  END;
  IF v_item.stock_actual + v_delta < 0 THEN
    RAISE EXCEPTION 'El movimiento dejaría el stock en negativo';
  END IF;

  INSERT INTO public.inventario_movimientos
    (inventario_id, tipo, cantidad, costo_unitario, referencia, usuario_id, notas)
  VALUES
    (p_inventario_id, p_tipo, p_cantidad, v_item.costo_unitario, p_referencia, p_usuario_id, p_notas)
  RETURNING * INTO v_mov;

  UPDATE public.inventario
    SET stock_actual = v_item.stock_actual + v_delta, updated_at = now()
    WHERE id = p_inventario_id;

  RETURN v_mov;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.respaldo_tablas(p_clave text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  tabla record;
  columnas jsonb;
  filas jsonb;
  resultado jsonb := '[]'::jsonb;
  omitir text[] := ARRAY['password', 'password_hash', 'contrasena', 'contraseña',
    'clave_sha256', 'access_token', 'refresh_token', 'api_key', 'secret'];
BEGIN
  PERFORM et_privado.exigir_permiso('Licencias','ver');
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
$function$
;
CREATE OR REPLACE FUNCTION et_privado.validar_admin_licencias(p_usuario_id uuid, p_clave text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  PERFORM et_privado.exigir_permiso('Licencias','editar',p_usuario_id);
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
$function$
;
CREATE OR REPLACE FUNCTION et_privado.autorizar_cotizacion_xml(p_usuario uuid, p_password text, p_editar boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE u jsonb; permisos jsonb; permiso text; rol text;
BEGIN
  PERFORM et_privado.exigir_permiso('Crear cotización',CASE WHEN p_editar THEN 'editar' ELSE 'ver' END,p_usuario);
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
  permiso := CASE WHEN permiso IN ('vista','view','solo vista') THEN 'ver' WHEN permiso IN ('edit','write','modificar') THEN 'editar' WHEN permiso IN ('moderador','moderate') THEN 'moderar' ELSE permiso END;
  IF coalesce(permiso,'none') NOT IN ('ver','editar','moderar') OR (p_editar AND permiso <> 'editar') THEN
    RAISE EXCEPTION 'Sin permiso para esta acción en Crear cotización' USING ERRCODE='42501';
  END IF;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.eliminar_ingreso_taller(p_ingreso_id uuid, p_usuario_id uuid, p_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  autor uuid;
BEGIN
  PERFORM et_privado.exigir_permiso('Control de Taller','eliminar',p_usuario_id);
  IF p_password IS NULL OR length(btrim(p_password)) = 0 OR NOT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = p_usuario_id AND u.activo IS TRUE AND u.password = p_password
      AND lower(btrim(coalesce(u.rol, ''))) NOT IN ('solo lectura', 'consulta')
  ) THEN
    RAISE EXCEPTION 'No autorizado para eliminar este ingreso' USING ERRCODE = '42501';
  END IF;
  SELECT creado_por INTO autor FROM public.ingresos_taller
    WHERE id = p_ingreso_id FOR UPDATE;
  IF NOT FOUND OR autor IS NULL OR autor IS DISTINCT FROM p_usuario_id THEN
    RAISE EXCEPTION 'No autorizado para eliminar este ingreso' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.ingresos_taller WHERE id = p_ingreso_id AND creado_por = p_usuario_id;
  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.listar_usuarios_turnables_acuerdos()
RETURNS TABLE(id uuid,nombre text,usuario text,rol text,activo boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 PERFORM et_privado.exigir_permiso('Acuerdos','ver');
 RETURN QUERY SELECT u.id,u.nombre::text,u.usuario::text,u.rol::text,u.activo
 FROM public.usuarios u WHERE u.activo IS TRUE AND et_privado.rbac_rol(u.rol)<>'proveedor'
 ORDER BY u.nombre;
END $$;
CREATE OR REPLACE FUNCTION public.usuario_actual_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT (et_privado.rbac_actor()->>'id')::uuid
$$;
CREATE OR REPLACE FUNCTION public.generar_folio_cotizacion_almacen() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 PERFORM et_privado.exigir_permiso(
 CASE WHEN et_privado.rbac_rol(et_privado.rbac_actor()->>'rol')='proveedor'
 THEN 'Cotizaciones Proveedor' ELSE 'Gestión de Cotizaciones' END,'crear');
 RETURN 'COT-' || EXTRACT(YEAR FROM CURRENT_DATE)::integer || '-' ||
 lpad(nextval('public.cotizaciones_almacen_folio_seq')::text,4,'0');
END $$;
CREATE OR REPLACE FUNCTION public.usuario_actual_rol() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT lower(btrim(et_privado.rbac_actor()->>'rol'))
$$;
-- RPC heredadas sin consumidor en el cliente actual; los folios siguen por triggers.
REVOKE ALL ON FUNCTION public.resolver_email_login(text),public.generar_folio(text)
 FROM PUBLIC,anon,authenticated;
-- Eliminar privilegios EXECUTE por defecto en funciones trigger: no son endpoints.
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure firma FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname IN ('public','et_privado') AND p.prorettype='trigger'::regtype LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.firma);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION et_privado.auditar_movimiento()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  antes jsonb;
  despues jsonb;
  registro jsonb;
  cabeceras jsonb;
  actor uuid;
  actor_nombre text;
  actor_rol text;
  actor_origen text := 'sin_identificar';
  entidad uuid;
  modulo_nombre text;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN antes := to_jsonb(OLD); END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN despues := to_jsonb(NEW); END IF;
  IF TG_OP = 'UPDATE' AND antes = despues THEN RETURN NEW; END IF;
  registro := coalesce(despues, antes);
  -- El login heredado no tiene identidad JWT verificable: señalar explícitamente
  -- que la cuenta fue declarada por el cliente. No inferir el editor del creador.
  BEGIN
    cabeceras := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
    actor := (et_privado.rbac_actor()->>'id')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN actor := NULL;
  END;
  IF actor IS NOT NULL THEN
    SELECT left(coalesce(u.nombre, u.usuario), 150), left(u.rol, 80)
    INTO actor_nombre, actor_rol FROM public.usuarios u WHERE u.id = actor AND u.activo IS TRUE;
    IF NOT FOUND THEN actor := NULL;
    ELSE actor_origen := 'sesion_validada'; END IF;
  END IF;
  BEGIN entidad := (registro ->> 'id')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN entidad := NULL;
  END;
  modulo_nombre := CASE
    WHEN TG_TABLE_NAME LIKE 'peticion%' THEN 'Peticiones'
    WHEN TG_TABLE_NAME LIKE 'requisicion%' THEN 'Requisiciones'
    WHEN TG_TABLE_NAME LIKE 'vale%' THEN 'Vales'
    WHEN TG_TABLE_NAME IN ('parque_vehicular', 'vehiculo_documentos', 'vehiculo_fotos') THEN 'Parque Vehicular'
    WHEN TG_TABLE_NAME LIKE '%inventario%' THEN 'Inventario'
    WHEN TG_TABLE_NAME LIKE 'acuerdo%' THEN 'Acuerdos'
    WHEN TG_TABLE_NAME LIKE '%calendario%' THEN 'Calendario'
    WHEN TG_TABLE_NAME LIKE 'ingresos_taller%' THEN 'Control de Taller'
    WHEN TG_TABLE_NAME LIKE '%tiempo_extra%' OR TG_TABLE_NAME = 'empleados' THEN 'Tiempo Extra'
    WHEN TG_TABLE_NAME LIKE 'cotizacion%' THEN 'Gestión de Cotizaciones'
    WHEN TG_TABLE_NAME LIKE '%tramites%' OR TG_TABLE_NAME = 'feriados_administrativos' THEN 'Tramites Administrativos'
    WHEN TG_TABLE_NAME = 'usuarios' THEN 'Usuarios'
    WHEN TG_TABLE_NAME LIKE '%licencia%' THEN 'Licencias'
    WHEN TG_TABLE_NAME LIKE 'proveedor%' THEN 'Proveedores'
    WHEN TG_TABLE_NAME LIKE '%siif%' THEN 'Seguimiento SIIF'
    WHEN TG_TABLE_NAME = 'notificaciones' THEN 'Notificaciones'
    ELSE TG_TABLE_NAME END;
  INSERT INTO public.auditoria (usuario_id, usuario_nombre, usuario_rol, modulo, accion,
    detalle, entidad_tipo, entidad_id, metadata)
  VALUES (actor, coalesce(actor_nombre, 'Sistema / origen no identificado'), coalesce(actor_rol, 'Sin identificar'),
    left(modulo_nombre,100), CASE TG_OP WHEN 'INSERT' THEN 'Creó registro' WHEN 'UPDATE' THEN 'Editó registro' WHEN 'TRUNCATE' THEN 'Vació tabla' ELSE 'Eliminó registro' END,
    TG_TABLE_NAME || coalesce(' · ' || (registro ->> 'id'), ''), left(TG_TABLE_NAME,80), entidad,
    jsonb_build_object('origen', 'base_de_datos', 'operacion', TG_OP, 'tabla', TG_TABLE_NAME,
      'identidad', actor_origen, 'registro_id', registro ->> 'id',
      'antes', et_privado.auditoria_sin_secretos(antes), 'despues', et_privado.auditoria_sin_secretos(despues)));
  IF TG_OP = 'TRUNCATE' THEN RETURN NULL; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$
;
REVOKE ALL ON FUNCTION et_privado.auditar_movimiento() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
