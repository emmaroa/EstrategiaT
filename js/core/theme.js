/**
 * Tema claro/oscuro — persistido en localStorage
 */
(function (global) {
  const STORAGE_KEY = "et_theme";
  const PALETTE_KEY = "et_palette";
  const PALETTES = ["original", "turquesa-naranja", "azul-rey", "oceano", "bosque", "violeta", "coral", "personalizada"];
  const DEFAULT_COLORS = { primary: "#fc712b", secondary: "#fd9319", teal: "#07b1bc" };
  const CUSTOM_VARS = ["--color-primary", "--color-primary-hover", "--color-primary-soft", "--color-secondary", "--color-accent", "--color-teal", "--color-teal-dark", "--shadow-focus"];

  function getCustomColors() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem("et_custom_colors_" + getActiveUserId()) || "{}"); } catch (_) {}
    return Object.fromEntries(Object.entries(DEFAULT_COLORS).map(([key, fallback]) => [key, /^#[0-9a-f]{6}$/i.test(saved?.[key]) ? saved[key] : fallback]));
  }

  function setCustomColors(colors) {
    const validated = Object.fromEntries(Object.entries(DEFAULT_COLORS).map(([key, fallback]) => [key, /^#[0-9a-f]{6}$/i.test(colors?.[key]) ? colors[key] : fallback]));
    localStorage.setItem("et_custom_colors_" + getActiveUserId(), JSON.stringify(validated));
  }

  function getActiveUserId() {
    try {
      const usuario = JSON.parse(localStorage.getItem("usuarioActivo") || "null");
      return usuario && (usuario.id || usuario.usuario) ? String(usuario.id || usuario.usuario) : "guest";
    } catch (_) { return "guest"; }
  }

  function getPalette() {
    const guardada = localStorage.getItem(PALETTE_KEY + "_" + getActiveUserId()) || (getActiveUserId() === "guest" ? localStorage.getItem(PALETTE_KEY) : null) || "original";
    return PALETTES.includes(guardada) ? guardada : "original";
  }

  function applyPalette(palette, persistir) {
    const valor = PALETTES.includes(palette) ? palette : "original";
    document.documentElement.setAttribute("data-palette", valor);
    CUSTOM_VARS.forEach(key => document.documentElement.style.removeProperty(key));
    if (valor === "personalizada") {
      const colors = getCustomColors();
      const vars = {
        "--color-primary": colors.primary,
        "--color-primary-hover": `color-mix(in srgb, ${colors.primary} 85%, black)`,
        "--color-primary-soft": `color-mix(in srgb, ${colors.primary} 14%, transparent)`,
        "--color-secondary": colors.secondary,
        "--color-accent": colors.secondary,
        "--color-teal": colors.teal,
        "--color-teal-dark": `color-mix(in srgb, ${colors.teal} 75%, black)`,
        "--shadow-focus": `0 0 0 4px color-mix(in srgb, ${colors.teal} 20%, transparent)`
      };
      Object.entries(vars).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    }
    if (persistir !== false) {
      localStorage.setItem(PALETTE_KEY + "_" + getActiveUserId(), valor);
    }
  }

  function getTheme() {
    const value = localStorage.getItem(STORAGE_KEY + "_" + getActiveUserId()) || localStorage.getItem(STORAGE_KEY) || "dark";
    return value === "light" ? "light" : "dark";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY + "_" + getActiveUserId(), theme);
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

  global.ETTheme = { getTheme, applyTheme, toggleTheme, getPalette, applyPalette, getCustomColors, setCustomColors, PALETTES };
})(window);
