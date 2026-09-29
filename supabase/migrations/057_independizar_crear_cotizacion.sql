BEGIN;
-- Independiza instalaciones que ya aplicaron la migraci?n 056 original.
-- Conserva registros y folios existentes; no consulta ni modifica Gesti?n de Cotizaciones.
CREATE SEQUENCE IF NOT EXISTS public.cotizaciones_xml_folio_seq;
REVOKE ALL ON SEQUENCE public.cotizaciones_xml_folio_seq FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.guardar_cotizacion_xml(p_usuario uuid, p_password text, p_datos jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  v_id uuid := nullif(p_datos->>'id','')::uuid; v_folio text; v_rev integer; v_num bigint;
  c jsonb; t jsonb; importe numeric; descuento numeric; base numeric; tasa numeric; impuesto numeric;
  st numeric := 0; ds numeric := 0; tr numeric := 0; rt numeric := 0; tt numeric;
  valor text; key text;
BEGIN
  PERFORM et_privado.autorizar_cotizacion_xml(p_usuario,p_password,true);
  IF p_datos IS NULL OR octet_length(p_datos::text)>4000000 OR jsonb_typeof(p_datos->'items') IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_datos->'items') NOT BETWEEN 1 AND 1000
     OR coalesce(btrim(p_datos#>>'{emisor,Nombre}'),'')='' OR coalesce(btrim(p_datos#>>'{origen,Moneda}'),'')=''
     OR coalesce(p_datos->>'fecha','') !~ '^\d{4}-\d{2}-\d{2}$' OR length(coalesce(p_datos->>'nota',''))>10000
     OR coalesce(p_datos->>'hash','') !~ '^[a-f0-9]{64}$' OR coalesce(p_datos->>'archivo','')='' THEN
    RAISE EXCEPTION 'Datos obligatorios incompletos o límites excedidos' USING ERRCODE='22023';
  END IF;
  FOR c IN SELECT value FROM jsonb_array_elements(p_datos->'items') LOOP
    FOREACH key IN ARRAY ARRAY['cantidad','precio','descuento'] LOOP
      IF coalesce(c->>key,'') !~ '^\d{1,12}(\.\d{1,6})?$' THEN RAISE EXCEPTION 'Importe o cantidad inválida' USING ERRCODE='22023'; END IF;
    END LOOP;
    IF (c->>'cantidad')::numeric <= 0 OR coalesce(btrim(c->>'descripcion'),'')='' THEN RAISE EXCEPTION 'Concepto inválido' USING ERRCODE='22023'; END IF;
    importe := round((c->>'cantidad')::numeric * (c->>'precio')::numeric,6);
    IF c ? 'importeOriginal' THEN
      IF (c->>'importeOriginal') !~ '^\d{1,12}(\.\d{1,6})?$' THEN RAISE EXCEPTION 'Importe inválido' USING ERRCODE='22023'; END IF;
      importe := (c->>'importeOriginal')::numeric;
    END IF;
    descuento := (c->>'descuento')::numeric;
    IF descuento > importe THEN RAISE EXCEPTION 'Descuento mayor al importe' USING ERRCODE='22023'; END IF;
    st := st + round(importe,2); ds := ds + round(descuento,2);
    IF jsonb_typeof(c->'taxes') IS DISTINCT FROM 'array' OR jsonb_array_length(c->'taxes')>100 THEN RAISE EXCEPTION 'Impuestos inválidos' USING ERRCODE='22023'; END IF;
    FOR t IN SELECT value FROM jsonb_array_elements(c->'taxes') LOOP
      IF coalesce(t->>'tipo','') NOT IN ('Traslado','Retencion') OR coalesce(t->>'factor','') NOT IN ('Tasa','Cuota','Exento') THEN RAISE EXCEPTION 'Tipo de impuesto inválido' USING ERRCODE='22023'; END IF;
      FOREACH key IN ARRAY ARRAY['base','tasa','importe'] LOOP
        valor := t->>key;
        IF coalesce(valor,'') <> '' AND valor !~ '^\d{1,12}(\.\d{1,6})?$' THEN RAISE EXCEPTION 'Impuesto inválido' USING ERRCODE='22023'; END IF;
      END LOOP;
      base := coalesce(nullif(t->>'base','')::numeric,importe-descuento);
      tasa := coalesce(nullif(t->>'tasa','')::numeric,0);
      impuesto := CASE WHEN t->>'factor'='Exento' THEN 0 WHEN coalesce((t->>'manual')::boolean,false) THEN coalesce(nullif(t->>'importe','')::numeric,0) ELSE round(base*tasa,6) END;
      IF t->>'tipo'='Retencion' THEN rt := rt+round(impuesto,2); ELSE tr := tr+round(impuesto,2); END IF;
    END LOOP;
  END LOOP;
  FOREACH key IN ARRAY ARRAY['trasladosExtra','retencionesExtra'] LOOP
    IF coalesce(p_datos->>key,'') !~ '^\d{1,12}(\.\d{1,6})?$' THEN RAISE EXCEPTION 'Ajuste de impuesto inválido' USING ERRCODE='22023'; END IF;
  END LOOP;
  tr := tr + round((p_datos->>'trasladosExtra')::numeric,2); rt := rt + round((p_datos->>'retencionesExtra')::numeric,2);
  tt := st-ds+tr-rt;
  IF tt<0 THEN RAISE EXCEPTION 'Total negativo' USING ERRCODE='22023'; END IF;
  v_folio := nullif(btrim(p_datos->>'folio'),'');
  IF v_id IS NULL THEN
    IF v_folio IS NULL THEN
      LOOP
        v_num := nextval('public.cotizaciones_xml_folio_seq');
        v_folio := 'COT-XML-' || extract(year FROM now() AT TIME ZONE 'America/Hermosillo')::int || '-' || lpad(v_num::text,greatest(4,length(v_num::text)),'0');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.cotizaciones_xml WHERE folio = v_folio);
      END LOOP;
    END IF;
    v_id := gen_random_uuid(); v_rev := 1;
  ELSE
    SELECT revision INTO v_rev FROM public.cotizaciones_xml WHERE id=v_id FOR UPDATE;
    IF v_rev IS NULL OR v_rev IS DISTINCT FROM (p_datos->>'revision')::integer THEN RAISE EXCEPTION 'La cotización cambió. Recarga antes de guardar.' USING ERRCODE='40001'; END IF;
    v_rev := v_rev+1;
  END IF;
  IF v_folio IS NULL OR length(v_folio)>80 OR v_folio ~ '[[:cntrl:]]' THEN RAISE EXCEPTION 'Folio inválido' USING ERRCODE='22023'; END IF;
  p_datos := p_datos || jsonb_build_object('id',v_id,'folio',v_folio,'revision',v_rev);
  INSERT INTO public.cotizaciones_xml(id,folio,proveedor,receptor,fecha,moneda,subtotal,descuento,impuestos,retenciones,total,nota,datos,usuario_id,revision)
    VALUES(v_id,v_folio,p_datos->'emisor',p_datos->'receptor',(p_datos->>'fecha')::date,p_datos#>>'{origen,Moneda}',st,ds,tr,rt,tt,coalesce(p_datos->>'nota',''),p_datos-'items'-'origen',p_usuario,v_rev)
    ON CONFLICT(id) DO UPDATE SET folio=excluded.folio,proveedor=excluded.proveedor,receptor=excluded.receptor,fecha=excluded.fecha,moneda=excluded.moneda,
      subtotal=excluded.subtotal,descuento=excluded.descuento,impuestos=excluded.impuestos,retenciones=excluded.retenciones,total=excluded.total,nota=excluded.nota,datos=excluded.datos,revision=excluded.revision,updated_at=now();
  DELETE FROM public.cotizaciones_xml_conceptos WHERE cotizacion_id=v_id;
  INSERT INTO public.cotizaciones_xml_conceptos(cotizacion_id,posicion,datos) SELECT v_id,ordinality::int,value FROM jsonb_array_elements(p_datos->'items') WITH ORDINALITY;
  INSERT INTO public.cotizaciones_xml_origen(cotizacion_id,uuid_fiscal,nombre_archivo,sha256,datos)
    VALUES(v_id,nullif(upper(btrim(p_datos->>'uuid')),''),p_datos->>'archivo',p_datos->>'hash',p_datos->'origen')
    ON CONFLICT(cotizacion_id) DO UPDATE SET uuid_fiscal=excluded.uuid_fiscal,datos=excluded.datos;
  RETURN p_datos;
END;
$$;
REVOKE ALL ON FUNCTION public.guardar_cotizacion_xml(uuid,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guardar_cotizacion_xml(uuid,text,jsonb) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
