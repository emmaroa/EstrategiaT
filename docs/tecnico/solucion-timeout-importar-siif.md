# Importar SIIF: error 57014

`canceling statement due to statement timeout` significa que PostgreSQL canceló el guardado al superar el tiempo disponible. La fila `supabase.js:23` solo identifica la llamada HTTP del navegador; no identifica la función SQL que consumió el tiempo.

En el código anterior, cada INSERT/UPDATE de requisiciones ejecutaba `sincronizar_envios_sp()` sobre todo el seguimiento. La corrección de SP emitidas consultaba nuevamente la vista por cada trámite automático, y se bloqueaban filas aunque ya estuvieran sincronizadas. Además, la importación enviaba 20 actualizaciones concurrentes. Son fuentes de trabajo repetido y contención; confirmar los tiempos exactos de producción requiere los registros y planes de esa base.

## Aplicación

1. Publicar los cambios de la versión 2.0.143 del importador: actualizaciones secuenciales, detención ante errores del servidor, detalle de error y conteos de guardados confirmados.
2. Ejecutar íntegramente `supabase/migrations/066_optimizar_importaciones_siif.sql` en **Supabase → SQL Editor** del proyecto de EstrategiaT, después de las migraciones 063 y 064. La migración es transaccional e idempotente. No borra requisiciones, órdenes, solicitudes ni historiales, ni aumenta el timeout.
3. Volver a analizar el CSV para distinguir lo ya guardado de lo pendiente y realizar la importación desde la versión publicada.

La migración añade índices para relaciones por año/oficio/número, reemplaza la sincronización global por lotes de requisiciones afectadas y omite cambios de importes/metadatos que no alteran la relación con SP. Conserva la precedencia por oficio, la exclusión de coincidencias ambiguas, los historiales, responsables, notas y las reglas Emitida/Emitido/Enviado. También indexa la búsqueda de autoría usada por las notificaciones de OC y otros registros.

## Validación local

`node scripts/test-flujo-siif.js` comprueba idempotencia, equivalencia con las relaciones de la vista, cambios de oficio con coincidencia por descripción, conservación del flujo, permisos y 1,937 altas/actualizaciones. Una prueba instrumentada hace fallar cualquier sincronización para demostrar que actualizar importes no la ejecuta.

`node scripts/test-importacion-siif-errores.js` comprueba la interrupción tras el primer 500/401, actualización secuencial y conservación de cabeceras. Las pruebas locales no sustituyen verificar la importación real después de aplicar la migración.
