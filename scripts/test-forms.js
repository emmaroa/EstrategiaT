const fs = require("fs");

const layout = fs.readFileSync("js/core/layout.js", "utf8");
const styles = fs.readFileSync("css/design-system.css", "utf8");
const usuarios = fs.readFileSync("modulos/usuarios.html", "utf8");
const permisos = fs.readFileSync("js/core/roles-admin.js", "utf8");

const checks = [
  [layout.includes("Descartar cambios"), "Falta protección contra cambios sin guardar"],
  [layout.includes("document.querySelectorAll(\"input, select, textarea\").forEach(prepararControl)"), "La mejora no cubre todos los campos"],
  [layout.includes("observadorFormularios"), "Falta soporte para formularios dinámicos"],
  [layout.includes("et-character-count"), "Falta el contador de caracteres"],
  [styles.includes(".et-field-invalid"), "Faltan estilos de validación"],
  [styles.includes(".et-character-count"), "Faltan estilos del contador"],
  [styles.includes("position: sticky"), "Falta fijar elementos de las ventanas"],
  [usuarios.includes("editarUsuario('" + '" + u.id + "' + "')"), "Editar usuario debe usar el identificador estable"],
  [usuarios.includes("usuariosSistema.find(function (usuario) { return usuario.id === id; })"), "Las acciones de usuario deben resolver por identificador"]
  ,[permisos.includes("acceso.dataset.rbacAccess=modulo"), "Cada módulo debe tener selector de acceso"]
  ,[permisos.includes("?'ver':'none'"), "Los usuarios nuevos deben comenzar sin permisos"]
  ,[usuarios.includes("filter(s=>s.value!=='none')"), "Los módulos sin acceso no deben incluirse en la lista permitida"]
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  failed.forEach(([, message]) => console.error("ERROR:", message));
  process.exit(1);
}

console.log("Formularios: validación, cambios pendientes y ventanas verificados.");
