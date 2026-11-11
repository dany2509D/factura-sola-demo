// Tienda en línea simulada (estilo tienda de comercio electrónico) y, al lado, lo que pasa en el
// negocio: cada pedido que entra se factura solo, sin que nadie lo toque.
import { h, clear } from '../../shared/ui/dom.js';
import { neg, ui, subscribe } from '../state.js';
import * as C from '../controller.js';
import { fmt } from '../money.js';
import { calcDocumento } from '../calc.js';
import { icono, logoNegocio, campo, badgeEstado, conservarFoco, fechaHora } from '../ui-kit.js';
import { masReciente, numeroConTipo } from '../docs.js';
import { renderPasos } from './emision.js';
import { toast } from '../../shared/ui/ui.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function montar(raiz) {
  let negocioPintado = null; let firmaTienda = ''; let firmaFeed = '';
  const vitrina = h('div', { class: 'shop__prods' });
  const carritoEl = h('div', { class: 'shop__carrito' });
  const feed = h('ol', { class: 'feed', 'aria-label': 'Pedidos de la tienda y su factura' });
  const marco = h('div', { class: 'navegador' });
  const anuncio = h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  let datosComprador = { nombre: '', correo: '' };
  let errores = {};

  raiz.append(h('section', { class: 'tienda', 'aria-labelledby': 'tit-tienda' },
    h('div', { class: 'pagina-cab' },
      h('div', null, h('h1', { id: 'tit-tienda' }, 'Tienda en línea'), h('p', { class: 'lead lead--chico' }, 'Un pedido entra desde la tienda y se factura solo: nadie lo digita ni lo toca.')),
      h('div', { class: 'pagina-cab__acciones' }, h('button', { class: 'btn btn--primary', type: 'button', onclick: () => { const r = C.pedidoDeTienda(); toast(`Pedido ${r.pedido} recibido desde la tienda.`, { kind: 'info' }); } }, icono('store', { size: 16 }), 'Simular pedido de la tienda'))),
    h('div', { class: 'tienda__rejilla' },
      marco,
      h('aside', { class: 'tienda__negocio', 'aria-labelledby': 'tit-feed' },
        h('h2', { id: 'tit-feed' }, 'En el negocio, al mismo tiempo'),
        h('p', { class: 'field__hint' }, 'Cada pedido pasa solo por Generada → Enviada → Autorizada y queda en la lista de documentos con origen "tienda".'),
        feed, h('a', { class: 'btn btn--ghost btn--sm', href: '#/documentos' }, 'Ver todos los documentos'))),
    anuncio));

  function pintaMarco() {
    const n = neg();
    const destacados = n.productos.filter((_, i) => i % 4 === 0).slice(0, 8);
    clear(vitrina).append(...destacados.map((p) => h('article', { class: 'shop__prod' },
      h('div', { class: 'shop__foto', 'aria-hidden': 'true' }, h('span', { class: 'mono' }, p.categoria)),
      h('h3', null, p.descripcion),
      h('p', { class: 'num' }, fmt(p.precio)),
      h('button', { class: 'btn btn--sm shop__agregar', type: 'button', onclick: () => C.tiendaAgregar(p.codigo), 'aria-label': `Agregar ${p.descripcion} al carrito` }, icono('plus', { size: 14 }), 'Agregar'))));
    clear(marco).append(
      h('div', { class: 'navegador__barra', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('span', null, `tienda.ejemplo/${n.id}`)),
      h('div', { class: 'shop' },
        h('header', { class: 'shop__cab' }, logoNegocio(n.id, 34), h('strong', null, n.nombre), h('span', { class: 'shop__envio' }, 'Envíos a todo Panamá (ejemplo)')),
        h('h2', { class: 'shop__titulo' }, 'Lo más pedido'),
        vitrina, carritoEl));
  }

  function pintaCarrito() {
    const n = neg(); const t = ui().tienda;
    const firma = JSON.stringify([n.id, t.carrito, errores]);
    if (firma === firmaTienda) return; firmaTienda = firma;
    conservarFoco(carritoEl, () => {
      clear(carritoEl);
      const items = t.carrito.map((l) => ({ ...n.productos.find((p) => p.codigo === l.codigo), cantidad: l.cantidad, descuentoPct: 0 })).filter((l) => l.codigo);
      const tot = calcDocumento(items);
      carritoEl.append(h('h2', { class: 'shop__titulo' }, icono('cart', { size: 18 }), `Su carrito (${items.reduce((a, l) => a + l.cantidad, 0)})`));
      if (!items.length) { carritoEl.append(h('p', { class: 'vacio' }, 'El carrito está vacío.')); return; }
      carritoEl.append(h('ul', { class: 'shop__lineas' }, tot.lineas.map((l) => h('li', null,
        h('span', null, l.descripcion, h('small', null, `${fmt(l.precio)} c/u`)),
        h('span', { class: 'stepper stepper--chico' },
          h('button', { class: 'btn btn--icon btn--sm', type: 'button', 'aria-label': `Una unidad menos de ${l.descripcion}`, 'data-foco': `t-menos-${l.codigo}`, onclick: () => C.tiendaCantidad(l.codigo, l.cantidad - 1) }, icono('minus', { size: 14 })),
          h('output', { class: 'num' }, String(l.cantidad)),
          h('button', { class: 'btn btn--icon btn--sm', type: 'button', 'aria-label': `Una unidad más de ${l.descripcion}`, 'data-foco': `t-mas-${l.codigo}`, onclick: () => C.tiendaCantidad(l.codigo, l.cantidad + 1) }, icono('plus', { size: 14 }))),
        h('strong', { class: 'num' }, fmt(l.total))))));
      const nombre = campo({ etiqueta: 'Su nombre', valor: datosComprador.nombre, foco: 't-nombre', requerido: true, alEscribir: (v) => { datosComprador.nombre = v; } });
      const correo = campo({ etiqueta: 'Su correo', tipo: 'email', valor: datosComprador.correo, foco: 't-correo', requerido: true, alEscribir: (v) => { datosComprador.correo = v; } });
      nombre.error(errores.nombre); correo.error(errores.correo);
      carritoEl.append(
        h('div', { class: 'tot tot--total' }, h('span', null, 'Total con ITBMS'), h('span', { class: 'num' }, fmt(tot.total))),
        nombre.el, correo.el,
        h('p', { class: 'field__hint' }, 'Datos ficticios. El pago se simula: no se procesa ningún cobro real.'),
        h('button', { class: 'btn btn--primary btn--cobrar', type: 'button', onclick: comprar }, icono('shield', { size: 18 }), `Pagar ${fmt(tot.total)} (simulado)`));
    });
  }

  function comprar() {
    const n = neg(); const t = ui().tienda;
    errores = {};
    if (!datosComprador.nombre.trim()) errores.nombre = 'Escriba su nombre.';
    if (!EMAIL.test(datosComprador.correo.trim())) errores.correo = 'Escriba un correo válido, por ejemplo nombre@ejemplo.com.';
    if (Object.keys(errores).length) { firmaTienda = ''; pintaCarrito(); return; }
    const items = t.carrito.map((l) => ({ ...n.productos.find((p) => p.codigo === l.codigo), cantidad: l.cantidad, descuentoPct: 0 }));
    const r = C.pedidoDeTienda({ items, comprador: { nombre: datosComprador.nombre.trim(), correo: datosComprador.correo.trim() } });
    datosComprador = { nombre: '', correo: '' }; errores = {};
    C.tiendaVaciar();
    toast(`Gracias. Pedido ${r.pedido} recibido: su factura llegará por correo.`, { kind: 'ok' });
    anuncio.textContent = `Pedido ${r.pedido} recibido.`;
  }

  function pintaFeed() {
    const n = neg();
    const docs = n.documentos.filter((d) => d.origen === 'tienda' && d.tipo === 'factura').sort(masReciente).slice(0, 6);
    const firma = JSON.stringify([n.id, docs.map((d) => [d.id, d.estado])]);
    if (firma === firmaFeed) return; firmaFeed = firma;
    clear(feed).append(...docs.map((d) => h('li', { class: 'feed__item' },
      h('div', { class: 'feed__cab' }, h('strong', null, `Pedido ${d.pedidoTienda}`), h('span', { class: 'num' }, fmt(d.total))),
      h('p', null, `${d.cliente.nombre} · ${fechaHora(d.fecha)}`),
      renderPasos(d),
      h('div', { class: 'feed__pie' }, badgeEstado(d.estado), h('a', { class: 'mono', href: `#/documentos/${d.id}` }, numeroConTipo(d))))));
  }

  function refrescar(alcance) {
    if (negocioPintado !== neg().id || alcance === 'reinicio') { negocioPintado = neg().id; firmaTienda = ''; firmaFeed = ''; pintaMarco(); }
    pintaCarrito(); pintaFeed();
  }
  refrescar();
  const baja = subscribe((_, a) => refrescar(a));
  return () => baja();
}
