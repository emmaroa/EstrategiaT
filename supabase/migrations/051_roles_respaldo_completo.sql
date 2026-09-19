BEGIN;

-- Retirar la firma antigua de la API para impedir que evada el control de rol.
ALTER FUNCTION public.respaldo_tablas(text) SET SCHEMA et_privado;
REVOKE ALL ON FUNCTION et_privado.respaldo_tablas(text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.respaldo_tablas(p_clave text, p_usuario_id uuid, p_password text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  -- La aplicación usa credenciales propias: revalidar la cuenta en el servidor,
  -- sin aceptar como autoridad el rol o el identificador del navegador.
  IF p_password IS NULL OR length(p_password) = 0 OR NOT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = p_usuario_id AND u.activo IS TRUE AND u.password = p_password
      AND regexp_replace(lower(btrim(u.rol)), '[ _-]', '', 'g') IN ('superadmin', 'director', 'admin')
  ) THEN
    RAISE EXCEPTION 'Respaldo exclusivo de SuperAdmin, Director y Admin activos. Verifica tus credenciales.'
      USING ERRCODE = '42501';
  END IF;
  RETURN et_privado.respaldo_tablas(p_clave);
END;
$$;
REVOKE ALL ON FUNCTION public.respaldo_tablas(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respaldo_tablas(text, uuid, text) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
