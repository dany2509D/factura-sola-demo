// Componentes de interfaz compartidos: banner de demo, avisos (toast) y diálogos.
import { h, $, clear } from './dom.js';

/**
 * Banner fijo arriba. Publica su alto en --banner-h para que el resto lo respete.
 * Con `whatsapp` el botón principal abre WhatsApp con el mensaje ya escrito.
 */
export function mountBanner(container, { whatsapp } = {}) {
  const banner = h('div', { class: 'demo-banner', role: 'region', 'aria-label': 'Aviso de demostración' },
    h('p', { class: 'demo-banner__text' },
      'Demo · Datos ficticios · No ingrese información real'),
    h('a', { class: 'demo-banner__cta', href: whatsapp, target: '_blank', rel: 'noopener' },
      'Agende un diagnóstico gratis por WhatsApp'));
  container.append(banner);
  const sync = () => document.documentElement.style.setProperty('--banner-h', `${banner.offsetHeight}px`);
  sync();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(sync).observe(banner);
  else addEventListener('resize', sync);
  return banner;
}

/** Aviso breve; se anuncia a lectores de pantalla. */
export function toast(message, { kind = 'info', ms = 3600 } = {}) {
  let region = $('#toasts');
  if (!region) {
    region = h('div', { id: 'toasts', class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(region);
  }
  const el = h('div', { class: `toast toast--${kind}` }, message);
  region.append(el);
  setTimeout(() => el.remove(), ms);
  return el;
}

/** Diálogo modal nativo (<dialog>): foco atrapado, Esc cierra. */
export function openDialog({ title, body, wide = false, onClose, labelledBy = 'dlg-title' }) {
  const dlg = h('dialog', { class: `dlg${wide ? ' dlg--wide' : ''}`, 'aria-labelledby': labelledBy });
  const close = () => { if (dlg.open) dlg.close(); };
  const head = h('div', { class: 'dlg__head' },
    h('h2', { id: labelledBy, class: 'dlg__title' }, title),
    h('button', { class: 'btn btn--ghost btn--icon', type: 'button', 'aria-label': 'Cerrar', onclick: close }, '✕'));
  const content = h('div', { class: 'dlg__body' });
  if (body) content.append(body);
  dlg.append(head, content);
  dlg.addEventListener('close', () => { dlg.remove(); onClose?.(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  document.body.append(dlg);
  dlg.showModal();
  return { dialog: dlg, close, setBody(node) { clear(content).append(node); }, setTitle(t) { $('.dlg__title', dlg).textContent = t; } };
}

/** Confirmación con <dialog>; resuelve true/false. */
export function confirmDialog({ title, text, confirmLabel = 'Aceptar', cancelLabel = 'Cancelar', danger = false }) {
  return new Promise((resolve) => {
    let answer = false;
    const body = h('div', null,
      h('p', null, text),
      h('div', { class: 'dlg__actions' },
        h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => d.close() }, cancelLabel),
        h('button', { class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`, type: 'button', onclick: () => { answer = true; d.close(); } }, confirmLabel)));
    const d = openDialog({ title, body, labelledBy: 'dlg-confirm', onClose: () => resolve(answer) });
  });
}
