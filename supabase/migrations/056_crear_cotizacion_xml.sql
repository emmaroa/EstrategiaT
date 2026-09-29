BEGIN;
CREATE SCHEMA IF NOT EXISTS et_privado;
CREATE SEQUENCE IF NOT EXISTS public.cotizaciones_xml_folio_seq;
REVOKE ALL ON SEQUENCE public.cotizaciones_xml_folio_seq FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS public.cotizaciones_xml (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), folio text NOT NULL UNIQUE,
  proveedor jsonb NOT NULL, receptor jsonb NOT NULL, fecha date NOT NULL, moneda text NOT NULL,
  subtotal numeric(20,2) NOT NULL, descuento numeric(20,2) NOT NULL,
  impuestos numeric(20,2) NOT NULL, retenciones numeric(20,2) NOT NULL, total numeric(20,2) NOT NULL CHECK(total >= 0),
  nota text NOT NULL DEFAULT '', datos jsonb NOT NULL,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id), revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.cotizaciones_xml_conceptos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cotizacion_id uuid NOT NULL REFERENCES public.cotizaciones_xml(id) ON DELETE CASCADE,
  posicion integer NOT NULL, datos jsonb NOT NULL, UNIQUE(cotizacion_id, posicion)
);
CREATE TABLE IF NOT EXISTS public.cotizaciones_xml_origen (
  cotizacion_id uuid PRIMARY KEY REFERENCES public.cotizaciones_xml(id) ON DELETE CASCADE,
  uuid_fiscal text UNIQUE, nombre_archivo text NOT NULL, sha256 text NOT NULL UNIQUE, datos jsonb NOT NULL
);
ALTER TABLE public.cotizaciones_xml ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones_xml_conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones_xml_origen ENABLE ROW LEVEL SECURITY;
-- Ninguna política pública: acceso exclusivamente mediante RPC que revalida credenciales.
REVOKE ALL ON public.cotizaciones_xml, public.cotizaciones_xml_conceptos, public.cotizaciones_xml_origen FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION et_privado.autorizar_cotizacion_xml(p_usuario uuid, p_password text, p_editar boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE u jsonb; permisos jsonb; permiso text; rol text;
BEGIN
  SELECT to_jsonb(t) INTO u FROM public.usuarios t WHERE t.id = p_usuario AND t.activo IS TRUE AND t.password = p_password AND length(p_password) > 0;
  IF u IS NULL THEN RAISE EXCEPTION 'Credenciales inválidas o cuenta inactiva' USING ERRCODE='42501'; END IF;
  rol := regexp_replace(lower(u->>'rol'), '[ _-]', '', 'g');
  IF rol = 'proveedor' THEN RAISE EXCEPTION 'Sin acceso a Crear cotización' USING ERRCODE='42501'; END IF;
  permisos := coalesce(u->'modulos_permitidos', '[]'::jsonb);
  IF jsonb_typeof(permisos) = 'string' THEN
    BEGIN permisos := (permisos #>> '{}')::jsonb;
    EXCEPTION WHEN OTHERS THEN
      SELECT jsonb_agg(btrim(x)) INTO permisos FROM unnest(string_to_array(u->>'modulos_permitidos', ',')) x;
    END;
  END IF;
  IF jsonb_typeof(permisos) = 'array' AND jsonb_array_length(permisos) > 0 THEN
    SELECT CASE WHEN jsonb_typeof(x)='string' THEN 'editar' ELSE lower(btrim(coalesce(x->>'permiso',x->>'acceso',x->>'nivel','none'))) END INTO permiso
      FROM jsonb_array_elements(permisos) x WHERE
      (jsonb_typeof(x)='string' AND btrim(x #>> '{}') = 'Crear cotización') OR btrim(coalesce(x->>'modulo',x->>'nombre',x->>'module')) = 'Crear cotización' LIMIT 1;
  ELSIF rol IN ('superadmin', 'admin', 'administradordelsistema', 'jefe', 'compras') THEN permiso := 'editar';
  END IF;
  permiso := CASE WHEN permiso IN ('vista','view','solo vista') THEN 'ver' WHEN permiso IN ('edit','write','modificar') THEN 'editar' WHEN permiso IN ('moderador','moderate') THEN 'moderar' ELSE permiso END;
  IF coalesce(permiso,'none') NOT IN ('ver','editar','moderar') OR (p_editar AND permiso <> 'editar') THEN
    RAISE EXCEPTION 'Sin permiso para esta acción en Crear cotización' USING ERRCODE='42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION et_privado.autorizar_cotizacion_xml(uuid,text,boolean) FROM PUBLIC, anon, authenticated;

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
CREATE OR REPLACE FUNCTION public.listar_cotizaciones_xml(p_usuario uuid,p_password text,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE resultado jsonb;
BEGIN
  PERFORM et_privado.autorizar_cotizacion_xml(p_usuario,p_password,false);
  SELECT coalesce(jsonb_agg(r.doc ORDER BY r.created_at DESC),'[]'::jsonb) INTO resultado FROM (
    SELECT c.created_at,c.datos || jsonb_build_object('origen',o.datos,'items',(SELECT jsonb_agg(i.datos ORDER BY i.posicion) FROM public.cotizaciones_xml_conceptos i WHERE i.cotizacion_id=c.id)) AS doc
    FROM public.cotizaciones_xml c JOIN public.cotizaciones_xml_origen o ON o.cotizacion_id=c.id ORDER BY c.created_at DESC,c.id LIMIT 50 OFFSET greatest(0,coalesce(p_offset,0))
  ) r;
  RETURN resultado;
END;
$$;
REVOKE ALL ON FUNCTION public.guardar_cotizacion_xml(uuid,text,jsonb), public.listar_cotizaciones_xml(uuid,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guardar_cotizacion_xml(uuid,text,jsonb), public.listar_cotizaciones_xml(uuid,text,integer) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
