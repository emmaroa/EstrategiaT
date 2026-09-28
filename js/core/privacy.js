(function (global) {
  'use strict';
  const root = new URL('../../', document.currentScript.src);
  const VERSION = '2026-09-27';
  const KEY = 'et_privacy_choices';
  const ACCEPTANCE_KEY = 'et_privacy_policy_accepted';
  let policyAccepted = false;
  const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  let memory = null, dialog, banner, opener;
  let sequence = 0;
  function read() {
    let value = memory;
    try { if (!value) value = JSON.parse(localStorage.getItem(KEY)); } catch (_) {}
    if (!value || value.version !== VERSION || !Number.isFinite(value.at) || value.at > Date.now() || Date.now() - value.at >= MAX_AGE) return null;
    return { version: VERSION, at: value.at, external: value.external === true };
  }
  function allows(category) { return category === 'essential' || (category === 'external' && read()?.external === true); }
  function save(external) {
    memory = { version: VERSION, at: Date.now(), external: external === true };
    let persisted = true;
    try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch (_) { persisted = false; }
    const bannerHadFocus = banner?.contains(document.activeElement);
    if (banner) banner.hidden = true;
    if (dialog?.open) dialog.close();
    else if (bannerHadFocus) document.querySelector('[data-privacy-settings]')?.focus();
    announce(persisted ? 'Preferencias de privacidad guardadas. Puedes cambiarlas en el pie de página.' : 'Preferencia aplicada solo a esta página; el navegador no permite guardarla.');
    global.dispatchEvent(new CustomEvent('et:privacy-change', { detail: read() }));
  }
  function announce(text) {
    const el = document.getElementById('etPrivacyStatus');
    if (el) el.textContent = text;
  }
  function configure() {
    opener = document.activeElement;
    dialog.querySelector('#etExternalConsent').checked = allows('external');
    dialog.showModal();
  }
  function hasAcceptedPolicy() {
    try { return policyAccepted || localStorage.getItem(ACCEPTANCE_KEY) === VERSION; } catch (_) { return policyAccepted; }
  }
  function acceptPolicy() {
    policyAccepted = true;
    try { localStorage.setItem(ACCEPTANCE_KEY, VERSION); } catch (_) {}
    document.querySelectorAll('.et-privacy-accept').forEach(block => block.remove());
  }
  function stop(event, scope) {
    if (!scope?.matches('[data-privacy-login]')) return true;
    if (hasAcceptedPolicy()) return true;
    const checkbox = scope?.querySelector('[data-privacy-accept]');
    if (!checkbox) return true;
    if (checkbox.checked) { acceptPolicy(); return true; }
    event.preventDefault();
    event.stopImmediatePropagation();
    const error = scope.querySelector('[data-privacy-error]');
    error.hidden = false;
    checkbox.setAttribute('aria-invalid', 'true');
    checkbox.focus();
    return false;
  }
  function scopeFor(button) {
    return button.closest('form, .modal-card, .login-card, .card, .panel, .profile-card, section, dialog') || button.parentElement;
  }
  function prepare(scope) {
    if (!scope?.matches('[data-privacy-login]')) return;
    if (hasAcceptedPolicy()) return;
    if (!scope || scope.closest('[data-privacy-ui]') || scope.dataset.privacyScope) return;
    scope.dataset.privacyScope = 'true';
    const id = 'etPrivacyAccept' + (++sequence);
    const block = document.createElement('div');
    block.className = 'et-privacy-accept';
    block.innerHTML = '<label for="' + id + '"><input type="checkbox" id="' + id + '" data-privacy-accept required aria-describedby="' + id + 'Note ' + id + 'Error"><span>Acepto la <a target="_blank" rel="noopener" href="' + new URL('privacidad.html', root).href + '">Política de Privacidad<span class="sr-only"> (abre otra pestaña)</span></a>.</span></label>' +
      '<details><summary>Más información</summary><small id="' + id + 'Note">La aceptación se recuerda en este navegador para el uso del sistema, incluida la captura y edición de registros, conforme a la Política de Privacidad. No autoriza publicidad, servicios opcionales ni el tratamiento de datos de otras personas sin una base legal.</small></details>' +
      '<p id="' + id + 'Error" data-privacy-error role="alert" hidden>Lee la Política de Privacidad y marca la casilla antes de continuar.</p>';
    const actions = scope.querySelector('.modal-actions, .profile-actions, .actions-right, .licencias-acciones, .dashboard-customizer-footer');
    if (actions && actions.parentElement) actions.before(block);
    else {
      const submit = scope.querySelector('[data-privacy-submit], button[type="submit"]');
      if (submit) submit.before(block); else scope.appendChild(block);
    }
    block.querySelector('input').addEventListener('change', function () {
      this.removeAttribute('aria-invalid');
      block.querySelector('[data-privacy-error]').hidden = true;
      if (this.checked) acceptPolicy();
    });
  }
  function prepareForms() {
    document.querySelectorAll('[data-privacy-login]').forEach(prepare);
  }
  // Capture before native, inline and application handlers. The Enter login path is covered too.
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-privacy-submit], button[type="submit"], input[type="submit"]');
    if (button && !button.closest('[data-privacy-ui]')) { const scope = scopeFor(button); prepare(scope); stop(event, scope); }
  }, true);
  document.addEventListener('submit', event => { if (!event.target.closest('[data-privacy-ui]')) { prepare(event.target); stop(event, event.target); } }, true);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.target.matches('textarea, a, button, input[type="checkbox"], input[type="radio"]')) return;
    const scope = event.target.closest('[data-privacy-scope]');
    if (scope) stop(event, scope);
  }, true);
  document.addEventListener('reset', event => {
    const box = event.target.querySelector('[data-privacy-accept]');
    if (box) { box.checked = false; box.removeAttribute('aria-invalid'); }
  }, true);
  function init() {
    const host = document.createElement('div');
    host.dataset.privacyUi = 'true';
    host.innerHTML = '<p id="etPrivacyStatus" class="sr-only" role="status" aria-live="polite"></p>' +
      '<section class="et-privacy-banner" aria-labelledby="etPrivacyBannerTitle" hidden><h2 id="etPrivacyBannerTitle">Tu privacidad</h2><p>Usamos almacenamiento necesario para la sesión y tus ajustes. Puedes permitir la copia opcional de peticiones a Google Sheets. No usamos analítica ni publicidad.</p><a href="' + new URL('cookies.html', root).href + '">Cookies y almacenamiento</a><div class="et-privacy-actions"><button type="button" data-choice="accept">Aceptar opcionales</button><button type="button" data-choice="reject">Rechazar opcionales</button><button type="button" data-choice="configure">Configurar</button></div></section>' +
      '<dialog class="et-privacy-dialog" aria-labelledby="etPrivacyTitle"><h2 id="etPrivacyTitle">Preferencias de privacidad</h2><p>El acceso y el guardado en EstrategiaT funcionan aunque rechaces los servicios opcionales.</p><p><strong>Necesarios:</strong> sesión, seguridad y ajustes solicitados. Siempre activos.</p><label class="et-privacy-option" for="etExternalConsent"><input id="etExternalConsent" type="checkbox"><span>Permitir sincronización opcional con Google Sheets al guardar peticiones</span></label><p>Se envían los datos de la petición a Google Apps Script. Esta elección no sustituye la autorización de las personas cuyos datos registras.</p><p>Analítica y publicidad: no instaladas. No se ofrece venta ni intercambio publicitario de datos en esta aplicación.</p><p>Al desactivar esta opción se detienen los envíos futuros; para solicitar la eliminación de copias ya enviadas consulta la Política de Privacidad.</p><div class="et-privacy-actions"><button type="button" data-choice="save">Guardar preferencias</button><button type="button" data-choice="reject">Rechazar opcionales</button><button type="button" data-choice="close">Cerrar sin cambios</button></div></dialog>';
    document.body.appendChild(host);
    dialog = host.querySelector('dialog'); banner = host.querySelector('section');
    banner.hidden = !!read();
    host.addEventListener('click', event => {
      const action = event.target.closest('[data-choice]')?.dataset.choice;
      if (action === 'accept') save(true);
      if (action === 'reject') save(false);
      if (action === 'configure') configure();
      if (action === 'save') save(dialog.querySelector('input').checked);
      if (action === 'close') dialog.close();
    });
    dialog.addEventListener('close', () => { if (opener?.isConnected) opener.focus(); });
    document.querySelectorAll('[data-privacy-settings]').forEach(button => button.addEventListener('click', configure));
    document.querySelectorAll('[data-copyright-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
    prepareForms();
    new MutationObserver(prepareForms).observe(document.body, { childList: true, subtree: true });
    global.addEventListener('storage', event => { if (event.key === KEY || event.key === null) { memory = null; banner.hidden = !!read(); } });
  }
  global.ETPrivacy = { allows, configure, version: VERSION };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
