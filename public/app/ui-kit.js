// Piezas de interfaz propias de esta demo: íconos, logos, etiquetas de estado, hojas (paneles
// superpuestos NO modales del navegador, para que el modo Presentación siga usable) y utilidades.
import { h, svgFrom, $, $$, clear } from '../shared/ui/dom.js';
import { ESTADOS, TIPOS_DOC, MARCAS, ETIQUETA_TIPO } from './config.js';

// ------------------------------------------------------------------ íconos

const TRAZOS = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M2 9a15 15 0 0 1 20 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r=".8" fill="currentColor"/>',
  wifioff: '<path d="M5 12.5a10 10 0 0 1 3-2M2 9a15 15 0 0 1 4-2.6M8.5 16a5 5 0 0 1 7 0M12 4a15 15 0 0 1 10 5M16 8.6a10 10 0 0 1 3 3.9"/><circle cx="12" cy="19.5" r=".8" fill="currentColor"/><path d="M3 3l18 18"/>',
  receipt: '<path d="M5 2v20l2-1.3L9 22l2-1.3 2 1.3 2-1.3 2 1.3 2-1.3V2l-2 1.3L15 2l-2 1.3L11 2 9 3.3 7 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  cart: '<path d="M6 6h15l-1.6 9H7.6zM6 6 5.2 3H2"/><circle cx="9" cy="20" r="1.2"/><circle cx="18" cy="20" r="1.2"/>',
  store: '<path d="M3 9l1.6-5h14.8L21 9M3 9v11h18V9M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9.5 20v-6h5v6"/>',
  chart: '<path d="M4 20V11M10 20V4M16 20v-6M22 20H2"/>',
  sliders: '<path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-5A8.5 8.5 0 1 1 21 11.5z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v7M14 10v7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>',
  alert: '<path d="M12 3 2 20h20zM12 10v4.5M12 17.5v.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/>',
  home: '<path d="M3 11 12 3l9 8M5 9.5V21h14V9.5"/>',
  file: '<path d="M6 2h9l5 5v15H6zM14 2v6h6"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7M21 3v6h-6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  hexnut: '<path d="M12 3 19.5 7.5v9L12 21l-7.5-4.5v-9z"/><circle cx="12" cy="12" r="3"/>',
  bricks: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9.3h18M3 14.7h18M9 4v5.3M15 9.3v5.4M9 14.7V20"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  droplet: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  sprout: '<path d="M12 21v-9"/><path d="M12 12c0-4 2.5-6 7-6 0 4-2.5 6-7 6z"/><path d="M12 15c0-3-2-5-6-5 0 3.5 2 5 6 5z"/>',
  cupsoda: '<path d="M7 8h10l-1.2 12H8.2z"/><path d="M6 8h12M12 3l1.2 5"/>',
  coffee: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3v3M12 3v3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
  utensils: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 21V3c-2.5 1.5-3.5 4-3.5 7 0 1.6 1 2.5 3.5 2.5"/>',
  cake: '<path d="M4 20h16v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z"/><path d="M4 16c2 1.5 3 1.5 4 0s2-1.5 4 0 3 1.5 4 0 2-1.5 4 0M12 12V8M12 5.2c.9.8.9 1.9 0 2.8-.9-.9-.9-2 0-2.8z"/>',
  bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  wine: '<path d="M8 3h8l-.5 6a3.5 3.5 0 0 1-7 0z"/><path d="M12 12.5V20M8.5 20h7"/>',
  star: '<path d="m12 3 2.4 5.4 5.6.6-4.2 3.8 1.2 5.7L12 15.6 7 18.5l1.2-5.7L4 9l5.6-.6z"/>',
  house: '<path d="M4 11 12 4l8 7M6 10v10h12V10M10 20v-5h4v5"/>',
  umbrella: '<path d="M3 12a9 9 0 0 1 18 0z"/><path d="M12 12v7a2 2 0 0 0 4 0"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  banknote: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 12h.01M17.5 12h.01"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
  yappy: '<circle cx="12" cy="12" r="9"/><path d="m8.5 8 3.5 5 3.5-5M12 13v4"/>',
  bank: '<path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  more: '<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7.5 8v8M11 8v8M14.5 8v8M17 8v8"/>',
  caja: '<rect x="6" y="3" width="12" height="6" rx="1.2"/><path d="M4 21v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6zM8 17h.01M12 17h.01M16 17h.01"/>',
};

export function icono(nombre, { size = 18, clase = '' } = {}) {
  return svgFrom(`<svg class="ico ${clase}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${TRAZOS[nombre] || ''}</svg>`);
}

/** Ícono de cada categoría de producto (reemplaza a los emojis). */
export const ICONO_CATEGORIA = {
  Herramientas: 'wrench', Fijación: 'hexnut', Construcción: 'bricks', Eléctrico: 'zap', Plomería: 'droplet', Jardín: 'sprout', Kiosco: 'cupsoda',
  Cafés: 'coffee', Bebidas: 'cupsoda', Desayunos: 'sun', Almuerzos: 'utensils', Postres: 'cake', Despensa: 'bag', Licores: 'wine',
  'Café y dulces': 'coffee', Artesanías: 'star', Hogar: 'house', Playa: 'umbrella', Libros: 'book', 'Licores y tabaco': 'wine',
};
export const iconoCategoria = (cat, size = 20) => icono(ICONO_CATEGORIA[cat] || 'tag', { size });

// ------------------------------------------------------------------ logos (SVG propio)

export function logoApp(size = 34) {
  return svgFrom(`<svg viewBox="0 0 32 32" width="${size}" height="${size}" role="img" aria-label="Factura sola"><rect width="32" height="32" rx="8" fill="#0a0a0a"/><path d="M9 6.5h14v19.2l-2.3-1.6-2.2 1.6-2.5-1.6-2.5 1.6-2.2-1.6L9 25.7z" fill="#fff"/><path d="m12.4 15.2 2.7 2.7 5.2-5.6" fill="none" stroke="#0a0a0a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.5 21h7" stroke="#c4cbd6" stroke-width="1.6" stroke-linecap="round"/></svg>`);
}

// Cada logo se dibuja con dos colores: `f` (el fondo del cuadro) y `g` (el dibujo). Con `inverso` se
// intercambian, para ponerlo sobre una banda del color de la marca.
const LOGOS = {
  tornillo: (f, g) => `<rect width="32" height="32" rx="8" fill="${f}"/><path d="M16 5.5 24.6 10.5v11L16 26.5 7.4 21.5v-11z" fill="${g}"/><circle cx="16" cy="16" r="4.2" fill="${f}"/><path d="M14.2 16h3.6" stroke="${g}" stroke-width="1.6" stroke-linecap="round"/>`,
  ceiba: (f, g) => `<rect width="32" height="32" rx="8" fill="${f}"/><path d="M16 27v-9" stroke="${g}" stroke-width="2.8" stroke-linecap="round"/><circle cx="16" cy="12" r="6" fill="${g}"/><circle cx="10.3" cy="15" r="4" fill="${g}"/><circle cx="21.7" cy="15" r="4" fill="${g}"/>`,
  brisa: (f, g) => `<rect width="32" height="32" rx="8" fill="${f}"/><path d="M6 12c3-3.2 5 3.2 8 0s5 3.2 8 0 3-1.6 4-.6M6 17.5c3-3.2 5 3.2 8 0s5 3.2 8 0 3-1.6 4-.6M6 23c3-3.2 5 3.2 8 0s5 3.2 8 0 3-1.6 4-.6" fill="none" stroke="${g}" stroke-width="2.2" stroke-linecap="round"/>`,
};
export function logoNegocio(id, size = 32, { inverso = false } = {}) {
  const clave = LOGOS[id] ? id : 'tornillo';
  const { color, tinta } = MARCAS[clave];
  const dibujo = LOGOS[clave](inverso ? tinta : color, inverso ? color : tinta);
  return svgFrom(`<svg viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true" focusable="false">${dibujo}</svg>`);
}

// ------------------------------------------------------------------ etiquetas

/** Etiqueta de estado: color (verde, ámbar, azul, rojo, gris) + ícono + texto, nunca solo color. */
export function badgeEstado(estado) {
  const e = ESTADOS[estado] || { nombre: estado, ico: 'file', tono: 'neutro' };
  return h('span', { class: `est est--${estado} est--t-${e.tono}` }, icono(e.ico, { size: 14 }), e.nombre);
}
export const nombreTipo = (tipo) => TIPOS_DOC[tipo]?.nombre ?? tipo;
export const tipoCorto = (tipo) => TIPOS_DOC[tipo]?.corto ?? tipo;

/** Insignia del tipo de documento con color propio: FAC, NC o ND (FAC-RF-13 y sección 12). */
export const badgeTipo = (tipo) => h('span', { class: `tipo tipo--${tipo}`, title: nombreTipo(tipo) }, ETIQUETA_TIPO[tipo] ?? 'DOC');

/** Número del documento con su insignia de tipo, para listas: "[FAC] PF1-000139". */
export const numeroDoc = (doc) => h('span', { class: 'numdoc' }, badgeTipo(doc.tipo), ' ', h('span', { class: 'mono' }, doc.numero));

/** Origen del documento con ícono: caja (punto de venta) o tienda en línea. El texto siempre acompaña al ícono. */
export function origenDoc(doc) {
  const tienda = doc.origen === 'tienda';
  return h('span', { class: 'origen' }, icono(tienda ? 'store' : 'caja', { size: 16 }), tienda ? `Tienda${doc.pedidoTienda ? ` ${doc.pedidoTienda}` : ''}` : `Caja ${doc.punto}`);
}

/**
 * Envuelve una fila de chips que se desplaza: si no caben, se ve un degradado en el borde y una flecha
 * para ver el resto (sin dejar una categoría cortada a medias). Devuelve el contenedor para insertar.
 */
export function chipsDesplazables(chips, { etiqueta = 'Ver más opciones' } = {}) {
  const flecha = h('button', { class: 'chips__mas', type: 'button', 'aria-label': etiqueta, tabindex: '-1', onclick: () => chips.scrollBy({ left: Math.max(160, chips.clientWidth * 0.6), behavior: 'smooth' }) }, icono('chevron', { size: 18 }));
  const envoltura = h('div', { class: 'chips-wrap' }, chips, flecha);
  const medir = () => {
    const resto = chips.scrollWidth - chips.scrollLeft - chips.clientWidth;
    envoltura.classList.toggle('chips-wrap--der', resto > 4);
    envoltura.classList.toggle('chips-wrap--izq', chips.scrollLeft > 4);
  };
  chips.addEventListener('scroll', medir, { passive: true });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(medir).observe(chips);
  if (typeof MutationObserver !== 'undefined') new MutationObserver(medir).observe(chips, { childList: true });
  requestAnimationFrame(medir);
  return envoltura;
}

/** 'YYYY-MM-DDTHH:mm' -> '10/11/2026 3:42 p. m.' */
export function fechaHora(s) {
  if (!s) return '';
  const [d, t] = s.split('T'); const [y, m, dd] = d.split('-');
  const [hh, mm] = (t || '00:00').split(':').map(Number);
  const suf = hh < 12 ? 'a. m.' : 'p. m.'; const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${dd}/${m}/${y} ${h12}:${String(mm).padStart(2, '0')} ${suf}`;
}
export function fechaCorta(s) { const [y, m, d] = s.slice(0, 10).split('-'); return `${d}/${m}/${y}`; }
export function hora12(s) {
  const [hh, mm] = s.slice(11, 16).split(':').map(Number);
  return `${hh % 12 === 0 ? 12 : hh % 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'a. m.' : 'p. m.'}`;
}
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export function nombreMes(ym) { const [y, m] = ym.split('-').map(Number); return `${MESES[m - 1]} de ${y}`; }

// ------------------------------------------------------------------ foco

/** Vuelve a pintar un contenedor sin que el teclado pierda su sitio (usa data-foco). */
export function conservarFoco(contenedor, pintar) {
  const a = document.activeElement;
  const clave = a && contenedor.contains(a) ? a.dataset?.foco : null;
  const sel = clave && a.selectionStart != null ? [a.selectionStart, a.selectionEnd] : null;
  pintar();
  if (clave) {
    const nuevo = contenedor.querySelector(`[data-foco="${CSS.escape(clave)}"]`);
    if (nuevo) { nuevo.focus({ preventScroll: true }); if (sel && nuevo.setSelectionRange) { try { nuevo.setSelectionRange(sel[0], sel[1]); } catch { /* tipo sin selección */ } } }
  }
}

// ------------------------------------------------------------------ hojas (paneles superpuestos)

let hojaN = 0;
const abiertas = new Set();
/** Cierra todas las hojas abiertas (lo usa el modo Presentación entre pasos). */
export function cerrarHojas() { for (const c of [...abiertas]) c(); }
const FOCALIZABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Panel superpuesto con rol de diálogo. No usa <dialog>.showModal() porque eso tapa y deja
 * inertes las tarjetas del modo Presentación; Esc cierra y el foco queda atrapado salvo
 * mientras se presenta.
 */
export function abrirHoja({ titulo, cuerpo, clase = '', alCerrar } = {}) {
  const previo = document.activeElement;
  const id = `hoja-t-${(hojaN += 1)}`;
  const cuerpoEl = h('div', { class: 'hoja__cuerpo' });
  if (cuerpo) cuerpoEl.append(cuerpo);
  const tituloEl = h('h2', { id, class: 'hoja__titulo' }, titulo);
  const panel = h('section', { class: `hoja ${clase}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id, tabindex: '-1' },
    h('header', { class: 'hoja__cab' }, tituloEl, h('button', { class: 'btn btn--ghost btn--icon', type: 'button', 'aria-label': 'Cerrar', onclick: () => cerrar() }, icono('x'))),
    cuerpoEl);
  const fondo = h('div', { class: 'hoja-fondo', onclick: () => cerrar() });
  const raiz = h('div', { class: 'hoja-raiz' }, fondo, panel);
  let cerrada = false;
  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); cerrar(); return; }
    if (e.key !== 'Tab' || document.body.classList.contains('is-presenting')) return;
    const f = $$(FOCALIZABLES, panel).filter((el) => el.offsetParent !== null);
    if (!f.length) { e.preventDefault(); return; }
    const primero = f[0]; const ultimo = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === primero || document.activeElement === panel)) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  }
  function cerrar() {
    if (cerrada) return; cerrada = true;
    document.removeEventListener('keydown', onKey, true);
    abiertas.delete(cerrar);
    raiz.remove();
    if (previo && previo.isConnected && !document.body.classList.contains('is-presenting')) previo.focus({ preventScroll: true });
    alCerrar?.();
  }
  document.addEventListener('keydown', onKey, true);
  abiertas.add(cerrar);
  document.body.append(raiz);
  panel.focus({ preventScroll: true });
  return { cerrar, panel, cuerpo: cuerpoEl, poner(nodo) { clear(cuerpoEl).append(nodo); }, titulo(t) { tituloEl.textContent = t; } };
}

// ------------------------------------------------------------------ campos de formulario

let campoN = 0;
/** Campo con etiqueta, ayuda y error. Devuelve { el, input, error(msg) }. */
export function campo({ etiqueta, tipo = 'text', valor = '', ayuda, requerido, nombre, inputmode, maxlength, min, max, step, placeholder, foco, alCambiar, alEscribir, autocomplete = 'off' }) {
  const id = `campo-${(campoN += 1)}`;
  const input = h('input', { id, name: nombre, type: tipo, value: valor, inputmode, maxlength, min, max, step, placeholder, autocomplete, 'aria-describedby': `${id}-d`, 'data-foco': foco, required: requerido || null });
  input.value = valor ?? '';
  const detalle = h('div', { id: `${id}-d` });
  if (ayuda) detalle.append(h('span', { class: 'field__hint' }, ayuda));
  const el = h('div', { class: 'field' }, h('label', { for: id }, etiqueta, requerido ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null), input, detalle);
  if (alCambiar) input.addEventListener('change', () => alCambiar(input.value));
  if (alEscribir) input.addEventListener('input', () => alEscribir(input.value));
  return {
    el, input,
    error(msg) {
      clear(detalle);
      if (msg) { input.setAttribute('aria-invalid', 'true'); detalle.append(h('span', { class: 'field__error', role: 'alert' }, msg)); }
      else { input.removeAttribute('aria-invalid'); if (ayuda) detalle.append(h('span', { class: 'field__hint' }, ayuda)); }
    },
  };
}

export function selector({ etiqueta, opciones, valor, alCambiar, foco }) {
  const id = `campo-${(campoN += 1)}`;
  const sel = h('select', { id, 'data-foco': foco }, opciones.map((o) => h('option', { value: o.valor, selected: String(o.valor) === String(valor) }, o.texto)));
  sel.value = valor;
  if (alCambiar) sel.addEventListener('change', () => alCambiar(sel.value));
  return { el: h('div', { class: 'field' }, h('label', { for: id }, etiqueta), sel), select: sel };
}

/** Opción de un grupo de radios con aspecto de tarjeta táctil. */
export function opcionRadio({ nombre, valor, texto, marcado, alCambiar, foco, ico, detalle }) {
  const input = h('input', { type: 'radio', name: nombre, value: valor, checked: marcado, 'data-foco': foco });
  input.checked = !!marcado;
  input.addEventListener('change', () => { if (input.checked) alCambiar?.(valor); });
  return h('label', { class: `opcion${marcado ? ' opcion--on' : ''}` }, input, ico ? icono(ico, { size: 18 }) : null,
    h('span', { class: 'opcion__txt' }, texto, detalle ? h('small', null, detalle) : null));
}

export { h, $, $$, clear };
