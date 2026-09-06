# Archivos CSV para Supabase

Los archivos están delimitados por comas, codificados en UTF-8 y tienen encabezados compatibles con PostgreSQL.

- `01_ingresos_taller_electricas.csv`: 35 registros completos del detalle operativo.
- `01_ingresos_taller_electricas_vinculados.csv`: 33 registros con `vehiculo_id`, preparados para la tabla `ingresos_taller`.
- `05_filas_incompletas_para_revision.csv`: registros del Excel que no tienen los campos mínimos para importarse.
- `06_unidades_sin_coincidencia_parque.csv`: unidades completas que aún no pudieron vincularse al parque vehicular.
- `07_revision_vinculos_parque.csv`: evidencia del UUID y campo utilizado para cada coincidencia.

## Importación

Importa únicamente `01_ingresos_taller_electricas_vinculados.csv` desde **Supabase → Table Editor → Import data from CSV**. La tabla `ingresos_taller` es la única fuente operativa; los reportes por dependencia, taller y modelo se calculan mediante vistas SQL y no deben importarse como tablas independientes.

No importes las filas de `06_unidades_sin_coincidencia_parque.csv` hasta registrar o corregir esas unidades en `parque_vehicular` y volver a ejecutar la vinculación.

La migración `039_reportes_derivados_control_area.sql` crea automáticamente las vistas de reportes.
