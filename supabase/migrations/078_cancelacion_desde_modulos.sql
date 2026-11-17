BEGIN;
CREATE TABLE IF NOT EXISTS et_privado.cancelacion_tablas(tabla text PRIMARY KEY);
INSERT INTO et_privado.cancelacion_tablas(tabla)
 SELECT tabla FROM et_privado.rbac_tablas WHERE tabla IN
 ('parque_vehicular','peticiones','cotizaciones_almacen','requis_siif','oc_siif','sp_siif',
 'acuerdos','eventos_calendario','ingresos_taller','ingresos_taller_pendientes','vales',
 'tramites_administrativos','empleados','periodos_tiempo_extra','ordenes_trabajo','requisiciones_siif')
 ON CONFLICT DO NOTHING;
ALTER TABLE et_privado.cancelacion_tablas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON et_privado.cancelacion_tablas FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT tabla FROM et_privado.cancelacion_tablas LOOP
  IF to_regclass(format('public.%I',t.tabla)) IS NULL THEN CONTINUE; END IF;
  EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS rbac_cancelado_por uuid, ADD COLUMN IF NOT EXISTS rbac_cancelado_en timestamptz, ADD COLUMN IF NOT EXISTS rbac_motivo_cancelacion text',t.tabla);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.cancelar_registro_modulo(p_tabla text,p_registro uuid,p_motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor(); r jsonb; m text; solicitud uuid;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sesión inválida' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM et_privado.cancelacion_tablas WHERE tabla=p_tabla)
 OR to_regclass(format('public.%I',p_tabla)) IS NULL THEN RAISE EXCEPTION 'Este módulo no admite cancelaciones'; END IF;
 IF length(btrim(coalesce(p_motivo,''))) NOT BETWEEN 5 AND 1000 THEN RAISE EXCEPTION 'Escriba un motivo de 5 a 1000 caracteres'; END IF;
 EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 FOR UPDATE',p_tabla) INTO r USING p_registro;
 m:=et_privado.rbac_modulo(p_tabla,r);
 IF r IS NULL OR NOT coalesce(et_privado.rbac_lectura(p_tabla,r),false)
  OR NOT coalesce(et_privado.rbac_puede(u,m,'solicitar_cancelacion',r),false) THEN
  RAISE EXCEPTION 'Sin permiso para cancelar este registro' USING ERRCODE='42501'; END IF;
 IF coalesce((r->>'rbac_cancelado')::boolean,false) THEN RAISE EXCEPTION 'El registro ya está cancelado'; END IF;
 SELECT id INTO solicitud FROM public.solicitudes_cancelacion
 WHERE tabla=p_tabla AND registro_id=p_registro AND estado='Pendiente' FOR UPDATE;
 IF solicitud IS NULL THEN
  INSERT INTO public.solicitudes_cancelacion(tabla,registro_id,modulo,motivo,solicitante_id)
  VALUES(p_tabla,p_registro,m,btrim(p_motivo),(u->>'id')::uuid) RETURNING id INTO solicitud;
 END IF;
 -- Se conserva el historial anterior. La aprobación es inmediata por el permiso del módulo.
 UPDATE public.solicitudes_cancelacion SET estado='Aprobada',resolucion=btrim(p_motivo),
  resuelto_por=(u->>'id')::uuid,resuelto_en=now() WHERE id=solicitud;
END $$;
CREATE OR REPLACE FUNCTION et_privado.rbac_aplicar_cancelacion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.estado='Aprobada' AND OLD.estado='Pendiente' THEN
  IF NOT EXISTS(SELECT 1 FROM et_privado.cancelacion_tablas WHERE tabla=NEW.tabla) THEN
   RAISE EXCEPTION 'Tabla no habilitada para cancelar'; END IF;
  EXECUTE format('UPDATE public.%I SET rbac_cancelado=true,rbac_cancelado_por=$2,rbac_cancelado_en=$3,rbac_motivo_cancelacion=$4 WHERE id=$1',NEW.tabla)
  USING NEW.registro_id,NEW.resuelto_por,NEW.resuelto_en,NEW.resolucion;
 END IF;
 RETURN NEW;
END $$;
-- Impedir falsificar los datos de cancelación mediante UPDATE directo.
CREATE OR REPLACE FUNCTION et_privado.proteger_datos_cancelacion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF pg_trigger_depth()>1 THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
  NEW.rbac_cancelado_por:=NULL;NEW.rbac_cancelado_en:=NULL;NEW.rbac_motivo_cancelacion:=NULL;
 ELSIF NEW.rbac_cancelado_por IS DISTINCT FROM OLD.rbac_cancelado_por
 OR NEW.rbac_cancelado_en IS DISTINCT FROM OLD.rbac_cancelado_en
 OR NEW.rbac_motivo_cancelacion IS DISTINCT FROM OLD.rbac_motivo_cancelacion THEN
  RAISE EXCEPTION 'Use Cancelar registro desde el módulo' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT tabla FROM et_privado.cancelacion_tablas LOOP
  IF to_regclass(format('public.%I',t.tabla)) IS NULL THEN CONTINUE; END IF;
  EXECUTE format('DROP TRIGGER IF EXISTS proteger_datos_cancelacion ON public.%I',t.tabla);
  EXECUTE format('CREATE TRIGGER proteger_datos_cancelacion BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION et_privado.proteger_datos_cancelacion()',t.tabla);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.solicitar_cancelacion(text,uuid,text),public.resolver_cancelacion(uuid,boolean,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION et_privado.rbac_aplicar_cancelacion(),et_privado.proteger_datos_cancelacion() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.cancelar_registro_modulo(text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancelar_registro_modulo(text,uuid,text) TO anon,authenticated;
DO $$ DECLARE definicion text; BEGIN
 definicion:=pg_get_functiondef('et_privado.rbac_escritura()'::regprocedure);
 definicion:=replace(definicion,'Solicite la cancelación mediante el módulo Cancelaciones','Use Cancelar registro desde este módulo');
 EXECUTE definicion;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
