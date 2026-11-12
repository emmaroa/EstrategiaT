const fs=require('node:fs');
const names=['070_roles_acciones_cancelaciones','071_barrera_sesion_tablas','072_cerrar_accesos_rpc','073_optimizar_lecturas_rls','074_catalogo_proveedores_jefe_almacen','075_respetar_modulos_personalizados','076_modulos_permitidos_obligatorios','077_administracion_roles'];
const parts=names.map(n=>{
 const s=fs.readFileSync('supabase/migrations/'+n+'.sql','utf8');
 if(!/^BEGIN;$/m.test(s)||!/^COMMIT;$/m.test(s))throw Error('Transacción no reconocida: '+n);
 return '-- '+n+'\n'+s.replace(/^BEGIN;\r?\n/m,'').replace(/^COMMIT;\r?\n?/m,'');
});
const pre=`-- EstrategiaT 2.0.161: instalación conjunta, no ejecutar 070/071/072 por separado.
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
`;
fs.writeFileSync('supabase/INSTALAR_SEGURIDAD.sql',pre+parts.join('\n')+`\nCOMMIT;
SELECT 'Protección instalada. Cierre sesión y vuelva a entrar.' AS resultado;
`);
