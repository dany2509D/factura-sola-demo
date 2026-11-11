// Inicio: arriba, el héroe con el texto y el comprobante saliendo de la impresora, y la tira del
// proceso que se ilumina con la venta en curso; debajo, el medidor del facturador gratuito y lo
// último que se emitió (la tabla va a todo lo ancho).
import { h, clear } from '../../shared/ui/dom.js';
import { neg, subscribe } from '../state.js';
import { masReciente, numeroConTipo } from '../docs.js';
import * as C from '../controller.js';
import { crearMedidor } from './medidor.js';
import { icono, logoNegocio, badgeEstado, numeroDoc, origenDoc, fechaHora } from '../ui-kit.js';
import { renderCafe, impresora } from './cafe.js';
import { fmt } from '../money.js';

const PASOS = [
  ['cart', 'Usted cobra'],
  ['receipt', 'Se arma la factura'],
  ['shield', 'El PAC la autoriza'],
  ['chat', 'Llega al cliente'],
];

/**
 * Estado de cada paso de la tira según el documento más reciente. El primero toma el color de la marca;
 * los demás, el color del estado en que está el documento (gris, azul, verde, ámbar o rojo).
 */
function estadoTira(doc) {
  const m = (est) => ({ est, tono: 'marca' });
  const pend = { est: 'pendiente', tono: 'neutro' };
  if (!doc) return { pasos: [pend, pend, pend, pend], texto: null };
  const enviado = (doc.envios || []).length > 0;
  switch (doc.estado) {
    case 'generada': return { pasos: [m('hecho'), { est: 'activo', tono: 'neutro' }, pend, pend], texto: 'Se está armando la factura…' };
    case 'enviada': return { pasos: [m('hecho'), { est: 'hecho', tono: 'neutro' }, { est: 'activo', tono: 'info' }, pend], texto: 'Enviada al PAC simulado, esperando la autorización…' };
    case 'autorizada': return { pasos: [m('hecho'), { est: 'hecho', tono: 'neutro' }, { est: 'hecho', tono: 'ok' }, { est: enviado ? 'hecho' : 'activo', tono: 'ok' }], texto: enviado ? 'Ya llegó al cliente.' : 'Lista para enviar al cliente por WhatsApp o correo.' };
    case 'rechazada': return { pasos: [m('hecho'), { est: 'hecho', tono: 'neutro' }, { est: 'error', tono: 'mal' }, pend], texto: 'El PAC la rechazó: corríjala y reenvíela.' };
    case 'en_cola': return { pasos: [m('hecho'), { est: 'hecho', tono: 'neutro' }, { est: 'cola', tono: 'aviso' }, pend], texto: 'Sin conexión: se enviará sola al volver internet.' };
    default: return { pasos: [pend, pend, pend, pend], texto: null };
  }
}

export function montar(raiz) {
  const medidor = crearMedidor({ editable: true });
  const cab = h('div', { class: 'heroe__negocio' });
  const tira = h('ol', { class: 'tira', 'aria-label': 'Cómo avanza una venta' });
  const tiraEstado = h('p', { class: 'tira__estado', role: 'status' });
  const actividad = h('div', { class: 'tabla-wrap' });
  const recibo = h('div', { class: 'heroe__recibo' });
  let reciboId = ''; let claveTira = ''; let idsVistos = new Set();

  function pintaCab() {
    const n = neg();
    clear(cab).append(logoNegocio(n.id, 48), h('div', null, h('strong', null, n.nombre), h('span', null, n.tipo)));
  }

  /** La tira refleja la venta más reciente: se ilumina paso a paso mientras se emite. */
  function pintaTira() {
    const n = neg();
    const doc = [...n.documentos].sort(masReciente)[0];
    const { pasos, texto } = estadoTira(doc);
    const clave = `${n.id}|${doc?.id}|${doc?.estado}|${(doc?.envios || []).length}`;
    if (clave === claveTira) return; claveTira = clave;
    clear(tira).append(...PASOS.map(([ico, nombre], i) => {
      const { est, tono } = pasos[i];
      const clase = `tira__paso tira__paso--${est} ${tono === 'marca' ? 'tira__paso--marca' : `paso--t-${tono}`}`;
      const leyenda = { hecho: 'cumplido', activo: 'en curso', pendiente: 'pendiente', error: 'con error', cola: 'en espera' }[est];
      return h('li', { class: clase, 'aria-current': est === 'activo' ? 'step' : null },
        h('span', { class: 'tira__punto', 'aria-hidden': 'true' }, icono(est === 'error' ? 'x' : ico, { size: 20 })),
        h('span', null, nombre, h('span', { class: 'sr-only' }, `: ${leyenda}`)));
    }));
    clear(tiraEstado);
    if (!doc) { tiraEstado.append('Cobre una venta y vea cómo avanza, paso a paso.'); return; }
    tiraEstado.append(h('a', { class: 'mono', href: `#/documentos/${doc.id}` }, numeroConTipo(doc)), badgeEstado(doc.estado), h('span', null, texto));
  }

  function pintaRecibo() {
    const n = neg();
    const doc = n.documentos.filter((d) => d.tipo === 'factura' && d.estado === 'autorizada').sort(masReciente)[0];
    const marca = doc ? `${n.id}:${doc.id}` : '';
    if (marca === reciboId) return; reciboId = marca;
    clear(recibo);
    if (!doc) { recibo.append(h('p', { class: 'heroe__vacio' }, 'Todavía no hay facturas autorizadas.')); return; }
    const papel = h('div', { class: 'heroe__papel' }, impresora(), renderCafe(doc, n, { compacto: true }));
    recibo.append(papel, h('p', { class: 'inicio__enlace' }, h('a', { href: `#/documentos/${doc.id}` }, `Abrir ${numeroConTipo(doc)} completo`)));
    // Si el papel es más alto que el espacio del héroe, se difumina al final en vez de cortarse en seco.
    requestAnimationFrame(() => papel.classList.toggle('heroe__papel--corta', papel.scrollHeight > papel.clientHeight + 2));
  }

  function pintaActividad() {
    const n = neg();
    const ultimos = [...n.documentos].sort(masReciente).slice(0, 7);
    const hayAnteriores = idsVistos.size > 0;
    const nuevos = new Set(hayAnteriores ? ultimos.filter((d) => !idsVistos.has(d.id)).map((d) => d.id) : []);
    idsVistos = new Set(ultimos.map((d) => d.id));
    clear(actividad).append(h('table', { class: 'tabla tabla--docs tabla--apilar' },
      h('caption', { class: 'sr-only' }, 'Últimos documentos emitidos'),
      h('thead', null, h('tr', null, ['Número', 'Cliente', 'Fecha', 'Origen', 'Total', 'Estado'].map((t) => h('th', { scope: 'col', class: t === 'Total' ? 'der' : '' }, t)))),
      h('tbody', null, ...ultimos.map((d) => h('tr', { class: `fila fila--${d.estado}${nuevos.has(d.id) ? ' fila--nueva' : ''}` },
        h('th', { scope: 'row', 'data-et': 'Número' }, h('a', { class: 'enlace-num', href: `#/documentos/${d.id}` }, numeroDoc(d))),
        h('td', { 'data-et': 'Cliente' }, d.cliente.nombre),
        h('td', { 'data-et': 'Fecha' }, fechaHora(d.fecha)),
        h('td', { 'data-et': 'Origen' }, origenDoc(d)),
        h('td', { class: 'der num', 'data-et': 'Total' }, d.tipo === 'nota_credito' ? `−${fmt(d.total)}` : fmt(d.total)),
        h('td', { 'data-et': 'Estado' }, badgeEstado(d.estado)))))));
  }

  raiz.append(
    h('section', { class: 'inicio' },
      h('section', { class: 'card heroe', 'aria-labelledby': 'tit-heroe' },
        h('div', { class: 'heroe__texto' },
          cab,
          h('h1', { id: 'tit-heroe' }, h('span', null, 'Usted cobra.'), ' ', h('span', null, 'La factura sale sola.')),
          h('p', { class: 'frase' }, 'Cada venta se arma, se envía al PAC, se autoriza y le llega al cliente, sin digitar dos veces. Y su contador recibe todo ordenado.'),
          h('div', { class: 'inicio__acciones' },
            h('a', { class: 'btn btn--primary btn--grande', href: '#/venta' }, icono('cart', { size: 18 }), 'Cobrar una venta'),
            h('button', { class: 'btn btn--grande', type: 'button', onclick: () => C.pedidoDeTienda() }, icono('store', { size: 18 }), 'Simular pedido de la tienda')),
          h('div', { class: 'tira-caja' }, tira, tiraEstado)),
        recibo),
      h('section', { class: 'card portada__medidor', 'aria-labelledby': 'tit-medidor' },
        h('div', { class: 'portada__cab' },
          h('h2', { id: 'tit-medidor', class: 'h-peq' }, '¿Ya pasó el tope del facturador gratuito?'),
          h('p', { class: 'card__sub' }, 'Ponga las cifras del prospecto y vea al instante si debe pasar a un PAC.')),
        medidor.el),
      h('section', { class: 'card', 'aria-labelledby': 'tit-act' },
        h('div', { class: 'seccion-cab--fila' }, h('h2', { id: 'tit-act', class: 'h-peq' }, 'Lo último que se emitió'), h('a', { href: '#/documentos' }, 'Ver todos')),
        actividad)));

  const refrescar = () => { medidor.actualizar(neg()); pintaActividad(); pintaRecibo(); pintaTira(); };
  let idPintado = neg().id;
  pintaCab(); refrescar();
  const baja = subscribe((_, alcance) => {
    if (alcance === 'ui') return;
    if (neg().id !== idPintado || alcance === 'reinicio') { idPintado = neg().id; idsVistos = new Set(); claveTira = ''; pintaCab(); }
    refrescar();
  });
  return () => { baja(); };
}
