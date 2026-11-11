// Modo Presentación (reutilizable): recorre el flujo principal paso a paso. Cada paso ejecuta
// una acción real de la demo y muestra una nota corta de qué se está demostrando.
// Se puede pausar, avanzar, retroceder (vuelve a reproducir desde el inicio) y salir.
import { h, $, $$, clear, reducedMotion } from './dom.js';

export function createPresentation({ getSteps, onStart, onStop, root = document.body }) {
  let steps = []; let i = 0; let playing = false; let card = null; let timer = null; let busy = false; let active = false; let token = 0;

  const clearHighlight = () => $$('.pres-hl').forEach((el) => el.classList.remove('pres-hl'));
  const highlight = (sel) => {
    clearHighlight();
    const list = [].concat(sel || []);
    let first = null;
    for (const s of list) for (const el of $$(s)) { el.classList.add('pres-hl'); first = first || el; }
    first?.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
  };

  function paint() {
    if (!card) return;
    const s = steps[i];
    clear(card);
    card.append(
      h('div', { class: 'pres__top' }, h('span', null, `Paso ${i + 1} de ${steps.length}`), h('span', null, playing ? 'Reproduciendo' : 'En pausa')),
      h('div', { class: 'pres__bar', 'aria-hidden': 'true' }, h('i', { style: { width: `${((i + 1) / steps.length) * 100}%` } })),
      h('h2', { id: 'pres-title' }, s.title),
      h('p', { id: 'pres-note', 'aria-live': 'polite' }, s.note),
      h('div', { class: 'pres__act' },
        h('div', { class: 'row', style: { gap: '8px' } },
          h('button', { class: 'btn btn--sm', type: 'button', disabled: busy || i === 0, onclick: prev }, '◀ Anterior'),
          h('button', { class: 'btn btn--sm', type: 'button', onclick: togglePlay, 'aria-pressed': String(playing) }, playing ? '⏸ Pausar' : '▶ Reproducir solo'),
          h('button', { class: 'btn btn--sm btn--primary', type: 'button', disabled: busy, onclick: next }, i === steps.length - 1 ? 'Terminar' : 'Siguiente ▶')),
        h('div', { class: 'row', style: { gap: '8px' } },
          s.link ? h('a', { class: 'btn btn--sm btn--primary', href: s.link.href, target: '_blank', rel: 'noopener' }, s.link.label) : null,
          h('button', { class: 'btn btn--sm', type: 'button', onclick: stop }, 'Salir (Esc)'))));
  }

  async function show(idx, { replay = false } = {}) {
    const my = ++token;
    clearTimeout(timer);
    busy = true; i = idx; paint();
    try {
      if (replay) {
        await onStart({ silent: true });
        for (let j = 0; j < idx; j++) await steps[j].run?.({ instant: true });
      }
      if (my !== token) return;
      await steps[idx].run?.({ instant: false });
      if (my !== token) return;
      highlight(steps[idx].highlight);
    } catch (e) { console.error(e); }
    busy = false; paint();
    if (playing && my === token) timer = setTimeout(next, steps[idx].dwell ?? 5200);
  }

  function next() { if (busy) return; if (i >= steps.length - 1) return stop(); show(i + 1); }
  function prev() { if (busy || i === 0) return; show(i - 1, { replay: true }); }
  function togglePlay() { playing = !playing; clearTimeout(timer); paint(); if (playing && !busy) timer = setTimeout(next, 1500); }

  function onKey(e) {
    if (!active) return;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (e.key === 'Escape' && !document.querySelector('dialog[open]')) { stop(); }
    else if (!typing && e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (!typing && e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  }

  async function start() {
    if (active) return;
    active = true; playing = false;
    steps = getSteps();
    document.body.classList.add('is-presenting');
    card = h('section', { class: 'pres', role: 'region', 'aria-labelledby': 'pres-title', 'aria-label': 'Modo presentación' });
    root.append(card);
    document.addEventListener('keydown', onKey);
    await onStart({ silent: false });
    show(0);
  }

  function stop() {
    if (!active) return;
    active = false; playing = false; token++; clearTimeout(timer);
    clearHighlight(); card?.remove(); card = null;
    document.removeEventListener('keydown', onKey);
    document.body.classList.remove('is-presenting');
    onStop?.();
  }

  return { start, stop, get active() { return active; } };
}
