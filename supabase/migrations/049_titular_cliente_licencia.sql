BEGIN;

-- Identidad del propietario y cliente actual. No altera la vigencia ni la
-- renovación. El aislamiento multicliente se implementará por separado.
UPDATE public.licencia_uso
SET titular = 'Brote Labs',
    cliente = 'Municipio de Hermosillo - Talleres'
WHERE id;

COMMIT;
