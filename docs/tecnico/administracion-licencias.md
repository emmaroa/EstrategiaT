# Administración de licencias de Brote Labs

El módulo `modulos/licencias.html` permite a **emma**, con rol **SuperAdmin** y cuenta activa, registrar clientes, editar vigencias y renovar licencias. Los demás usuarios, incluidos otros SuperAdmin, no tienen acceso. El vencimiento sigue siendo informativo y no bloquea la operación.

## Activación

Las migraciones 048 y 049 ya deben estar aplicadas. Publicar los archivos web de esta versión y ejecutar desde el SQL Editor administrativo de Supabase, en este orden:

1. `supabase/migrations/050_administracion_licencias.sql`.
2. `supabase/configurar_licencias_emma.sql`.

El segundo archivo genera una clave aleatoria, la vincula al identificador real de la cuenta `emma` y devuelve **clave_privada_licencias** una sola vez. Guardarla en un gestor de contraseñas. No compartirla con los clientes ni pegarla en el código. Volver a ejecutar ese archivo no cambia una configuración existente ni devuelve su clave. Si `emma` no existe, no es SuperAdmin activo o hay más de una coincidencia, la configuración falla.

Después, entrar como **emma → Sistema → Licencias** e introducir la clave privada. No es la contraseña de inicio de sesión ni la clave de respaldo.

## Operaciones

- La licencia actual se importa como `ET-HMO-001`, conservando el nombre y el vencimiento aplicados antes de esta migración. Su propietario es Brote Labs.
- **Nueva licencia:** código único, cliente, inicio opcional, vencimiento opcional y notas. Sin vencimiento se muestra «Sin vigencia».
- **Editar:** corrige los datos del registro. Las fechas usan la zona de Hermosillo; el vencimiento incluye todo el día seleccionado.
- **Renovar:** solicita un vencimiento posterior al anterior. El guardado queda registrado en el historial privado con la cuenta y los valores anteriores/nuevos.
- Editar la licencia marcada **Instalación actual** actualiza también `public.licencia_uso` en la misma transacción y refresca el aviso de vigencia. Las licencias de otros clientes no cambian ese aviso.
- Si dos sesiones editan la misma licencia, la segunda debe actualizar antes de guardar, para evitar perder cambios.
- **Bloquear módulo:** elimina la clave y los datos del módulo en memoria. El acceso también se bloquea a los 15 minutos, al cambiar la cuenta o al abandonar la página. La clave nunca se guarda en localStorage/sessionStorage.

## Protección del servidor

El inicio de sesión heredado todavía no ofrece una identidad verificable por Supabase Auth. Por ese motivo, el rol del navegador solo controla la navegación. Cada RPC administrativa verifica además, en el servidor, el identificador de la cuenta propietaria, el nombre `emma`, su rol actual SuperAdmin, su estado activo y el hash de la clave privada.

`et_privado.licencias_administrador`, `et_privado.licencias` y `et_privado.licencias_historial` no son consultables por `anon` o `authenticated`, ni aparecen en el ZIP del esquema `public`. No se agrega una API pública para habilitar propietarios, rotar claves o concederse permisos. No habilitar `et_privado` como esquema de API.

La clave es una credencial de propietario: quien la posea puede usarla junto con el identificador de emma. La protección de este módulo no corrige el acceso heredado del resto del sistema. La migración completa a autenticación y aislamiento multicliente sigue pendiente.

### Recuperar o rotar la clave

Desde SQL administrativo ejecutar la siguiente sentencia. La clave anterior deja de funcionar inmediatamente; guardar el nuevo valor devuelto:

```sql
WITH nueva AS MATERIALIZED (
  SELECT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') AS valor
), actualizada AS (
  UPDATE et_privado.licencias_administrador
  SET clave_sha256 = sha256(convert_to((SELECT valor FROM nueva), 'UTF8'))
  WHERE id RETURNING usuario_id
)
SELECT nueva.valor AS clave_privada_licencias
FROM nueva CROSS JOIN actualizada;
```

## Alcance multicliente

Este módulo es el registro administrativo de licencias por cliente. **No habilita todavía usuarios ni datos operativos para varios clientes**: no agrega `cliente_id` a sus tablas ni implementa aislamiento de datos. El respaldo operativo existente continúa siendo global. No incorporar datos de otro cliente hasta completar ese trabajo.

Una vez aplicada 050, renovar desde este módulo; actualizar solo `public.licencia_uso` mediante SQL dejaría el registro administrativo desincronizado.

## Verificación

`npm.cmd run test:licencias-admin` comprueba permisos, filtros de rol/nombre, fechas, expiración y cambios de cuenta. `npm.cmd run test:licencias-sql` ejecuta las migraciones y pruebas de acceso en PostgreSQL en memoria mediante PGlite, sin conectar a Supabase. Ambas pruebas forman parte de `npm.cmd run verify`.

Validar en producción después del despliegue: acceso de emma con clave, rechazo de otros usuarios y actualización de la vigencia de Hermosillo.
