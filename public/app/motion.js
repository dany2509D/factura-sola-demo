// Movimiento de la interfaz: números que cuentan, entrada escalonada de las pantallas, vuelo del
// artículo al carrito y destello de filas. Todo respeta "reducir movimiento": en ese caso las
// cifras saltan al valor final y no se anima nada.
import { reducedMotion } from '../shared/ui/dom.js';

/** Cuenta de un valor a otro (por defecto, desde el último que mostró ese elemento). */
export function animarNumero(el, hasta, { desde, dur = 750, formato = (v) => String(Math.round(v)) } = {}) {
  const ini = desde ?? el._v ?? 0;
  el._v = hasta;
  if (el._raf) cancelAnimationFrame(el._raf);
  if (reducedMotion() || ini === hasta || document.hidden) { el.textContent = formato(hasta); return; }
  const t0 = performance.now();
  const paso = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - (1 - k) ** 3;
    el.textContent = formato(ini + (hasta - ini) * e);
    if (k < 1) el._raf = requestAnimationFrame(paso); else el.textContent = formato(hasta);
  };
  el._raf = requestAnimationFrame(paso);
}

const SELECTOR_ENTRADA = '.pagina-cab, .marca-banda, .escaner, .heroe, .card, .kpis, .prods, .navegador, .feed__item, .lista-docs .tabla-wrap, .filtros, .admin__barra, .paginacion';

/** Entrada escalonada de lo que hay dentro de `raiz`; se apaga sola para no animar los redibujos. */
export function animarEntrada(raiz) {
  if (reducedMotion()) return;
  let i = 0;
  for (const el of raiz.querySelectorAll(SELECTOR_ENTRADA)) el.style.setProperty('--i', String(Math.min(i++, 9)));
  raiz.classList.remove('entra'); void raiz.offsetWidth; raiz.classList.add('entra');
  clearTimeout(raiz._tEntra);
  raiz._tEntra = setTimeout(() => raiz.classList.remove('entra'), 1200);
}

/** Destello breve sobre un elemento (fila recién tocada). */
export function pulso(el, clase = 'prod--pulso', ms = 650) {
  if (!el || reducedMotion()) return;
  el.classList.remove(clase); void el.offsetWidth; el.classList.add(clase);
  setTimeout(() => el.classList.remove(clase), ms);
}

/** Un punto que vuela desde un elemento hasta otro (artículo → carrito). */
export function volar(desde, hacia, { dur = 560 } = {}) {
  if (reducedMotion() || !desde || !hacia || !desde.isConnected || !hacia.isConnected) return;
  const a = desde.getBoundingClientRect(); const b = hacia.getBoundingClientRect();
  if (!a.width || !b.width) return;
  const punto = document.createElement('span');
  punto.className = 'vuelo'; punto.setAttribute('aria-hidden', 'true');
  const x0 = a.left + a.width / 2; const y0 = a.top + a.height / 2;
  punto.style.left = `${x0 - 9}px`; punto.style.top = `${y0 - 9}px`;
  document.body.append(punto);
  const dx = b.left + Math.min(b.width / 2, 40) - x0; const dy = b.top + b.height / 2 - y0;
  const anim = punto.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 46}px) scale(1.15)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.35)`, opacity: 0.15 },
  ], { duration: dur, easing: 'cubic-bezier(.4, 0, .2, 1)' });
  anim.onfinish = () => punto.remove();
  hacia.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.035)' }, { transform: 'scale(1)' }], { duration: 300, delay: Math.max(0, dur - 120) });
}
