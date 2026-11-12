# Módulos explícitos para todas las cuentas — 2.0.167

Publicar el cliente 2.0.167 y aplicar la migración
`076_modulos_permitidos_obligatorios.sql` después de 075. Las cuentas deben volver
a iniciar sesión. El paquete completo incluye la corrección para instalaciones nuevas.

La lista `modulos_permitidos` es obligatoria para todos los roles. Una lista nula,
vacía o ausente no concede módulos. Dashboard también requiere selección.
Las excepciones de acciones no pueden ampliar esa lista ni convertir un módulo
de lectura en editable. Se mantienen los límites de cada rol y de autoría.
Las tablas auxiliares (catálogo de proveedores, perfil propio) conservan su acceso
necesario desde los módulos autorizados, sin conceder módulos adicionales.

Usuarios permite seleccionar Sin acceso, Solo lectura o Lectura y edición por
módulo, y guarda esa lista también en cuentas de permisos versión 2. Al entrar,
se abre el primer módulo autorizado; sin módulos se informa en el login.

La migración no inventa listas a partir del rol ni modifica cuentas. Si ninguna
cuenta activa conserva Usuarios con edición, aborta íntegramente. Antes de aplicar,
asignar ese módulo a la cuenta SuperAdmin que administra accesos desde Usuarios.
Después del cambio, revisar las cuentas sin módulos desde esa cuenta administradora.

Verificado: correspondencia JS/SQL, todos los roles con listas vacías y módulos
excluidos incluso con excepciones true, lectura sin escritura, navegación al primer
módulo y login sin módulos; además reconstrucción de 50 tablas con políticas y RPC.
