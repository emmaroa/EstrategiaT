-- Ejecutar UNA VEZ, después de 050, desde el SQL Editor administrativo.
-- El resultado muestra la clave privada recién generada. Guardarla en un gestor
-- de contraseñas. No enviarla al repositorio ni compartirla con clientes.
-- Si emma no existe, no es SuperAdmin o hay ambigüedad, la operación falla.
-- Si ya se configuró, no cambia la clave y no devuelve filas.
WITH nueva_clave AS MATERIALIZED (
  SELECT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') AS valor
), configuracion AS (
  INSERT INTO et_privado.licencias_administrador (id, usuario_id, clave_sha256)
  SELECT true, (
    SELECT id FROM public.usuarios
    WHERE lower(btrim(usuario)) = 'emma' AND activo IS TRUE
      AND regexp_replace(lower(btrim(rol)), '[ _-]', '', 'g') = 'superadmin'
  ), sha256(convert_to(nueva_clave.valor, 'UTF8'))
  FROM nueva_clave
  ON CONFLICT (id) DO NOTHING
  RETURNING usuario_id
)
SELECT 'emma' AS usuario, nueva_clave.valor AS clave_privada_licencias
FROM nueva_clave CROSS JOIN configuracion;
