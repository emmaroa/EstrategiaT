BEGIN;
ALTER TABLE public.flujo_tramites_siif ADD COLUMN automatico_sp boolean NOT NULL DEFAULT false;
ALTER TABLE public.flujo_tramites_siif_historial ALTER COLUMN usuario_id DROP NOT NULL;

CREATE FUNCTION et_privado.sincronizar_envios_sp()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE r record; anterior public.flujo_tramites_siif%ROWTYPE;
  nuevo public.flujo_tramites_siif%ROWTYPE; lote uuid:=gen_random_uuid();
BEGIN
  FOR r IN
    SELECT v.id, string_agg(coalesce(s->>'numero_solicitud',s->>'id','Sin número'),', ' ORDER BY s->>'numero_solicitud') AS solicitudes
    FROM public.seguimiento_siif v
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(v.solicitudes_pago,'[]'::jsonb)) s
    WHERE nullif(btrim(s->>'estatus'),'') IS NOT NULL AND lower(btrim(s->>'estatus'))<>'emitida'
    GROUP BY v.id ORDER BY v.id
  LOOP
    INSERT INTO public.flujo_tramites_siif(requisicion_id) VALUES(r.id) ON CONFLICT DO NOTHING;
    SELECT * INTO anterior FROM public.flujo_tramites_siif WHERE requisicion_id=r.id FOR UPDATE;
    IF FOUND AND anterior.etapa=10 AND anterior.ubicacion='Enviado' AND anterior.automatico_sp THEN CONTINUE; END IF;
    INSERT INTO public.flujo_tramites_siif(requisicion_id,etapa,ubicacion,responsable,nota,revision,automatico_sp)
    VALUES(r.id,10,'Enviado','Sin responsable registrado','Envío automático por estatus de SP: '||r.solicitudes,1,true)
    ON CONFLICT (requisicion_id) DO UPDATE SET
      etapa=10,ubicacion='Enviado',automatico_sp=true,proveedor_espera='',
      responsable=coalesce(nullif(public.flujo_tramites_siif.responsable,''),'Sin responsable registrado'),
      revision=public.flujo_tramites_siif.revision+1,
      desde=CASE WHEN public.flujo_tramites_siif.ubicacion='Enviado' THEN public.flujo_tramites_siif.desde ELSE now() END,
      actualizado_en=now(),actualizado_por=NULL
    RETURNING * INTO nuevo;
    INSERT INTO public.flujo_tramites_siif_historial(requisicion_id,lote,antes,despues,usuario_id,usuario_nombre)
    VALUES(r.id,lote,CASE WHEN anterior.requisicion_id IS NULL THEN
      jsonb_build_object('etapa',0,'ubicacion','Sin registrar','responsable','') ELSE to_jsonb(anterior) END,
      to_jsonb(nuevo)||jsonb_build_object('motivo_automatico','SP con estatus distinto de Emitida: '||r.solicitudes),
      NULL,'Automático · SIIF');
  END LOOP;
END $$;
CREATE FUNCTION et_privado.actualizar_envios_sp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  PERFORM et_privado.sincronizar_envios_sp();
  RETURN NULL;
END $$;
-- También se ejecuta al importar primero la SP y posteriormente la requisición.
CREATE TRIGGER flujo_envios_sp AFTER INSERT OR UPDATE ON public.sp_siif
FOR EACH STATEMENT EXECUTE FUNCTION et_privado.actualizar_envios_sp();
CREATE TRIGGER flujo_envios_requisicion AFTER INSERT OR UPDATE ON public.requis_siif
FOR EACH STATEMENT EXECUTE FUNCTION et_privado.actualizar_envios_sp();

CREATE FUNCTION et_privado.proteger_envio_sp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NEW.etapa<>10 AND EXISTS (
    SELECT 1 FROM public.seguimiento_siif v,
      LATERAL jsonb_array_elements(coalesce(v.solicitudes_pago,'[]'::jsonb)) s
    WHERE v.id=NEW.requisicion_id AND nullif(btrim(s->>'estatus'),'') IS NOT NULL
      AND lower(btrim(s->>'estatus'))<>'emitida'
  ) THEN
    RAISE EXCEPTION 'Este trámite corresponde a Enviado por el estatus de su solicitud de pago. Actualiza el listado.';
  END IF;
  IF NEW.etapa<>10 THEN NEW.automatico_sp:=false; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER proteger_envio_sp BEFORE UPDATE ON public.flujo_tramites_siif
FOR EACH ROW EXECUTE FUNCTION et_privado.proteger_envio_sp();
REVOKE ALL ON FUNCTION et_privado.sincronizar_envios_sp(),et_privado.actualizar_envios_sp(),et_privado.proteger_envio_sp()
FROM PUBLIC,anon,authenticated;
-- Aplicación inicial a los datos existentes; las reimportaciones son idempotentes.
SELECT et_privado.sincronizar_envios_sp();
NOTIFY pgrst,'reload schema';
COMMIT;
