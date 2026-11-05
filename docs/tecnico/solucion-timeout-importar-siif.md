# Importar SIIF: error 57014

`canceling statement due to statement timeout` significa que PostgreSQL canceló el guardado al superar el tiempo disponible. La fila `supabase.js:23` solo identifica la llamada HTTP del navegador; no identifica la función SQL que consumió el tiempo.

En el código anterior, cada INSERT/UPDATE de requisiciones ejecutaba `sincronizar_envios_sp()` sobre todo el seguimiento. La corrección de SP emitidas consultaba nuevamente la vista por cada trámite automático, y se bloqueaban filas aunque ya estuvieran sincronizadas. Además, la importación enviaba 20 actualizaciones concurrentes. Son fuentes de trabajo repetido y contención; confirmar los tiempos exactos de producción requiere los registros y planes de esa base.

## Aplicación

1. Publicar los cambios de la versión 2.0.143 del importador: actualizaciones secuenciales, detención ante errores del servidor, detalle de error y conteos de guardados confirmados.
2. Ejecutar íntegramente `supabase/migrations/066_optimizar_importaciones_siif.sql` en **Supabase → SQL Editor** del proyecto de EstrategiaT, después de las migraciones 063 y 064. La migración es transaccional e idempotente. No borra requisiciones, órdenes, solicitudes ni historiales, ni aumenta el timeout.
3. Volver a analizar el CSV para distinguir lo ya guardado de lo pendiente y realizar la importación desde la versión publicada.

La migración añade índices para relaciones por año/oficio/número, reemplaza la sincronización global por lotes de requisiciones afectadas y omite cambios de importes/metadatos que no alteran la relación con SP. Conserva la precedencia por oficio, la exclusión de coincidencias ambiguas, los historiales, responsables, notas y las reglas Emitida/Emitido/Enviado. También indexa la búsqueda de autoría usada por las notificaciones de OC y otros registros.

## Validación local

### Corrección del 5 de noviembre de 2026

Se cerraron seis historiales en estado `Procesando` mediante
`node scripts/cancelar-importaciones-pendientes.js --apply`, conservando las filas
ya importadas y un respaldo en `imports/cancelacion-siif-*`. Se utiliza `Fallida`
con el detalle `cancelada: true`, compatible con el catálogo de estados actual.
Cerrar el historial por REST no interrumpe por sí solo una pestaña con código antiguo.

El importador ahora omite filas sin cambios, actualiza solo campos modificados,
consulta el estado antes de cada escritura, permite cancelar, bloquea la selección
durante el análisis y la carga, ordena la lectura paginada por ID y rechaza claves
ambiguas en la base. Una actualización solo se cuenta si el servidor devuelve su ID.
Al finalizar o fallar se descarta la vista previa para no reutilizar altas obsoletas.

Para completar la instalación en producción se necesita publicar el importador y
ejecutar, en este orden, `066_optimizar_importaciones_siif.sql` y
`068_cancelar_importaciones_siif.sql` con acceso administrativo a Supabase.
La segunda migración impide nuevas escrituras de cargas cerradas y evita que una
pestaña antigua cambie su estado a Procesada. Una escritura que ya tomó el bloqueo
termina antes del cierre; sus datos se conservan. Las migraciones no se aplican con
la clave pública REST del proyecto. No se ha verificado su instalación en producción.

`node scripts/test-importacion-siif-cancelacion.js` prueba la protección en las
tres tablas, conservación de datos, edición ajena al importador e idempotencia.

`node scripts/test-flujo-siif.js` comprueba idempotencia, equivalencia con las relaciones de la vista, cambios de oficio con coincidencia por descripción, conservación del flujo, permisos y 1,937 altas/actualizaciones. Una prueba instrumentada hace fallar cualquier sincronización para demostrar que actualizar importes no la ejecuta.

`node scripts/test-importacion-siif-errores.js` comprueba la interrupción tras el primer 500/401, actualización secuencial y conservación de cabeceras. Las pruebas locales no sustituyen verificar la importación real después de aplicar la migración.
