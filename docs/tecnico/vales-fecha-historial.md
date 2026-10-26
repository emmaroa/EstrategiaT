# Fecha e historial de vales — 2.0.144

Aplicar `supabase/migrations/067_vales_fecha_historial.sql` completo en SQL Editor de Supabase y publicar el sitio actualizado. Requiere las migraciones de auditoría 006/052 y sesiones 062. La migración se puede ejecutar nuevamente y no modifica fechas históricas.

Las altas toman la fecha del servidor en America/Hermosillo; las ediciones conservan su fecha original. El formulario muestra esa misma zona horaria, bloquea el campo y vuelve a calcular la fecha al guardar. La impresión del alta usa la fecha confirmada por Supabase.

El botón Historial aparece en las acciones y en el detalle del vale. Muestra fecha/hora, autor y cambios anteriores/nuevos; carga 100 movimientos por página. Solo SuperAdmin, Admin (incluido Administrador del Sistema) y Jefe de Almacén pueden acceder. La sesión se valida en el servidor. Si una cuenta antigua no tiene token, debe cerrar e iniciar sesión. La política restringe también la lectura directa de los eventos de Vales en la auditoría central.

Se aprovechan los movimientos existentes de auditoría asociados al ID del vale. Los eventos antiguos sin ID no se pueden vincular de forma fiable y no se reconstruyen. Las nuevas impresiones y acciones manuales incluyen el ID; pueden acompañar al evento automático de base de datos.

Validación: `node scripts/test-vales-historial.js`, además de pruebas de folios, impresión y paginación.
