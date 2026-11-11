// CAFE: comprobante impreso de la factura electrónica (simulado). Se ve en pantalla, se imprime y
// se "manda" por WhatsApp o correo simulados.
import { h, svgFrom, $ } from '../../shared/ui/dom.js';
import { fmt } from '../money.js';
import { qrSvg, cufeAgrupado } from '../fake.js';
import { AVISO_SIM, PACS, METODOS_PAGO, TASAS } from '../config.js';
import { nombreTipo, fechaHora, logoNegocio, icono } from '../ui-kit.js';

// Sello de tinta del comprobante: mismo color, ícono y texto que la etiqueta de estado de las listas.
const SELLOS = {
  autorizada: ['AUTORIZADA', 'sello--ok', 'check'],
  rechazada: ['RECHAZADA', 'sello--mal', 'x'],
  en_cola: ['EN COLA', 'sello--cola', 'clock'],
  generada: ['EN TRÁMITE', 'sello--info', 'send'],
  enviada: ['EN TRÁMITE', 'sello--info', 'send'],
};

export const nombreArchivo = (doc) => `CAFE-${doc.numero}.pdf`;

/** Documentos cuyo comprobante ya "salió impreso" en esta sesión (la animación se ve una sola vez). */
const impresos = new Set();

/** Ranura de impresora decorativa: el comprobante sale de aquí. */
export function impresora() {
  return h('div', { class: 'impresora', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
}

function fila(etiqueta, valor, clase = '') {
  return h('div', { class: `cafe__fila ${clase}` }, h('span', null, etiqueta), h('span', { class: 'num' }, valor));
}

/**
 * Comprobante. Con `compacto` (el de la portada) muestra lo esencial —cabecera, número, sello, dos
 * líneas, total y QR— para que quepa arriba del pliegue; el completo está en el detalle del documento.
 */
export function renderCafe(doc, n, { anima = true, compacto = false } = {}) {
  const imprime = anima && doc.estado === 'autorizada' && !impresos.has(doc.id);
  if (imprime) impresos.add(doc.id);
  const punto = n.puntos.find((p) => p.codigo === doc.punto);
  const sucursal = n.sucursales.find((s) => s.id === punto?.sucursalId);
  const pac = PACS.find((p) => p.id === doc.pac)?.nombre ?? 'PAC';
  const metodo = METODOS_PAGO.find((m) => m.id === doc.metodoPago)?.nombre ?? doc.metodoPago;
  const [textoSello, claseSello, icoSello] = SELLOS[doc.estado] || ['', '', ''];
  const esContribuyente = doc.cliente.tipo === 'contribuyente';

  const MAX_COMPACTO = 2;
  const visibles = compacto ? doc.lineas.slice(0, MAX_COMPACTO) : doc.lineas;
  const lineas = h('ul', { class: 'cafe__lineas' }, visibles.map((l) => h('li', { class: 'cafe__linea' },
    h('span', { class: 'cafe__cant num' }, `${l.cantidad} ×`),
    h('span', { class: 'cafe__desc' }, l.descripcion,
      compacto ? null : h('small', null, `${fmt(l.precio)} c/u, ITBMS ${l.tasa} %${l.descuentoPct ? `, desc. ${l.descuentoPct} %` : ''}`)),
    h('span', { class: 'cafe__imp num' }, fmt(l.total)))),
  compacto && doc.lineas.length > MAX_COMPACTO ? h('li', { class: 'cafe__mas' }, `y ${doc.lineas.length - MAX_COMPACTO} ${doc.lineas.length - MAX_COMPACTO === 1 ? 'artículo más' : 'artículos más'}`) : null);

  const totales = h('div', { class: 'cafe__totales' },
    compacto ? null : fila('Subtotal', fmt(doc.subtotal)),
    !compacto && doc.descuentoTotal > 0 ? fila('Descuentos aplicados', fmt(-doc.descuentoTotal)) : null,
    compacto ? null : TASAS.filter((t) => (doc.basePorTasa?.[String(t)] || 0) > 0).map((t) => fila(`ITBMS ${t} % sobre ${fmt(doc.basePorTasa[String(t)])}`, fmt(doc.itbmsPorTasa[String(t)]), 'cafe__fila--tasa')),
    fila('ITBMS total', fmt(doc.itbmsTotal)),
    h('div', { class: 'cafe__fila cafe__fila--total' }, h('span', null, 'Total'), h('span', { class: 'num' }, fmt(doc.total))));

  let autorizacion;
  if (doc.estado === 'autorizada') {
    autorizacion = h('div', { class: 'cafe__aut' },
      h('div', { class: 'cafe__qr' }, svgFrom(qrSvg(doc.cufe, { size: compacto ? 92 : 156 })), h('small', null, 'QR ilustrativo')),
      h('dl', { class: 'cafe__datos' },
        h('dt', null, 'CUFE (ficticio)'), h('dd', { class: 'mono' }, compacto ? `${cufeAgrupado(doc.cufe).slice(0, 26)}…` : cufeAgrupado(doc.cufe)),
        h('dt', null, 'Protocolo de autorización (ficticio)'), h('dd', { class: 'mono' }, doc.protocolo),
        h('dt', null, 'Autorizado el'), h('dd', null, fechaHora(doc.fechaAutorizacion)),
        compacto ? null : [h('dt', null, 'Autorizado por'), h('dd', null, `${pac} (simulado)`)]));
  } else if (doc.estado === 'rechazada') {
    autorizacion = h('p', { class: 'cafe__nota cafe__nota--mal' }, doc.rechazos[doc.rechazos.length - 1]?.motivo ?? 'El PAC simulado rechazó el documento.');
  } else if (doc.estado === 'en_cola') {
    autorizacion = h('p', { class: 'cafe__nota cafe__nota--cola' }, 'Pendiente de autorización: se enviará solo al PAC cuando vuelva la conexión.');
  } else {
    autorizacion = h('p', { class: 'cafe__nota cafe__nota--cola' }, 'Enviando al PAC simulado…');
  }

  return h('article', { class: `cafe${compacto ? ' cafe--compacto' : ''}${imprime ? ' cafe--imprime' : ''}`, 'aria-label': `Comprobante ${doc.numero}` },
    h('p', { class: 'cafe__sim' }, h('strong', null, 'SIMULACIÓN'), ' · sin validez fiscal'),
    // Cabecera con el logo y el color del negocio (en la impresión de 80 mm pasa a blanco y negro).
    h('header', { class: 'cafe__marca' },
      logoNegocio(n.id, compacto ? 38 : 46, { inverso: true }),
      h('div', { class: 'cafe__marca-txt' },
        h('h3', null, n.nombre),
        h('p', null, n.emisor.razonSocial),
        h('p', { class: 'mono' }, `RUC ${n.emisor.ruc} DV ${n.emisor.dv}`))),
    compacto ? null : h('div', { class: 'cafe__emisor' },
      n.emisor.direccion ? h('p', null, n.emisor.direccion) : null,
      h('p', null, `${sucursal?.nombre ?? ''}${sucursal ? ', ' : ''}${doc.puntoNombre} (${doc.punto})`)),
    h('div', { class: 'cafe__titulo' },
      h('div', { class: 'cafe__titulo-txt' },
        h('p', { class: 'cafe__tipo' }, nombreTipo(doc.tipo)),
        h('p', { class: 'cafe__numero mono' }, `N.º ${doc.numero}`),
        compacto ? h('p', { class: 'cafe__fecha' }, fechaHora(doc.fecha)) : null),
      textoSello ? h('span', { class: `sello ${claseSello}` }, icono(icoSello, { size: 16 }), textoSello) : null),
    doc.documentoReferenciaNumero ? h('p', { class: 'cafe__ref' }, `Referencia: factura ${doc.documentoReferenciaNumero}`, doc.motivoNota ? `. ${doc.motivoNota}` : '') : null,
    h('dl', { class: 'cafe__meta' },
      compacto ? null : [h('dt', null, 'Fecha'), h('dd', null, `${fechaHora(doc.fecha)}`)],
      h('dt', null, 'Cliente'), h('dd', null, doc.cliente.nombre),
      esContribuyente && !compacto ? [h('dt', null, 'RUC'), h('dd', { class: 'mono' }, `${doc.cliente.ruc} DV ${doc.cliente.dv}`)] : null,
      compacto ? null : [h('dt', null, 'Pago'), h('dd', null, `${metodo} (simulado)`)],
      doc.pedidoTienda && !compacto ? [h('dt', null, 'Pedido'), h('dd', { class: 'mono' }, doc.pedidoTienda)] : null),
    lineas, totales, autorizacion,
    compacto ? null : h('footer', { class: 'cafe__pie' }, AVISO_SIM));
}

/** Imprime solo el CAFE: lo monta en #print-root y el CSS de impresión oculta todo lo demás. */
export function imprimirCafe(doc, n) {
  let raiz = $('#print-root');
  if (!raiz) { raiz = h('div', { id: 'print-root', 'aria-hidden': 'true' }); document.body.append(raiz); }
  raiz.replaceChildren(renderCafe(doc, n, { anima: false }));
  document.body.classList.add('imprimiendo');
  const limpiar = () => { document.body.classList.remove('imprimiendo'); raiz.replaceChildren(); removeEventListener('afterprint', limpiar); };
  addEventListener('afterprint', limpiar);
  try { window.print(); } catch { limpiar(); }
  setTimeout(() => { if (document.body.classList.contains('imprimiendo')) limpiar(); }, 60000);
}

