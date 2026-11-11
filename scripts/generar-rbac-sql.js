const fs=require('node:fs'),vm=require('node:vm');
const ctx={};vm.runInNewContext(fs.readFileSync('js/core/rbac.js','utf8'),ctx);
const r=ctx.ETRbac;
const quote=v=>"'"+String(v).replace(/'/g,"''")+"'";
const base=Object.entries(r.matriz).flatMap(([rol,modulos])=>Object.entries(modulos).map(([modulo,acciones])=>`(${quote(rol)},${quote(modulo)},${quote(JSON.stringify(acciones))}::jsonb)`)).join(',\n');
const tablas=Object.entries(r.tablas).map(([tabla,modulo])=>`(${quote(tabla)},${quote(modulo)})`).join(',\n');
const template=fs.readFileSync('scripts/rbac-migracion.template.sql','utf8');
fs.writeFileSync('supabase/migrations/070_roles_acciones_cancelaciones.sql',template.replace('/* MATRIZ */',base).replace('/* TABLAS */',tablas));
