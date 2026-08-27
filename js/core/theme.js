/**
 * Tema claro/oscuro — persistido en localStorage
 */
(function (global) {
  const STORAGE_KEY = "et_theme";
  const PALETTE_KEY = "et_palette";
  const PALETTES = ["original", "oceano", "bosque", "violeta", "coral"];

  function getActiveUserId() {
    try {
      const usuario = JSON.parse(localStorage.getItem("usuarioActivo") || "null");
      return usuario && (usuario.id || usuario.usuario) ? String(usuario.id || usuario.usuario) : "guest";
    } catch (_) { return "guest"; }
  }

  function getPalette() {
    const guardada = localStorage.getItem(PALETTE_KEY + "_" + getActiveUserId()) || localStorage.getItem(PALETTE_KEY) || "original";
    return PALETTES.includes(guardada) ? guardada : "original";
  }

  function applyPalette(palette, persistir) {
    const valor = PALETTES.includes(palette) ? palette : "original";
    document.documentElement.setAttribute("data-palette", valor);
    if (persistir !== false) {
      localStorage.setItem(PALETTE_KEY + "_" + getActiveUserId(), valor);
      localStorage.setItem(PALETTE_KEY, valor);
    }
  }

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || "dark";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
    document.querySelectorAll("[data-theme-icon]").forEach(function (el) {
      el.textContent = theme === "dark" ? "☀️" : "🌙";
    });
  }

  function toggleTheme() {
    applyTheme(getTheme() === "dark" ? "light" : "dark");
  }

  function initTheme() {
    applyTheme(getTheme());
    applyPalette(getPalette(), false);
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", toggleTheme);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTheme);
  } else {
    initTheme();
  }

  global.ETTheme = { getTheme, applyTheme, toggleTheme, getPalette, applyPalette, PALETTES };
})(window);
