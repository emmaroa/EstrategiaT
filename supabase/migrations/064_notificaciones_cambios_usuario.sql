BEGIN;
CREATE SCHEMA IF NOT EXISTS et_privado;

CREATE OR REPLACE FUNCTION et_privado.lista_avisos(valor jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
BEGIN
  IF jsonb_typeof(valor)='string' THEN
    BEGIN RETURN et_privado.lista_avisos((valor #>> '{}')::jsonb);
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN to_jsonb(string_to_array(valor #>> '{}', ','));
    END;
  END IF;
  RETURN CASE WHEN jsonb_typeof(valor)='array' THEN valor ELSE '[]'::jsonb END;
END $$;

-- Permisos por defecto sincronizados con permissions.js por el generador.
CREATE OR REPLACE FUNCTION et_privado.modulos_avisos(u jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $$
DECLARE permisos jsonb; resultado jsonb; rol text;
BEGIN
  permisos:=et_privado.lista_avisos(coalesce(u->'modulos_permitidos',u->'modulos',u->'permisos_modulos'));
  IF jsonb_array_length(permisos)>0 THEN
    SELECT coalesce(jsonb_agg(CASE WHEN jsonb_typeof(x)='string' THEN btrim(x #>> '{}')
      ELSE coalesce(x->>'modulo',x->>'nombre',x->>'module') END),'[]'::jsonb)
    INTO resultado FROM jsonb_array_elements(permisos) x
    WHERE jsonb_typeof(x)='string' OR lower(coalesce(x->>'permiso',x->>'acceso',x->>'nivel','none'))
      IN ('ver','vista','view','solo vista','moderar','moderador','moderate','editar','edit','write','modificar');
    RETURN resultado;
  END IF;
  rol:=lower(regexp_replace(coalesce(u->>'rol',''),'[ _-]','','g'));
  RETURN coalesce(('{"administradordelsistema":["Buscador Seccional","Reporte MIR","Dashboard","Parque Vehicular","Peticiones","Peticiones de Coordinadores","Crear cotización","Gestión de Cotizaciones","Cotizaciones Proveedor","Seguimiento de trámites SIIF","Seguimiento Peticiones","Seguimiento SIIF","Importar SIIF","Requisiciones SIIF","Órdenes de Compra SIIF","Solicitudes de Pago SIIF","Acuerdos","Calendario","Control de Taller","Vales","Usuarios","Auditoría","Tiempo Extra","Tramites Administrativos","Generar Textos","Portal Proveedor","Peticiones de almacén","Inventario","Compras","Proveedores","Reportes","Notificaciones","Documentos","Inteligencia de Negocio"],"jefe":["Buscador Seccional","Reporte MIR","Dashboard","Parque Vehicular","Peticiones","Peticiones de Coordinadores","Crear cotización","Gestión de Cotizaciones","Cotizaciones Proveedor","Seguimiento de trámites SIIF","Seguimiento Peticiones","Seguimiento SIIF","Importar SIIF","Requisiciones SIIF","Órdenes de Compra SIIF","Solicitudes de Pago SIIF","Acuerdos","Calendario","Control de Taller","Vales","Usuarios","Auditoría","Tiempo Extra","Tramites Administrativos","Generar Textos","Portal Proveedor","Peticiones de almacén","Inventario","Compras","Proveedores","Reportes","Notificaciones","Documentos","Inteligencia de Negocio"],"jefedealmacen":["Dashboard","Peticiones","Peticiones de Coordinadores","Vales","Calendario"],"técnicovales":["Dashboard","Vales","Peticiones","Calendario"],"proveedor":["Portal Proveedor","Peticiones de almacén","Cotizaciones Proveedor","Seguimiento de trámites SIIF"],"moderadordeacuerdos":["Dashboard","Acuerdos","Calendario","Peticiones"],"director":["Dashboard","Parque Vehicular","Peticiones","Seguimiento Peticiones","Seguimiento SIIF","Acuerdos","Vales","Inventario","Compras","Proveedores","Reportes","Notificaciones","Documentos","Inteligencia de Negocio","Tiempo Extra","Tramites Administrativos","Generar Textos","Calendario","Control de Taller"],"coordinador":["Dashboard","Parque Vehicular","Peticiones de Coordinadores","Seguimiento Peticiones","Seguimiento SIIF","Acuerdos","Vales","Inventario","Compras","Reportes","Notificaciones","Tramites Administrativos","Generar Textos","Peticiones","Calendario","Control de Taller"],"encargadodealmacén":["Dashboard","Acuerdos","Peticiones","Vales","Inventario","Notificaciones","Calendario"],"técnico":["Dashboard","Parque Vehicular","Peticiones","Acuerdos","Notificaciones","Tiempo Extra","Calendario"],"sololectura":["Dashboard","Parque Vehicular","Peticiones","Seguimiento SIIF","Vales","Reportes","Tiempo Extra","Tramites Administrativos","Generar Textos","Calendario"],"coordinadorinfraestructura":["Dashboard","Peticiones de Coordinadores","Peticiones","Calendario","Control de Taller"],"capturistaadministrativo":["Dashboard","Tramites Administrativos","Generar Textos","Peticiones","Calendario"],"superadmin":["Buscador Seccional","Reporte MIR","Dashboard","Parque Vehicular","Peticiones","Peticiones de Coordinadores","Crear cotización","Gestión de Cotizaciones","Cotizaciones Proveedor","Seguimiento de trámites SIIF","Seguimiento Peticiones","Seguimiento SIIF","Importar SIIF","Requisiciones SIIF","Órdenes de Compra SIIF","Solicitudes de Pago SIIF","Acuerdos","Calendario","Control de Taller","Vales","Usuarios","Auditoría","Tiempo Extra","Tramites Administrativos","Generar Textos","Portal Proveedor","Peticiones de almacén","Inventario","Compras","Proveedores","Reportes","Notificaciones","Documentos","Inteligencia de Negocio"],"admin":["Dashboard","Parque Vehicular","Peticiones","Gestión de Cotizaciones","Seguimiento Peticiones","Acuerdos","Seguimiento SIIF","Importar SIIF","Requisiciones SIIF","Órdenes de Compra SIIF","Solicitudes de Pago SIIF","Vales","Auditoría","Inventario","Compras","Proveedores","Reportes","Notificaciones","Documentos","Inteligencia de Negocio","Tiempo Extra","Tramites Administrativos","Generar Textos","Calendario","Control de Taller"],"compras":["Crear cotización","Dashboard","Peticiones","Gestión de Cotizaciones","Seguimiento SIIF","Importar SIIF","Requisiciones SIIF","Órdenes de Compra SIIF","Solicitudes de Pago SIIF","Compras","Proveedores","Generar Textos","Parque Vehicular","Calendario"],"almacen":["Dashboard","Peticiones","Vales","Inventario","Parque Vehicular","Calendario"],"consulta":["Dashboard","Parque Vehicular","Peticiones","Seguimiento SIIF","Vales","Reportes","Calendario"],"capturistapv":["Dashboard","Parque Vehicular","Peticiones","Calendario"]}'::jsonb)->rol,'[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION et_privado.afectado_aviso(u jsonb, r jsonb, tabla text, modulos jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $$
DECLARE rol text:=lower(regexp_replace(coalesce(u->>'rol',''),'[ _-]','','g')); directo boolean; permitido boolean;
BEGIN
  IF r IS NULL OR coalesce((u->>'activo')::boolean,false)=false THEN RETURN false; END IF;
  IF tabla='usuarios' THEN RETURN u->>'id'=r->>'id'; END IF;
  permitido:=EXISTS(SELECT 1 FROM jsonb_array_elements_text(modulos) m
    WHERE et_privado.modulos_avisos(u) ? m);
  IF NOT permitido THEN RETURN false; END IF;
  IF tabla='eventos_calendario' THEN
    RETURN rol<>'proveedor' AND (r->>'creado_por'=u->>'id' OR r->>'alcance'='Todos'
      OR (r->>'alcance'='Seleccionados' AND coalesce(r->'destinatarios','[]'::jsonb) ? (u->>'id')));
  END IF;
  IF rol='proveedor' THEN
    RETURN nullif(btrim(r->>'proveedor'),'') IS NOT NULL AND
      (lower(btrim(r->>'proveedor'))=lower(btrim(u->>'proveedor')) OR EXISTS(
        SELECT 1 FROM jsonb_array_elements_text(et_privado.lista_avisos(u->'proveedores_permitidos')) p
        WHERE lower(btrim(p))=lower(btrim(r->>'proveedor'))));
  END IF;
  directo:=EXISTS(SELECT 1 FROM unnest(ARRAY['creado_por','capturado_por','asignado_a','usuario_id','solicitante_id','responsable_id']) k
    WHERE r->>k=u->>'id');
  IF directo THEN RETURN true; END IF;
  -- Las peticiones antiguas registran al creador en la bitácora, no en la fila.
  IF to_regclass('public.auditoria') IS NOT NULL AND r->>'id' IS NOT NULL THEN
    IF EXISTS(SELECT 1 FROM public.auditoria a WHERE a.entidad_id::text=r->>'id'
      AND a.entidad_tipo=tabla AND a.usuario_id::text=u->>'id'
      AND a.metadata->>'operacion'='INSERT') THEN RETURN true; END IF;
  END IF;
  IF rol LIKE 'coordinador%' THEN
    RETURN EXISTS(SELECT 1 FROM jsonb_array_elements_text(et_privado.lista_avisos(u->'areas_permitidas')) area
      WHERE lower(btrim(area))=lower(btrim(coalesce(r->>'area',r->>'grupo',''))))
      OR (rol='coordinadorinfraestructura' AND r->>'dependencia' ILIKE '%Infraestructura%');
  END IF;
  -- Colas operativas: los responsables del módulo reciben sus cambios.
  RETURN rol IN ('superadmin','admin','administradordelsistema','director','compras','almacen','encargadodealmacén','jefedealmacen');
END $$;

CREATE OR REPLACE FUNCTION et_privado.notificar_cambio_usuario()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE antes jsonb; despues jsonb; r jsonb; u record; modulos jsonb:=TG_ARGV[0]::jsonb;
  ruta text:=TG_ARGV[1]; etiqueta text:=TG_ARGV[2]; cambios text; enlace text; titulo text;
  previo boolean; actual boolean; relacionados jsonb:='[]'::jsonb; relacionado jsonb; referencia_id text; ref record;
BEGIN
  IF TG_OP<>'INSERT' THEN antes:=to_jsonb(OLD); END IF;
  IF TG_OP<>'DELETE' THEN despues:=to_jsonb(NEW); END IF;
  -- No avisar por marcas de tiempo o revisiones sin cambio de contenido.
  IF TG_OP='UPDATE' AND (antes-ARRAY['updated_at','actualizado_en','revision'])
    = (despues-ARRAY['updated_at','actualizado_en','revision']) THEN RETURN NEW; END IF;
  r:=coalesce(despues,antes);
  SELECT string_agg(replace(k,'_',' '),', ' ORDER BY k) INTO cambios
  FROM (SELECT key k FROM jsonb_object_keys(coalesce(antes,'{}'::jsonb)||coalesce(despues,'{}'::jsonb)) key
    WHERE coalesce(antes,'{}'::jsonb)->key IS DISTINCT FROM coalesce(despues,'{}'::jsonb)->key
      AND key NOT IN ('updated_at','actualizado_en','revision','password','token','sesion_token')) fields;
  -- Afecta también a los participantes de la petición o requisición vinculada.
  FOR ref IN SELECT * FROM (VALUES ('peticion_id','peticiones'),('requisicion_id','requis_siif'),
      ('acuerdo_id','acuerdos'),('empleado_id','empleados'),('unidad_id','parque_vehicular'),
      ('vehiculo_id','parque_vehicular'),('tecnico_id','tecnicos')) refs(campo,tabla)
  LOOP
    IF to_regclass('public.'||ref.tabla) IS NOT NULL THEN
      FOR referencia_id IN SELECT DISTINCT v->>ref.campo AS id FROM jsonb_array_elements(jsonb_build_array(antes,despues)) v
        WHERE nullif(v->>ref.campo,'') IS NOT NULL
      LOOP
        EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id::text=$1',ref.tabla)
          INTO relacionado USING referencia_id;
        IF relacionado IS NOT NULL THEN relacionados:=relacionados||jsonb_build_array(jsonb_build_object('tabla',ref.tabla,'fila',relacionado)); END IF;
      END LOOP;
    END IF;
  END LOOP;
  titulo:=etiqueta||CASE TG_OP WHEN 'INSERT' THEN ': nuevo registro' WHEN 'DELETE' THEN ': registro eliminado' ELSE ': cambios registrados' END;
  FOR u IN SELECT to_jsonb(t) datos FROM public.usuarios t WHERE t.activo IS TRUE LOOP
    previo:=coalesce(et_privado.afectado_aviso(u.datos,antes,TG_TABLE_NAME,modulos),false);
    actual:=coalesce(et_privado.afectado_aviso(u.datos,despues,TG_TABLE_NAME,modulos),false);
    IF NOT (previo OR actual) AND TG_TABLE_NAME NOT IN ('usuarios','eventos_calendario')
      AND NOT (lower(u.datos->>'rol')='proveedor' AND nullif(btrim(r->>'proveedor'),'') IS NOT NULL) THEN
      actual:=EXISTS(SELECT 1 FROM jsonb_array_elements(relacionados) x WHERE et_privado.afectado_aviso(u.datos,x->'fila',x->>'tabla',modulos));
    END IF;
    IF previo OR actual THEN
      enlace:=CASE WHEN TG_OP='DELETE' OR (previo AND NOT actual) THEN NULL
        WHEN lower(u.datos->>'rol')='proveedor' THEN 'modulos/portal-proveedor.html' ELSE ruta END;
      IF enlace IS NOT NULL AND lower(u.datos->>'rol')='proveedor' THEN
        enlace:=enlace||CASE WHEN TG_TABLE_NAME='cotizaciones_almacen' THEN '?vista=cotizaciones'
          WHEN TG_TABLE_NAME='peticiones' THEN '?vista=peticiones' ELSE '?vista=seguimiento-siif' END;
      END IF;
      IF enlace IS NOT NULL AND TG_TABLE_NAME='usuarios' THEN enlace:='modulos/mi-perfil.html'; END IF;
      IF enlace IS NOT NULL AND TG_TABLE_NAME='eventos_calendario' THEN
        enlace:=ruta||'?evento='||(r->>'id');
      END IF;
      IF enlace IS NOT NULL AND TG_TABLE_NAME='peticiones' AND lower(u.datos->>'rol')<>'proveedor'
        AND NOT (et_privado.modulos_avisos(u.datos) ? 'Peticiones') THEN
        enlace:=CASE WHEN et_privado.modulos_avisos(u.datos) ? 'Peticiones de Coordinadores'
          THEN 'modulos/peticiones-coordinadores.html' ELSE 'modulos/seguimiento-peticiones.html' END;
      END IF;
      INSERT INTO public.notificaciones(usuario_id,tipo,titulo,mensaje,enlace)
      VALUES((u.datos->>'id')::uuid, 'cambio_'||left(TG_TABLE_NAME,43), titulo,
        CASE WHEN previo AND NOT actual AND TG_OP<>'DELETE' THEN 'El registro dejó de estar asignado a ti o a tu área.'
          WHEN TG_TABLE_NAME='usuarios' THEN 'Se modificó tu cuenta. Revisa tus permisos y vuelve a iniciar sesión.'
          ELSE etiqueta||coalesce(' · '||nullif(coalesce(r->>'folio',r->>'numero',r->>'numero_economico',r->>'id'),''),'')||
            CASE WHEN TG_OP='UPDATE' THEN '. Campos modificados: '||coalesce(cambios,'datos del registro')||'.' ELSE '.' END END,
        enlace);
    END IF;
  END LOOP;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

-- Cada evento se persiste en la misma transacción, aunque el destinatario esté desconectado.
DO $$ DECLARE cfg record;
BEGIN
  FOR cfg IN SELECT * FROM (VALUES
    ('usuarios','["Usuarios"]','modulos/usuarios.html','Cuenta de usuario'),
    ('eventos_calendario','["Calendario"]','modulos/calendario.html','Calendario'),
    ('acuerdos','["Acuerdos"]','modulos/acuerdos.html','Ticket'),
    ('acuerdos_historial','["Acuerdos"]','modulos/acuerdos.html','Seguimiento de ticket'),
    ('peticiones','["Peticiones","Peticiones de Coordinadores","Seguimiento Peticiones","Peticiones de almacén"]','modulos/peticiones.html','Petición'),
    ('cotizaciones_almacen','["Gestión de Cotizaciones","Cotizaciones Proveedor"]','modulos/peticiones.html?vista=cotizaciones','Cotización'),
    ('requisiciones','["Seguimiento SIIF","Requisiciones","Seguimiento de trámites SIIF"]','modulos/requisiciones.html','Requisición'),
    ('requis_siif','["Seguimiento SIIF","Requisiciones SIIF","Seguimiento de trámites SIIF"]','modulos/seguimiento-siif.html','Requisición SIIF'),
    ('flujo_tramites_siif','["Seguimiento SIIF"]','modulos/seguimiento-siif.html','Trámite SIIF'),
    ('oc_siif','["Seguimiento SIIF","Órdenes de Compra SIIF","Seguimiento de trámites SIIF"]','modulos/seguimiento-siif.html','Orden de compra'),
    ('sp_siif','["Seguimiento SIIF","Solicitudes de Pago SIIF","Seguimiento de trámites SIIF"]','modulos/seguimiento-siif.html','Solicitud de pago'),
    ('ingresos_taller','["Control de Taller"]','modulos/control-taller.html','Ingreso a taller'),
    ('ingresos_taller_pendientes','["Control de Taller"]','modulos/control-taller.html','Ingreso pendiente'),
    ('parque_vehicular','["Parque Vehicular"]','modulos/parque-vehicular.html','Unidad'),
    ('vales','["Vales"]','modulos/vales.html','Vale'),
    ('inventario','["Inventario"]','modulos/inventario.html','Inventario'),
    ('inventario_movimientos','["Inventario"]','modulos/inventario.html','Movimiento de inventario'),
    ('proveedores','["Proveedores"]','modulos/proveedores.html','Proveedor'),
    ('empleados','["Tiempo Extra","Tramites Administrativos"]','modulos/empleados.html','Empleado'),
    ('periodos_tiempo_extra','["Tiempo Extra"]','modulos/tiempo-extra.html','Periodo de tiempo extra'),
    ('tramites_administrativos','["Tramites Administrativos"]','modulos/tramites-administrativos.html','Trámite administrativo'),
    ('tiempo_extra_empleados','["Tiempo Extra"]','modulos/tiempo-extra.html','Tiempo extra'),
    ('tiempo_extra_detalles','["Tiempo Extra"]','modulos/tiempo-extra.html','Detalle de tiempo extra'),
    ('cotizaciones_xml','["Crear cotización"]','modulos/crear-cotizacion.html','Cotización XML')
  ) t(tabla,modulos,ruta,etiqueta) LOOP
    IF to_regclass('public.'||cfg.tabla) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS et_notificar_cambio_usuario ON public.%I',cfg.tabla);
      EXECUTE format('CREATE TRIGGER et_notificar_cambio_usuario AFTER INSERT OR UPDATE OR DELETE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION et_privado.notificar_cambio_usuario(%L,%L,%L)',cfg.tabla,cfg.modulos,cfg.ruta,cfg.etiqueta);
    END IF;
  END LOOP;
  IF to_regclass('public.acuerdos') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_notificar_acuerdo_asignado ON public.acuerdos;
  END IF;
  IF to_regclass('public.cotizaciones_almacen') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_notificar_cotizacion_requisicion_generada ON public.cotizaciones_almacen;
  END IF;
END $$;
REVOKE ALL ON FUNCTION et_privado.lista_avisos(jsonb),et_privado.modulos_avisos(jsonb),
  et_privado.afectado_aviso(jsonb,jsonb,text,jsonb),et_privado.notificar_cambio_usuario() FROM PUBLIC,anon,authenticated;
CREATE INDEX IF NOT EXISTS idx_notificaciones_bandeja ON public.notificaciones(usuario_id,leida,created_at DESC,id DESC);
NOTIFY pgrst,'reload schema';
COMMIT;
