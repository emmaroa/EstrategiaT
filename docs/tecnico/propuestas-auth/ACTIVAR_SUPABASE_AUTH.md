# Activar Supabase Auth

La migraciÃ³n `028_auth_y_seguridad_acuerdos.sql` elimina el acceso anÃ³nimo a
Acuerdos, historial y notificaciones. Para no bloquear usuarios, aplÃ­quela y
vincule las cuentas en una misma ventana de mantenimiento.

1. Cree cada cuenta en **Supabase > Authentication > Users**, usando un correo
   real o institucional y una contraseÃ±a temporal.
2. Vincule la cuenta con el perfil funcional:

```sql
UPDATE public.usuarios
SET email = 'persona@organizacion.gob.mx',
    auth_user_id = 'UUID_DE_AUTH_USERS',
    password = NULL
WHERE usuario = 'nombre_usuario';
```

3. Compruebe que todos los perfiles activos, salvo cuentas tÃ©cnicas que no
   inician sesiÃ³n, quedaron vinculados:

```sql
SELECT id, usuario, nombre, rol
FROM public.usuarios
WHERE activo IS TRUE AND auth_user_id IS NULL;
```

4. Cuando el resultado sea vacÃ­o, elimine definitivamente la columna heredada:

```sql
ALTER TABLE public.usuarios DROP COLUMN IF EXISTS password;
```

El acceso admite tanto el correo como el nombre de usuario. La contraseÃ±a ya no
se consulta ni se guarda en `public.usuarios`; Supabase Auth la valida y mantiene
la sesiÃ³n con tokens renovables.
