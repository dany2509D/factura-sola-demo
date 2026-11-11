// Punto de venta: catálogo, carrito, cliente, forma de pago y cobro. Al cobrar, el panel de la
// derecha muestra la emisión paso a paso y el CAFE.
import { h, clear } from '../../shared/ui/dom.js';
import { neg, ui, carritoDe, subscribe, getState } from '../state.js';
import * as C from '../controller.js';
import { fmt } from '../money.js';
import { METODOS_PAGO, SIMULACIONES, AVISO_SIM, CATALOGO_EN_TARJETAS } from '../config.js';
import { icono, iconoCategoria, logoNegocio, chipsDesplazables, campo, selector, opcionRadio, conservarFoco, nombreTipo, badgeEstado } from '../ui-kit.js';
import { renderCafe, impresora } from './cafe.js';
import { animarNumero, volar, pulso } from '../motion.js';
import { renderPasos, renderRechazo, renderEnCola, renderAccionesComprobante } from './emision.js';
import { numeroConTipo } from '../docs.js';

const ICONO_PAGO = { efectivo: 'banknote', tarjeta: 'card', yappy: 'yappy', ach: 'bank' };

export function montar(raiz) {
  // Al entrar a "Vender" empieza una venta nueva; la anterior se consulta en Documentos (FAC-HU2.1).
  // En el celular el carrito es una hoja que se abre a propósito (barra "Venta actual"): al entrar siempre
  // se ve el catálogo. Sin esto, la hoja que quedó abierta tras un cobro reaparecía vacía encima del catálogo.
  ui().emisionDocId = null;
  ui().carritoAbierto = false;
  let busqueda = ''; let categoria = 'Todas'; let negocioPintado = null; let firmaPanel = ''; let ultimoEstado = '';
  let lineasPrevias = new Set(); let nuevasLineas = new Set(); let totalPrevio = 0;

  const anuncio = h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  const buscador = h('input', { id: 'buscar', type: 'search', placeholder: 'Código de barras o nombre del artículo', autocomplete: 'off', enterkeyhint: 'done' });
  buscador.addEventListener('input', () => { busqueda = buscador.value.trim().toLowerCase(); pintaCatalogo(); });
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Categorías' });
  const chipsEnvueltos = chipsDesplazables(chips, { etiqueta: 'Ver más categorías' });
  const cabLista = h('div', { class: 'prods__cab', 'aria-hidden': 'true' }, h('span', null, 'Código'), h('span', null, 'Artículo'), h('span', null, 'ITBMS'), h('span', { class: 'der' }, 'Precio'), h('span'));
  const grid = h('div', { class: 'prods' });
  const panel = h('aside', { class: 'panel-venta', id: 'panel-venta', 'aria-label': 'Venta actual' });
  const barra = h('button', { class: 'barra-carrito', type: 'button', onclick: () => C.abrirCarrito(true) });
  // Encabezado del punto de venta: logo y nombre del negocio, en el color de su marca.
  const encabezado = h('div', { class: 'catalogo__cab marca-banda' });
  let claveEncabezado = '';

  raiz.append(
    h('div', { class: 'venta' },
      h('section', { class: 'catalogo', 'aria-labelledby': 'tit-cat' },
        encabezado,
        // Campo grande para el cajero: con lector de código de barras, el código entra y se agrega solo.
        h('div', { class: 'escaner' },
          h('label', { class: 'escaner__et', for: 'buscar' }, 'Escanee o escriba el código'),
          h('div', { class: 'escaner__caja' }, icono('scan', { size: 24 }), buscador),
          h('p', { class: 'escaner__ayuda' }, 'Pulse Intro para agregarlo. También puede buscar por nombre o tocar un artículo. Las tasas de ITBMS del catálogo son de ejemplo.')),
        chipsEnvueltos, cabLista, grid),
      panel),
    barra, anuncio);

  const destinoVuelo = () => (matchMedia('(min-width: 1240px)').matches ? panel.querySelector('.panel-venta__cab h2') : barra);

  function pintaEncabezado() {
    const n = neg(); const punto = n.puntos.find((p) => p.id === n.puntoActivo);
    const clave = `${n.id}|${n.puntoActivo}`;
    if (clave === claveEncabezado) return; claveEncabezado = clave;
    const sucursal = n.sucursales.find((s) => s.id === punto?.sucursalId)?.nombre;
    clear(encabezado).append(
      logoNegocio(n.id, 52, { inverso: true }),
      h('div', { class: 'marca-banda__txt' }, h('h1', { id: 'tit-cat' }, 'Punto de venta'), h('p', null, n.nombre)),
      punto ? h('p', { class: 'marca-banda__punto' }, h('strong', null, `${punto.codigo}, ${punto.nombre}`), sucursal ? h('span', null, sucursal) : null) : null);
  }

  const filtrar = () => {
    const n = neg();
    return n.productos.filter((p) => (categoria === 'Todas' || p.categoria === categoria)
      && (!busqueda || `${p.descripcion} ${p.codigo}`.toLowerCase().includes(busqueda)));
  };
  const agregar = (p, desde) => {
    C.agregarAlCarrito(p.codigo);
    const fila = grid.querySelector(`[data-codigo="${p.codigo}"]`);
    if (fila) pulso(fila);
    volar(desde || fila?.querySelector('.prod__mas') || fila, destinoVuelo());
  };

  // Intro agrega el artículo cuando el código coincide exacto (lector de código de barras) o es la única coincidencia.
  buscador.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
    ev.preventDefault();
    const q = buscador.value.trim().toLowerCase();
    if (!q) return;
    const n = neg(); const lista = filtrar();
    const p = n.productos.find((x) => x.codigo.toLowerCase() === q) || (lista.length === 1 ? lista[0] : null);
    if (!p) { anuncio.textContent = lista.length ? `${lista.length} artículos coinciden. Escriba el código completo o toque uno.` : 'Ningún artículo coincide.'; return; }
    buscador.value = ''; busqueda = ''; categoria = 'Todas'; pintaCatalogo();
    agregar(p, buscador);
    anuncio.textContent = `Agregado: ${p.descripcion}.`;
  });

  // ------------------------------------------------------------ catálogo
  function pintaCatalogo() {
    const n = neg();
    const tarjetas = CATALOGO_EN_TARJETAS.includes(n.id);
    const cats = ['Todas', ...new Set(n.productos.map((p) => p.categoria))];
    if (!cats.includes(categoria)) categoria = 'Todas';
    clear(chips).append(...cats.map((c) => h('button', { class: `chip${c === categoria ? ' chip--on' : ''}`, type: 'button', 'aria-pressed': String(c === categoria), onclick: () => { categoria = c; pintaCatalogo(); } }, c)));
    const lista = filtrar();
    cabLista.hidden = tarjetas;
    grid.className = tarjetas ? 'prods prods--tarjetas' : 'prods';
    clear(grid);
    if (!lista.length) grid.append(h('p', { class: 'vacio' }, 'No hay artículos que coincidan con la búsqueda.'));
    for (const p of lista) {
      const etiqueta = `Agregar ${p.descripcion}, ${fmt(p.precio)}, ITBMS ${p.tasa} por ciento`;
      const alTocar = (ev) => agregar(p, ev.currentTarget.querySelector('.prod__mas'));
      if (tarjetas) {
        // Café: cada plato es una tarjeta con su ícono y su precio.
        grid.append(h('button', { class: 'tarjeta-prod', type: 'button', dataset: { codigo: p.codigo }, 'aria-label': etiqueta, onclick: alTocar },
          h('span', { class: 'tarjeta-prod__ico', 'aria-hidden': 'true' }, iconoCategoria(p.categoria, 36)),
          h('span', { class: 'tarjeta-prod__nombre' }, p.descripcion),
          h('span', { class: 'tarjeta-prod__cat' }, p.categoria),
          h('span', { class: 'tarjeta-prod__pie' }, h('strong', { class: 'num' }, fmt(p.precio)), h('span', { class: 'tasa mono' }, `ITBMS ${p.tasa} %`)),
          h('span', { class: 'prod__mas', 'aria-hidden': 'true' }, icono('plus', { size: 20 })),
          h('span', { class: 'prod__qty', hidden: true })));
        continue;
      }
      grid.append(h('button', { class: 'prod', type: 'button', dataset: { codigo: p.codigo }, 'aria-label': etiqueta, onclick: alTocar },
        h('span', { class: 'prod__cod mono' }, p.codigo),
        h('span', { class: 'prod__nombre' }, p.descripcion, h('small', null, p.categoria)),
        h('span', { class: 'prod__tasa mono' }, `${p.tasa} %`),
        h('strong', { class: 'prod__precio num' }, fmt(p.precio)),
        h('span', { class: 'prod__mas', 'aria-hidden': 'true' }, icono('plus', { size: 20 })),
        h('span', { class: 'prod__qty', hidden: true })));
    }
    pintaCantidades();
  }
  function pintaCantidades() {
    const c = carritoDe();
    for (const el of grid.querySelectorAll('.prod, .tarjeta-prod')) {
      const l = c.lineas.find((x) => x.codigo === el.dataset.codigo);
      const q = el.querySelector('.prod__qty');
      q.hidden = !l; q.textContent = l ? `× ${l.cantidad}` : '';
      el.classList.toggle('prod--en-carrito', !!l);
    }
  }

  // ------------------------------------------------------------ carrito
  function lineaCarrito(l) {
    const n = neg(); const p = n.productos.find((x) => x.codigo === l.codigo);
    const calc = C.totalesDelCarrito().lineas.find((x) => x.codigo === l.codigo);
    const input = h('input', { type: 'number', min: '1', max: '999', value: String(l.cantidad), inputmode: 'numeric', 'aria-label': `Cantidad de ${p.descripcion}`, 'data-foco': `qty-${l.codigo}` });
    input.addEventListener('change', () => C.fijarCantidad(l.codigo, input.value));
    const desc = h('input', { type: 'number', min: '0', max: '100', step: '1', value: String(l.descuentoPct || 0), inputmode: 'decimal', 'aria-label': `Descuento en porcentaje de ${p.descripcion}`, 'data-foco': `desc-${l.codigo}` });
    desc.addEventListener('change', () => C.fijarDescuento(l.codigo, desc.value));
    return h('li', { class: `linea${nuevasLineas.has(l.codigo) ? ' linea--nueva' : ''}` },
      h('div', { class: 'linea__cab' },
        h('strong', null, p.descripcion),
        h('button', { class: 'btn btn--ghost btn--icon btn--sm', type: 'button', 'aria-label': `Quitar ${p.descripcion}`, 'data-foco': `quitar-${l.codigo}`, onclick: () => C.quitarDelCarrito(l.codigo) }, icono('trash', { size: 16 }))),
      h('div', { class: 'linea__ctrl' },
        h('div', { class: 'stepper', role: 'group', 'aria-label': 'Cantidad' },
          h('button', { class: 'btn btn--icon btn--sm', type: 'button', 'aria-label': `Una unidad menos de ${p.descripcion}`, 'data-foco': `menos-${l.codigo}`, onclick: () => C.fijarCantidad(l.codigo, l.cantidad - 1) }, icono('minus', { size: 16 })),
          input,
          h('button', { class: 'btn btn--icon btn--sm', type: 'button', 'aria-label': `Una unidad más de ${p.descripcion}`, 'data-foco': `mas-${l.codigo}`, onclick: () => C.fijarCantidad(l.codigo, l.cantidad + 1) }, icono('plus', { size: 16 }))),
        h('label', { class: 'linea__desc' }, h('span', null, 'Desc.'), desc, h('span', { 'aria-hidden': 'true' }, '%')),
        h('strong', { class: 'linea__total num' }, fmt(calc.total))),
      h('small', { class: 'linea__nota' }, `${fmt(p.precio)} c/u · ITBMS ${p.tasa} %${calc.descuento > 0 ? ` · descuento ${fmt(calc.descuento)}` : ''}`));
  }

  function bloqueCliente(c) {
    const n = neg(); const err = c.errores || {};
    const modo = c.cliente.modo;
    const cont = h('fieldset', { class: 'bloque' }, h('legend', null, 'Cliente'),
      h('div', { class: 'opciones opciones--2' },
        opcionRadio({ nombre: 'cli-modo', valor: 'consumidor', texto: 'Consumidor final', marcado: modo === 'consumidor', foco: 'modo-consumidor', alCambiar: () => C.fijarCliente({ modo: 'consumidor' }) }),
        opcionRadio({ nombre: 'cli-modo', valor: 'ruc', texto: 'Cliente con RUC', marcado: modo === 'ruc', foco: 'modo-ruc', alCambiar: () => C.fijarCliente({ modo: 'ruc' }) })));
    if (modo === 'ruc') {
      const guardados = selector({
        etiqueta: 'Cliente guardado', foco: 'cli-guardado', valor: c.cliente.clienteId,
        opciones: [{ valor: '', texto: 'Escribir un cliente nuevo' }, ...n.clientes.map((g) => ({ valor: g.id, texto: `${g.nombre} · ${g.ruc}` }))],
        alCambiar: (v) => C.elegirClienteGuardado(v),
      });
      const nombre = campo({ etiqueta: 'Nombre o razón social', valor: c.cliente.nombre, requerido: true, foco: 'cli-nombre', alEscribir: (v) => C.escribirCliente({ nombre: v, clienteId: '' }) });
      // El ejemplo va como ayuda visible y no como placeholder: así el campo se anuncia por su etiqueta (FAC-RNF-07).
      const ruc = campo({ etiqueta: 'RUC', valor: c.cliente.ruc, requerido: true, foco: 'cli-ruc', ayuda: 'Ej.: 8-123-4567', alEscribir: (v) => C.escribirCliente({ ruc: v, clienteId: '' }) });
      const dv = campo({ etiqueta: 'DV', valor: c.cliente.dv, requerido: true, foco: 'cli-dv', maxlength: 2, inputmode: 'numeric', ayuda: 'Ej.: 07', alEscribir: (v) => C.escribirCliente({ dv: v, clienteId: '' }) });
      const correo = campo({ etiqueta: 'Correo (opcional)', tipo: 'email', valor: c.cliente.correo, foco: 'cli-correo', alEscribir: (v) => C.escribirCliente({ correo: v }) });
      const tel = campo({ etiqueta: 'WhatsApp del cliente (opcional)', tipo: 'tel', valor: c.cliente.telefono, foco: 'cli-tel', inputmode: 'tel', ayuda: 'Ej.: +507 6123-4567. Si falta, se pide al enviar por WhatsApp.', alEscribir: (v) => C.escribirCliente({ telefono: v }) });
      nombre.error(err.nombre); ruc.error(err.ruc); dv.error(err.dv); tel.error(err.telefono);
      cont.append(guardados.el, nombre.el, h('div', { class: 'fila-2' }, ruc.el, dv.el), correo.el, tel.el,
        h('p', { class: 'field__hint' }, 'Se valida el formato del RUC y del DV. Datos ficticios: no escriba información real.'));
    }
    return cont;
  }

  function bloquePago(c) {
    return h('fieldset', { class: 'bloque' }, h('legend', null, 'Forma de pago'),
      h('div', { class: 'opciones opciones--4 opciones--pago' }, METODOS_PAGO.map((m) => opcionRadio({ nombre: 'pago', valor: m.id, texto: m.nombre, marcado: c.metodoPago === m.id, foco: `pago-${m.id}`, alCambiar: C.fijarMetodoPago, ico: ICONO_PAGO[m.id] }))),
      h('p', { class: 'field__hint' }, 'Pago simulado: no se procesa ningún cobro real.'));
  }

  function bloqueSimulacion(c) {
    const s = selector({
      etiqueta: 'Simular rechazo del PAC', foco: 'simular', valor: c.simulacion,
      opciones: SIMULACIONES.map((o) => ({ valor: o.id, texto: o.nombre })), alCambiar: C.fijarSimulacion,
    });
    const caja = h('div', { class: 'bloque bloque--sim' }, s.el,
      h('p', { class: 'field__hint' }, 'Para la demostración: el PAC rechazará la próxima factura con el motivo elegido y podrá corregirla y reenviarla.'));
    if (c.errores?.simulacion) caja.append(h('p', { class: 'field__error', role: 'alert' }, c.errores.simulacion));
    return caja;
  }

  /** Total a cobrar con el desglose plegable debajo (se recuerda abierto o cerrado entre repintados). */
  function desgloseTotales(t) {
    const filas = [h('div', { class: 'tot' }, h('span', null, 'Subtotal'), h('span', { class: 'num' }, fmt(t.subtotal)))];
    if (t.descuentoTotal > 0) filas.push(h('div', { class: 'tot' }, h('span', null, 'Descuentos'), h('span', { class: 'num' }, fmt(-t.descuentoTotal))));
    for (const k of Object.keys(t.itbmsPorTasa)) if (t.basePorTasa[k] > 0) filas.push(h('div', { class: 'tot tot--tasa' }, h('span', null, `ITBMS ${k} %`), h('span', { class: 'num' }, fmt(t.itbmsPorTasa[k]))));
    filas.push(h('div', { class: 'tot tot--tasa' }, h('span', null, 'ITBMS total'), h('span', { class: 'num' }, fmt(t.itbmsTotal))));
    const det = h('details', { class: 'desglose' },
      h('summary', null,
        h('span', { class: 'desglose__tit' }, 'Total a cobrar'),
        h('strong', { class: 'cobro__total-num num' }, fmt(t.total)),
        icono('chevron', { size: 18, clase: 'desglose__flecha' })),
      h('div', { class: 'desglose__filas' }, filas, h('p', { class: 'field__hint' }, 'El total siempre es la suma de las líneas.')));
    det.open = !!ui().desglose;
    det.addEventListener('toggle', () => { ui().desglose = det.open; });
    return det;
  }

  function panelCarrito() {
    const n = neg(); const c = carritoDe(); const s = getState();
    const t = C.totalesDelCarrito();
    const vacio = c.lineas.length === 0;
    const puntos = selector({
      etiqueta: 'Punto de facturación', foco: 'punto', valor: n.puntoActivo,
      opciones: n.puntos.filter((p) => !p.web).map((p) => ({ valor: p.id, texto: `${p.codigo} · ${p.nombre} (${n.sucursales.find((x) => x.id === p.sucursalId)?.nombre})` })),
      alCambiar: C.fijarPuntoActivo,
    });
    return h('div', { class: 'panel-venta__in' },
      h('header', { class: 'panel-venta__cab' },
        h('h2', null, icono('cart', { size: 20 }), 'Venta actual'),
        h('button', { class: 'btn btn--ghost btn--sm panel-venta__cerrar', type: 'button', onclick: () => C.abrirCarrito(false) }, 'Seguir vendiendo')),
      puntos.el,
      vacio ? h('p', { class: 'vacio' }, 'Todavía no hay artículos. Toque uno del catálogo para empezar.')
        : h('ul', { class: 'lineas', 'aria-label': 'Artículos de la venta' }, c.lineas.map(lineaCarrito)),
      bloqueCliente(c), bloquePago(c), bloqueSimulacion(c),
      c.errores?.carrito ? h('p', { class: 'field__error', role: 'alert' }, c.errores.carrito) : null,
      s.offline ? h('p', { class: 'alerta alerta--cola alerta--mini' }, icono('wifioff', { size: 16 }), ' Sin conexión: la factura quedará en cola y se enviará sola.') : null,
      h('div', { class: 'cobro' },
        // El total y, plegado debajo, el desglose del ITBMS (subtotal, descuentos y cada tasa).
        desgloseTotales(t),
        h('button', { class: 'btn btn--primary btn--cobrar', type: 'button', disabled: vacio, onclick: () => { C.cobrar(); } },
          icono('receipt', { size: 22 }), vacio ? 'Cobrar' : h('span', null, 'Cobrar ', h('span', { class: 'cobro__monto num' }, fmt(t.total))))),
      h('p', { class: 'aviso-sim' }, AVISO_SIM));
  }

  function panelEmision(doc) {
    const n = neg();
    return h('div', { class: 'panel-venta__in' },
      h('header', { class: 'panel-venta__cab' },
        h('h2', null, icono('receipt', { size: 20 }), nombreTipo(doc.tipo)),
        badgeEstado(doc.estado)),
      h('p', { class: 'emision__num mono' }, `N.º ${numeroConTipo(doc)}`),
      renderPasos(doc),
      doc.estado === 'autorizada' ? h('p', { class: 'alerta alerta--ok alerta--mini' }, icono('check', { size: 16 }), ' Factura autorizada: ya puede entregarla al cliente.') : null,
      doc.estado === 'rechazada' ? renderRechazo(doc) : null,
      doc.estado === 'en_cola' ? renderEnCola(doc) : null,
      (doc.estado === 'generada' || doc.estado === 'enviada') ? h('p', { class: 'alerta alerta--cola alerta--mini' }, icono('clock', { size: 16 }), ' Enviando al PAC simulado…') : null,
      renderAccionesComprobante(doc, h('a', { class: 'btn', href: `#/documentos/${doc.id}` }, icono('file', { size: 16 }), 'Ver documento')),
      impresora(), renderCafe(doc, n),
      h('div', { class: 'panel-venta__pie' },
        h('button', { class: 'btn btn--primary btn--cobrar', type: 'button', onclick: () => C.nuevaVenta() }, icono('plus', { size: 20 }), 'Nueva venta'),
        h('button', { class: 'btn btn--ghost panel-venta__cerrar', type: 'button', onclick: () => C.abrirCarrito(false) }, 'Volver al catálogo')));
  }

  function pintaPanel(forzar = false) {
    const n = neg(); const c = carritoDe(); const u = ui(); const s = getState();
    const doc = u.emisionDocId ? n.documentos.find((d) => d.id === u.emisionDocId) : null;
    const firma = JSON.stringify([n.id, doc ? [doc.id, doc.estado, doc.rechazos.length, doc.historial.length, doc.total, doc.fecha, doc.cliente.dv, (doc.envios || []).length] : c, n.puntoActivo, s.offline, u.carritoAbierto, n.clientes.length]);
    if (!forzar && firma === firmaPanel) return;
    firmaPanel = firma;
    const actuales = new Set(c.lineas.map((l) => l.codigo));
    nuevasLineas = new Set([...actuales].filter((x) => !lineasPrevias.has(x))); lineasPrevias = actuales;
    panel.classList.toggle('panel-venta--abierto', !!u.carritoAbierto);
    conservarFoco(panel, () => clear(panel).append(doc ? panelEmision(doc) : panelCarrito()));
    const totalEl = panel.querySelector('.cobro__total-num');
    if (totalEl) {
      const nuevo = C.totalesDelCarrito().total;
      if (nuevo !== totalPrevio) anuncio.textContent = `Total a cobrar: ${fmt(nuevo)}.`;
      animarNumero(totalEl, nuevo, { desde: totalPrevio, formato: fmt, dur: 450 });
      const monto = panel.querySelector('.cobro__monto');
      if (monto) animarNumero(monto, nuevo, { desde: totalPrevio, formato: fmt, dur: 450 });
      totalPrevio = nuevo;
    }
    const marca = doc ? `${doc.id}:${doc.estado}` : '';
    if (doc && marca !== ultimoEstado) anuncio.textContent = `${nombreTipo(doc.tipo)} ${doc.numero}: ${doc.estado === 'autorizada' ? 'autorizada' : doc.estado === 'rechazada' ? 'rechazada por el PAC' : doc.estado === 'en_cola' ? 'en cola, sin conexión' : 'enviando al PAC'}.`;
    ultimoEstado = marca;
    // Barra inferior (solo en móvil).
    const total = C.totalesDelCarrito();
    const cant = c.lineas.reduce((a, l) => a + l.cantidad, 0);
    clear(barra).append(icono(doc ? 'receipt' : 'cart', { size: 20 }), h('span', null, doc ? `Comprobante ${numeroConTipo(doc)}` : `Venta actual · ${cant} ${cant === 1 ? 'artículo' : 'artículos'}`), h('strong', { class: 'num' }, doc ? fmt(doc.total) : fmt(total.total)));
    barra.classList.toggle('barra-carrito--oculta', !!u.carritoAbierto);
  }

  function refrescar(alcance) {
    pintaEncabezado();
    if (negocioPintado !== neg().id || alcance === 'reinicio') { negocioPintado = neg().id; ui().carritoAbierto = false; busqueda = ''; buscador.value = ''; categoria = 'Todas'; pintaCatalogo(); pintaPanel(true); return; }
    pintaCantidades(); pintaPanel();
  }
  refrescar();
  const baja = subscribe((_, alcance) => refrescar(alcance));
  return () => baja();
}
