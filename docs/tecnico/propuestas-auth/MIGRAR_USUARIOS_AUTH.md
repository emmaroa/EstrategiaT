# Migrar usuarios existentes a Supabase Auth

Este procedimiento conserva temporalmente la contraseÃ±a actual. La cuenta queda
marcada para cambio obligatorio y el valor heredado se elimina de
`public.usuarios` cuando la persona define su contraseÃ±a nueva.

## PreparaciÃ³n

1. Haz un respaldo de `public.usuarios`.
2. Ejecuta las migraciones `028`, `029` y `030` en una ventana de mantenimiento.
   Ejecuta tambiÃ©n `031` para habilitar correos temporales y su sincronizaciÃ³n.
3. En **Authentication > Providers > Email**, desactiva **Secure email change**.
   Como el correo anterior serÃ¡ temporal y no recibe mensajes, la confirmaciÃ³n
   debe enviarse solamente al correo real nuevo. MantÃ©n habilitada la
   confirmaciÃ³n del correo nuevo.
4. Los perfiles sin correo recibirÃ¡n una direcciÃ³n temporal automÃ¡tica. Puedes
   definir el dominio con `TEMP_EMAIL_DOMAIN`; usa de preferencia un subdominio
   reservado de tu organizaciÃ³n.
4. Copia temporalmente la URL y la llave secreta del proyecto a la terminal.
   Nunca uses la llave publicable para este proceso ni guardes la secreta en Git.

```powershell
$env:SUPABASE_URL="https://TU_PROYECTO.supabase.co"
$env:SUPABASE_SECRET_KEY="sb_secret_REEMPLAZAR"
$env:TEMP_EMAIL_DOMAIN="temporal.tu-dominio.mx"
```

## Simular

```powershell
npm.cmd run auth:migrate:check
```

La simulaciÃ³n no modifica datos. Muestra el correo temporal que se generarÃ¡ para
quien no tenga uno. Corrige correos duplicados y usuarios sin contraseÃ±a antes
de continuar.

## Ejecutar

```powershell
npm.cmd run auth:migrate
```

El comando es reanudable: omite perfiles ya vinculados y, si encuentra una
cuenta Auth con el mismo correo, la vincula sin reemplazar su contraseÃ±a.

## Verificar

```sql
SELECT id, usuario, email, auth_user_id,
       password_change_required, email_change_required
FROM public.usuarios
WHERE activo IS TRUE
ORDER BY nombre;
```

No debe haber perfiles activos con `auth_user_id IS NULL`. Los usuarios creados
por la migraciÃ³n deben tener `password_change_required = true`; quienes reciban
correo temporal tambiÃ©n tendrÃ¡n `email_change_required = true`. En el primer
acceso deberÃ¡n registrar y confirmar su correo real, ademÃ¡s de cambiar la
contraseÃ±a. Al cambiarla, el valor heredado de `password` queda nulo.

Al terminar, elimina las variables sensibles de la terminal:

```powershell
Remove-Item Env:SUPABASE_SECRET_KEY
Remove-Item Env:SUPABASE_URL
Remove-Item Env:TEMP_EMAIL_DOMAIN
```
