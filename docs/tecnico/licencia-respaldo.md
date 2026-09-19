# Licencia de uso y respaldo CSV

Aplicar `supabase/migrations/048_licencia_respaldo.sql` desde una conexión administrativa de la base de datos. No se modifica la autenticación existente. La licencia es informativa: al vencer se muestra un aviso y se permite seguir trabajando, renovar y respaldar. El panel aparece en las pantallas que cargan el layout compartido.

Aplicar después `supabase/migrations/049_titular_cliente_licencia.sql`, que asigna **Brote Labs** como propietario y **Municipio de Hermosillo - Talleres** como cliente actual. La fecha continúa pendiente, sin inventar una vigencia. Renovar abre WhatsApp al **+52 662 937 9505**. Una solicitud de WhatsApp no cambia por sí misma la fecha: el proveedor debe confirmar la renovación y actualizarla en la base de datos.

El destino previsto es alojar varios clientes en el mismo sistema. Esta asignación identifica la licencia actual; todavía no agrega pertenencia de usuarios/registros ni aislamiento multicliente. El respaldo existente sigue siendo global. Antes de incorporar otro cliente deben implementarse sesiones verificables por servidor, pertenencia a cliente, políticas de acceso por cliente y exportación limitada a sus datos. El nombre del cliente no sustituye esos controles.

Con la migración 050, configurar o renovar desde el [módulo de Licencias de emma](administracion-licencias.md). La clave privada de administración es independiente de la clave de respaldo. El ejemplo siguiente solo corresponde a instalaciones anteriores a 050:

```sql
UPDATE public.licencia_uso SET
  titular = 'Brote Labs',
  cliente = 'Municipio de Hermosillo - Talleres',
  valida_hasta = '2027-01-01 00:00:00-07'::timestamptz
WHERE id;
```

La fecha del ejemplo es ilustrativa. `valida_hasta` es el instante exacto de expiración, exclusivo. El contador usa el reloj del servidor y redondea hacia arriba los días pendientes; al vencer muestra cero. Se actualiza cada minuto y al regresar a la pestaña. Un fallo de conexión se muestra como estado desconocido y no bloquea el trabajo; se conserva el aviso de propiedad de Brote Labs.

## Habilitar el respaldo

Aplicar también `supabase/migrations/051_roles_respaldo_completo.sql`. Solo **SuperAdmin, Director y Admin** activos pueden descargar el ZIP. No se incluyen otros roles como Administrador del Sistema o jefe. El botón se oculta para el resto; el servidor verifica el rol real y la contraseña de la cuenta, además de la clave de respaldo. La firma antigua de la función se retira de la API pública. Es necesario publicar también el cliente web actualizado; no existe una ruta alternativa sin validación de rol.

Generar una clave aleatoria de al menos 32 caracteres (por ejemplo, `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) y entregarla únicamente a quien tenga autorización para descargar todos los datos. Registrar su hash desde SQL administrativo:

```sql
INSERT INTO et_privado.respaldo_config (id, clave_sha256)
VALUES (true, sha256(convert_to('SUSTITUIR_POR_LA_CLAVE_ALEATORIA', 'UTF8')))
ON CONFLICT (id) DO UPDATE SET clave_sha256 = EXCLUDED.clave_sha256;
```

No guardar la clave real en el repositorio. El respaldo requiere esta clave y confirmar la contraseña del usuario en cada solicitud, verificadas por el servidor: no confía en un rol editable de localStorage. Ninguna de las dos se conserva en el navegador. La clave de respaldo debe ser aleatoria, no una contraseña humana. Rotarla reemplazando el hash. Esta protección no corrige las políticas anónimas ni la autenticación heredada de otras tablas del proyecto.

## Alcance y límites

- ZIP estándar sin compresión, con un CSV UTF-8 por tabla del esquema `public`, incluidas tablas vacías con sus encabezados. Descubre las tablas automáticamente, incluidas nuevas tablas y tablas particionadas sin duplicar sus particiones.
- Una única consulta obtiene una instantánea consistente sin paginación ni el límite habitual de 1,000 filas. Un error impide generar el ZIP; no se entrega un archivo parcial como respaldo completo.
- Incluye datos operativos. Excluye contraseñas y columnas de secretos enumeradas en la migración; también quedan fuera esquemas internos, Supabase Auth, Storage, archivos adjuntos, código y estructura SQL. Revisar esa lista si se agregan nuevos campos de credenciales. No equivale a un respaldo de recuperación PostgreSQL.
- Objetos y arreglos se serializan como JSON. Textos que pueden interpretarse como fórmulas reciben un apóstrofo inicial para abrirlos de forma segura en hojas de cálculo; tenerlo en cuenta al reimportar. Los valores NULL se exportan como campos vacíos. Los nombres de tabla usan codificación URL en el nombre del CSV.
- La respuesta y el ZIP se construyen en memoria; bases grandes pueden superar el tiempo límite del servidor o la memoria del navegador. El formato se limita a menos de 4 GB. En tal caso se requiere un exportador de servidor por streaming, sin presentar este intento fallido como respaldo exitoso.
- La descarga se realiza desde el navegador web. En Capacitor se indica abrir el sistema en el navegador, ya que este proyecto todavía no incorpora un puente nativo para guardar archivos ZIP.

Pruebas locales: `node scripts/test-licencia.js` y `npm.cmd run verify`. Verificar después de aplicar la migración: vigencia futura/vencida/sin fecha, clave incorrecta, descarga autorizada, tablas vacías y una tabla con más de 1,000 registros.
