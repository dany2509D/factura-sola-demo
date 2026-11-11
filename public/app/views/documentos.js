// Lista de documentos y detalle de cada uno (CAFE, estados, notas de crédito y débito).
import { h, clear } from '../../shared/ui/dom.js';
import { neg, ui, subscribe, getState } from '../state.js';
import * as C from '../controller.js';
import { fmt } from '../money.js';
import { calcDocumento } from '../calc.js';
import { lineasDevolvibles, notasDe, referencia, masReciente, numeroConTipo, etiquetaNumero } from '../docs.js';
import { TASAS, MOTIVOS_NOTA_CREDITO, METODOS_PAGO } from '../config.js';
import { icono, badgeEstado, numeroDoc, origenDoc, chipsDesplazables, nombreTipo, fechaHora, campo, selector, conservarFoco } from '../ui-kit.js';
import { renderCafe, impresora } from './cafe.js';
import { renderPasos, renderRechazo, renderEnCola, renderAccionesComprobante } from './emision.js';
import { toast } from '../../shared/ui/ui.js';

const FILTROS = [
  ['todos', 'Todos', () => true],
  ['facturas', 'Facturas', (d) => d.tipo === 'factura'],
  ['notas', 'Notas', (d) => d.tipo !== 'factura'],
  ['cola', 'En cola', (d) => d.estado === 'en_cola'],
  ['rechazadas', 'Rechazadas', (d) => d.estado === 'rechazada'],
];
const TAMANOS = [10, 25, 50, 100];

/** Números de página a mostrar: primera, última y vecinas de la actual, con '…' en los huecos. */
export function ventanaPaginas(actual, total) {
  const set = new Set([1, total, actual - 1, actual, actual + 1].filter((n) => n >= 1 && n <= total));
  const orden = [...set].sort((a, b) => a - b); const out = [];
  orden.forEach((n, i) => { if (i && n - orden[i - 1] > 1) out.push('…'); out.push(n); });
  return out;
}

const importe = (d) => (d.tipo === 'nota_credito' ? `−${fmt(d.total)}` : fmt(d.total));
const ordenar = (docs) => [...docs].sort(masReciente);

// ------------------------------------------------------------------ lista

export function montarLista(raiz) {
  let filtro = 'todos'; let q = ''; let pagina = 1; let negocioPintado = null;
  const cfg = (ui().listaDocs ||= { porPagina: 25 });
  const banner = h('div', { class: 'cola-banner' });
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filtrar documentos' });
  const buscador = h('input', { id: 'buscar-doc', type: 'search', placeholder: 'Buscar por número, cliente o pedido', autocomplete: 'off' });
  buscador.addEventListener('input', () => { q = buscador.value.trim().toLowerCase(); pagina = 1; pintaTabla(); });
  const tabla = h('div', { class: 'tabla-wrap' });
  const paginacion = h('nav', { class: 'paginacion', 'aria-label': 'Paginación de documentos' });
  const conteo = h('p', { class: 'conteo', role: 'status', 'aria-live': 'polite' });
  const subtitulo = h('p', { class: 'subtitulo' });
  const cabecera = h('div', { class: 'filtros' }, chipsDesplazables(chips, { etiqueta: 'Ver más filtros' }), h('div', { class: 'buscador' }, icono('search', { size: 18 }), h('label', { for: 'buscar-doc', class: 'sr-only' }, 'Buscar documento'), buscador));

  raiz.append(h('section', { class: 'lista-docs', 'aria-labelledby': 'tit-docs' },
    h('div', { class: 'pagina-cab' },
      h('div', null, h('h1', { id: 'tit-docs' }, 'Documentos emitidos'), subtitulo),
      h('div', { class: 'pagina-cab__acciones' },
        h('button', { class: 'btn', type: 'button', onclick: () => C.pedidoDeTienda() }, icono('store', { size: 16 }), 'Simular pedido de la tienda'))),
    banner, cabecera, conteo, tabla, paginacion));

  function pintaBanner() {
    const n = C.enCola(neg().id).length; const off = getState().offline;
    clear(banner);
    banner.hidden = !(off || n);
    if (banner.hidden) return;
    banner.append(h('div', { class: 'alerta alerta--cola' },
      icono(off ? 'wifioff' : 'clock', { size: 18 }),
      h('p', null, off ? h('strong', null, 'Sin conexión. ') : null, n ? `${n} ${n === 1 ? 'documento espera' : 'documentos esperan'} para enviarse al PAC.` : 'Las nuevas ventas quedarán en cola.'),
      off ? h('button', { class: 'btn btn--sm', type: 'button', onclick: () => C.ponerSinConexion(false) }, icono('wifi', { size: 16 }), 'Volver a conectar') : (n ? h('button', { class: 'btn btn--sm', type: 'button', onclick: () => C.vaciarCola() }, 'Enviar ahora') : null)));
  }

  function pintaChips() {
    const n = neg();
    clear(chips).append(...FILTROS.map(([id, nombre, fn]) => {
      const total = n.documentos.filter(fn).length;
      return h('button', { class: `chip${id === filtro ? ' chip--on' : ''}`, type: 'button', 'aria-pressed': String(id === filtro), onclick: () => { filtro = id; pagina = 1; pintaChips(); pintaTabla(); } }, nombre, h('span', { class: 'chip__n' }, String(total)));
    }));
  }

  function irA(n, { desplazar = true } = {}) {
    pagina = n; pintaTabla();
    if (desplazar && cabecera.getBoundingClientRect().top < 0) cabecera.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function pintaPaginacion(total, paginas, ini, fin) {
    conservarFoco(paginacion, () => {
      clear(paginacion);
      if (!total) return;
      const filas = h('select', { id: 'pag-filas', 'data-foco': 'pag-filas' }, ...TAMANOS.map((t) => h('option', { value: String(t), selected: t === cfg.porPagina }, String(t))));
      filas.value = String(cfg.porPagina);
      filas.addEventListener('change', () => { cfg.porPagina = Number(filas.value); irA(1, { desplazar: false }); });
      const btn = (n) => h('button', { class: `pag${n === pagina ? ' pag--on' : ''}`, type: 'button', 'aria-current': n === pagina ? 'page' : null, 'aria-label': `Página ${n}`, 'data-foco': `pag-${n}`, onclick: () => irA(n) }, String(n));
      paginacion.append(
        h('p', { class: 'paginacion__info' }, `Mostrando ${ini + 1}–${fin} de ${total}`),
        h('div', { class: 'paginacion__ctl' },
          h('label', { class: 'paginacion__filas', for: 'pag-filas' }, 'Filas por página', filas),
          paginas > 1 ? h('ul', { class: 'paginacion__nums' },
            h('li', null, h('button', { class: 'pag pag--ext', type: 'button', disabled: pagina === 1, 'aria-label': 'Página anterior', 'data-foco': 'pag-prev', onclick: () => irA(pagina - 1) }, icono('chevron', { size: 16, clase: 'ico--izq' }), h('span', null, 'Anterior'))),
            h('li', { class: 'paginacion__pos' }, `Página ${pagina} de ${paginas}`),
            ...ventanaPaginas(pagina, paginas).map((n) => h('li', { class: 'paginacion__num' }, n === '…' ? h('span', { class: 'pag pag--pts', 'aria-hidden': 'true' }, '…') : btn(n))),
            h('li', null, h('button', { class: 'pag pag--ext', type: 'button', disabled: pagina === paginas, 'aria-label': 'Página siguiente', 'data-foco': 'pag-next', onclick: () => irA(pagina + 1) }, h('span', null, 'Siguiente'), icono('chevron', { size: 16 })))) : null));
    });
  }

  function pintaTabla() {
    const n = neg(); const fn = FILTROS.find((f) => f[0] === filtro)[2];
    const todos = ordenar(n.documentos.filter(fn).filter((d) => !q || `${d.numero} ${d.cliente.nombre} ${d.pedidoTienda || ''} ${d.cliente.ruc || ''}`.toLowerCase().includes(q)));
    const total = todos.length; const porPagina = cfg.porPagina;
    const paginas = Math.max(1, Math.ceil(total / porPagina));
    pagina = Math.min(Math.max(1, pagina), paginas);
    const ini = (pagina - 1) * porPagina; const vista = todos.slice(ini, ini + porPagina);
    conteo.textContent = `${total} ${total === 1 ? 'documento' : 'documentos'}`;
    clear(tabla);
    if (!vista.length) { tabla.append(h('p', { class: 'vacio' }, 'No hay documentos con ese filtro.')); pintaPaginacion(0, 1, 0, 0); return; }
    tabla.append(h('table', { class: 'tabla tabla--docs tabla--apilar' },
      h('caption', { class: 'sr-only' }, `Documentos emitidos, del más reciente al más antiguo. Página ${pagina} de ${paginas}`),
      h('thead', null, h('tr', null, ['Número', 'Fecha', 'Cliente', 'Origen', 'Total', 'Estado'].map((t) => h('th', { scope: 'col', class: t === 'Total' ? 'der' : '' }, t)))),
      h('tbody', null, vista.map((d) => h('tr', { class: `fila fila--${d.estado}` },
        // El número siempre va con la insignia de su tipo (FAC, NC o ND); las notas dicen sobre qué factura.
        h('th', { scope: 'row', 'data-et': 'Número' }, h('a', { class: 'enlace-num', href: `#/documentos/${d.id}` }, numeroDoc(d)),
          d.documentoReferenciaNumero ? h('small', { class: 'sobre' }, `sobre ${etiquetaNumero('factura', d.documentoReferenciaNumero)}`) : null),
        h('td', { 'data-et': 'Fecha' }, fechaHora(d.fecha)),
        h('td', { 'data-et': 'Cliente' }, d.cliente.nombre),
        h('td', { 'data-et': 'Origen' }, origenDoc(d)),
        h('td', { class: 'der num', 'data-et': 'Total' }, importe(d)),
        h('td', { 'data-et': 'Estado' }, badgeEstado(d.estado)))))));
    pintaPaginacion(total, paginas, ini, ini + vista.length);
  }

  function refrescar(alcance) {
    if (negocioPintado !== neg().id || alcance === 'reinicio') { negocioPintado = neg().id; q = ''; buscador.value = ''; filtro = 'todos'; pagina = 1; }
    subtitulo.textContent = `${neg().nombre}, del más reciente al más antiguo`;
    pintaBanner(); pintaChips(); pintaTabla();
  }
  refrescar();
  const baja = subscribe((_, a) => { if (a !== 'ui') refrescar(a); });
  return () => baja();
}

// ------------------------------------------------------------------ detalle

function formNotaCredito(doc, alEmitir) {
  const n = neg();
  const lineas = lineasDevolvibles(n.documentos, doc);
  const cant = Object.fromEntries(lineas.map((l) => [l.codigo, 0]));
  const motivo = selector({ etiqueta: 'Motivo', valor: MOTIVOS_NOTA_CREDITO[0], opciones: MOTIVOS_NOTA_CREDITO.map((m) => ({ valor: m, texto: m })) });
  const resumen = h('div', { class: 'totales totales--mini', 'aria-live': 'polite' });
  const msg = h('p', { class: 'field__error', role: 'alert' });
  const inputs = {};
  const recalcular = () => {
    const sel = lineas.filter((l) => cant[l.codigo] > 0).map((l) => ({ ...l, cantidad: cant[l.codigo] }));
    const t = calcDocumento(sel);
    clear(resumen).append(
      h('div', { class: 'tot' }, h('span', null, 'Subtotal a devolver'), h('span', { class: 'num' }, fmt(t.subtotal))),
      h('div', { class: 'tot' }, h('span', null, 'ITBMS'), h('span', { class: 'num' }, fmt(t.itbmsTotal))),
      h('div', { class: 'tot tot--total' }, h('span', null, 'Total de la nota'), h('span', { class: 'num' }, fmt(t.total))));
  };
  const filas = lineas.map((l) => {
    const input = h('input', { type: 'number', min: '0', max: String(l.disponible), value: '0', inputmode: 'numeric', disabled: l.disponible === 0, 'aria-label': `Cantidad a devolver de ${l.descripcion}` });
    input.addEventListener('input', () => { cant[l.codigo] = Math.max(0, Math.min(l.disponible, Math.floor(Number(input.value) || 0))); recalcular(); });
    inputs[l.codigo] = input;
    return h('tr', null,
      h('th', { scope: 'row', 'data-et': 'Artículo' }, l.descripcion),
      h('td', { class: 'der num', 'data-et': 'Vendido' }, String(l.cantidad)),
      h('td', { class: 'der num', 'data-et': 'Ya devuelto' }, String(l.devuelto)),
      h('td', { class: 'der', 'data-et': 'Devolver' }, input));
  });
  recalcular();
  const todo = () => { for (const l of lineas) { cant[l.codigo] = l.disponible; inputs[l.codigo].value = String(l.disponible); } recalcular(); };
  const emitir = () => {
    const r = C.emitirNotaCredito(doc.id, lineas.map((l) => ({ codigo: l.codigo, cantidad: cant[l.codigo] })), motivo.select.value);
    if (!r.ok) { msg.textContent = r.error; return; }
    toast('Nota de crédito emitida y enviada al PAC simulado.', { kind: 'ok' });
    alEmitir(r.id);
  };
  const hayDisponible = lineas.some((l) => l.disponible > 0);
  return h('section', { class: 'form-nota card', 'aria-label': 'Nota de crédito' },
    h('h3', null, 'Nota de crédito'),
    h('p', { class: 'field__hint' }, `Devuelva uno o varios artículos de la factura ${doc.numero}. La nota queda ligada a ella y resta en el panel del contador.`),
    hayDisponible ? [
      h('div', { class: 'tabla-wrap' }, h('table', { class: 'tabla tabla--mini tabla--apilar' },
        h('thead', null, h('tr', null, ['Artículo', 'Vendido', 'Ya devuelto', 'Devolver'].map((t) => h('th', { scope: 'col', class: t === 'Artículo' ? '' : 'der' }, t)))),
        h('tbody', null, filas))),
      h('button', { class: 'btn btn--sm', type: 'button', onclick: todo }, 'Devolver todo lo disponible'),
      motivo.el, resumen, msg,
      h('button', { class: 'btn btn--primary', type: 'button', onclick: emitir }, icono('receipt', { size: 16 }), 'Emitir nota de crédito'),
    ] : h('p', { class: 'vacio' }, 'Ya se devolvió todo lo vendido en esta factura.'));
}

function formNotaDebito(doc, alEmitir) {
  const concepto = campo({ etiqueta: 'Concepto del cargo adicional', valor: 'Flete adicional', requerido: true });
  const monto = campo({ etiqueta: 'Monto sin ITBMS (B/.)', tipo: 'number', valor: '5.00', min: '0', step: '0.01', inputmode: 'decimal', requerido: true });
  const tasa = selector({ etiqueta: 'Tasa de ITBMS', valor: '7', opciones: TASAS.map((t) => ({ valor: String(t), texto: `${t} %` })) });
  const msg = h('p', { class: 'field__error', role: 'alert' });
  const resumen = h('div', { class: 'totales totales--mini', 'aria-live': 'polite' });
  const recalcular = () => {
    const t = calcDocumento([{ precio: Number(monto.input.value) || 0, cantidad: 1, tasa: Number(tasa.select.value), descuentoPct: 0 }]);
    clear(resumen).append(h('div', { class: 'tot' }, h('span', null, 'ITBMS'), h('span', { class: 'num' }, fmt(t.itbmsTotal))), h('div', { class: 'tot tot--total' }, h('span', null, 'Total de la nota'), h('span', { class: 'num' }, fmt(t.total))));
  };
  monto.input.addEventListener('input', recalcular); tasa.select.addEventListener('change', recalcular); recalcular();
  return h('section', { class: 'form-nota card', 'aria-label': 'Nota de débito' },
    h('h3', null, 'Nota de débito'),
    h('p', { class: 'field__hint' }, `Agregue un cargo posterior a la factura ${doc.numero}, por ejemplo un flete o un ajuste.`),
    concepto.el, h('div', { class: 'fila-2' }, monto.el, tasa.el), resumen, msg,
    h('button', { class: 'btn btn--primary', type: 'button', onclick: () => {
      const r = C.emitirNotaDebito(doc.id, { concepto: concepto.input.value, monto: monto.input.value, tasa: tasa.select.value, motivo: 'Cargo adicional' });
      if (!r.ok) { msg.textContent = r.error; return; }
      toast('Nota de débito emitida y enviada al PAC simulado.', { kind: 'ok' });
      alEmitir(r.id);
    } }, icono('receipt', { size: 16 }), 'Emitir nota de débito'));
}

export function montarDetalle(raiz, { id }) {
  let abierto = null; // 'credito' | 'debito' | null
  let firmas = { estado: '', notas: '' };
  const cuerpo = h('div', { class: 'detalle' });
  raiz.append(h('div', { class: 'detalle-pagina' }, h('a', { class: 'volver', href: '#/documentos' }, icono('back', { size: 16 }), 'Documentos'), cuerpo));

  const colCafe = h('div', { class: 'detalle__cafe' });
  const colEstado = h('div', { class: 'detalle__estado' });
  const colNotas = h('div', { class: 'detalle__notas' });
  const colHist = h('div', { class: 'detalle__hist' });
  const cab = h('header', { class: 'detalle__cab' });
  let docId = id; let sinDoc = false;

  const irAlDoc = (nuevoId) => { location.hash = `#/documentos/${nuevoId}`; };

  function pintaCab(doc) {
    clear(cab).append(h('div', null, h('p', { class: 'eyebrow' }, nombreTipo(doc.tipo)), h('h1', { class: 'mono' }, numeroConTipo(doc))), badgeEstado(doc.estado));
  }
  function pintaEstado(doc) {
    const n = neg();
    const ref = referencia(n.documentos, doc);
    clear(colEstado).append(
      h('section', { class: 'card' },
        renderPasos(doc),
        doc.estado === 'autorizada' ? h('p', { class: 'alerta alerta--ok alerta--mini' }, icono('check', { size: 16 }), ' Autorizado por el PAC simulado.') : null,
        doc.estado === 'rechazada' ? renderRechazo(doc) : null,
        doc.estado === 'en_cola' ? renderEnCola(doc) : null,
        (doc.estado === 'generada' || doc.estado === 'enviada') ? h('p', { class: 'alerta alerta--cola alerta--mini' }, icono('clock', { size: 16 }), ' Enviando al PAC simulado…') : null,
        renderAccionesComprobante(doc),
        doc.envios?.length ? h('ul', { class: 'envios' }, doc.envios.map((e) => h('li', null, icono(e.canal === 'whatsapp' ? 'chat' : 'mail', { size: 14 }), ` ${e.canal === 'whatsapp' ? 'WhatsApp' : 'Correo'} a ${e.a}, ${fechaHora(e.t)} (simulado)`))) : null),
      h('section', { class: 'card' }, h('h2', { class: 'h-peq' }, 'Datos del documento'),
        h('dl', { class: 'ficha' },
          h('dt', null, 'Origen'), h('dd', null, doc.origen === 'tienda' ? `Tienda en línea, pedido ${doc.pedidoTienda ?? ''}` : `Punto de venta ${doc.punto}, ${doc.puntoNombre}`),
          h('dt', null, 'Forma de pago'), h('dd', null, `${METODOS_PAGO.find((m) => m.id === doc.metodoPago)?.nombre ?? doc.metodoPago} (simulado)`),
          ref ? [h('dt', null, 'Documento de referencia'), h('dd', null, h('a', { class: 'mono', href: `#/documentos/${ref.id}` }, numeroConTipo(ref)))] : null,
          doc.motivoNota ? [h('dt', null, 'Motivo'), h('dd', null, doc.motivoNota)] : null)));
  }
  function pintaNotas(doc) {
    const n = neg();
    clear(colNotas);
    const relacionadas = notasDe(n.documentos, doc);
    if (doc.tipo === 'factura' && doc.estado === 'autorizada') {
      colNotas.append(h('section', { class: 'card' },
        h('h2', { class: 'h-peq' }, 'Correcciones posteriores'),
        h('div', { class: 'acciones-doc' },
          h('button', { class: 'btn', type: 'button', 'aria-expanded': String(abierto === 'credito'), onclick: () => { abierto = abierto === 'credito' ? null : 'credito'; refrescar(); } }, icono('refresh', { size: 16 }), 'Emitir nota de crédito'),
          h('button', { class: 'btn', type: 'button', 'aria-expanded': String(abierto === 'debito'), onclick: () => { abierto = abierto === 'debito' ? null : 'debito'; refrescar(); } }, icono('plus', { size: 16 }), 'Emitir nota de débito')),
        abierto === 'credito' ? formNotaCredito(doc, irAlDoc) : null,
        abierto === 'debito' ? formNotaDebito(doc, irAlDoc) : null));
    }
    if (relacionadas.length) {
      colNotas.append(h('section', { class: 'card' }, h('h2', { class: 'h-peq' }, 'Notas ligadas a este documento'),
        h('ul', { class: 'relacionadas' }, relacionadas.map((r) => h('li', null, h('a', { class: 'mono', href: `#/documentos/${r.id}` }, numeroConTipo(r)), h('span', null, importe(r)), badgeEstado(r.estado))))));
    }
  }
  function pintaHist(doc) {
    clear(colHist).append(h('section', { class: 'card' }, h('h2', { class: 'h-peq' }, 'Historial'),
      h('ol', { class: 'historial' }, doc.historial.map((e) => h('li', null,
        badgeEstado(e.estado), h('time', null, fechaHora(e.t)),
        e.motivo ? h('p', { class: 'historial__nota historial__nota--mal' }, h('strong', null, 'Motivo: '), e.motivo) : null,
        e.cambio ? h('p', { class: 'historial__nota' }, h('strong', null, 'Se corrigió: '), e.cambio) : null)))));
  }

  function refrescar() {
    const n = neg(); const doc = n.documentos.find((d) => d.id === docId);
    if (!doc) {
      sinDoc = true;
      clear(cuerpo).append(h('section', { class: 'card vacio' }, h('h1', null, 'No encontramos ese documento'), h('p', null, 'Puede que pertenezca a otro negocio o que la demo se haya reiniciado.'), h('a', { class: 'btn btn--primary', href: '#/documentos' }, 'Ver todos los documentos')));
      return;
    }
    if (sinDoc || !cuerpo.firstChild) {
      sinDoc = false;
      clear(cuerpo).append(cab, h('div', { class: 'detalle__rejilla' }, colCafe, h('div', { class: 'detalle__lado' }, colEstado, colNotas, colHist)));
      firmas = { estado: '', notas: '' };
    }
    const fEstado = JSON.stringify([doc.estado, doc.rechazos.length, doc.historial.length, doc.total, doc.fecha, doc.cliente.dv, (doc.envios || []).length, getState().offline]);
    const fNotas = JSON.stringify([doc.estado, notasDe(n.documentos, doc).map((x) => [x.id, x.estado]), abierto]);
    if (fEstado !== firmas.estado) {
      firmas.estado = fEstado;
      pintaCab(doc); clear(colCafe).append(impresora(), renderCafe(doc, n)); pintaEstado(doc); pintaHist(doc);
    }
    if (fNotas !== firmas.notas) { firmas.notas = fNotas; pintaNotas(doc); }
  }
  refrescar();
  const baja = subscribe((_, a) => { if (a !== 'ui') refrescar(); });
  return () => baja();
}
