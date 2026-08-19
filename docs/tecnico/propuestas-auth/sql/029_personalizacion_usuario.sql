-- Preferencias personales del usuario y foto de perfil.
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS dashboard_kpis JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.actualizar_mi_personalizacion(
  p_avatar_url TEXT,
  p_dashboard_kpis JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesion requerida'; END IF;
  IF jsonb_typeof(COALESCE(p_dashboard_kpis, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'La seleccion de KPIs debe ser una lista';
  END IF;
  UPDATE public.usuarios
  SET avatar_url = NULLIF(trim(p_avatar_url), ''),
      dashboard_kpis = COALESCE(p_dashboard_kpis, '[]'::jsonb)
  WHERE auth_user_id = auth.uid() AND activo IS TRUE
  ;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil activo no encontrado'; END IF;
  RETURN;
END;
$$;
REVOKE ALL ON FUNCTION public.actualizar_mi_personalizacion(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.actualizar_mi_personalizacion(TEXT, JSONB) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatares', 'avatares', TRUE, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS avatares_usuario_inserta ON storage.objects;
CREATE POLICY avatares_usuario_inserta ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
DROP POLICY IF EXISTS avatares_usuario_actualiza ON storage.objects;
CREATE POLICY avatares_usuario_actualiza ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::TEXT)
WITH CHECK (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
DROP POLICY IF EXISTS avatares_usuario_elimina ON storage.objects;
CREATE POLICY avatares_usuario_elimina ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
