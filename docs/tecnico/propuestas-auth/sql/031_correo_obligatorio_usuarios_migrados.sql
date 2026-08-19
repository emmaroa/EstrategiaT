-- Permite migrar perfiles sin correo mediante una direccion temporal y obliga
-- a reemplazarla por una direccion real confirmada.
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS email_change_required BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.sincronizar_email_auth_perfil()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email AND NEW.email IS NOT NULL THEN
    UPDATE public.usuarios
    SET email = lower(trim(NEW.email)), email_change_required = FALSE
    WHERE auth_user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sincronizar_email_auth_perfil ON auth.users;
CREATE TRIGGER trg_sincronizar_email_auth_perfil
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sincronizar_email_auth_perfil();

