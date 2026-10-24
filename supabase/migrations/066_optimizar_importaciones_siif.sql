BEGIN;
-- No ampliar statement_timeout: evitar recorrer la vista completa por cada escritura.
CREATE OR REPLACE FUNCTION et_privado.siif_oficio(text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path=pg_catalog
AS $$ SELECT upper(btrim(coalesce($1,''))) $$;
CREATE OR REPLACE FUNCTION et_privado.siif_numero(text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path=pg_catalog
AS $$ SELECT coalesce(nullif(ltrim(regexp_replace(coalesce($1,''),'\D','','g'),'0'),''),'0') $$;
CREATE OR REPLACE FUNCTION et_privado.siif_req_descripcion(text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path=pg_catalog
AS $$ SELECT coalesce(nullif(ltrim(substring(coalesce($1,'') FROM '(?i)(?:REQ|REQUISICI[ÓO]N)[^0-9]*0*([0-9]+)'),'0'),''),'0') $$;

CREATE INDEX IF NOT EXISTS idx_requis_envio_oficio ON public.requis_siif
  ((extract(year FROM fecha)),et_privado.siif_oficio(oficio));
CREATE INDEX IF NOT EXISTS idx_requis_envio_numero ON public.requis_siif
  ((extract(year FROM fecha)),et_privado.siif_numero(folio));
CREATE INDEX IF NOT EXISTS idx_sp_envio_referencia ON public.sp_siif
  ((extract(year FROM fecha)),et_privado.siif_oficio(referencia));
CREATE INDEX IF NOT EXISTS idx_sp_envio_descripcion ON public.sp_siif
  ((extract(year FROM fecha)),et_privado.siif_req_descripcion(descripcion));

-- Misma precedencia y exclusión de ambigüedades que la vista 061, sin OC ni JSON agregado.
CREATE OR REPLACE FUNCTION et_privado.sp_de_requisicion(p_id uuid)
RETURNS SETOF public.sp_siif LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  WITH r AS MATERIALIZED (
    SELECT id,extract(year FROM fecha) anio,et_privado.siif_oficio(oficio) oficio,
      et_privado.siif_numero(folio) numero FROM public.requis_siif WHERE id=p_id
  )
  SELECT s.* FROM r JOIN public.sp_siif s
    ON extract(year FROM s.fecha)=r.anio AND et_privado.siif_oficio(s.referencia)=r.oficio
  WHERE r.oficio<>'' AND (SELECT count(*) FROM public.requis_siif q
    WHERE extract(year FROM q.fecha)=r.anio AND et_privado.siif_oficio(q.oficio)=r.oficio)=1
  UNION ALL
  SELECT s.* FROM r JOIN public.sp_siif s
    ON extract(year FROM s.fecha)=r.anio AND et_privado.siif_req_descripcion(s.descripcion)=r.numero
  WHERE r.numero<>'0' AND (SELECT count(*) FROM public.requis_siif q
    WHERE extract(year FROM q.fecha)=r.anio AND et_privado.siif_numero(q.folio)=r.numero)=1
    AND NOT EXISTS (SELECT 1 FROM public.requis_siif q
      WHERE extract(year FROM q.fecha)=r.anio AND et_privado.siif_oficio(q.oficio)<>''
        AND et_privado.siif_oficio(q.oficio)=et_privado.siif_oficio(s.referencia));
$$;

CREATE OR REPLACE FUNCTION et_privado.sp_emitida_editable(p_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT coalesce(bool_or(lower(btrim(estatus)) IN ('emitida','emitido')),false)
    AND NOT coalesce(bool_or(nullif(btrim(estatus),'') IS NOT NULL
      AND lower(btrim(estatus)) NOT IN ('emitida','emitido')),false)
  FROM et_privado.sp_de_requisicion(p_id);
$$;

CREATE OR REPLACE FUNCTION et_privado.proteger_envio_sp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE emitida boolean; enviada boolean;
BEGIN
  SELECT coalesce(bool_or(lower(btrim(estatus)) IN ('emitida','emitido')),false),
    coalesce(bool_or(nullif(btrim(estatus),'') IS NOT NULL AND lower(btrim(estatus)) NOT IN ('emitida','emitido')),false)
  INTO emitida,enviada FROM et_privado.sp_de_requisicion(NEW.requisicion_id);
  IF (NEW.etapa<>10 OR NEW.ubicacion<>'Enviado') AND enviada THEN
    RAISE EXCEPTION 'Este trámite corresponde a Enviado por el estatus de su solicitud de pago. Actualiza el listado.';
  END IF;
  IF NEW.etapa<>10 OR (emitida AND NOT enviada) THEN NEW.automatico_sp:=false; END IF;
  RETURN NEW;
END $$;

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
      string_agg(coalesce(numero_solicitud,id::text,'Sin número'),', ' ORDER BY numero_solicitud)
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

-- Se conserva la reparación explícita de todo el histórico, pero no se ejecuta al importar.
CREATE OR REPLACE FUNCTION et_privado.sincronizar_envios_sp()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT et_privado.sincronizar_envios_sp(array(SELECT id FROM public.requis_siif ORDER BY id));
$$;

CREATE OR REPLACE FUNCTION et_privado.actualizar_envios_sp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE cambios jsonb; ids uuid[];
BEGIN
  IF TG_OP='INSERT' THEN
    SELECT jsonb_agg(to_jsonb(n)) INTO cambios FROM envios_nuevos n;
  ELSIF TG_OP='DELETE' THEN
    SELECT jsonb_agg(to_jsonb(a)) INTO cambios FROM envios_anteriores a;
  ELSIF TG_TABLE_NAME='requis_siif' THEN
    SELECT jsonb_agg(x.fila) INTO cambios FROM envios_nuevos n JOIN envios_anteriores a USING(id)
      CROSS JOIN LATERAL (VALUES(to_jsonb(n)),(to_jsonb(a))) x(fila)
      WHERE (n.fecha,n.folio,n.oficio) IS DISTINCT FROM (a.fecha,a.folio,a.oficio);
  ELSE
    SELECT jsonb_agg(x.fila) INTO cambios FROM envios_nuevos n JOIN envios_anteriores a USING(id)
      CROSS JOIN LATERAL (VALUES(to_jsonb(n)),(to_jsonb(a))) x(fila)
      WHERE (n.fecha,n.referencia,n.descripcion,n.estatus) IS DISTINCT FROM (a.fecha,a.referencia,a.descripcion,a.estatus);
  END IF;
  IF cambios IS NULL THEN RETURN NULL; END IF;
  WITH originales AS MATERIALIZED (
    SELECT DISTINCT extract(year FROM (x->>'fecha')::date) anio,
      et_privado.siif_oficio(CASE WHEN TG_TABLE_NAME='requis_siif' THEN x->>'oficio' ELSE x->>'referencia' END) oficio,
      CASE WHEN TG_TABLE_NAME='requis_siif' THEN et_privado.siif_numero(x->>'folio') ELSE et_privado.siif_req_descripcion(x->>'descripcion') END numero
    FROM jsonb_array_elements(cambios) x
  ), claves AS MATERIALIZED (
    SELECT * FROM originales
    UNION
    -- Cambiar/quitar un oficio puede liberar la coincidencia por descripción de otra requisición.
    SELECT extract(year FROM s.fecha),et_privado.siif_oficio(s.referencia),et_privado.siif_req_descripcion(s.descripcion)
    FROM originales c JOIN public.sp_siif s ON extract(year FROM s.fecha)=c.anio
      AND et_privado.siif_oficio(s.referencia)=c.oficio
    WHERE TG_TABLE_NAME='requis_siif' AND c.oficio<>''
  ), afectadas AS (
    SELECT r.id FROM claves c JOIN public.requis_siif r
      ON extract(year FROM r.fecha)=c.anio AND et_privado.siif_oficio(r.oficio)=c.oficio WHERE c.oficio<>''
    UNION
    SELECT r.id FROM claves c JOIN public.requis_siif r
      ON extract(year FROM r.fecha)=c.anio AND et_privado.siif_numero(r.folio)=c.numero WHERE c.numero<>'0'
  ) SELECT array_agg(a.id ORDER BY a.id) INTO ids FROM afectadas a JOIN public.requis_siif r ON r.id=a.id
    WHERE EXISTS (SELECT 1 FROM public.sp_siif s WHERE extract(year FROM s.fecha)=extract(year FROM r.fecha)
      AND et_privado.siif_oficio(r.oficio)<>'' AND et_privado.siif_oficio(s.referencia)=et_privado.siif_oficio(r.oficio))
      OR EXISTS (SELECT 1 FROM public.sp_siif s WHERE extract(year FROM s.fecha)=extract(year FROM r.fecha)
      AND et_privado.siif_numero(r.folio)<>'0' AND et_privado.siif_req_descripcion(s.descripcion)=et_privado.siif_numero(r.folio));
  IF ids IS NOT NULL THEN PERFORM et_privado.sincronizar_envios_sp(ids); END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS flujo_envios_requisicion ON public.requis_siif;
DROP TRIGGER IF EXISTS flujo_envios_sp ON public.sp_siif;
DO $$ DECLARE tabla text; evento text; referencia text; nombre text;
BEGIN
  FOREACH tabla IN ARRAY ARRAY['requis_siif','sp_siif'] LOOP
    FOREACH evento IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
      nombre:='flujo_envios_'||lower(evento);
      referencia:=CASE evento WHEN 'INSERT' THEN 'NEW TABLE AS envios_nuevos'
        WHEN 'DELETE' THEN 'OLD TABLE AS envios_anteriores'
        ELSE 'OLD TABLE AS envios_anteriores NEW TABLE AS envios_nuevos' END;
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I',nombre,tabla);
      EXECUTE format('CREATE TRIGGER %I AFTER %s ON public.%I REFERENCING %s FOR EACH STATEMENT EXECUTE FUNCTION et_privado.actualizar_envios_sp()',nombre,evento,tabla,referencia);
    END LOOP;
  END LOOP;
END $$;

-- El aviso consulta autoría por usuario/fila. Evitar un barrido de auditoría por cada destinatario.
DO $$ BEGIN
  IF to_regclass('public.auditoria') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_auditoria_autor_avisos ON public.auditoria
      (entidad_tipo,(entidad_id::text),(usuario_id::text)) WHERE metadata->>'operacion'='INSERT';
  END IF;
END $$;
REVOKE ALL ON FUNCTION et_privado.sp_de_requisicion(uuid),et_privado.sincronizar_envios_sp(uuid[]) FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
