BEGIN;
CREATE OR REPLACE FUNCTION et_privado.sp_emitida_editable(p_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT coalesce(bool_or(lower(btrim(s->>'estatus')) IN ('emitida','emitido')),false)
    AND NOT coalesce(bool_or(nullif(btrim(s->>'estatus'),'') IS NOT NULL
      AND lower(btrim(s->>'estatus')) NOT IN ('emitida','emitido')),false)
  FROM public.seguimiento_siif v,
    LATERAL jsonb_array_elements(coalesce(v.solicitudes_pago,'[]'::jsonb)) s
  WHERE v.id=p_id;
$$;
CREATE OR REPLACE FUNCTION et_privado.sincronizar_envios_sp()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE r record; anterior public.flujo_tramites_siif%ROWTYPE;
  nuevo public.flujo_tramites_siif%ROWTYPE; lote uuid:=gen_random_uuid();
BEGIN
-- Corrige la marca heredada sin inventar una nueva ubicacion fisica.
WITH anteriores AS MATERIALIZED (
  SELECT * FROM public.flujo_tramites_siif
  WHERE automatico_sp AND et_privado.sp_emitida_editable(requisicion_id)
), cambios AS (
  UPDATE public.flujo_tramites_siif f SET automatico_sp=false,revision=f.revision+1,
    actualizado_en=now(),actualizado_por=NULL
  FROM anteriores a WHERE f.requisicion_id=a.requisicion_id RETURNING f.*
)
INSERT INTO public.flujo_tramites_siif_historial(requisicion_id,lote,antes,despues,usuario_id,usuario_nombre)
SELECT c.requisicion_id,gen_random_uuid(),to_jsonb(a),to_jsonb(c),NULL,'Correccion de SP emitida'
FROM cambios c JOIN anteriores a USING(requisicion_id);
  FOR r IN
    SELECT v.id, string_agg(coalesce(s->>'numero_solicitud',s->>'id','Sin número'),', ' ORDER BY s->>'numero_solicitud') AS solicitudes
    FROM public.seguimiento_siif v
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(v.solicitudes_pago,'[]'::jsonb)) s
    WHERE nullif(btrim(s->>'estatus'),'') IS NOT NULL AND lower(btrim(s->>'estatus'))NOT IN ('emitida','emitido')
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
CREATE OR REPLACE FUNCTION et_privado.actualizar_envios_sp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  PERFORM et_privado.sincronizar_envios_sp();
  RETURN NULL;
END $$;
-- También se ejecuta al importar primero la SP y posteriormente la requisición.
CREATE OR REPLACE FUNCTION et_privado.proteger_envio_sp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF (NEW.etapa<>10 OR NEW.ubicacion<>'Enviado') AND EXISTS (
    SELECT 1 FROM public.seguimiento_siif v,
      LATERAL jsonb_array_elements(coalesce(v.solicitudes_pago,'[]'::jsonb)) s
    WHERE v.id=NEW.requisicion_id AND nullif(btrim(s->>'estatus'),'') IS NOT NULL
      AND lower(btrim(s->>'estatus'))NOT IN ('emitida','emitido')
  ) THEN
    RAISE EXCEPTION 'Este trámite corresponde a Enviado por el estatus de su solicitud de pago. Actualiza el listado.';
  END IF;
  IF NEW.etapa<>10 OR et_privado.sp_emitida_editable(NEW.requisicion_id) THEN NEW.automatico_sp:=false; END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.mover_flujo_siif(
  p_usuario uuid,p_token text,p_tramites jsonb,p_etapa integer,
  p_ubicacion text,p_responsable text,p_nota text DEFAULT '',p_acuse text DEFAULT '',p_proveedor text DEFAULT ''
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor text; item record; anterior public.flujo_tramites_siif%ROWTYPE;
  nuevo public.flujo_tramites_siif%ROWTYPE; lote uuid:=gen_random_uuid(); cantidad integer:=0;
BEGIN
  actor:=et_privado.autorizar_flujo_siif(p_usuario,p_token,true);
  IF jsonb_typeof(p_tramites) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Selección inválida'; END IF;
  IF jsonb_array_length(p_tramites) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Selecciona entre 1 y 500 trámites'; END IF;
  IF p_etapa IS NULL OR p_etapa NOT BETWEEN 1 AND 10
    OR p_ubicacion IS NULL OR p_ubicacion NOT IN ('Compras','Administrativo','Almacén','Enviado')
    OR nullif(btrim(p_responsable),'') IS NULL OR length(p_responsable)>150
    OR p_nota IS NULL OR length(p_nota)>2000 OR p_acuse IS NULL OR length(p_acuse)>150
    OR p_proveedor IS NULL OR length(p_proveedor)>150 THEN
    RAISE EXCEPTION 'Etapa, ubicación, responsable o texto inválidos';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_tramites) AS t(id uuid,revision integer)
      WHERE id IS NULL OR revision IS NULL OR revision<0)
    OR (SELECT count(DISTINCT id) FROM jsonb_to_recordset(p_tramites) AS t(id uuid,revision integer))<>jsonb_array_length(p_tramites) THEN
    RAISE EXCEPTION 'Identificadores o revisiones inválidos';
  END IF;
  -- Orden estable y bloqueo por registro. Todo el lote confirma o se revierte.
  FOR item IN SELECT * FROM jsonb_to_recordset(p_tramites) AS t(id uuid,revision integer) ORDER BY id LOOP
    INSERT INTO public.flujo_tramites_siif(requisicion_id) VALUES(item.id) ON CONFLICT DO NOTHING;
    SELECT * INTO anterior FROM public.flujo_tramites_siif WHERE requisicion_id=item.id FOR UPDATE;
    IF anterior.revision<>item.revision THEN
      RAISE EXCEPTION 'Un trámite cambió. Actualiza el listado y revisa la selección.' USING ERRCODE='40001';
    END IF;
    IF NOT et_privado.sp_emitida_editable(item.id) THEN
  IF p_etapa IN (3,6) AND (p_ubicacion<>'Compras' OR nullif(btrim(p_proveedor),'') IS NULL) THEN
    RAISE EXCEPTION 'La espera del proveedor permanece en Compras; indica el proveedor';
  END IF;
  IF (p_etapa=10) IS DISTINCT FROM (p_ubicacion='Enviado') THEN
    RAISE EXCEPTION 'Enviado corresponde a la etapa de acuse y envío a Oficialía Mayor';
  END IF;
    END IF;
    UPDATE public.flujo_tramites_siif SET etapa=p_etapa,ubicacion=p_ubicacion,
      responsable=btrim(p_responsable),nota=btrim(p_nota),
      proveedor_espera=CASE WHEN p_etapa IN (3,6) THEN btrim(p_proveedor) ELSE '' END,
      acuse=CASE WHEN btrim(p_acuse)<>'' THEN btrim(p_acuse) ELSE anterior.acuse END,
      desde=CASE WHEN anterior.etapa<>p_etapa OR anterior.ubicacion<>p_ubicacion
        OR anterior.responsable<>btrim(p_responsable) THEN now() ELSE anterior.desde END,
      revision=revision+1,actualizado_en=now(),actualizado_por=p_usuario
    WHERE requisicion_id=item.id RETURNING * INTO nuevo;
    INSERT INTO public.flujo_tramites_siif_historial(requisicion_id,lote,antes,despues,usuario_id,usuario_nombre)
    VALUES(item.id,lote,to_jsonb(anterior),to_jsonb(nuevo),p_usuario,actor);
    cantidad:=cantidad+1;
  END LOOP;
  RETURN cantidad;
END $$;
REVOKE ALL ON FUNCTION et_privado.sp_emitida_editable(uuid) FROM PUBLIC,anon,authenticated;
SELECT et_privado.sincronizar_envios_sp();
NOTIFY pgrst,'reload schema';
COMMIT;
