-- EstrategiaT 2.0.161: instalación conjunta, no ejecutar 070/071/072 por separado.
-- Publicar primero el cliente de esta versión y volver a iniciar sesión después.
-- Si falla cualquier sentencia, la transacción completa se revierte.
BEGIN;
SET LOCAL lock_timeout='10s';
DO $$ BEGIN
 IF to_regclass('et_privado.sesiones_aplicacion') IS NULL
 OR to_regprocedure('public.iniciar_sesion_aplicacion(text,text)') IS NULL THEN
  RAISE EXCEPTION 'Falta el login por sesión de la migración 062';
 END IF;
END $$;
-- 070_roles_acciones_cancelaciones
CREATE SCHEMA IF NOT EXISTS et_privado;
CREATE TABLE IF NOT EXISTS et_privado.rbac_respaldo_usuarios AS SELECT id,to_jsonb(u)-'password' datos,now() respaldado_en FROM public.usuarios u;
REVOKE ALL ON et_privado.rbac_respaldo_usuarios FROM PUBLIC,anon,authenticated;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS permisos_version integer NOT NULL DEFAULT 2;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS permisos_excepciones jsonb NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS et_privado.rbac_base(rol text,modulo text,acciones jsonb,PRIMARY KEY(rol,modulo));
INSERT INTO et_privado.rbac_base VALUES
('superadmin','Dashboard','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Buscador Seccional','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Reporte MIR','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Parque Vehicular','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Peticiones','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Peticiones de Coordinadores','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Seguimiento Peticiones','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Gestión de Cotizaciones','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Crear cotización','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Seguimiento SIIF','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Requisiciones SIIF','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Órdenes de Compra SIIF','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Solicitudes de Pago SIIF','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Acuerdos','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Calendario','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Control de Taller','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Inventario','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Vales','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Tiempo Extra','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Tramites Administrativos','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Generar Textos','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Importar SIIF','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Usuarios','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Roles','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Auditoría','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Licencias','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Cancelaciones','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Portal Proveedor','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Peticiones de almacén','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Cotizaciones Proveedor','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('superadmin','Seguimiento de trámites SIIF','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Dashboard','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Buscador Seccional','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Reporte MIR','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Parque Vehicular','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Peticiones','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Peticiones de Coordinadores','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Seguimiento Peticiones','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Gestión de Cotizaciones','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Crear cotización','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Seguimiento SIIF','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Requisiciones SIIF','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Órdenes de Compra SIIF','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Solicitudes de Pago SIIF','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Acuerdos','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Calendario','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Control de Taller','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Inventario','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Vales','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Tiempo Extra','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Tramites Administrativos','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Generar Textos','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Importar SIIF','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Auditoría','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('administradordelsistema','Cancelaciones','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('compras','Dashboard','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('compras','Parque Vehicular','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('compras','Seguimiento SIIF','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('compras','Requisiciones SIIF','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('compras','Órdenes de Compra SIIF','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('compras','Solicitudes de Pago SIIF','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('compras','Peticiones','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion","generar_requisicion"]'::jsonb),
('compras','Gestión de Cotizaciones','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('compras','Crear cotización','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('compras','Generar Textos','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('compras','Importar SIIF','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion","importar"]'::jsonb),
('compras','Cancelaciones','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('jefedealmacen','Dashboard','["ver","exportar","imprimir"]'::jsonb),
('jefedealmacen','Parque Vehicular','["ver","exportar","imprimir"]'::jsonb),
('jefedealmacen','Seguimiento SIIF','["ver","exportar","imprimir"]'::jsonb),
('jefedealmacen','Peticiones','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('jefedealmacen','Vales','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('jefedealmacen','Inventario','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('jefedealmacen','Cancelaciones','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefedealmacen','Peticiones de Coordinadores','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion","autorizar"]'::jsonb),
('almacen','Dashboard','["ver","exportar","imprimir"]'::jsonb),
('almacen','Parque Vehicular','["ver","exportar","imprimir"]'::jsonb),
('almacen','Seguimiento SIIF','["ver","exportar","imprimir"]'::jsonb),
('almacen','Peticiones','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('almacen','Vales','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('almacen','Inventario','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('almacen','Cancelaciones','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('almacen','Gestión de Cotizaciones','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('encargadodealmacen','Dashboard','["ver","exportar","imprimir"]'::jsonb),
('encargadodealmacen','Parque Vehicular','["ver","exportar","imprimir"]'::jsonb),
('encargadodealmacen','Seguimiento SIIF','["ver","exportar","imprimir"]'::jsonb),
('encargadodealmacen','Peticiones','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('encargadodealmacen','Vales','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('encargadodealmacen','Inventario','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('encargadodealmacen','Cancelaciones','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('coordinador','Dashboard','["ver","exportar","imprimir"]'::jsonb),
('coordinador','Parque Vehicular','["ver","exportar","imprimir"]'::jsonb),
('coordinador','Peticiones','["ver","exportar","imprimir"]'::jsonb),
('coordinador','Seguimiento Peticiones','["ver","exportar","imprimir"]'::jsonb),
('coordinador','Peticiones de Coordinadores','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('coordinador','Control de Taller','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('coordinador','Calendario','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('coordinador','Cancelaciones','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('coordinadorinfraestructura','Dashboard','["ver","exportar","imprimir"]'::jsonb),
('coordinadorinfraestructura','Peticiones','["ver","exportar","imprimir"]'::jsonb),
('coordinadorinfraestructura','Peticiones de Coordinadores','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('coordinadorinfraestructura','Cancelaciones','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('tecnico','Dashboard','["ver","exportar","imprimir"]'::jsonb),
('tecnico','Buscador Seccional','["ver","exportar","imprimir"]'::jsonb),
('tecnico','Reporte MIR','["ver","exportar","imprimir"]'::jsonb),
('tecnico','Parque Vehicular','["ver","exportar","imprimir"]'::jsonb),
('tecnico','Peticiones','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('tecnico','Peticiones de Coordinadores','["ver","exportar","imprimir"]'::jsonb),
('tecnico','Seguimiento Peticiones','["ver","exportar","imprimir"]'::jsonb),
('tecnico','Gestión de Cotizaciones','["ver","exportar","imprimir"]'::jsonb),
('tecnico','Crear cotización','["ver","exportar","imprimir"]'::jsonb),
('tecnico','Seguimiento SIIF','["ver","exportar","imprimir"]'::jsonb),
('tecnico','Requisiciones SIIF','["ver","exportar","imprimir"]'::jsonb),
('tecnico','Órdenes de Compra SIIF','["ver","exportar","imprimir"]'::jsonb),
('tecnico','Solicitudes de Pago SIIF','["ver","exportar","imprimir"]'::jsonb),
('tecnico','Acuerdos','["ver","exportar","imprimir"]'::jsonb),
('tecnico','Calendario','["ver","exportar","imprimir"]'::jsonb),
('tecnico','Control de Taller','["ver","exportar","imprimir"]'::jsonb),
('tecnico','Inventario','["ver","exportar","imprimir"]'::jsonb),
('tecnico','Vales','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('tecnico','Tiempo Extra','["ver","exportar","imprimir"]'::jsonb),
('tecnico','Tramites Administrativos','["ver","exportar","imprimir"]'::jsonb),
('tecnico','Generar Textos','["ver","exportar","imprimir"]'::jsonb),
('tecnico','Cancelaciones','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('capturistaadministrativo','Dashboard','["ver","exportar","imprimir"]'::jsonb),
('capturistaadministrativo','Parque Vehicular','["ver","exportar","imprimir"]'::jsonb),
('capturistaadministrativo','Peticiones','["ver","exportar","imprimir"]'::jsonb),
('capturistaadministrativo','Seguimiento Peticiones','["ver","exportar","imprimir"]'::jsonb),
('capturistaadministrativo','Tramites Administrativos','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('capturistaadministrativo','Tiempo Extra','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('capturistaadministrativo','Generar Textos','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('capturistaadministrativo','Cancelaciones','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('proveedor','Portal Proveedor','["ver","exportar","imprimir"]'::jsonb),
('proveedor','Peticiones de almacén','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('proveedor','Cotizaciones Proveedor','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('proveedor','Seguimiento de trámites SIIF','["ver","exportar","imprimir"]'::jsonb),
('consulta','Dashboard','["ver","exportar","imprimir"]'::jsonb),
('consulta','Buscador Seccional','["ver","exportar","imprimir"]'::jsonb),
('consulta','Reporte MIR','["ver","exportar","imprimir"]'::jsonb),
('consulta','Parque Vehicular','["ver","exportar","imprimir"]'::jsonb),
('consulta','Peticiones','["ver","exportar","imprimir"]'::jsonb),
('consulta','Peticiones de Coordinadores','["ver","exportar","imprimir"]'::jsonb),
('consulta','Seguimiento Peticiones','["ver","exportar","imprimir"]'::jsonb),
('consulta','Gestión de Cotizaciones','["ver","exportar","imprimir"]'::jsonb),
('consulta','Crear cotización','["ver","exportar","imprimir"]'::jsonb),
('consulta','Seguimiento SIIF','["ver","exportar","imprimir"]'::jsonb),
('consulta','Requisiciones SIIF','["ver","exportar","imprimir"]'::jsonb),
('consulta','Órdenes de Compra SIIF','["ver","exportar","imprimir"]'::jsonb),
('consulta','Solicitudes de Pago SIIF','["ver","exportar","imprimir"]'::jsonb),
('consulta','Acuerdos','["ver","exportar","imprimir"]'::jsonb),
('consulta','Calendario','["ver","exportar","imprimir"]'::jsonb),
('consulta','Control de Taller','["ver","exportar","imprimir"]'::jsonb),
('consulta','Inventario','["ver","exportar","imprimir"]'::jsonb),
('consulta','Vales','["ver","exportar","imprimir"]'::jsonb),
('consulta','Tiempo Extra','["ver","exportar","imprimir"]'::jsonb),
('consulta','Tramites Administrativos','["ver","exportar","imprimir"]'::jsonb),
('consulta','Generar Textos','["ver","exportar","imprimir"]'::jsonb),
('sololectura','Dashboard','["ver","exportar","imprimir"]'::jsonb),
('sololectura','Buscador Seccional','["ver","exportar","imprimir"]'::jsonb),
('sololectura','Reporte MIR','["ver","exportar","imprimir"]'::jsonb),
('sololectura','Parque Vehicular','["ver","exportar","imprimir"]'::jsonb),
('sololectura','Peticiones','["ver","exportar","imprimir"]'::jsonb),
('sololectura','Peticiones de Coordinadores','["ver","exportar","imprimir"]'::jsonb),
('sololectura','Seguimiento Peticiones','["ver","exportar","imprimir"]'::jsonb),
('sololectura','Gestión de Cotizaciones','["ver","exportar","imprimir"]'::jsonb),
('sololectura','Crear cotización','["ver","exportar","imprimir"]'::jsonb),
('sololectura','Seguimiento SIIF','["ver","exportar","imprimir"]'::jsonb),
('sololectura','Requisiciones SIIF','["ver","exportar","imprimir"]'::jsonb),
('sololectura','Órdenes de Compra SIIF','["ver","exportar","imprimir"]'::jsonb),
('sololectura','Solicitudes de Pago SIIF','["ver","exportar","imprimir"]'::jsonb),
('sololectura','Acuerdos','["ver","exportar","imprimir"]'::jsonb),
('sololectura','Calendario','["ver","exportar","imprimir"]'::jsonb),
('sololectura','Control de Taller','["ver","exportar","imprimir"]'::jsonb),
('sololectura','Inventario','["ver","exportar","imprimir"]'::jsonb),
('sololectura','Vales','["ver","exportar","imprimir"]'::jsonb),
('sololectura','Tiempo Extra','["ver","exportar","imprimir"]'::jsonb),
('sololectura','Tramites Administrativos','["ver","exportar","imprimir"]'::jsonb),
('sololectura','Generar Textos','["ver","exportar","imprimir"]'::jsonb),
('director','Dashboard','["ver","exportar","imprimir"]'::jsonb),
('director','Buscador Seccional','["ver","exportar","imprimir"]'::jsonb),
('director','Reporte MIR','["ver","exportar","imprimir"]'::jsonb),
('director','Parque Vehicular','["ver","exportar","imprimir"]'::jsonb),
('director','Peticiones','["ver","exportar","imprimir"]'::jsonb),
('director','Peticiones de Coordinadores','["ver","exportar","imprimir"]'::jsonb),
('director','Seguimiento Peticiones','["ver","exportar","imprimir"]'::jsonb),
('director','Gestión de Cotizaciones','["ver","exportar","imprimir"]'::jsonb),
('director','Crear cotización','["ver","exportar","imprimir"]'::jsonb),
('director','Seguimiento SIIF','["ver","exportar","imprimir"]'::jsonb),
('director','Requisiciones SIIF','["ver","exportar","imprimir"]'::jsonb),
('director','Órdenes de Compra SIIF','["ver","exportar","imprimir"]'::jsonb),
('director','Solicitudes de Pago SIIF','["ver","exportar","imprimir"]'::jsonb),
('director','Acuerdos','["ver","exportar","imprimir"]'::jsonb),
('director','Calendario','["ver","exportar","imprimir"]'::jsonb),
('director','Control de Taller','["ver","exportar","imprimir"]'::jsonb),
('director','Inventario','["ver","exportar","imprimir"]'::jsonb),
('director','Vales','["ver","exportar","imprimir"]'::jsonb),
('director','Tiempo Extra','["ver","exportar","imprimir"]'::jsonb),
('director','Tramites Administrativos','["ver","exportar","imprimir"]'::jsonb),
('director','Generar Textos','["ver","exportar","imprimir"]'::jsonb),
('capturistapv','Dashboard','["ver","exportar","imprimir"]'::jsonb),
('capturistapv','Parque Vehicular','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('capturistapv','Cancelaciones','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('tecnicovales','Dashboard','["ver","exportar","imprimir"]'::jsonb),
('tecnicovales','Vales','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('tecnicovales','Cancelaciones','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('moderadordeacuerdos','Dashboard','["ver","exportar","imprimir"]'::jsonb),
('moderadordeacuerdos','Acuerdos','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('moderadordeacuerdos','Calendario','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('moderadordeacuerdos','Cancelaciones','["ver","exportar","imprimir","crear","editar","cambiar_estatus","solicitar_cancelacion"]'::jsonb),
('admin','Dashboard','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Buscador Seccional','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Reporte MIR','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Parque Vehicular','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Peticiones','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Peticiones de Coordinadores','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Seguimiento Peticiones','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Gestión de Cotizaciones','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Crear cotización','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Seguimiento SIIF','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Requisiciones SIIF','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Órdenes de Compra SIIF','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Solicitudes de Pago SIIF','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Acuerdos','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Calendario','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Control de Taller','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Inventario','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Vales','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Tiempo Extra','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Tramites Administrativos','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Generar Textos','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Importar SIIF','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Auditoría','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('admin','Cancelaciones','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Dashboard','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Buscador Seccional','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Reporte MIR','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Parque Vehicular','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Peticiones','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Peticiones de Coordinadores','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Seguimiento Peticiones','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Gestión de Cotizaciones','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Crear cotización','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Seguimiento SIIF','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Requisiciones SIIF','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Órdenes de Compra SIIF','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Solicitudes de Pago SIIF','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Acuerdos','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Calendario','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Control de Taller','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Inventario','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Vales','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Tiempo Extra','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Tramites Administrativos','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Generar Textos','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Importar SIIF','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Auditoría','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb),
('jefe','Cancelaciones','["ver","crear","editar","eliminar","cambiar_estatus","autorizar","importar","generar_requisicion","exportar","imprimir","solicitar_cancelacion","aprobar_cancelacion"]'::jsonb)
ON CONFLICT(rol,modulo) DO UPDATE SET acciones=excluded.acciones
WHERE to_regclass('et_privado.roles') IS NULL;
CREATE TABLE IF NOT EXISTS et_privado.rbac_tablas(tabla text PRIMARY KEY,modulo text NOT NULL);
INSERT INTO et_privado.rbac_tablas VALUES
('parque_vehicular','Parque Vehicular'),
('peticiones','Peticiones'),
('cotizaciones_almacen','Gestión de Cotizaciones'),
('requis_siif','Requisiciones SIIF'),
('oc_siif','Órdenes de Compra SIIF'),
('sp_siif','Solicitudes de Pago SIIF'),
('importaciones_siif','Importar SIIF'),
('acuerdos','Acuerdos'),
('eventos_calendario','Calendario'),
('ingresos_taller','Control de Taller'),
('ingresos_taller_pendientes','Control de Taller'),
('inventario','Inventario'),
('inventario_movimientos','Inventario'),
('vales','Vales'),
('tramites_administrativos','Tramites Administrativos'),
('empleados','Tiempo Extra'),
('periodos_tiempo_extra','Tiempo Extra'),
('tiempo_extra_empleados','Tiempo Extra'),
('tiempo_extra_detalles','Tiempo Extra'),
('usuarios','Usuarios'),
('ordenes_trabajo','Control de Taller'),
('proveedores','Gestión de Cotizaciones'),
('ubicaciones_inventario','Inventario'),
('feriados_administrativos','Tramites Administrativos'),
('requisiciones_siif','Requisiciones SIIF'),
('flujo_tramites_siif','Seguimiento SIIF')
ON CONFLICT(tabla) DO UPDATE SET modulo=excluded.modulo;
REVOKE ALL ON et_privado.rbac_base,et_privado.rbac_tablas FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION et_privado.rbac_rol(text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
 SELECT regexp_replace(lower(translate(coalesce($1,''),'áéíóúÁÉÍÓÚ','aeiouAEIOU')),'[ _-]','','g')
$$;
CREATE OR REPLACE FUNCTION et_privado.rbac_actor() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT to_jsonb(u)-'password' FROM public.usuarios u JOIN et_privado.sesiones_aplicacion s ON s.usuario_id=u.id
 WHERE s.token_hash=sha256(convert_to(coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb->>'x-et-session-token','UTF8'))
 AND s.expira_en>now() AND u.activo IS TRUE LIMIT 1
$$;
CREATE OR REPLACE FUNCTION public.obtener_perfil_acceso() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT et_privado.rbac_actor() $$;
REVOKE ALL ON FUNCTION public.obtener_perfil_acceso() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_perfil_acceso() TO anon,authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='usuarios' AND column_name='nombre') THEN
  EXECUTE 'CREATE OR REPLACE VIEW public.directorio_usuarios WITH (security_barrier=true) AS SELECT id,nombre,usuario,rol,activo FROM public.usuarios WHERE activo IS TRUE AND et_privado.rbac_actor() IS NOT NULL';
  GRANT SELECT ON public.directorio_usuarios TO anon,authenticated;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION et_privado.limite_modulos_anterior(u jsonb,m text,a text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
DECLARE lista jsonb:=u->'modulos_permitidos'; x jsonb; nombre text; nivel text; edita boolean;
BEGIN
 IF jsonb_typeof(lista)='string' THEN
  BEGIN lista:=(lista #>> '{}')::jsonb;
  EXCEPTION WHEN OTHERS THEN SELECT jsonb_agg(btrim(v)) INTO lista FROM unnest(string_to_array(u->>'modulos_permitidos',',')) v WHERE btrim(v)<>'';
  END;
 END IF;
 IF jsonb_typeof(lista) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 IF jsonb_array_length(lista)=0 THEN RETURN false; END IF;
 FOR x IN SELECT value FROM jsonb_array_elements(lista) LOOP
  nombre:=btrim(CASE WHEN jsonb_typeof(x)='string' THEN x #>> '{}' ELSE coalesce(x->>'modulo',x->>'nombre',x->>'module','') END);
  IF nombre='Requisiciones' THEN nombre:='Seguimiento SIIF'; END IF;
  IF nombre IS DISTINCT FROM m THEN CONTINUE; END IF;
  nivel:=CASE WHEN jsonb_typeof(x)='string' THEN 'editar' ELSE lower(btrim(coalesce(x->>'permiso',x->>'acceso',x->>'nivel',''))) END;
  edita:=nivel IN ('editar','edit','write','modificar');
  IF (a IN ('ver','exportar','imprimir') AND (edita OR nivel IN ('ver','vista','view','solo vista','moderar','moderador','moderate')))
    OR (a NOT IN ('ver','exportar','imprimir') AND edita) THEN RETURN true; END IF;
 END LOOP;
 RETURN false;
END $$;
REVOKE ALL ON FUNCTION et_privado.limite_modulos_anterior(jsonb,text,text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION et_privado.rbac_puede(u jsonb,m text,a text,r jsonb DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE rol text:=et_privado.rbac_rol(u->>'rol'); permisos jsonb; ex jsonb; permitido boolean; visible boolean;
BEGIN
 IF u IS NULL OR coalesce((u->>'activo')::boolean,false)=false THEN RETURN false; END IF;
 IF m='Roles' THEN RETURN rol='superadmin'; END IF;
 IF NOT et_privado.limite_modulos_anterior(u,m,'ver') OR NOT et_privado.limite_modulos_anterior(u,m,a) THEN RETURN false; END IF;
 IF m='Usuarios' AND rol<>'superadmin' THEN RETURN false; END IF;
 IF m='Licencias' AND (rol<>'superadmin' OR lower(u->>'usuario')<>'emma') THEN RETURN false; END IF;
 IF a='eliminar' AND rol NOT IN ('superadmin','administradordelsistema') THEN RETURN false; END IF;
 IF a='aprobar_cancelacion' AND rol NOT IN ('superadmin','administradordelsistema','jefedealmacen') THEN RETURN false; END IF;
 SELECT b.acciones INTO permisos FROM et_privado.rbac_base b WHERE b.rol=et_privado.rbac_rol(u->>'rol') AND b.modulo=m;
 ex:=u->'permisos_excepciones'->m;
 visible:=CASE WHEN jsonb_typeof(ex->'ver')='boolean' THEN (ex->>'ver')::boolean ELSE coalesce(permisos ? 'ver',false) AND et_privado.limite_modulos_anterior(u,m,'ver') END;
 permitido:=CASE WHEN jsonb_typeof(ex->a)='boolean' THEN (ex->>a)::boolean ELSE coalesce(permisos ? a,false) AND et_privado.limite_modulos_anterior(u,m,a) END;
 IF NOT visible OR NOT permitido THEN RETURN false; END IF;
 IF r IS NOT NULL AND a IN ('editar','cambiar_estatus','autorizar','solicitar_cancelacion') AND rol IN ('coordinador','coordinadorinfraestructura','tecnico') THEN
   RETURN coalesce(nullif(coalesce(r->>'rbac_creado_por',r->>'creado_por',r->>'creada_por_id',r->>'usuario_id',r->>'solicitante_id'),'')=u->>'id',false);
 END IF;
 RETURN true;
END $$;
CREATE OR REPLACE FUNCTION et_privado.rbac_modulo(t text,r jsonb) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT CASE WHEN et_privado.rbac_rol(et_privado.rbac_actor()->>'rol')='proveedor' AND t='peticiones' THEN 'Peticiones de almacén'
 WHEN et_privado.rbac_rol(et_privado.rbac_actor()->>'rol')='proveedor' AND t='cotizaciones_almacen' THEN 'Cotizaciones Proveedor'
 WHEN et_privado.rbac_rol(et_privado.rbac_actor()->>'rol')='proveedor' AND t IN ('requis_siif','oc_siif','sp_siif') THEN 'Seguimiento de trámites SIIF'
 WHEN t='peticiones' AND r->>'origen_peticion'='coordinador' THEN 'Peticiones de Coordinadores' ELSE modulo END FROM et_privado.rbac_tablas WHERE tabla=t
$$;
CREATE OR REPLACE FUNCTION et_privado.rbac_proveedor(u jsonb,r jsonb) RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(u->'proveedores_permitidos')='array' THEN u->'proveedores_permitidos' ELSE '[]'::jsonb END || jsonb_build_array(u->>'proveedor')) p
 WHERE nullif(btrim(p),'') IS NOT NULL AND et_privado.rbac_rol(p) IN (et_privado.rbac_rol(r->>'proveedor'),et_privado.rbac_rol(r->>'beneficiario')))
$$;
CREATE OR REPLACE FUNCTION et_privado.rbac_lectura(t text,r jsonb) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor(); m text:=et_privado.rbac_modulo(t,r);
BEGIN
 IF u IS NULL THEN RETURN false; END IF;
 IF t='usuarios' THEN RETURN et_privado.rbac_rol(u->>'rol')='superadmin' OR r->>'id'=u->>'id'; END IF;
 IF et_privado.rbac_rol(u->>'rol')='proveedor' AND NOT coalesce(et_privado.rbac_proveedor_fila(u,t,r),false) THEN RETURN false; END IF;
 IF et_privado.rbac_rol(u->>'rol')='proveedor' AND t='parque_vehicular' THEN RETURN true; END IF;
 RETURN coalesce(et_privado.rbac_puede(u,m,'ver',r),false);
END $$;
CREATE OR REPLACE FUNCTION et_privado.rbac_proveedor_fila(u jsonb,t text,r jsonb) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE permitido boolean:=false;
BEGIN
 IF et_privado.rbac_proveedor(u,r) THEN RETURN true; END IF;
 IF t='sp_siif' AND nullif(r->>'beneficiario','') IS NOT NULL THEN
   RETURN et_privado.rbac_proveedor(u,jsonb_build_object('proveedor',regexp_replace(r->>'beneficiario','^[^-]+ - ','')));
 END IF;
 IF t='requis_siif' AND to_regclass('public.oc_siif') IS NOT NULL THEN
  EXECUTE $q$SELECT EXISTS(SELECT 1 FROM public.oc_siif o WHERE et_privado.rbac_proveedor($1,to_jsonb(o))
   AND left(o.fecha::text,4)=left($2->>'fecha',4)
   AND ((nullif($2->>'oficio','') IS NOT NULL AND upper(btrim(o.oficio_requisicion))=upper(btrim($2->>'oficio')))
   OR (nullif(btrim(o.oficio_requisicion),'') IS NULL AND ltrim(o.numero_requisicion::text,'0')=ltrim($2->>'folio','0'))))$q$ INTO permitido USING u,r;
 ELSIF t='parque_vehicular' AND to_regclass('public.cotizaciones_almacen') IS NOT NULL THEN
  EXECUTE $q$SELECT EXISTS(SELECT 1 FROM public.cotizaciones_almacen c WHERE et_privado.rbac_proveedor($1,to_jsonb(c))
   AND nullif(c.unidad,'') IS NOT NULL AND c.unidad IN ($2->>'numero_economico',$2->>'numero_inventario',$2->>'unidad_patrulla'))$q$ INTO permitido USING u,r;
 END IF;
 RETURN permitido;
END $$;
CREATE OR REPLACE FUNCTION et_privado.rbac_escritura() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor(); anterior jsonb; nuevo jsonb; m text; accion text;
BEGIN
 -- Las escrituras derivadas de disparadores ya autorizados conservan su transacción.
 IF pg_trigger_depth()>1 THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF u IS NULL THEN RAISE EXCEPTION 'Sesión inválida o expirada' USING ERRCODE='42501'; END IF;
 IF TG_OP<>'INSERT' THEN anterior:=to_jsonb(OLD); END IF;
 IF TG_OP<>'DELETE' THEN nuevo:=to_jsonb(NEW); END IF;
 IF TG_TABLE_NAME='usuarios' AND TG_OP='UPDATE' AND anterior->>'id'=u->>'id'
   AND (anterior-ARRAY['password','avatar_url','dashboard_kpis'])=(nuevo-ARRAY['password','avatar_url','dashboard_kpis']) THEN
   IF anterior->'password' IS DISTINCT FROM nuevo->'password' AND length(coalesce(nuevo->>'password',''))<8 THEN
     RAISE EXCEPTION 'La contraseña requiere al menos 8 caracteres' USING ERRCODE='42501';
   END IF;
   RETURN NEW;
 END IF;
 m:=et_privado.rbac_modulo(TG_TABLE_NAME,coalesce(anterior,nuevo));
 accion:=CASE TG_OP WHEN 'INSERT' THEN 'crear' WHEN 'DELETE' THEN 'eliminar' ELSE 'editar' END;
 IF TG_TABLE_NAME='importaciones_siif' THEN accion:='importar'; END IF;
 IF NOT coalesce(et_privado.rbac_puede(u,m,accion,anterior),false) THEN RAISE EXCEPTION 'Sin permiso: % / %',m,accion USING ERRCODE='42501'; END IF;
 IF et_privado.rbac_rol(u->>'rol')='proveedor' THEN
   IF NOT coalesce(et_privado.rbac_proveedor(u,coalesce(anterior,nuevo)),false) OR (nuevo IS NOT NULL AND NOT coalesce(et_privado.rbac_proveedor(u,nuevo),false)) THEN RAISE EXCEPTION 'Registro de otro proveedor' USING ERRCODE='42501'; END IF;
   IF TG_OP='UPDATE' AND TG_TABLE_NAME='peticiones' AND (anterior-ARRAY['estatus_proveedor','fecha_entrega_proveedor','nota_proveedor','updated_at']) IS DISTINCT FROM (nuevo-ARRAY['estatus_proveedor','fecha_entrega_proveedor','nota_proveedor','updated_at']) THEN RAISE EXCEPTION 'Solo puede actualizar datos de entrega' USING ERRCODE='42501'; END IF;
 END IF;
 IF TG_OP='UPDATE' THEN
   IF ((anterior->'estatus' IS DISTINCT FROM nuevo->'estatus' AND lower(coalesce(nuevo->>'estatus','')) LIKE 'cancelad%') OR (anterior->'estado' IS DISTINCT FROM nuevo->'estado' AND lower(coalesce(nuevo->>'estado','')) LIKE 'cancelad%')) AND NOT (TG_TABLE_NAME IN ('requis_siif','oc_siif','sp_siif') AND et_privado.rbac_puede(u,'Importar SIIF','importar')) THEN RAISE EXCEPTION 'Solicite la cancelación mediante el módulo Cancelaciones' USING ERRCODE='42501'; END IF;
   IF NOT coalesce(et_privado.rbac_puede(u,et_privado.rbac_modulo(TG_TABLE_NAME,nuevo),accion,anterior),false) THEN RAISE EXCEPTION 'No puede cambiar el módulo del registro' USING ERRCODE='42501'; END IF;
   IF (anterior->'estatus' IS DISTINCT FROM nuevo->'estatus' OR anterior->'estado' IS DISTINCT FROM nuevo->'estado') AND TG_TABLE_NAME<>'importaciones_siif'
     AND NOT coalesce(et_privado.rbac_puede(u,m,'cambiar_estatus',anterior),false) THEN RAISE EXCEPTION 'Sin permiso para cambiar estatus' USING ERRCODE='42501'; END IF;
   NEW.rbac_creado_por:=OLD.rbac_creado_por;
   IF NEW.rbac_creado_por IS NULL AND coalesce(anterior->>'creado_por',anterior->>'creada_por_id',anterior->>'usuario_id',anterior->>'solicitante_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
     NEW.rbac_creado_por:=coalesce(anterior->>'creado_por',anterior->>'creada_por_id',anterior->>'usuario_id',anterior->>'solicitante_id')::uuid;
   END IF;
   IF anterior->'estado_autorizacion' IS DISTINCT FROM nuevo->'estado_autorizacion' AND NOT coalesce(et_privado.rbac_puede(u,m,'autorizar',anterior),false) THEN RAISE EXCEPTION 'Sin permiso para autorizar' USING ERRCODE='42501'; END IF;
   IF anterior->'creada_por_id' IS DISTINCT FROM nuevo->'creada_por_id' THEN RAISE EXCEPTION 'No se puede cambiar la autoría' USING ERRCODE='42501'; END IF;
   IF anterior->'creado_por' IS DISTINCT FROM nuevo->'creado_por' THEN RAISE EXCEPTION 'No se puede cambiar la autoría' USING ERRCODE='42501'; END IF;
   IF NEW.rbac_cancelado IS DISTINCT FROM OLD.rbac_cancelado THEN RAISE EXCEPTION 'Utilice el flujo de cancelación' USING ERRCODE='42501'; END IF;
   IF OLD.rbac_cancelado THEN RAISE EXCEPTION 'El registro está cancelado' USING ERRCODE='42501'; END IF;
 ELSIF TG_OP='INSERT' THEN
   NEW.rbac_creado_por:=(u->>'id')::uuid;NEW.rbac_cancelado:=false;
   NEW:=jsonb_populate_record(NEW,jsonb_build_object('creado_por',u->>'id','creada_por_id',u->>'id'));
   IF nuevo->>'origen_peticion'='coordinador' AND coalesce(nuevo->>'estado_autorizacion','pendiente')<>'pendiente' AND NOT et_privado.rbac_puede(u,m,'autorizar') THEN RAISE EXCEPTION 'Sin permiso para autorizar' USING ERRCODE='42501'; END IF;
 END IF;
 IF TG_TABLE_NAME='usuarios' AND TG_OP<>'DELETE' THEN
   IF jsonb_typeof(NEW.permisos_excepciones)<>'object' THEN RAISE EXCEPTION 'Excepciones inválidas'; END IF;
   NEW.permisos_version:=2;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT tabla FROM et_privado.rbac_tablas LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.'||t.tabla) AND relkind IN ('r','p')) THEN CONTINUE; END IF;
  EXECUTE format('DROP TRIGGER IF EXISTS rbac_escritura ON public.%I',t.tabla);
  EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS rbac_creado_por uuid, ADD COLUMN IF NOT EXISTS rbac_cancelado boolean NOT NULL DEFAULT false',t.tabla);
  EXECUTE format('DROP TRIGGER IF EXISTS rbac_escritura ON public.%I',t.tabla);
  EXECUTE format('CREATE TRIGGER rbac_escritura BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION et_privado.rbac_escritura()',t.tabla);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t.tabla);
  EXECUTE format('DROP POLICY IF EXISTS rbac_lectura ON public.%I',t.tabla);
  EXECUTE format('CREATE POLICY rbac_lectura ON public.%I AS RESTRICTIVE FOR SELECT TO anon,authenticated USING (et_privado.rbac_lectura(%L,to_jsonb(%I)))',t.tabla,t.tabla,t.tabla);
 END LOOP;
END $$;
-- Evitar que una vista de consulta omita las políticas de sus tablas de origen.
DO $$ DECLARE v record; BEGIN
 FOR v IN SELECT viewname FROM pg_views WHERE schemaname='public' AND viewname IN ('seguimiento_siif','kardex_inventario','reporte_control_area_unidades','reporte_control_area_dependencias','reporte_control_area_talleres','reporte_control_area_modelos') LOOP
  EXECUTE format('ALTER VIEW public.%I SET (security_invoker=true)',v.viewname);
 END LOOP;
END $$;
CREATE TABLE IF NOT EXISTS public.solicitudes_cancelacion(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tabla text NOT NULL,registro_id uuid NOT NULL,modulo text NOT NULL,
 motivo text NOT NULL CHECK(length(btrim(motivo))>=5),solicitante_id uuid NOT NULL REFERENCES public.usuarios(id),
 estado text NOT NULL DEFAULT 'Pendiente' CHECK(estado IN ('Pendiente','Aprobada','Rechazada')),
 resolucion text,resuelto_por uuid REFERENCES public.usuarios(id),created_at timestamptz NOT NULL DEFAULT now(),resuelto_en timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS cancelacion_pendiente_unica ON public.solicitudes_cancelacion(tabla,registro_id) WHERE estado='Pendiente';
ALTER TABLE public.solicitudes_cancelacion ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.solicitudes_cancelacion FROM anon,authenticated;
GRANT SELECT ON public.solicitudes_cancelacion TO anon,authenticated;
DROP POLICY IF EXISTS consultar_cancelaciones ON public.solicitudes_cancelacion;
CREATE POLICY consultar_cancelaciones ON public.solicitudes_cancelacion FOR SELECT TO anon,authenticated USING (
 solicitante_id::text=et_privado.rbac_actor()->>'id' OR et_privado.rbac_puede(et_privado.rbac_actor(),'Cancelaciones','aprobar_cancelacion'));
CREATE OR REPLACE FUNCTION public.solicitar_cancelacion(p_tabla text,p_registro uuid,p_motivo text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor();r jsonb;m text;salida uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM et_privado.rbac_tablas WHERE tabla=p_tabla AND tabla<>'usuarios') THEN RAISE EXCEPTION 'Tabla no disponible'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=p_tabla AND column_name='id' AND udt_name='uuid') THEN RAISE EXCEPTION 'Esta tabla no admite cancelación por registro'; END IF;
 EXECUTE format('SELECT to_jsonb(r) FROM public.%I r WHERE id=$1 FOR UPDATE',p_tabla) INTO r USING p_registro;
 m:=et_privado.rbac_modulo(p_tabla,r);
 IF r IS NULL OR NOT coalesce(et_privado.rbac_puede(u,m,'solicitar_cancelacion',r),false) THEN RAISE EXCEPTION 'Sin permiso para solicitar cancelación' USING ERRCODE='42501'; END IF;
 IF (r->>'rbac_cancelado')::boolean THEN RAISE EXCEPTION 'Ya está cancelado'; END IF;
 INSERT INTO public.solicitudes_cancelacion(tabla,registro_id,modulo,motivo,solicitante_id)
 VALUES(p_tabla,p_registro,m,btrim(p_motivo),(u->>'id')::uuid) RETURNING id INTO salida;
 RETURN salida;
END $$;
CREATE OR REPLACE FUNCTION public.resolver_cancelacion(p_id uuid,p_aprobar boolean,p_motivo text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor();s public.solicitudes_cancelacion%ROWTYPE;
BEGIN
 IF NOT coalesce(et_privado.rbac_puede(u,'Cancelaciones','aprobar_cancelacion'),false) THEN RAISE EXCEPTION 'Sin permiso para resolver cancelaciones' USING ERRCODE='42501'; END IF;
 IF length(btrim(coalesce(p_motivo,'')))<5 THEN RAISE EXCEPTION 'Escriba el motivo de la resolución'; END IF;
 SELECT * INTO s FROM public.solicitudes_cancelacion WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR s.estado<>'Pendiente' THEN RAISE EXCEPTION 'La solicitud ya fue resuelta o no existe'; END IF;
 UPDATE public.solicitudes_cancelacion SET estado=CASE WHEN p_aprobar THEN 'Aprobada' ELSE 'Rechazada' END,
 resolucion=p_motivo,resuelto_por=(u->>'id')::uuid,resuelto_en=now() WHERE id=p_id;
END $$;
-- El cambio del registro se ejecuta como efecto del trigger autorizado, no como borrado.
CREATE OR REPLACE FUNCTION et_privado.rbac_aplicar_cancelacion() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.estado='Aprobada' AND OLD.estado='Pendiente' THEN
  EXECUTE format('UPDATE public.%I SET rbac_cancelado=true WHERE id=$1',NEW.tabla) USING NEW.registro_id;
  IF NOT FOUND THEN NULL; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS aplicar_cancelacion ON public.solicitudes_cancelacion;
CREATE TRIGGER aplicar_cancelacion AFTER UPDATE ON public.solicitudes_cancelacion FOR EACH ROW EXECUTE FUNCTION et_privado.rbac_aplicar_cancelacion();
REVOKE ALL ON FUNCTION public.solicitar_cancelacion(text,uuid,text),public.resolver_cancelacion(uuid,boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.solicitar_cancelacion(text,uuid,text),public.resolver_cancelacion(uuid,boolean,text) TO anon,authenticated;
CREATE OR REPLACE FUNCTION et_privado.autorizar_flujo_siif(p_usuario uuid,p_token text,p_editar boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb;
BEGIN
 SELECT to_jsonb(t)-'password' INTO u FROM public.usuarios t JOIN et_privado.sesiones_aplicacion s ON s.usuario_id=t.id
 WHERE t.id=p_usuario AND t.activo IS TRUE AND s.expira_en>now() AND s.token_hash=sha256(convert_to(p_token,'UTF8'));
 IF NOT coalesce(et_privado.rbac_puede(u,'Seguimiento SIIF',CASE WHEN p_editar THEN 'editar' ELSE 'ver' END),false) THEN RAISE EXCEPTION 'Sin sesión o permiso para Seguimiento SIIF' USING ERRCODE='42501'; END IF;
 RETURN coalesce(u->>'nombre',u->>'usuario');
END $$;
REVOKE ALL ON FUNCTION et_privado.autorizar_flujo_siif(uuid,text,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION et_privado.rbac_rol(text),et_privado.rbac_actor(),et_privado.rbac_puede(jsonb,text,text,jsonb),et_privado.rbac_modulo(text,jsonb),et_privado.rbac_lectura(text,jsonb),et_privado.rbac_escritura(),et_privado.rbac_aplicar_cancelacion() FROM PUBLIC;
REVOKE ALL ON FUNCTION et_privado.rbac_proveedor(jsonb,jsonb),et_privado.rbac_proveedor_fila(jsonb,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA et_privado TO anon,authenticated;
GRANT EXECUTE ON FUNCTION et_privado.rbac_actor(),et_privado.rbac_lectura(text,jsonb),et_privado.rbac_puede(jsonb,text,text,jsonb) TO anon,authenticated;
NOTIFY pgrst,'reload schema';

-- 071_barrera_sesion_tablas
-- Requiere 062 y 070. Probar en staging con el inventario real antes de producción.
-- Es una barrera adicional: nunca amplía las políticas existentes.
DO $$ BEGIN
  IF to_regprocedure('et_privado.rbac_actor()') IS NULL
    OR to_regclass('et_privado.rbac_tablas') IS NULL THEN
    RAISE EXCEPTION 'Instale primero las migraciones 062 y 070';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION et_privado.seguridad_fila(t text,r jsonb,a text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor(); m text; padre jsonb;
BEGIN
  IF u IS NULL THEN RETURN false; END IF;
  -- El trigger rbac_escritura limita los campos propios a contraseña y preferencias.
  IF t='usuarios' AND a='editar' AND r->>'id'=u->>'id' THEN RETURN true; END IF;
  IF t='categorias_inventario' THEN
    RETURN a='ver' AND et_privado.rbac_puede(u,'Inventario','ver');
  END IF;
  IF t='acuerdos_historial' THEN
    SELECT to_jsonb(x) INTO padre FROM public.acuerdos x WHERE x.id::text=r->>'acuerdo_id';
    IF padre IS NULL OR NOT et_privado.rbac_lectura('acuerdos',padre) THEN RETURN false; END IF;
    IF a='ver' THEN RETURN true; END IF;
    -- Historial append-only. La identidad se coteja con la sesión, no con el navegador.
    RETURN a='crear' AND r->>'usuario_id'=u->>'id'
      AND et_privado.rbac_puede(u,'Acuerdos','editar',padre);
  END IF;
  IF t='notificaciones' THEN
    RETURN a IN ('ver','editar') AND r->>'usuario_id'=u->>'id';
  END IF;
  IF t='auditoria' THEN
    RETURN a='ver' AND et_privado.rbac_puede(u,'Auditoría','ver');
  END IF;
  IF t='solicitudes_cancelacion' THEN
    RETURN a='ver' AND (r->>'solicitante_id'=u->>'id'
      OR et_privado.rbac_puede(u,'Cancelaciones','aprobar_cancelacion'));
  END IF;
  IF EXISTS(SELECT 1 FROM et_privado.rbac_tablas WHERE tabla=t) THEN
    IF a='ver' THEN RETURN et_privado.rbac_lectura(t,r); END IF;
    m:=et_privado.rbac_modulo(t,r);
    IF et_privado.rbac_rol(u->>'rol')='proveedor'
      AND NOT coalesce(et_privado.rbac_proveedor_fila(u,t,r),false) THEN RETURN false; END IF;
    RETURN et_privado.rbac_puede(u,m,CASE WHEN t='importaciones_siif' THEN 'importar' ELSE a END,r);
  END IF;
  -- Tablas no clasificadas quedan cerradas hasta revisar su acceso explícitamente.
  RETURN false;
END $$;
REVOKE ALL ON FUNCTION et_privado.seguridad_fila(text,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION et_privado.seguridad_fila(text,jsonb,text) TO anon,authenticated;

DO $$ DECLARE t record; a text; comando text; condicion text; BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
    AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass
      AND d.objid=c.oid AND d.deptype='e') LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t.relname);
    -- TRUNCATE no está sujeto a RLS.
    EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM PUBLIC,anon,authenticated',t.relname);
    FOREACH a IN ARRAY ARRAY['ver','crear','editar','eliminar'] LOOP
      comando:=CASE a WHEN 'ver' THEN 'SELECT' WHEN 'crear' THEN 'INSERT'
        WHEN 'editar' THEN 'UPDATE' ELSE 'DELETE' END;
      condicion:=format('et_privado.seguridad_fila(%L,to_jsonb(%I),%L)',t.relname,t.relname,a);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I','seguridad_'||a,t.relname);
      EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR %s TO anon,authenticated %s',
        'seguridad_'||a,t.relname,comando,
        CASE WHEN a='crear' THEN 'WITH CHECK ('||condicion||')'
          WHEN a='editar' THEN 'USING ('||condicion||') WITH CHECK ('||condicion||')'
          ELSE 'USING ('||condicion||')' END);
    END LOOP;
  END LOOP;
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='et_privado' AND c.relkind IN ('r','p') LOOP
    EXECUTE format('ALTER TABLE et_privado.%I ENABLE ROW LEVEL SECURITY',t.relname);
    EXECUTE format('REVOKE ALL ON et_privado.%I FROM PUBLIC,anon,authenticated',t.relname);
  END LOOP;
END $$;
-- Solo se puede marcar como leída una notificación; ni su texto ni su destinatario.
DO $$ DECLARE c record; BEGIN
 IF to_regclass('public.notificaciones') IS NOT NULL THEN
  REVOKE INSERT,UPDATE,DELETE ON public.notificaciones FROM PUBLIC,anon,authenticated;
  FOR c IN SELECT attname FROM pg_attribute WHERE attrelid='public.notificaciones'::regclass
    AND attnum>0 AND NOT attisdropped LOOP
    EXECUTE format('REVOKE INSERT (%I),UPDATE (%I),REFERENCES (%I) ON public.notificaciones FROM PUBLIC,anon,authenticated',c.attname,c.attname,c.attname);
  END LOOP;
  GRANT SELECT,UPDATE(leida) ON public.notificaciones TO anon,authenticated;
 END IF;
END $$;
-- Las vistas ordinarias deben respetar RLS. El directorio de 070 es una
-- proyección explícita sin contraseñas y valida la sesión en su definición.
DO $$ DECLARE v record; BEGIN
  FOR v IN SELECT c.relname,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('v','m') AND c.relname<>'directorio_usuarios'
    AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass
      AND d.objid=c.oid AND d.deptype='e') LOOP
    IF v.relkind='v' THEN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker=true)',v.relname);
    ELSE
      EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',v.relname);
    END IF;
  END LOOP;
END $$;
NOTIFY pgrst,'reload schema';

-- 072_cerrar_accesos_rpc
-- Requiere 070 y 071. Definiciones revisadas del inventario del 11-11-2026.
REVOKE CREATE ON SCHEMA public FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION et_privado.exigir_permiso(m text,a text,identidad uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor();
BEGIN
 IF u IS NULL OR (identidad IS NOT NULL AND identidad::text<>u->>'id')
   OR NOT coalesce(et_privado.rbac_puede(u,m,a),false) THEN
   RAISE EXCEPTION 'Sesión o permiso inválido' USING ERRCODE='42501';
 END IF;
 RETURN (u->>'id')::uuid;
END $$;
REVOKE ALL ON FUNCTION et_privado.exigir_permiso(text,text,uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.registrar_movimiento_inventario(p_inventario_id uuid, p_tipo character varying, p_cantidad numeric, p_referencia character varying DEFAULT NULL::character varying, p_notas text DEFAULT NULL::text, p_usuario_id uuid DEFAULT NULL::uuid)
 RETURNS inventario_movimientos
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item public.inventario;
  v_mov public.inventario_movimientos;
  v_delta NUMERIC;
BEGIN
  p_usuario_id := et_privado.exigir_permiso('Inventario','editar',p_usuario_id);
  PERFORM et_privado.exigir_permiso('Inventario','crear');
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor que cero';
  END IF;
  IF p_tipo NOT IN ('entrada', 'salida', 'ajuste', 'devolucion') THEN
    RAISE EXCEPTION 'Tipo de movimiento no válido';
  END IF;

  SELECT * INTO v_item FROM public.inventario WHERE id = p_inventario_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Artículo de inventario no encontrado'; END IF;

  v_delta := CASE
    WHEN p_tipo IN ('entrada', 'devolucion') THEN p_cantidad
    WHEN p_tipo = 'salida' THEN -p_cantidad
    ELSE p_cantidad - v_item.stock_actual
  END;
  IF v_item.stock_actual + v_delta < 0 THEN
    RAISE EXCEPTION 'El movimiento dejaría el stock en negativo';
  END IF;

  INSERT INTO public.inventario_movimientos
    (inventario_id, tipo, cantidad, costo_unitario, referencia, usuario_id, notas)
  VALUES
    (p_inventario_id, p_tipo, p_cantidad, v_item.costo_unitario, p_referencia, p_usuario_id, p_notas)
  RETURNING * INTO v_mov;

  UPDATE public.inventario
    SET stock_actual = v_item.stock_actual + v_delta, updated_at = now()
    WHERE id = p_inventario_id;

  RETURN v_mov;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.respaldo_tablas(p_clave text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  tabla record;
  columnas jsonb;
  filas jsonb;
  resultado jsonb := '[]'::jsonb;
  omitir text[] := ARRAY['password', 'password_hash', 'contrasena', 'contraseña',
    'clave_sha256', 'access_token', 'refresh_token', 'api_key', 'secret'];
BEGIN
  PERFORM et_privado.exigir_permiso('Licencias','ver');
  IF p_clave IS NULL OR length(p_clave) < 32 OR NOT EXISTS (
    SELECT 1 FROM et_privado.respaldo_config
    WHERE id AND clave_sha256 = sha256(convert_to(p_clave, 'UTF8'))
  ) THEN
    RAISE EXCEPTION 'Clave de respaldo incorrecta o no configurada' USING ERRCODE = '42501';
  END IF;

  FOR tabla IN
    SELECT c.oid, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relispartition
    ORDER BY c.relname
  LOOP
    SELECT coalesce(jsonb_agg(a.attname ORDER BY a.attnum), '[]'::jsonb)
    INTO columnas FROM pg_attribute a
    WHERE a.attrelid = tabla.oid AND a.attnum > 0 AND NOT a.attisdropped
      AND NOT (a.attname = ANY(omitir));
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t) - $1), ''[]''::jsonb) FROM public.%I t', tabla.relname)
      INTO filas USING omitir;
    resultado := resultado || jsonb_build_array(jsonb_build_object(
      'nombre', tabla.relname, 'columnas', columnas, 'filas', filas));
  END LOOP;
  RETURN resultado;
END;
$function$
;
CREATE OR REPLACE FUNCTION et_privado.validar_admin_licencias(p_usuario_id uuid, p_clave text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  PERFORM et_privado.exigir_permiso('Licencias','editar',p_usuario_id);
  IF p_clave IS NULL OR length(p_clave) < 32 OR length(p_clave) > 256 OR NOT EXISTS (
    SELECT 1 FROM et_privado.licencias_administrador a
    JOIN public.usuarios u ON u.id = a.usuario_id
    WHERE a.id AND a.usuario_id = p_usuario_id AND u.activo IS TRUE
      AND lower(btrim(u.usuario)) = 'emma'
      AND regexp_replace(lower(btrim(u.rol)), '[ _-]', '', 'g') = 'superadmin'
      AND a.clave_sha256 = sha256(convert_to(p_clave, 'UTF8'))
  ) THEN
    RAISE EXCEPTION 'Acceso exclusivo del SuperAdmin propietario. Verifica tu cuenta y clave privada.'
      USING ERRCODE = '42501';
  END IF;
END;
$function$
;
CREATE OR REPLACE FUNCTION et_privado.autorizar_cotizacion_xml(p_usuario uuid, p_password text, p_editar boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE u jsonb; permisos jsonb; permiso text; rol text;
BEGIN
  PERFORM et_privado.exigir_permiso('Crear cotización',CASE WHEN p_editar THEN 'editar' ELSE 'ver' END,p_usuario);
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
$function$
;
CREATE OR REPLACE FUNCTION public.eliminar_ingreso_taller(p_ingreso_id uuid, p_usuario_id uuid, p_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  autor uuid;
BEGIN
  PERFORM et_privado.exigir_permiso('Control de Taller','eliminar',p_usuario_id);
  IF p_password IS NULL OR length(btrim(p_password)) = 0 OR NOT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = p_usuario_id AND u.activo IS TRUE AND u.password = p_password
      AND lower(btrim(coalesce(u.rol, ''))) NOT IN ('solo lectura', 'consulta')
  ) THEN
    RAISE EXCEPTION 'No autorizado para eliminar este ingreso' USING ERRCODE = '42501';
  END IF;
  SELECT creado_por INTO autor FROM public.ingresos_taller
    WHERE id = p_ingreso_id FOR UPDATE;
  IF NOT FOUND OR autor IS NULL OR autor IS DISTINCT FROM p_usuario_id THEN
    RAISE EXCEPTION 'No autorizado para eliminar este ingreso' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.ingresos_taller WHERE id = p_ingreso_id AND creado_por = p_usuario_id;
  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.listar_usuarios_turnables_acuerdos()
RETURNS TABLE(id uuid,nombre text,usuario text,rol text,activo boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 PERFORM et_privado.exigir_permiso('Acuerdos','ver');
 RETURN QUERY SELECT u.id,u.nombre::text,u.usuario::text,u.rol::text,u.activo
 FROM public.usuarios u WHERE u.activo IS TRUE AND et_privado.rbac_rol(u.rol)<>'proveedor'
 ORDER BY u.nombre;
END $$;
CREATE OR REPLACE FUNCTION public.usuario_actual_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT (et_privado.rbac_actor()->>'id')::uuid
$$;
CREATE OR REPLACE FUNCTION public.generar_folio_cotizacion_almacen() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 PERFORM et_privado.exigir_permiso(
 CASE WHEN et_privado.rbac_rol(et_privado.rbac_actor()->>'rol')='proveedor'
 THEN 'Cotizaciones Proveedor' ELSE 'Gestión de Cotizaciones' END,'crear');
 RETURN 'COT-' || EXTRACT(YEAR FROM CURRENT_DATE)::integer || '-' ||
 lpad(nextval('public.cotizaciones_almacen_folio_seq')::text,4,'0');
END $$;
CREATE OR REPLACE FUNCTION public.usuario_actual_rol() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT lower(btrim(et_privado.rbac_actor()->>'rol'))
$$;
-- RPC heredadas sin consumidor en el cliente actual; los folios siguen por triggers.
REVOKE ALL ON FUNCTION public.resolver_email_login(text),public.generar_folio(text)
 FROM PUBLIC,anon,authenticated;
-- Eliminar privilegios EXECUTE por defecto en funciones trigger: no son endpoints.
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure firma FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname IN ('public','et_privado') AND p.prorettype='trigger'::regtype LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.firma);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION et_privado.auditar_movimiento()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  antes jsonb;
  despues jsonb;
  registro jsonb;
  cabeceras jsonb;
  actor uuid;
  actor_nombre text;
  actor_rol text;
  actor_origen text := 'sin_identificar';
  entidad uuid;
  modulo_nombre text;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN antes := to_jsonb(OLD); END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN despues := to_jsonb(NEW); END IF;
  IF TG_OP = 'UPDATE' AND antes = despues THEN RETURN NEW; END IF;
  registro := coalesce(despues, antes);
  -- El login heredado no tiene identidad JWT verificable: señalar explícitamente
  -- que la cuenta fue declarada por el cliente. No inferir el editor del creador.
  BEGIN
    cabeceras := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
    actor := (et_privado.rbac_actor()->>'id')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN actor := NULL;
  END;
  IF actor IS NOT NULL THEN
    SELECT left(coalesce(u.nombre, u.usuario), 150), left(u.rol, 80)
    INTO actor_nombre, actor_rol FROM public.usuarios u WHERE u.id = actor AND u.activo IS TRUE;
    IF NOT FOUND THEN actor := NULL;
    ELSE actor_origen := 'sesion_validada'; END IF;
  END IF;
  BEGIN entidad := (registro ->> 'id')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN entidad := NULL;
  END;
  modulo_nombre := CASE
    WHEN TG_TABLE_NAME LIKE 'peticion%' THEN 'Peticiones'
    WHEN TG_TABLE_NAME LIKE 'requisicion%' THEN 'Requisiciones'
    WHEN TG_TABLE_NAME LIKE 'vale%' THEN 'Vales'
    WHEN TG_TABLE_NAME IN ('parque_vehicular', 'vehiculo_documentos', 'vehiculo_fotos') THEN 'Parque Vehicular'
    WHEN TG_TABLE_NAME LIKE '%inventario%' THEN 'Inventario'
    WHEN TG_TABLE_NAME LIKE 'acuerdo%' THEN 'Acuerdos'
    WHEN TG_TABLE_NAME LIKE '%calendario%' THEN 'Calendario'
    WHEN TG_TABLE_NAME LIKE 'ingresos_taller%' THEN 'Control de Taller'
    WHEN TG_TABLE_NAME LIKE '%tiempo_extra%' OR TG_TABLE_NAME = 'empleados' THEN 'Tiempo Extra'
    WHEN TG_TABLE_NAME LIKE 'cotizacion%' THEN 'Gestión de Cotizaciones'
    WHEN TG_TABLE_NAME LIKE '%tramites%' OR TG_TABLE_NAME = 'feriados_administrativos' THEN 'Tramites Administrativos'
    WHEN TG_TABLE_NAME = 'usuarios' THEN 'Usuarios'
    WHEN TG_TABLE_NAME LIKE '%licencia%' THEN 'Licencias'
    WHEN TG_TABLE_NAME LIKE 'proveedor%' THEN 'Proveedores'
    WHEN TG_TABLE_NAME LIKE '%siif%' THEN 'Seguimiento SIIF'
    WHEN TG_TABLE_NAME = 'notificaciones' THEN 'Notificaciones'
    ELSE TG_TABLE_NAME END;
  INSERT INTO public.auditoria (usuario_id, usuario_nombre, usuario_rol, modulo, accion,
    detalle, entidad_tipo, entidad_id, metadata)
  VALUES (actor, coalesce(actor_nombre, 'Sistema / origen no identificado'), coalesce(actor_rol, 'Sin identificar'),
    left(modulo_nombre,100), CASE TG_OP WHEN 'INSERT' THEN 'Creó registro' WHEN 'UPDATE' THEN 'Editó registro' WHEN 'TRUNCATE' THEN 'Vació tabla' ELSE 'Eliminó registro' END,
    TG_TABLE_NAME || coalesce(' · ' || (registro ->> 'id'), ''), left(TG_TABLE_NAME,80), entidad,
    jsonb_build_object('origen', 'base_de_datos', 'operacion', TG_OP, 'tabla', TG_TABLE_NAME,
      'identidad', actor_origen, 'registro_id', registro ->> 'id',
      'antes', et_privado.auditoria_sin_secretos(antes), 'despues', et_privado.auditoria_sin_secretos(despues)));
  IF TG_OP = 'TRUNCATE' THEN RETURN NULL; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$
;
REVOKE ALL ON FUNCTION et_privado.auditar_movimiento() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';

-- 073_optimizar_lecturas_rls
-- Corrección de lecturas: permisos calculados una vez por sentencia, no por fila.
SET LOCAL lock_timeout='10s';
CREATE OR REPLACE FUNCTION et_privado.contexto_lectura()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor(); permitidos jsonb; mapa jsonb;
BEGIN
 IF u IS NULL THEN RETURN NULL; END IF;
 SELECT coalesce(jsonb_agg(m),'[]'::jsonb) INTO permitidos FROM
 (SELECT DISTINCT modulo m FROM et_privado.rbac_base
 UNION SELECT modulo FROM et_privado.rbac_tablas) x
 WHERE et_privado.rbac_puede(u,m,'ver');
 SELECT jsonb_object_agg(tabla,modulo) INTO mapa FROM et_privado.rbac_tablas;
 RETURN jsonb_build_object('usuario',u,'rol',et_privado.rbac_rol(u->>'rol'),
   'modulos',permitidos,'tablas',mapa);
END $$;
CREATE OR REPLACE FUNCTION et_privado.lectura_con_contexto(t text,r jsonb,c jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=c->'usuario'; rol text:=c->>'rol'; m text:=c->'tablas'->>t;
BEGIN
 IF u IS NULL THEN RETURN false; END IF;
 IF t='usuarios' THEN RETURN rol='superadmin' OR r->>'id'=u->>'id'; END IF;
 IF rol='proveedor' THEN
  IF NOT coalesce(et_privado.rbac_proveedor_fila(u,t,r),false) THEN RETURN false; END IF;
  IF t='parque_vehicular' THEN RETURN true; END IF;
  m:=CASE WHEN t='peticiones' THEN 'Peticiones de almacén'
    WHEN t='cotizaciones_almacen' THEN 'Cotizaciones Proveedor'
    WHEN t IN ('requis_siif','oc_siif','sp_siif') THEN 'Seguimiento de trámites SIIF' ELSE m END;
 ELSIF t='peticiones' AND r->>'origen_peticion'='coordinador' THEN
  m:='Peticiones de Coordinadores';
 END IF;
 RETURN coalesce((c->'modulos') ? m,false);
END $$;
REVOKE ALL ON FUNCTION et_privado.contexto_lectura(),et_privado.lectura_con_contexto(text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION et_privado.contexto_lectura(),et_privado.lectura_con_contexto(text,jsonb,jsonb) TO anon,authenticated;
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT tabla FROM et_privado.rbac_tablas WHERE to_regclass(format('public.%I',tabla)) IS NOT NULL LOOP
  -- Ambas barreras anteriores repetían la misma autorización de lectura.
  EXECUTE format('DROP POLICY IF EXISTS rbac_lectura ON public.%I',t.tabla);
  EXECUTE format('DROP POLICY IF EXISTS seguridad_ver ON public.%I',t.tabla);
  EXECUTE format('CREATE POLICY seguridad_ver ON public.%I AS RESTRICTIVE FOR SELECT TO anon,authenticated USING (et_privado.lectura_con_contexto(%L,to_jsonb(%I),(SELECT et_privado.contexto_lectura())))',t.tabla,t.tabla,t.tabla);
 END LOOP;
END $$;
DROP POLICY IF EXISTS seguridad_ver ON public.notificaciones;
CREATE POLICY seguridad_ver ON public.notificaciones AS RESTRICTIVE FOR SELECT TO anon,authenticated
 USING (usuario_id=(SELECT (et_privado.rbac_actor()->>'id')::uuid));
DROP POLICY IF EXISTS seguridad_editar ON public.notificaciones;
CREATE POLICY seguridad_editar ON public.notificaciones AS RESTRICTIVE FOR UPDATE TO anon,authenticated
 USING (usuario_id=(SELECT (et_privado.rbac_actor()->>'id')::uuid))
 WITH CHECK (usuario_id=(SELECT (et_privado.rbac_actor()->>'id')::uuid));
CREATE INDEX IF NOT EXISTS notificaciones_usuario_lectura_fecha_idx
 ON public.notificaciones(usuario_id,leida,created_at DESC,id DESC);
NOTIFY pgrst,'reload schema';

-- 074_catalogo_proveedores_jefe_almacen
-- Cat?logo necesario para asignar proveedores en Peticiones y Vales.
-- Conserva permisos de escritura y excepciones; no modifica la cuenta de Jair.
CREATE OR REPLACE FUNCTION et_privado.rbac_lectura(t text,r jsonb) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor(); m text:=et_privado.rbac_modulo(t,r);
BEGIN
 IF u IS NULL THEN RETURN false; END IF;
 IF t='proveedores' AND et_privado.rbac_rol(u->>'rol')='jefedealmacen'
   AND (et_privado.rbac_puede(u,'Peticiones','ver') OR et_privado.rbac_puede(u,'Vales','ver')) THEN
   RETURN true;
 END IF;
 IF t='usuarios' THEN RETURN et_privado.rbac_rol(u->>'rol')='superadmin' OR r->>'id'=u->>'id'; END IF;
 IF et_privado.rbac_rol(u->>'rol')='proveedor' AND NOT coalesce(et_privado.rbac_proveedor_fila(u,t,r),false) THEN RETURN false; END IF;
 IF et_privado.rbac_rol(u->>'rol')='proveedor' AND t='parque_vehicular' THEN RETURN true; END IF;
 RETURN coalesce(et_privado.rbac_puede(u,m,'ver',r),false);
END $$;
CREATE OR REPLACE FUNCTION et_privado.lectura_con_contexto(t text,r jsonb,c jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=c->'usuario'; rol text:=c->>'rol'; m text:=c->'tablas'->>t;
BEGIN
 IF u IS NULL THEN RETURN false; END IF;
 IF t='proveedores' AND rol='jefedealmacen'
   AND ((c->'modulos') ? 'Peticiones' OR (c->'modulos') ? 'Vales') THEN RETURN true; END IF;
 IF t='usuarios' THEN RETURN rol='superadmin' OR r->>'id'=u->>'id'; END IF;
 IF rol='proveedor' THEN
  IF NOT coalesce(et_privado.rbac_proveedor_fila(u,t,r),false) THEN RETURN false; END IF;
  IF t='parque_vehicular' THEN RETURN true; END IF;
  m:=CASE WHEN t='peticiones' THEN 'Peticiones de almacén'
    WHEN t='cotizaciones_almacen' THEN 'Cotizaciones Proveedor'
    WHEN t IN ('requis_siif','oc_siif','sp_siif') THEN 'Seguimiento de trámites SIIF' ELSE m END;
 ELSIF t='peticiones' AND r->>'origen_peticion'='coordinador' THEN
  m:='Peticiones de Coordinadores';
 END IF;
 RETURN coalesce((c->'modulos') ? m,false);
END $$;
REVOKE ALL ON FUNCTION et_privado.rbac_lectura(text,jsonb),et_privado.lectura_con_contexto(text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION et_privado.rbac_lectura(text,jsonb),et_privado.lectura_con_contexto(text,jsonb,jsonb) TO anon,authenticated;
NOTIFY pgrst,'reload schema';

-- 075_respetar_modulos_personalizados
CREATE OR REPLACE FUNCTION et_privado.limite_modulos_anterior(u jsonb,m text,a text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
DECLARE lista jsonb:=u->'modulos_permitidos'; x jsonb; nombre text; nivel text; edita boolean;
BEGIN
 IF jsonb_typeof(lista)='string' THEN
  BEGIN lista:=(lista #>> '{}')::jsonb;
  EXCEPTION WHEN OTHERS THEN SELECT jsonb_agg(btrim(v)) INTO lista FROM unnest(string_to_array(u->>'modulos_permitidos',',')) v WHERE btrim(v)<>'';
  END;
 END IF;
 IF jsonb_typeof(lista) IS DISTINCT FROM 'array' THEN RETURN true; END IF;
 IF jsonb_array_length(lista)=0 OR m='Dashboard' THEN RETURN true; END IF;
 FOR x IN SELECT value FROM jsonb_array_elements(lista) LOOP
  nombre:=btrim(CASE WHEN jsonb_typeof(x)='string' THEN x #>> '{}' ELSE coalesce(x->>'modulo',x->>'nombre',x->>'module','') END);
  IF nombre='Requisiciones' THEN nombre:='Seguimiento SIIF'; END IF;
  IF nombre IS DISTINCT FROM m THEN CONTINUE; END IF;
  nivel:=CASE WHEN jsonb_typeof(x)='string' THEN 'editar' ELSE lower(btrim(coalesce(x->>'permiso',x->>'acceso',x->>'nivel',''))) END;
  edita:=nivel IN ('editar','edit','write','modificar');
  IF (a IN ('ver','exportar','imprimir') AND (edita OR nivel IN ('ver','vista','view','solo vista','moderar','moderador','moderate')))
    OR (a NOT IN ('ver','exportar','imprimir') AND edita) THEN RETURN true; END IF;
 END LOOP;
 RETURN false;
END $$;
REVOKE ALL ON FUNCTION et_privado.limite_modulos_anterior(jsonb,text,text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION et_privado.rbac_puede(u jsonb,m text,a text,r jsonb DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE rol text:=et_privado.rbac_rol(u->>'rol'); permisos jsonb; ex jsonb; permitido boolean; visible boolean;
BEGIN
 IF u IS NULL OR coalesce((u->>'activo')::boolean,false)=false THEN RETURN false; END IF;
 IF m='Usuarios' AND rol<>'superadmin' THEN RETURN false; END IF;
 IF m='Licencias' AND (rol<>'superadmin' OR lower(u->>'usuario')<>'emma') THEN RETURN false; END IF;
 IF a='eliminar' AND rol NOT IN ('superadmin','administradordelsistema') THEN RETURN false; END IF;
 IF a='aprobar_cancelacion' AND rol NOT IN ('superadmin','administradordelsistema','jefedealmacen') THEN RETURN false; END IF;
 SELECT b.acciones INTO permisos FROM et_privado.rbac_base b WHERE b.rol=et_privado.rbac_rol(u->>'rol') AND b.modulo=m;
 ex:=u->'permisos_excepciones'->m;
 visible:=CASE WHEN jsonb_typeof(ex->'ver')='boolean' THEN (ex->>'ver')::boolean ELSE coalesce(permisos ? 'ver',false) AND et_privado.limite_modulos_anterior(u,m,'ver') END;
 permitido:=CASE WHEN jsonb_typeof(ex->a)='boolean' THEN (ex->>a)::boolean ELSE coalesce(permisos ? a,false) AND et_privado.limite_modulos_anterior(u,m,a) END;
 IF NOT visible OR NOT permitido THEN RETURN false; END IF;
 IF r IS NOT NULL AND a IN ('editar','cambiar_estatus','autorizar','solicitar_cancelacion') AND rol IN ('coordinador','coordinadorinfraestructura','tecnico') THEN
   RETURN coalesce(nullif(coalesce(r->>'rbac_creado_por',r->>'creado_por',r->>'creada_por_id',r->>'usuario_id',r->>'solicitante_id'),'')=u->>'id',false);
 END IF;
 RETURN true;
END $$;
NOTIFY pgrst,'reload schema';

SELECT u.usuario,u.rol,u.modulos_permitidos,
 (SELECT jsonb_agg(m ORDER BY m) FROM (SELECT DISTINCT modulo m FROM et_privado.rbac_base) x
 WHERE et_privado.rbac_puede(to_jsonb(u),m,'ver')) AS modulos_visibles
FROM public.usuarios u WHERE lower(btrim(u.usuario))='paulo';

-- 076_modulos_permitidos_obligatorios
CREATE OR REPLACE FUNCTION et_privado.limite_modulos_anterior(u jsonb,m text,a text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
DECLARE lista jsonb:=u->'modulos_permitidos'; x jsonb; nombre text; nivel text; edita boolean;
BEGIN
 IF jsonb_typeof(lista)='string' THEN
  BEGIN lista:=(lista #>> '{}')::jsonb;
  EXCEPTION WHEN OTHERS THEN SELECT jsonb_agg(btrim(v)) INTO lista FROM unnest(string_to_array(u->>'modulos_permitidos',',')) v WHERE btrim(v)<>'';
  END;
 END IF;
 IF jsonb_typeof(lista) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 IF jsonb_array_length(lista)=0 THEN RETURN false; END IF;
 FOR x IN SELECT value FROM jsonb_array_elements(lista) LOOP
  nombre:=btrim(CASE WHEN jsonb_typeof(x)='string' THEN x #>> '{}' ELSE coalesce(x->>'modulo',x->>'nombre',x->>'module','') END);
  IF nombre='Requisiciones' THEN nombre:='Seguimiento SIIF'; END IF;
  IF nombre IS DISTINCT FROM m THEN CONTINUE; END IF;
  nivel:=CASE WHEN jsonb_typeof(x)='string' THEN 'editar' ELSE lower(btrim(coalesce(x->>'permiso',x->>'acceso',x->>'nivel',''))) END;
  edita:=nivel IN ('editar','edit','write','modificar');
  IF (a IN ('ver','exportar','imprimir') AND (edita OR nivel IN ('ver','vista','view','solo vista','moderar','moderador','moderate')))
    OR (a NOT IN ('ver','exportar','imprimir') AND edita) THEN RETURN true; END IF;
 END LOOP;
 RETURN false;
END $$;
REVOKE ALL ON FUNCTION et_privado.limite_modulos_anterior(jsonb,text,text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION et_privado.rbac_puede(u jsonb,m text,a text,r jsonb DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE rol text:=et_privado.rbac_rol(u->>'rol'); permisos jsonb; ex jsonb; permitido boolean; visible boolean;
BEGIN
 IF u IS NULL OR coalesce((u->>'activo')::boolean,false)=false THEN RETURN false; END IF;
 IF NOT et_privado.limite_modulos_anterior(u,m,'ver') OR NOT et_privado.limite_modulos_anterior(u,m,a) THEN RETURN false; END IF;
 IF m='Usuarios' AND rol<>'superadmin' THEN RETURN false; END IF;
 IF m='Licencias' AND (rol<>'superadmin' OR lower(u->>'usuario')<>'emma') THEN RETURN false; END IF;
 IF a='eliminar' AND rol NOT IN ('superadmin','administradordelsistema') THEN RETURN false; END IF;
 IF a='aprobar_cancelacion' AND rol NOT IN ('superadmin','administradordelsistema','jefedealmacen') THEN RETURN false; END IF;
 SELECT b.acciones INTO permisos FROM et_privado.rbac_base b WHERE b.rol=et_privado.rbac_rol(u->>'rol') AND b.modulo=m;
 ex:=u->'permisos_excepciones'->m;
 visible:=CASE WHEN jsonb_typeof(ex->'ver')='boolean' THEN (ex->>'ver')::boolean ELSE coalesce(permisos ? 'ver',false) AND et_privado.limite_modulos_anterior(u,m,'ver') END;
 permitido:=CASE WHEN jsonb_typeof(ex->a)='boolean' THEN (ex->>a)::boolean ELSE coalesce(permisos ? a,false) AND et_privado.limite_modulos_anterior(u,m,a) END;
 IF NOT visible OR NOT permitido THEN RETURN false; END IF;
 IF r IS NOT NULL AND a IN ('editar','cambiar_estatus','autorizar','solicitar_cancelacion') AND rol IN ('coordinador','coordinadorinfraestructura','tecnico') THEN
   RETURN coalesce(nullif(coalesce(r->>'rbac_creado_por',r->>'creado_por',r->>'creada_por_id',r->>'usuario_id',r->>'solicitante_id'),'')=u->>'id',false);
 END IF;
 RETURN true;
END $$;
CREATE OR REPLACE FUNCTION et_privado.rbac_lectura(t text,r jsonb) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor(); m text:=et_privado.rbac_modulo(t,r);
BEGIN
 IF u IS NULL THEN RETURN false; END IF;
 IF t='proveedores' AND et_privado.rbac_rol(u->>'rol')='jefedealmacen'
   AND (et_privado.rbac_puede(u,'Peticiones','ver') OR et_privado.rbac_puede(u,'Vales','ver')) THEN
   RETURN true;
 END IF;
 IF t='usuarios' THEN RETURN et_privado.rbac_puede(u,'Usuarios','ver') OR r->>'id'=u->>'id'; END IF;
 IF et_privado.rbac_rol(u->>'rol')='proveedor' AND NOT coalesce(et_privado.rbac_proveedor_fila(u,t,r),false) THEN RETURN false; END IF;
 IF et_privado.rbac_rol(u->>'rol')='proveedor' AND t='parque_vehicular' THEN RETURN et_privado.rbac_puede(u,'Cotizaciones Proveedor','ver'); END IF;
 RETURN coalesce(et_privado.rbac_puede(u,m,'ver',r),false);
END $$;
CREATE OR REPLACE FUNCTION et_privado.lectura_con_contexto(t text,r jsonb,c jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=c->'usuario'; rol text:=c->>'rol'; m text:=c->'tablas'->>t;
BEGIN
 IF u IS NULL THEN RETURN false; END IF;
 IF t='proveedores' AND rol='jefedealmacen'
   AND ((c->'modulos') ? 'Peticiones' OR (c->'modulos') ? 'Vales') THEN RETURN true; END IF;
 IF t='usuarios' THEN RETURN coalesce((c->'modulos') ? 'Usuarios',false) OR r->>'id'=u->>'id'; END IF;
 IF rol='proveedor' THEN
  IF NOT coalesce(et_privado.rbac_proveedor_fila(u,t,r),false) THEN RETURN false; END IF;
  IF t='parque_vehicular' THEN RETURN coalesce((c->'modulos') ? 'Cotizaciones Proveedor',false); END IF;
  m:=CASE WHEN t='peticiones' THEN 'Peticiones de almacén'
    WHEN t='cotizaciones_almacen' THEN 'Cotizaciones Proveedor'
    WHEN t IN ('requis_siif','oc_siif','sp_siif') THEN 'Seguimiento de trámites SIIF' ELSE m END;
 ELSIF t='peticiones' AND r->>'origen_peticion'='coordinador' THEN
  m:='Peticiones de Coordinadores';
 END IF;
 RETURN coalesce((c->'modulos') ? m,false);
END $$;
REVOKE ALL ON FUNCTION et_privado.rbac_lectura(text,jsonb),et_privado.lectura_con_contexto(text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION et_privado.rbac_lectura(text,jsonb),et_privado.lectura_con_contexto(text,jsonb,jsonb) TO anon,authenticated;

DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.usuarios WHERE activo IS TRUE) AND NOT EXISTS(
 SELECT 1 FROM public.usuarios u WHERE u.activo IS TRUE AND et_privado.rbac_puede(to_jsonb(u),'Usuarios','editar')) THEN
 RAISE EXCEPTION 'No hay SuperAdmin con Usuarios permitido para editar. Asigne primero ese m?dulo a la cuenta administradora; no se aplic? ning?n cambio.';
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
SELECT usuario,rol,modulos_permitidos FROM public.usuarios ORDER BY usuario;

-- 077_administracion_roles
CREATE TABLE IF NOT EXISTS et_privado.roles (
 clave text PRIMARY KEY, nombre text NOT NULL, revision integer NOT NULL DEFAULT 1
);
INSERT INTO et_privado.roles(clave,nombre)
 SELECT DISTINCT rol,rol FROM et_privado.rbac_base ON CONFLICT DO NOTHING;
INSERT INTO et_privado.roles(clave,nombre)
 SELECT et_privado.rbac_rol(rol),min(rol) FROM public.usuarios WHERE nullif(btrim(rol),'') IS NOT NULL
 GROUP BY et_privado.rbac_rol(rol) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS et_privado.roles_historial (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, fecha timestamptz NOT NULL DEFAULT now(),
 actor uuid NOT NULL, rol text NOT NULL, accion text NOT NULL, antes jsonb, despues jsonb
);
ALTER TABLE et_privado.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE et_privado.roles_historial ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON et_privado.roles,et_privado.roles_historial FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION et_privado.rbac_actor() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT (to_jsonb(u)-'password') || jsonb_build_object('permisos_rol',
   coalesce((SELECT jsonb_object_agg(b.modulo,b.acciones) FROM et_privado.rbac_base b
     WHERE b.rol=et_privado.rbac_rol(u.rol)),'{}'::jsonb))
 FROM public.usuarios u JOIN et_privado.sesiones_aplicacion s ON s.usuario_id=u.id
 WHERE s.token_hash=sha256(convert_to(coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb->>'x-et-session-token','UTF8'))
 AND s.expira_en>now() AND u.activo IS TRUE LIMIT 1
$$;
CREATE OR REPLACE FUNCTION et_privado.exigir_admin_roles() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor();
BEGIN
 IF u IS NULL OR et_privado.rbac_rol(u->>'rol')<>'superadmin' THEN
  RAISE EXCEPTION 'Solo SuperAdmin puede administrar roles' USING ERRCODE='42501';
 END IF;
 RETURN (u->>'id')::uuid;
END $$;
REVOKE ALL ON FUNCTION et_privado.exigir_admin_roles() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.admin_listar_roles() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE resultado jsonb;
BEGIN
 PERFORM et_privado.exigir_admin_roles();
 SELECT coalesce(jsonb_agg(jsonb_build_object('clave',r.clave,'nombre',r.nombre,'revision',r.revision,
  'usuarios',(SELECT count(*) FROM public.usuarios u WHERE et_privado.rbac_rol(u.rol)=r.clave),
  'permisos',coalesce((SELECT jsonb_object_agg(b.modulo,b.acciones) FROM et_privado.rbac_base b WHERE b.rol=r.clave),'{}'::jsonb)) ORDER BY r.nombre),'[]'::jsonb)
 INTO resultado FROM et_privado.roles r;
 RETURN resultado;
END $$;

CREATE OR REPLACE FUNCTION public.admin_guardar_rol(p_clave text,p_nombre text,p_permisos jsonb,p_revision integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
#variable_conflict use_variable
DECLARE actor uuid:=et_privado.exigir_admin_roles(); clave text:=et_privado.rbac_rol(p_clave);
 actual et_privado.roles%ROWTYPE; anterior jsonb; item record; accion text;
BEGIN
 IF clave IS NULL OR clave !~ '^[a-z0-9]{2,60}$' OR length(btrim(coalesce(p_nombre,''))) NOT BETWEEN 2 AND 80
  OR jsonb_typeof(p_permisos) IS DISTINCT FROM 'object' OR p_revision IS NULL OR p_revision<0 THEN
  RAISE EXCEPTION 'Nombre, clave o permisos inválidos';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtext('roles:'||clave));
 SELECT * INTO actual FROM et_privado.roles WHERE roles.clave=clave FOR UPDATE;
 IF (FOUND AND actual.revision<>p_revision) OR (NOT FOUND AND p_revision<>0) THEN
  RAISE EXCEPTION 'El rol cambió. Actualice antes de guardar' USING ERRCODE='40001';
 END IF;
 SELECT jsonb_object_agg(modulo,acciones) INTO anterior FROM et_privado.rbac_base WHERE rol=clave;
 FOR item IN SELECT * FROM jsonb_each(p_permisos) LOOP
  IF NOT EXISTS(SELECT 1 FROM et_privado.roles_modulos WHERE modulo=item.key)
   OR jsonb_typeof(item.value)<>'array' THEN RAISE EXCEPTION 'Módulo o acciones inválidos: %',item.key; END IF;
  IF jsonb_array_length(item.value)>0 AND NOT item.value ? 'ver' THEN RAISE EXCEPTION 'Las acciones requieren lectura'; END IF;
  IF item.key IN ('Usuarios','Roles','Licencias') AND clave<>'superadmin' AND jsonb_array_length(item.value)>0 THEN
   RAISE EXCEPTION 'Módulo reservado a SuperAdmin'; END IF;
  FOR accion IN SELECT jsonb_array_elements_text(item.value) LOOP
   IF accion NOT IN ('ver','crear','editar','eliminar','cambiar_estatus','autorizar','importar','generar_requisicion','exportar','imprimir','solicitar_cancelacion','aprobar_cancelacion') THEN RAISE EXCEPTION 'Acción inválida'; END IF;
   IF accion='eliminar' AND clave NOT IN ('superadmin','administradordelsistema') THEN RAISE EXCEPTION 'Este rol no puede eliminar registros'; END IF;
   IF accion='aprobar_cancelacion' AND clave NOT IN ('superadmin','administradordelsistema','jefedealmacen') THEN RAISE EXCEPTION 'Este rol no puede aprobar cancelaciones'; END IF;
  END LOOP;
 END LOOP;
 IF clave='superadmin' AND (NOT coalesce(p_permisos->'Usuarios' ?& ARRAY['ver','crear','editar'],false)
  OR NOT coalesce(p_permisos->'Roles' ? 'ver',false)) THEN
  RAISE EXCEPTION 'SuperAdmin debe conservar Usuarios y Roles'; END IF;
 INSERT INTO et_privado.roles AS dest(clave,nombre,revision) VALUES(clave,btrim(p_nombre),1)
 ON CONFLICT ON CONSTRAINT roles_pkey DO UPDATE SET nombre=excluded.nombre,revision=dest.revision+1;
 DELETE FROM et_privado.rbac_base WHERE rol=clave;
 INSERT INTO et_privado.rbac_base(rol,modulo,acciones) SELECT clave,key,value FROM jsonb_each(p_permisos) WHERE jsonb_array_length(value)>0;
 INSERT INTO et_privado.roles_historial(actor,rol,accion,antes,despues) VALUES(actor,clave,'guardar',anterior,p_permisos);
END $$;

CREATE TABLE IF NOT EXISTS et_privado.roles_modulos(modulo text PRIMARY KEY);
INSERT INTO et_privado.roles_modulos SELECT DISTINCT modulo FROM et_privado.rbac_base ON CONFLICT DO NOTHING;
INSERT INTO et_privado.roles_modulos VALUES('Roles') ON CONFLICT DO NOTHING;
ALTER TABLE et_privado.roles_modulos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON et_privado.roles_modulos FROM PUBLIC,anon,authenticated;
INSERT INTO et_privado.rbac_base VALUES('superadmin','Roles','["ver","crear","editar","eliminar"]')
 ON CONFLICT(rol,modulo) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_eliminar_rol(p_clave text,p_revision integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=et_privado.exigir_admin_roles(); actual et_privado.roles%ROWTYPE; anterior jsonb;
BEGIN
 IF p_clave='superadmin' THEN RAISE EXCEPTION 'SuperAdmin no se puede eliminar'; END IF;
 SELECT * INTO actual FROM et_privado.roles WHERE clave=p_clave FOR UPDATE;
 IF NOT FOUND OR actual.revision IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'El rol cambió. Actualice la lista' USING ERRCODE='40001'; END IF;
 IF EXISTS(SELECT 1 FROM public.usuarios WHERE et_privado.rbac_rol(rol)=p_clave) THEN
  RAISE EXCEPTION 'Reasigne primero los usuarios de este rol'; END IF;
 SELECT jsonb_object_agg(modulo,acciones) INTO anterior FROM et_privado.rbac_base WHERE rol=p_clave;
 DELETE FROM et_privado.rbac_base WHERE rol=p_clave;
 DELETE FROM et_privado.roles WHERE clave=p_clave;
 INSERT INTO et_privado.roles_historial(actor,rol,accion,antes) VALUES(actor,p_clave,'eliminar',anterior);
END $$;
CREATE OR REPLACE FUNCTION et_privado.validar_rol_asignado() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.rol IS NOT DISTINCT FROM OLD.rol THEN RETURN NEW; END IF;
 PERFORM 1 FROM et_privado.roles WHERE clave=et_privado.rbac_rol(NEW.rol) FOR KEY SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Seleccione un rol existente'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validar_rol_asignado ON public.usuarios;
CREATE TRIGGER validar_rol_asignado BEFORE INSERT OR UPDATE OF rol ON public.usuarios FOR EACH ROW EXECUTE FUNCTION et_privado.validar_rol_asignado();
REVOKE ALL ON FUNCTION et_privado.validar_rol_asignado() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_listar_roles(),public.admin_guardar_rol(text,text,jsonb,integer),public.admin_eliminar_rol(text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_listar_roles(),public.admin_guardar_rol(text,text,jsonb,integer),public.admin_eliminar_rol(text,integer) TO anon,authenticated;
CREATE OR REPLACE FUNCTION et_privado.rbac_puede(u jsonb,m text,a text,r jsonb DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE rol text:=et_privado.rbac_rol(u->>'rol'); permisos jsonb; ex jsonb; permitido boolean; visible boolean;
BEGIN
 IF u IS NULL OR coalesce((u->>'activo')::boolean,false)=false THEN RETURN false; END IF;
 IF m='Roles' THEN RETURN rol='superadmin'; END IF;
 IF NOT et_privado.limite_modulos_anterior(u,m,'ver') OR NOT et_privado.limite_modulos_anterior(u,m,a) THEN RETURN false; END IF;
 IF m='Usuarios' AND rol<>'superadmin' THEN RETURN false; END IF;
 IF m='Licencias' AND (rol<>'superadmin' OR lower(u->>'usuario')<>'emma') THEN RETURN false; END IF;
 IF a='eliminar' AND rol NOT IN ('superadmin','administradordelsistema') THEN RETURN false; END IF;
 IF a='aprobar_cancelacion' AND rol NOT IN ('superadmin','administradordelsistema','jefedealmacen') THEN RETURN false; END IF;
 SELECT b.acciones INTO permisos FROM et_privado.rbac_base b WHERE b.rol=et_privado.rbac_rol(u->>'rol') AND b.modulo=m;
 ex:=u->'permisos_excepciones'->m;
 visible:=CASE WHEN jsonb_typeof(ex->'ver')='boolean' THEN (ex->>'ver')::boolean ELSE coalesce(permisos ? 'ver',false) AND et_privado.limite_modulos_anterior(u,m,'ver') END;
 permitido:=CASE WHEN jsonb_typeof(ex->a)='boolean' THEN (ex->>a)::boolean ELSE coalesce(permisos ? a,false) AND et_privado.limite_modulos_anterior(u,m,a) END;
 IF NOT visible OR NOT permitido THEN RETURN false; END IF;
 IF r IS NOT NULL AND a IN ('editar','cambiar_estatus','autorizar','solicitar_cancelacion') AND rol IN ('coordinador','coordinadorinfraestructura','tecnico') THEN
   RETURN coalesce(nullif(coalesce(r->>'rbac_creado_por',r->>'creado_por',r->>'creada_por_id',r->>'usuario_id',r->>'solicitante_id'),'')=u->>'id',false);
 END IF;
 RETURN true;
END $$;
NOTIFY pgrst,'reload schema';

-- 078_cancelacion_desde_modulos
CREATE TABLE IF NOT EXISTS et_privado.cancelacion_tablas(tabla text PRIMARY KEY);
INSERT INTO et_privado.cancelacion_tablas(tabla)
 SELECT tabla FROM et_privado.rbac_tablas WHERE tabla IN
 ('parque_vehicular','peticiones','cotizaciones_almacen','requis_siif','oc_siif','sp_siif',
 'acuerdos','eventos_calendario','ingresos_taller','ingresos_taller_pendientes','vales',
 'tramites_administrativos','empleados','periodos_tiempo_extra','ordenes_trabajo','requisiciones_siif')
 ON CONFLICT DO NOTHING;
ALTER TABLE et_privado.cancelacion_tablas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON et_privado.cancelacion_tablas FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT tabla FROM et_privado.cancelacion_tablas LOOP
  IF to_regclass(format('public.%I',t.tabla)) IS NULL THEN CONTINUE; END IF;
  EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS rbac_cancelado_por uuid, ADD COLUMN IF NOT EXISTS rbac_cancelado_en timestamptz, ADD COLUMN IF NOT EXISTS rbac_motivo_cancelacion text',t.tabla);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.cancelar_registro_modulo(p_tabla text,p_registro uuid,p_motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor(); r jsonb; m text; solicitud uuid;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sesión inválida' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM et_privado.cancelacion_tablas WHERE tabla=p_tabla)
 OR to_regclass(format('public.%I',p_tabla)) IS NULL THEN RAISE EXCEPTION 'Este módulo no admite cancelaciones'; END IF;
 IF length(btrim(coalesce(p_motivo,''))) NOT BETWEEN 5 AND 1000 THEN RAISE EXCEPTION 'Escriba un motivo de 5 a 1000 caracteres'; END IF;
 EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 FOR UPDATE',p_tabla) INTO r USING p_registro;
 m:=et_privado.rbac_modulo(p_tabla,r);
 IF r IS NULL OR NOT coalesce(et_privado.rbac_lectura(p_tabla,r),false)
  OR NOT coalesce(et_privado.rbac_puede(u,m,'solicitar_cancelacion',r),false) THEN
  RAISE EXCEPTION 'Sin permiso para cancelar este registro' USING ERRCODE='42501'; END IF;
 IF coalesce((r->>'rbac_cancelado')::boolean,false) THEN RAISE EXCEPTION 'El registro ya está cancelado'; END IF;
 SELECT id INTO solicitud FROM public.solicitudes_cancelacion
 WHERE tabla=p_tabla AND registro_id=p_registro AND estado='Pendiente' FOR UPDATE;
 IF solicitud IS NULL THEN
  INSERT INTO public.solicitudes_cancelacion(tabla,registro_id,modulo,motivo,solicitante_id)
  VALUES(p_tabla,p_registro,m,btrim(p_motivo),(u->>'id')::uuid) RETURNING id INTO solicitud;
 END IF;
 -- Se conserva el historial anterior. La aprobación es inmediata por el permiso del módulo.
 UPDATE public.solicitudes_cancelacion SET estado='Aprobada',resolucion=btrim(p_motivo),
  resuelto_por=(u->>'id')::uuid,resuelto_en=now() WHERE id=solicitud;
END $$;
CREATE OR REPLACE FUNCTION et_privado.rbac_aplicar_cancelacion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.estado='Aprobada' AND OLD.estado='Pendiente' THEN
  IF NOT EXISTS(SELECT 1 FROM et_privado.cancelacion_tablas WHERE tabla=NEW.tabla) THEN
   RAISE EXCEPTION 'Tabla no habilitada para cancelar'; END IF;
  EXECUTE format('UPDATE public.%I SET rbac_cancelado=true,rbac_cancelado_por=$2,rbac_cancelado_en=$3,rbac_motivo_cancelacion=$4 WHERE id=$1',NEW.tabla)
  USING NEW.registro_id,NEW.resuelto_por,NEW.resuelto_en,NEW.resolucion;
 END IF;
 RETURN NEW;
END $$;
-- Impedir falsificar los datos de cancelación mediante UPDATE directo.
CREATE OR REPLACE FUNCTION et_privado.proteger_datos_cancelacion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF pg_trigger_depth()>1 THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
  NEW.rbac_cancelado_por:=NULL;NEW.rbac_cancelado_en:=NULL;NEW.rbac_motivo_cancelacion:=NULL;
 ELSIF NEW.rbac_cancelado_por IS DISTINCT FROM OLD.rbac_cancelado_por
 OR NEW.rbac_cancelado_en IS DISTINCT FROM OLD.rbac_cancelado_en
 OR NEW.rbac_motivo_cancelacion IS DISTINCT FROM OLD.rbac_motivo_cancelacion THEN
  RAISE EXCEPTION 'Use Cancelar registro desde el módulo' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT tabla FROM et_privado.cancelacion_tablas LOOP
  IF to_regclass(format('public.%I',t.tabla)) IS NULL THEN CONTINUE; END IF;
  EXECUTE format('DROP TRIGGER IF EXISTS proteger_datos_cancelacion ON public.%I',t.tabla);
  EXECUTE format('CREATE TRIGGER proteger_datos_cancelacion BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION et_privado.proteger_datos_cancelacion()',t.tabla);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.solicitar_cancelacion(text,uuid,text),public.resolver_cancelacion(uuid,boolean,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION et_privado.rbac_aplicar_cancelacion(),et_privado.proteger_datos_cancelacion() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.cancelar_registro_modulo(text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancelar_registro_modulo(text,uuid,text) TO anon,authenticated;
DO $$ DECLARE definicion text; BEGIN
 definicion:=pg_get_functiondef('et_privado.rbac_escritura()'::regprocedure);
 definicion:=replace(definicion,'Solicite la cancelación mediante el módulo Cancelaciones','Use Cancelar registro desde este módulo');
 EXECUTE definicion;
END $$;
NOTIFY pgrst,'reload schema';

-- 079_proveedores_tecnicos_vales
-- Permite consultar proveedores para asignarlos en Vales.
-- Conserva permisos de escritura, excepciones y autoria.
CREATE OR REPLACE FUNCTION et_privado.rbac_lectura(t text,r jsonb) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor(); m text:=et_privado.rbac_modulo(t,r);
BEGIN
 IF u IS NULL THEN RETURN false; END IF;
 IF t='proveedores' AND et_privado.rbac_rol(u->>'rol')='jefedealmacen'
   AND (et_privado.rbac_puede(u,'Peticiones','ver') OR et_privado.rbac_puede(u,'Vales','ver')) THEN
   RETURN true;
 END IF;
 IF t='proveedores' AND et_privado.rbac_rol(u->>'rol') IN ('tecnico','tecnicovales')
   AND et_privado.rbac_puede(u,'Vales','ver') THEN RETURN true; END IF;
 IF t='usuarios' THEN RETURN et_privado.rbac_rol(u->>'rol')='superadmin' OR r->>'id'=u->>'id'; END IF;
 IF et_privado.rbac_rol(u->>'rol')='proveedor' AND NOT coalesce(et_privado.rbac_proveedor_fila(u,t,r),false) THEN RETURN false; END IF;
 IF et_privado.rbac_rol(u->>'rol')='proveedor' AND t='parque_vehicular' THEN RETURN true; END IF;
 RETURN coalesce(et_privado.rbac_puede(u,m,'ver',r),false);
END $$;
CREATE OR REPLACE FUNCTION et_privado.lectura_con_contexto(t text,r jsonb,c jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=c->'usuario'; rol text:=c->>'rol'; m text:=c->'tablas'->>t;
BEGIN
 IF u IS NULL THEN RETURN false; END IF;
 IF t='proveedores' AND rol='jefedealmacen'
   AND ((c->'modulos') ? 'Peticiones' OR (c->'modulos') ? 'Vales') THEN RETURN true; END IF;
 IF t='proveedores' AND rol IN ('tecnico','tecnicovales')
   AND (c->'modulos') ? 'Vales' THEN RETURN true; END IF;
 IF t='usuarios' THEN RETURN rol='superadmin' OR r->>'id'=u->>'id'; END IF;
 IF rol='proveedor' THEN
  IF NOT coalesce(et_privado.rbac_proveedor_fila(u,t,r),false) THEN RETURN false; END IF;
  IF t='parque_vehicular' THEN RETURN true; END IF;
  m:=CASE WHEN t='peticiones' THEN 'Peticiones de almacén'
    WHEN t='cotizaciones_almacen' THEN 'Cotizaciones Proveedor'
    WHEN t IN ('requis_siif','oc_siif','sp_siif') THEN 'Seguimiento de trámites SIIF' ELSE m END;
 ELSIF t='peticiones' AND r->>'origen_peticion'='coordinador' THEN
  m:='Peticiones de Coordinadores';
 END IF;
 RETURN coalesce((c->'modulos') ? m,false);
END $$;
REVOKE ALL ON FUNCTION et_privado.rbac_lectura(text,jsonb),et_privado.lectura_con_contexto(text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION et_privado.rbac_lectura(text,jsonb),et_privado.lectura_con_contexto(text,jsonb,jsonb) TO anon,authenticated;
NOTIFY pgrst,'reload schema';

-- 080_cancelacion_peticiones_roles
-- Regla obligatoria, incluso si existen excepciones de permisos por usuario.
DO $$ DECLARE definicion text; BEGIN
 definicion := pg_get_functiondef('et_privado.rbac_puede(jsonb,text,text,jsonb)'::regprocedure);
 IF position('cancelacion_peticiones_roles' IN definicion)=0 THEN
  definicion := regexp_replace(definicion, '\mBEGIN\M', $regla$BEGIN
   -- cancelacion_peticiones_roles
   IF m='Peticiones' AND a='solicitar_cancelacion'
      AND et_privado.rbac_rol(u->>'rol') NOT IN ('superadmin','jefedealmacen') THEN RETURN false; END IF;
  $regla$);
  EXECUTE definicion;
 END IF;
END $$;

CREATE OR REPLACE FUNCTION et_privado.proteger_cancelacion_peticion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE u jsonb:=et_privado.rbac_actor(); cambia boolean;
BEGIN
 IF TG_OP='INSERT' THEN
  cambia:=coalesce(NEW.rbac_cancelado,false) OR lower(btrim(coalesce(NEW.estatus,''))) IN ('cancelado','cancelada');
 ELSE
  cambia:=(coalesce(NEW.rbac_cancelado,false) AND NOT coalesce(OLD.rbac_cancelado,false))
   OR (NEW.estatus IS DISTINCT FROM OLD.estatus AND lower(btrim(coalesce(NEW.estatus,''))) IN ('cancelado','cancelada'));
 END IF;
 IF cambia AND coalesce(NEW.origen_peticion,'')<>'coordinador' THEN
  IF NOT coalesce(et_privado.rbac_puede(u,'Peticiones','solicitar_cancelacion',to_jsonb(NEW)),false) THEN
   RAISE EXCEPTION 'Sin permiso: solo SuperAdmin y Jefe de Almacén pueden cancelar peticiones' USING ERRCODE='42501';
  END IF;
  IF NOT coalesce(NEW.rbac_cancelado,false) THEN
   RAISE EXCEPTION 'Use Cancelar petición e indique el motivo' USING ERRCODE='42501';
  END IF;
  NEW.estatus:='CANCELADO';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proteger_cancelacion_peticion ON public.peticiones;
CREATE TRIGGER proteger_cancelacion_peticion BEFORE INSERT OR UPDATE ON public.peticiones
FOR EACH ROW EXECUTE FUNCTION et_privado.proteger_cancelacion_peticion();
REVOKE ALL ON FUNCTION et_privado.proteger_cancelacion_peticion() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';

COMMIT;
SELECT 'Protección instalada. Cierre sesión y vuelva a entrar.' AS resultado;
