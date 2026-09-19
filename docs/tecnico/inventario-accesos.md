# Inventario: visibilidad y asignación

En **Usuarios → Editar usuario → Inventario**, asignar **Solo vista** o **Editar**. Guardar y cerrar/iniciar sesión con el usuario afectado para recargar sus permisos.

La ruta directa comprueba el permiso. Solo vista oculta altas, ubicaciones, edición y movimientos y rechaza esas operaciones en el servicio de la interfaz. El lector de códigos y la impresión siguen disponibles para consulta.

## Activación con el login actual

Aplicar 046 y 047 si faltan y después **053_inventario_login_actual.sql**. La 053 elimina el requisito de Supabase Auth para Inventario usando el cliente anon del inicio de sesión actual. También habilita la consulta de categorías y completa la columna de usuario para movimientos en instalaciones creadas con 046.

No es necesario registrar usuarios en Supabase Auth ni solicitarles otro inicio de sesión. La APK 2.0.81 ya es compatible; el cambio se activa en la base de datos.

Los permisos Solo vista/Editar se controlan en la app. El acceso anon a estas tablas y a la función de movimientos no verifica la identidad individual en el servidor; un cliente directo puede acceder sin pasar por la interfaz. La autorización por usuario en la base de datos y el aislamiento multicliente siguen pendientes. Los controles de licencias y respaldo no cambian.
