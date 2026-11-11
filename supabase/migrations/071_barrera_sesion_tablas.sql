-- Requiere 062 y 070. Probar en staging con el inventario real antes de producción.
-- Es una barrera adicional: nunca amplía las políticas existentes.
BEGIN;
DO $$ BEGIN
  IF to_regprocedure('et_privado.rbac_actor()') IS NULL
    OR to_regclass('et_privado.rbac_tablas') IS NULL THEN
    RAISE EXCEPTION 'Instale primero las migraciones 062 y 070';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION et_privado.seguridad_fila(t text,r jsonb,a text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor(); m text; padre jsonb;
BEGIN
  IF u IS NULL THEN RETURN false; END IF;
  -- El trigger rbac_escritura limita los campos propios a contraseña y preferencias.
  IF t='usuarios' AND a='editar' AND r->>'id'=u->>'id' THEN RETURN true; END IF;
  IF t='categorias_inventario' THEN
    RETURN a='ver' AND et_privado.rbac_puede(u,'Inventario','ver');
  END IF;
  IF t='acuerdos_historial' THEN
    SELECT to_jsonb(x) INTO padre FROM public.acuerdos x WHERE x.id::text=r->>'acuerdo_id';
    IF padre IS NULL OR NOT et_privado.rbac_lectura('acuerdos',padre) THEN RETURN false; END IF;
    IF a='ver' THEN RETURN true; END IF;
    -- Historial append-only. La identidad se coteja con la sesión, no con el navegador.
    RETURN a='crear' AND r->>'usuario_id'=u->>'id'
      AND et_privado.rbac_puede(u,'Acuerdos','editar',padre);
  END IF;
  IF t='notificaciones' THEN
    RETURN a IN ('ver','editar') AND r->>'usuario_id'=u->>'id';
  END IF;
  IF t='auditoria' THEN
    RETURN a='ver' AND et_privado.rbac_puede(u,'Auditoría','ver');
  END IF;
  IF t='solicitudes_cancelacion' THEN
    RETURN a='ver' AND (r->>'solicitante_id'=u->>'id'
      OR et_privado.rbac_puede(u,'Cancelaciones','aprobar_cancelacion'));
  END IF;
  IF EXISTS(SELECT 1 FROM et_privado.rbac_tablas WHERE tabla=t) THEN
    IF a='ver' THEN RETURN et_privado.rbac_lectura(t,r); END IF;
    m:=et_privado.rbac_modulo(t,r);
    IF et_privado.rbac_rol(u->>'rol')='proveedor'
      AND NOT coalesce(et_privado.rbac_proveedor_fila(u,t,r),false) THEN RETURN false; END IF;
    RETURN et_privado.rbac_puede(u,m,CASE WHEN t='importaciones_siif' THEN 'importar' ELSE a END,r);
  END IF;
  -- Tablas no clasificadas quedan cerradas hasta revisar su acceso explícitamente.
  RETURN false;
END $$;
REVOKE ALL ON FUNCTION et_privado.seguridad_fila(text,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION et_privado.seguridad_fila(text,jsonb,text) TO anon,authenticated;

DO $$ DECLARE t record; a text; comando text; condicion text; BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
    AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass
      AND d.objid=c.oid AND d.deptype='e') LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t.relname);
    -- TRUNCATE no está sujeto a RLS.
    EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM PUBLIC,anon,authenticated',t.relname);
    FOREACH a IN ARRAY ARRAY['ver','crear','editar','eliminar'] LOOP
      comando:=CASE a WHEN 'ver' THEN 'SELECT' WHEN 'crear' THEN 'INSERT'
        WHEN 'editar' THEN 'UPDATE' ELSE 'DELETE' END;
      condicion:=format('et_privado.seguridad_fila(%L,to_jsonb(%I),%L)',t.relname,t.relname,a);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I','seguridad_'||a,t.relname);
      EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR %s TO anon,authenticated %s',
        'seguridad_'||a,t.relname,comando,
        CASE WHEN a='crear' THEN 'WITH CHECK ('||condicion||')'
          WHEN a='editar' THEN 'USING ('||condicion||') WITH CHECK ('||condicion||')'
          ELSE 'USING ('||condicion||')' END);
    END LOOP;
  END LOOP;
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='et_privado' AND c.relkind IN ('r','p') LOOP
    EXECUTE format('ALTER TABLE et_privado.%I ENABLE ROW LEVEL SECURITY',t.relname);
    EXECUTE format('REVOKE ALL ON et_privado.%I FROM PUBLIC,anon,authenticated',t.relname);
  END LOOP;
END $$;
-- Solo se puede marcar como leída una notificación; ni su texto ni su destinatario.
DO $$ DECLARE c record; BEGIN
 IF to_regclass('public.notificaciones') IS NOT NULL THEN
  REVOKE INSERT,UPDATE,DELETE ON public.notificaciones FROM PUBLIC,anon,authenticated;
  FOR c IN SELECT attname FROM pg_attribute WHERE attrelid='public.notificaciones'::regclass
    AND attnum>0 AND NOT attisdropped LOOP
    EXECUTE format('REVOKE INSERT (%I),UPDATE (%I),REFERENCES (%I) ON public.notificaciones FROM PUBLIC,anon,authenticated',c.attname,c.attname,c.attname);
  END LOOP;
  GRANT SELECT,UPDATE(leida) ON public.notificaciones TO anon,authenticated;
 END IF;
END $$;
-- Las vistas ordinarias deben respetar RLS. El directorio de 070 es una
-- proyección explícita sin contraseñas y valida la sesión en su definición.
DO $$ DECLARE v record; BEGIN
  FOR v IN SELECT c.relname,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('v','m') AND c.relname<>'directorio_usuarios'
    AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass
      AND d.objid=c.oid AND d.deptype='e') LOOP
    IF v.relkind='v' THEN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker=true)',v.relname);
    ELSE
      EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',v.relname);
    END IF;
  END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
