BEGIN;

-- Omitir secretos incluso si aparecen dentro de metadata u otros objetos JSON.
CREATE OR REPLACE FUNCTION et_privado.auditoria_sin_secretos(valor jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog AS $$
DECLARE resultado jsonb;
BEGIN
  IF jsonb_typeof(valor) = 'object' THEN
    SELECT coalesce(jsonb_object_agg(key, CASE
      WHEN lower(key) ~ '(password|passwd|contras[eñn]|clave|token|secret|api_key|authorization)'
      THEN '"[PROTEGIDO]"'::jsonb ELSE et_privado.auditoria_sin_secretos(value) END), '{}'::jsonb)
    INTO resultado FROM jsonb_each(valor);
    RETURN resultado;
  ELSIF jsonb_typeof(valor) = 'array' THEN
    SELECT coalesce(jsonb_agg(et_privado.auditoria_sin_secretos(value)), '[]'::jsonb)
    INTO resultado FROM jsonb_array_elements(valor);
    RETURN resultado;
  END IF;
  RETURN valor;
END;
$$;
REVOKE ALL ON FUNCTION et_privado.auditoria_sin_secretos(jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION et_privado.auditar_movimiento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
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
    actor := (cabeceras ->> 'x-et-usuario-id')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN actor := NULL;
  END;
  IF actor IS NOT NULL THEN
    SELECT left(coalesce(u.nombre, u.usuario), 150), left(u.rol, 80)
    INTO actor_nombre, actor_rol FROM public.usuarios u WHERE u.id = actor AND u.activo IS TRUE;
    IF NOT FOUND THEN actor := NULL;
    ELSE actor_origen := 'declarado_por_aplicacion'; END IF;
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
$$;
REVOKE ALL ON FUNCTION et_privado.auditar_movimiento() FROM PUBLIC, anon, authenticated;

DO $$ DECLARE tabla record;
BEGIN
  FOR tabla IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relispartition
      AND c.relname <> 'auditoria'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass
        AND d.objid = c.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS et_auditoria_movimiento ON public.%I', tabla.relname);
    EXECUTE format('CREATE TRIGGER et_auditoria_movimiento AFTER INSERT OR UPDATE OR DELETE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION et_privado.auditar_movimiento()', tabla.relname);
    EXECUTE format('DROP TRIGGER IF EXISTS et_auditoria_vaciado ON public.%I', tabla.relname);
    EXECUTE format('CREATE TRIGGER et_auditoria_vaciado AFTER TRUNCATE ON public.%I
      FOR EACH STATEMENT EXECUTE FUNCTION et_privado.auditar_movimiento()', tabla.relname);
  END LOOP;
END $$;

-- Los eventos manuales anteriores siguen permitidos, pero se limpian también
-- sus metadatos. Las claves nunca deben aparecer en el comparativo.
CREATE OR REPLACE FUNCTION et_privado.sanear_evento_auditoria()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  NEW.metadata := et_privado.auditoria_sin_secretos(NEW.metadata);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION et_privado.sanear_evento_auditoria() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER et_sanear_evento_auditoria BEFORE INSERT ON public.auditoria
FOR EACH ROW EXECUTE FUNCTION et_privado.sanear_evento_auditoria();

-- La bitácora no se borra ni modifica mediante el cliente web.
REVOKE UPDATE, DELETE, TRUNCATE ON public.auditoria FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_auditoria_cursor ON public.auditoria(created_at DESC, id DESC);
NOTIFY pgrst, 'reload schema';
COMMIT;
