BEGIN;
CREATE SCHEMA IF NOT EXISTS et_privado;
CREATE OR REPLACE FUNCTION et_privado.validar_importacion_activa()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE estado_carga text;
BEGIN
  IF NEW.importacion_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW.importacion_id IS NOT DISTINCT FROM OLD.importacion_id
      AND NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN RETURN NEW; END IF;
  END IF;
  -- Serializar con el cierre: las escrituras ya iniciadas terminan antes de cancelar.
  SELECT estado INTO estado_carga FROM public.importaciones_siif
    WHERE id=NEW.importacion_id FOR SHARE;
  IF estado_carga IS DISTINCT FROM 'Procesando' THEN
    RAISE EXCEPTION 'La importación está cerrada o cancelada. Vuelva a analizar el archivo.' USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION et_privado.impedir_reapertura_importacion()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF OLD.estado <> 'Procesando' AND NEW.estado IS DISTINCT FROM OLD.estado THEN
    RAISE EXCEPTION 'Una importación cerrada no puede reabrirse ni cambiar su estado.' USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS impedir_reapertura_importacion ON public.importaciones_siif;
CREATE TRIGGER impedir_reapertura_importacion BEFORE UPDATE ON public.importaciones_siif
  FOR EACH ROW EXECUTE FUNCTION et_privado.impedir_reapertura_importacion();
DO $$ DECLARE tabla text; BEGIN
  FOREACH tabla IN ARRAY ARRAY['requis_siif','oc_siif','sp_siif'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS validar_importacion_activa ON public.%I',tabla);
    EXECUTE format('CREATE TRIGGER validar_importacion_activa BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION et_privado.validar_importacion_activa()',tabla);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION et_privado.validar_importacion_activa() FROM PUBLIC;
REVOKE ALL ON FUNCTION et_privado.impedir_reapertura_importacion() FROM PUBLIC;
COMMIT;
