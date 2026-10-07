-- El login normal emite una sesión opaca de 8 horas. Nunca guardar contraseñas.
BEGIN;
CREATE TABLE et_privado.sesiones_aplicacion (
  token_hash bytea PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  expira_en timestamptz NOT NULL
);
ALTER TABLE et_privado.sesiones_aplicacion ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON et_privado.sesiones_aplicacion FROM PUBLIC,anon,authenticated;
CREATE INDEX sesiones_aplicacion_expira_idx ON et_privado.sesiones_aplicacion(expira_en);

CREATE OR REPLACE FUNCTION public.iniciar_sesion_aplicacion(p_usuario text,p_password text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb; token text; expira timestamptz:=now()+interval '8 hours';
BEGIN
  SELECT to_jsonb(t) INTO u FROM public.usuarios t
  WHERE t.usuario=p_usuario AND t.password=p_password AND t.activo IS TRUE AND length(p_password)>0;
  IF u IS NULL THEN RAISE EXCEPTION 'Usuario o contraseña incorrectos, o cuenta inactiva' USING ERRCODE='42501'; END IF;
  token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  DELETE FROM et_privado.sesiones_aplicacion WHERE expira_en<=now();
  INSERT INTO et_privado.sesiones_aplicacion(token_hash,usuario_id,expira_en)
  VALUES(sha256(convert_to(token,'UTF8')),(u->>'id')::uuid,expira);
  RETURN jsonb_build_object('usuario',u-'password','token',token,'expira_en',expira);
END $$;
CREATE OR REPLACE FUNCTION public.cerrar_sesion_aplicacion(p_token text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
  DELETE FROM et_privado.sesiones_aplicacion WHERE token_hash=sha256(convert_to(p_token,'UTF8'))
$$;
REVOKE ALL ON FUNCTION public.iniciar_sesion_aplicacion(text,text),public.cerrar_sesion_aplicacion(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.iniciar_sesion_aplicacion(text,text),public.cerrar_sesion_aplicacion(text) TO anon,authenticated;

DROP FUNCTION public.consultar_flujo_siif(uuid,text,uuid[]);
DROP FUNCTION public.historial_flujo_siif(uuid,text,uuid,bigint);
DROP FUNCTION public.mover_flujo_siif(uuid,text,jsonb,integer,text,text,text,text,text);
DROP FUNCTION et_privado.autorizar_flujo_siif(uuid,text,boolean);
CREATE FUNCTION et_privado.autorizar_flujo_siif(p_usuario uuid,p_token text,p_editar boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb; permisos jsonb; permiso text; rol text;
BEGIN
  SELECT to_jsonb(t) INTO u FROM public.usuarios t
  JOIN et_privado.sesiones_aplicacion s ON s.usuario_id=t.id
  WHERE t.id=p_usuario AND t.activo IS TRUE AND s.expira_en>now()
    AND s.token_hash=sha256(convert_to(p_token,'UTF8'));
  IF u IS NULL THEN RAISE EXCEPTION 'Sesión inválida o expirada. Inicia sesión nuevamente.' USING ERRCODE='42501'; END IF;
  rol:=regexp_replace(lower(u->>'rol'),'[ _-]','','g');
  IF rol='proveedor' THEN RAISE EXCEPTION 'Sin acceso al seguimiento interno' USING ERRCODE='42501'; END IF;
  permisos:=coalesce(u->'modulos_permitidos','[]'::jsonb);
  IF jsonb_typeof(permisos)='string' THEN
    BEGIN permisos:=(permisos #>> '{}')::jsonb;
    EXCEPTION WHEN OTHERS THEN
      SELECT jsonb_agg(btrim(x)) INTO permisos FROM unnest(string_to_array(u->>'modulos_permitidos',',')) x;
    END;
  END IF;
  IF jsonb_typeof(permisos)='array' AND jsonb_array_length(permisos)>0 THEN
    SELECT CASE WHEN jsonb_typeof(x)='string' THEN 'editar'
      ELSE lower(btrim(coalesce(x->>'permiso',x->>'acceso',x->>'nivel','none'))) END INTO permiso
    FROM jsonb_array_elements(permisos) x
    WHERE (CASE WHEN jsonb_typeof(x)='string' THEN btrim(x #>> '{}')
      ELSE btrim(coalesce(x->>'modulo',x->>'nombre',x->>'module')) END)
      IN ('Seguimiento SIIF','Requisiciones')
    ORDER BY CASE WHEN (CASE WHEN jsonb_typeof(x)='string' THEN x #>> '{}' ELSE coalesce(x->>'modulo',x->>'nombre',x->>'module') END)='Seguimiento SIIF' THEN 0 ELSE 1 END
    LIMIT 1;
  ELSIF rol IN ('superadmin','admin','administradordelsistema','jefe','compras','director','coordinador') THEN
    permiso:='editar';
  ELSIF rol IN ('sololectura','consulta') THEN permiso:='ver';
  END IF;
  permiso:=CASE WHEN permiso IN ('vista','view','solo vista') THEN 'ver'
    WHEN permiso IN ('edit','write','modificar') THEN 'editar' ELSE permiso END;
  IF coalesce(permiso,'none') NOT IN ('ver','editar','moderar')
    OR (p_editar AND (permiso<>'editar' OR rol IN ('sololectura','consulta'))) THEN
    RAISE EXCEPTION 'Sin permiso para esta acción en Seguimiento SIIF' USING ERRCODE='42501';
  END IF;
  RETURN coalesce(nullif(u->>'nombre',''),u->>'usuario');
END $$;
REVOKE ALL ON FUNCTION et_privado.autorizar_flujo_siif(uuid,text,boolean) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.consultar_flujo_siif(p_usuario uuid,p_token text,p_ids uuid[])
RETURNS SETOF public.flujo_tramites_siif LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  PERFORM et_privado.autorizar_flujo_siif(p_usuario,p_token,false);
  IF coalesce(cardinality(p_ids),0)>500 THEN RAISE EXCEPTION 'Máximo 500 trámites por consulta'; END IF;
  RETURN QUERY SELECT * FROM public.flujo_tramites_siif WHERE requisicion_id=ANY(p_ids);
END $$;

CREATE OR REPLACE FUNCTION public.historial_flujo_siif(p_usuario uuid,p_token text,p_requisicion uuid,p_antes bigint DEFAULT NULL)
RETURNS SETOF public.flujo_tramites_siif_historial LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  PERFORM et_privado.autorizar_flujo_siif(p_usuario,p_token,false);
  RETURN QUERY SELECT * FROM public.flujo_tramites_siif_historial
  WHERE requisicion_id=p_requisicion AND (p_antes IS NULL OR id<p_antes) ORDER BY id DESC LIMIT 100;
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
  IF p_etapa IN (3,6) AND (p_ubicacion<>'Compras' OR nullif(btrim(p_proveedor),'') IS NULL) THEN
    RAISE EXCEPTION 'La espera del proveedor permanece en Compras; indica el proveedor';
  END IF;
  IF (p_etapa=10) IS DISTINCT FROM (p_ubicacion='Enviado') THEN
    RAISE EXCEPTION 'Enviado corresponde a la etapa de acuse y envío a Oficialía Mayor';
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
REVOKE ALL ON FUNCTION public.consultar_flujo_siif(uuid,text,uuid[]),
  public.historial_flujo_siif(uuid,text,uuid,bigint),
  public.mover_flujo_siif(uuid,text,jsonb,integer,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consultar_flujo_siif(uuid,text,uuid[]),
  public.historial_flujo_siif(uuid,text,uuid,bigint),
  public.mover_flujo_siif(uuid,text,jsonb,integer,text,text,text,text,text) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
