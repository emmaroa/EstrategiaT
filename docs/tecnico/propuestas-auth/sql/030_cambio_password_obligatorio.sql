-- Los usuarios migrados conservan temporalmente su contrasena actual,
-- pero deben reemplazarla despues de su primer acceso con Supabase Auth.
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS password_change_required BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.confirmar_mi_cambio_password()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesion requerida'; END IF;
  UPDATE public.usuarios
  SET password_change_required = FALSE, password = NULL
  WHERE auth_user_id = auth.uid() AND activo IS TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil activo no encontrado'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.confirmar_mi_cambio_password() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_mi_cambio_password() TO authenticated;
