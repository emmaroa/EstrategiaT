-- Autenticacion real, perfiles funcionales y aislamiento del modulo Acuerdos.
-- Antes de activar el nuevo login, cada perfil existente debe tener email y
-- auth_user_id vinculados a una cuenta creada en Supabase Authentication.

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email_normalizado
  ON public.usuarios (lower(email)) WHERE email IS NOT NULL;

CREATE OR REPLACE FUNCTION public.usuario_actual_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.usuarios
  WHERE auth_user_id = auth.uid() AND activo IS TRUE
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.usuario_actual_rol()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT lower(trim(COALESCE(rol, ''))) FROM public.usuarios
  WHERE auth_user_id = auth.uid() AND activo IS TRUE
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.usuario_actual_admin_acuerdos()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(public.usuario_actual_rol() IN (
    'superadmin', 'super admin', 'super_admin', 'admin',
    'administrador del sistema', 'jefe', 'director',
    'moderador de acuerdos', 'moderador acuerdos'
  ), FALSE)
$$;

-- Permite iniciar con nombre de usuario sin exponer el perfil ni su contrasena.
CREATE OR REPLACE FUNCTION public.resolver_email_login(p_usuario TEXT)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT email FROM public.usuarios
  WHERE lower(usuario) = lower(trim(p_usuario)) AND activo IS TRUE
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.resolver_email_login(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.usuario_actual_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.usuario_actual_rol() TO authenticated;
GRANT EXECUTE ON FUNCTION public.usuario_actual_admin_acuerdos() TO authenticated;

ALTER TABLE public.acuerdos
  ADD CONSTRAINT acuerdos_estado_valido
  CHECK (estado IN ('Nuevo', 'Turnado', 'En proceso', 'En revisiÃ³n', 'Concluido')) NOT VALID;

ALTER TABLE public.acuerdos
  ADD CONSTRAINT acuerdos_prioridad_valida
  CHECK (prioridad IN ('Baja', 'Media', 'Alta', 'Urgente')) NOT VALID;

CREATE OR REPLACE FUNCTION public.validar_acuerdo()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE rol_destino TEXT;
BEGIN
  IF NEW.asignado_a IS NOT NULL THEN
    SELECT lower(trim(COALESCE(rol, ''))) INTO rol_destino
    FROM public.usuarios WHERE id = NEW.asignado_a;
    IF rol_destino = 'proveedor' THEN
      RAISE EXCEPTION 'Los acuerdos no pueden turnarse a proveedores';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.estado IS DISTINCT FROM OLD.estado
     AND NOT public.usuario_actual_admin_acuerdos() THEN
    IF NOT (
      (OLD.estado IN ('Nuevo', 'Turnado') AND NEW.estado = 'En proceso') OR
      (OLD.estado = 'En proceso' AND NEW.estado = 'En revisiÃ³n') OR
      (OLD.estado = 'En revisiÃ³n' AND NEW.estado IN ('En proceso', 'Concluido'))
    ) THEN
      RAISE EXCEPTION 'Transicion de estado no permitida: % -> %', OLD.estado, NEW.estado;
    END IF;
  END IF;
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_acuerdo ON public.acuerdos;
CREATE TRIGGER trg_validar_acuerdo BEFORE INSERT OR UPDATE ON public.acuerdos
FOR EACH ROW EXECUTE FUNCTION public.validar_acuerdo();

ALTER TABLE public.acuerdos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acuerdos_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname, tablename FROM pg_policies
           WHERE schemaname = 'public'
             AND tablename IN ('acuerdos', 'acuerdos_historial', 'notificaciones')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

CREATE POLICY acuerdos_consulta ON public.acuerdos FOR SELECT TO authenticated
USING (public.usuario_actual_admin_acuerdos() OR creado_por = public.usuario_actual_id() OR asignado_a = public.usuario_actual_id());
CREATE POLICY acuerdos_alta ON public.acuerdos FOR INSERT TO authenticated
WITH CHECK (creado_por = public.usuario_actual_id() AND NOT EXISTS (
  SELECT 1 FROM public.usuarios u WHERE u.id = asignado_a AND lower(trim(u.rol)) = 'proveedor'
));
CREATE POLICY acuerdos_actualizacion ON public.acuerdos FOR UPDATE TO authenticated
USING (public.usuario_actual_admin_acuerdos() OR creado_por = public.usuario_actual_id() OR asignado_a = public.usuario_actual_id())
WITH CHECK (public.usuario_actual_admin_acuerdos() OR creado_por = public.usuario_actual_id() OR asignado_a = public.usuario_actual_id());
CREATE POLICY acuerdos_baja ON public.acuerdos FOR DELETE TO authenticated
USING (public.usuario_actual_admin_acuerdos());

CREATE POLICY acuerdos_historial_consulta ON public.acuerdos_historial FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.acuerdos a WHERE a.id = acuerdo_id));
CREATE POLICY acuerdos_historial_alta ON public.acuerdos_historial FOR INSERT TO authenticated
WITH CHECK (usuario_id = public.usuario_actual_id() AND EXISTS (SELECT 1 FROM public.acuerdos a WHERE a.id = acuerdo_id));

CREATE POLICY notificaciones_propias_consulta ON public.notificaciones FOR SELECT TO authenticated
USING (usuario_id = public.usuario_actual_id());
CREATE POLICY notificaciones_propias_actualiza ON public.notificaciones FOR UPDATE TO authenticated
USING (usuario_id = public.usuario_actual_id()) WITH CHECK (usuario_id = public.usuario_actual_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.acuerdos TO authenticated;
GRANT SELECT, INSERT ON public.acuerdos_historial TO authenticated;
REVOKE ALL ON public.acuerdos, public.acuerdos_historial, public.notificaciones FROM anon;
GRANT SELECT, UPDATE ON public.notificaciones TO authenticated;

-- El perfil autenticado puede leerse a si mismo. Las politicas administrativas
-- existentes pueden coexistir con esta regla durante la migracion.
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS usuarios_perfil_propio ON public.usuarios;
CREATE POLICY usuarios_perfil_propio ON public.usuarios FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());
DROP POLICY IF EXISTS usuarios_admin_consulta ON public.usuarios;
CREATE POLICY usuarios_admin_consulta ON public.usuarios FOR SELECT TO authenticated
USING (public.usuario_actual_admin_acuerdos());
DROP POLICY IF EXISTS usuarios_admin_alta ON public.usuarios;
CREATE POLICY usuarios_admin_alta ON public.usuarios FOR INSERT TO authenticated
WITH CHECK (public.usuario_actual_admin_acuerdos());
DROP POLICY IF EXISTS usuarios_admin_actualiza ON public.usuarios;
CREATE POLICY usuarios_admin_actualiza ON public.usuarios FOR UPDATE TO authenticated
USING (public.usuario_actual_admin_acuerdos()) WITH CHECK (public.usuario_actual_admin_acuerdos());

CREATE OR REPLACE FUNCTION public.listar_usuarios_turnables_acuerdos()
RETURNS TABLE(id UUID, nombre TEXT, usuario TEXT, rol TEXT, activo BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.id, u.nombre::TEXT, u.usuario::TEXT, u.rol::TEXT, u.activo
  FROM public.usuarios u
  WHERE u.activo IS TRUE AND lower(trim(COALESCE(u.rol, ''))) <> 'proveedor'
  ORDER BY u.nombre
$$;
GRANT EXECUTE ON FUNCTION public.listar_usuarios_turnables_acuerdos() TO authenticated;
