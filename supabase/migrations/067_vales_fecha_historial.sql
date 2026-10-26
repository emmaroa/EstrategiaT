BEGIN;
CREATE OR REPLACE FUNCTION et_privado.fijar_fecha_vale()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF TG_OP='INSERT' THEN NEW.fecha := (statement_timestamp() AT TIME ZONE 'America/Hermosillo')::date;
  ELSIF NEW.fecha IS DISTINCT FROM OLD.fecha THEN
    RAISE EXCEPTION 'La fecha del vale no se puede modificar' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS et_fijar_fecha_vale ON public.vales;
CREATE TRIGGER et_fijar_fecha_vale BEFORE INSERT OR UPDATE ON public.vales
FOR EACH ROW EXECUTE FUNCTION et_privado.fijar_fecha_vale();
REVOKE ALL ON FUNCTION et_privado.fijar_fecha_vale() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION et_privado.puede_historial_vales(p_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios u
    JOIN et_privado.sesiones_aplicacion s ON s.usuario_id=u.id
    WHERE s.token_hash=sha256(convert_to(p_token,'UTF8')) AND s.expira_en>now() AND u.activo IS TRUE
    AND regexp_replace(translate(lower(u.rol),'áéíóú','aeiou'),'[ _-]','','g')
      IN ('superadmin','admin','administrador','administradordelsistema','jefedealmacen'));
$$;
REVOKE ALL ON FUNCTION et_privado.puede_historial_vales(text) FROM PUBLIC;
GRANT USAGE ON SCHEMA et_privado TO anon,authenticated;
GRANT EXECUTE ON FUNCTION et_privado.puede_historial_vales(text) TO anon,authenticated;
DROP POLICY IF EXISTS vales_historial_restringido ON public.auditoria;
CREATE POLICY vales_historial_restringido ON public.auditoria AS RESTRICTIVE FOR SELECT TO anon,authenticated
USING ((coalesce(entidad_tipo,'') <> 'vales' AND coalesce(modulo,'') <> 'Vales') OR
 et_privado.puede_historial_vales(coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb->>'x-et-session-token'));

CREATE OR REPLACE FUNCTION public.historial_vale(p_token text,p_vale uuid,p_offset integer DEFAULT 0)
RETURNS SETOF public.auditoria LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NOT et_privado.puede_historial_vales(p_token) THEN
    RAISE EXCEPTION 'Sin acceso al historial de vales. Verifica tu rol e inicia sesión nuevamente.' USING ERRCODE='42501';
  END IF;
  RETURN QUERY SELECT a.* FROM public.auditoria a WHERE a.entidad_tipo='vales' AND a.entidad_id=p_vale
    ORDER BY a.created_at DESC,a.id DESC LIMIT 100 OFFSET greatest(coalesce(p_offset,0),0);
END $$;
REVOKE ALL ON FUNCTION public.historial_vale(text,uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.historial_vale(text,uuid,integer) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
