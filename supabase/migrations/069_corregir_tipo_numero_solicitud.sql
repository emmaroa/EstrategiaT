BEGIN;
-- Corregir SQLSTATE 42804 con numero_solicitud bigint sin modificar datos.
CREATE OR REPLACE FUNCTION et_privado.sincronizar_envios_sp(p_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE r record; anterior public.flujo_tramites_siif%ROWTYPE;
  nuevo public.flujo_tramites_siif%ROWTYPE; lote uuid:=gen_random_uuid();
  enviada boolean; emitida boolean; solicitudes text;
BEGIN
  FOR r IN SELECT DISTINCT id FROM unnest(coalesce(p_ids,'{}'::uuid[])) id
    WHERE id IS NOT NULL ORDER BY id LOOP
    SELECT coalesce(bool_or(nullif(btrim(estatus),'') IS NOT NULL AND lower(btrim(estatus)) NOT IN ('emitida','emitido')),false),
      coalesce(bool_or(lower(btrim(estatus)) IN ('emitida','emitido')),false),
      string_agg(coalesce(numero_solicitud::text,id::text,'Sin número'),', ' ORDER BY numero_solicitud)
        FILTER (WHERE nullif(btrim(estatus),'') IS NOT NULL AND lower(btrim(estatus)) NOT IN ('emitida','emitido'))
    INTO enviada,emitida,solicitudes FROM et_privado.sp_de_requisicion(r.id);
    SELECT * INTO anterior FROM public.flujo_tramites_siif WHERE requisicion_id=r.id;
    IF enviada THEN
      IF FOUND AND anterior.etapa=10 AND anterior.ubicacion='Enviado' AND anterior.automatico_sp THEN CONTINUE; END IF;
      INSERT INTO public.flujo_tramites_siif(requisicion_id) VALUES(r.id) ON CONFLICT DO NOTHING;
      SELECT * INTO anterior FROM public.flujo_tramites_siif WHERE requisicion_id=r.id FOR UPDATE;
      IF anterior.etapa=10 AND anterior.ubicacion='Enviado' AND anterior.automatico_sp THEN CONTINUE; END IF;
      UPDATE public.flujo_tramites_siif SET etapa=10,ubicacion='Enviado',automatico_sp=true,proveedor_espera='',
        responsable=coalesce(nullif(responsable,''),'Sin responsable registrado'),
        nota=CASE WHEN revision=0 AND nota='' THEN 'Envío automático por estatus de SP: '||solicitudes ELSE nota END,revision=revision+1,
        desde=CASE WHEN ubicacion='Enviado' THEN desde ELSE now() END,actualizado_en=now(),actualizado_por=NULL
      WHERE requisicion_id=r.id RETURNING * INTO nuevo;
      INSERT INTO public.flujo_tramites_siif_historial(requisicion_id,lote,antes,despues,usuario_id,usuario_nombre)
      VALUES(r.id,lote,to_jsonb(anterior),to_jsonb(nuevo)||jsonb_build_object('motivo_automatico','SP con estatus distinto de Emitida: '||solicitudes),NULL,'Automático · SIIF');
    ELSIF emitida AND anterior.automatico_sp THEN
      SELECT * INTO anterior FROM public.flujo_tramites_siif WHERE requisicion_id=r.id FOR UPDATE;
      IF NOT anterior.automatico_sp THEN CONTINUE; END IF;
      UPDATE public.flujo_tramites_siif SET automatico_sp=false,revision=revision+1,actualizado_en=now(),actualizado_por=NULL
      WHERE requisicion_id=r.id RETURNING * INTO nuevo;
      INSERT INTO public.flujo_tramites_siif_historial(requisicion_id,lote,antes,despues,usuario_id,usuario_nombre)
      VALUES(r.id,lote,to_jsonb(anterior),to_jsonb(nuevo),NULL,'Correccion de SP emitida');
    END IF;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION et_privado.sincronizar_envios_sp(uuid[]) FROM PUBLIC,anon,authenticated;
COMMIT;
