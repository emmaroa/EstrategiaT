-- La aplicación usa el cliente público de Supabase y controla el acceso
-- funcional desde usuarios/modulos_permitidos. La tabla fue creada sin los
-- privilegios REST necesarios, por lo que PostgREST respondía 42501.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.acuerdos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.acuerdos_historial TO anon, authenticated;

