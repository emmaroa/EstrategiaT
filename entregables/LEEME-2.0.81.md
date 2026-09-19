# EstrategiaT 2.0.81 — Android

APK de instalación directa, compilación debug firmada con la clave de desarrollo de este equipo. Identificador: `mx.gob.sonora.estrategiat`; versión Android: `20081`.

Incluye el botón directo para copiar peticiones, administración de licencias para emma, respaldo restringido por rol, Auditoría con paginación y contexto de cambios, asignación de Inventario desde Usuarios y eliminación de favoritos/recientes del menú.

Instalar la APK en Android. La actualización sobre una instalación anterior requiere que ambas estén firmadas con la misma clave. No desinstalar la app si Android indica una incompatibilidad de firma; primero revisar la firma de la versión instalada.

## Configuración de servidor

Las migraciones no se ejecutan al instalar la APK. Aplicar únicamente las pendientes en Supabase, en orden:

- 046 y 047: estructura y permisos de Inventario.
- 048 y 049: licencia, propietario y cliente actual (ya reportadas como aplicadas).
- 050 y `supabase/configurar_licencias_emma.sql`: administración de licencias y clave privada de emma.
- 051: respaldo solo para SuperAdmin, Director y Admin activos.
- 052: auditoría automática de nuevos movimientos en las tablas públicas.

Inventario se puede asignar desde Usuarios, pero su operación sigue requiriendo integrar el login con Supabase Auth; la separación operativa de varios clientes sigue pendiente. La descarga del respaldo ZIP se realiza desde el navegador web, según el aviso de la app.

Esta entrega no publica el sitio web ni cambia el DNS. La app necesita conexión a internet para Supabase y las librerías externas.
