# Folios de vales

Aplicar `supabase/migrations/054_vales_folio_atomico.sql` antes de publicar `modulos/vales.html`. El formulario muestra «Se asigna al guardar» y usa el folio devuelto por la base de datos. La migración también asigna folios a las altas de clientes anteriores que todavía envían su propio consecutivo.

El contador privado por año se inicializa con el máximo de todos los folios existentes con formato `0001-2026-V`. Un incremento atómico por fila serializa las altas del mismo año; no depende de la cantidad de filas descargadas por el navegador. El año corresponde a America/Hermosillo. El contador no retrocede al eliminar un vale ni al repetir la migración. Los folios existentes no se pueden editar.

No se renumeran duplicados históricos porque pueden corresponder a documentos ya entregados. Para localizarlos sin modificar datos:

```sql
SELECT folio, count(*) AS cantidad
FROM public.vales
GROUP BY folio
HAVING count(*) > 1
ORDER BY folio;
```

Validación local: `node scripts/test-vales-folios.js` ejecuta PostgreSQL aislado y comprueba históricos de más de 1000 filas, altas con y sin folio enviado, edición, eliminación, rollback, reinstalación y consecutivos mayores a 9999.
