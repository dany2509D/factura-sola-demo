// Piezas compartidas entre el punto de venta y el detalle de un documento: la línea de estados
// (Generada → Enviada → Autorizada), el aviso de rechazo con su corrección y los botones de
// imprimir / WhatsApp / correo.
import { h } from '../../shared/ui/dom.js';
import { neg, getState } from '../state.js';
import { corregirYReenviar, vaciarCola, ponerSinConexion } from '../controller.js';
import { fmt } from '../money.js';
import { icono, campo, fechaCorta } from '../ui-kit.js';
import { todayKey } from '../../shared/time/panama.js';
import { imprimirCafe } from './cafe.js';
import { enviarPorWhatsApp, enviarPorCorreo } from './enviar.js';
import { toast } from '../../shared/ui/ui.js';

const LEYENDA_PASO = { hecho: 'cumplido', activo: 'en curso', pendiente: 'pendiente', error: 'con error', cola: 'en espera' };

/**
 * Línea de tiempo animada del documento. Sin conexión el documento queda "En cola": ahí "Enviada"
 * todavía no se cumplió, así que se muestra pendiente y con la nota de cuándo ocurrirá.
 */
export function renderPasos(doc) {
  const e = doc.estado;
  // Cada paso lleva el color de su estado: Generada gris, Enviada azul, Autorizada verde, Rechazada rojo y En cola ámbar.
  const fases = e === 'en_cola' ? [
    { nombre: 'Generada', ico: 'file', est: 'hecho', tono: 'neutro' },
    { nombre: 'En cola', ico: 'clock', est: 'cola', tono: 'aviso', nota: 'sin conexión' },
    { nombre: 'Enviada', ico: 'send', est: 'pendiente', tono: 'info', nota: 'al volver internet' },
  ] : [
    { nombre: 'Generada', ico: 'file', est: e === 'generada' ? 'activo' : 'hecho', tono: 'neutro' },
    { nombre: 'Enviada', ico: 'send', est: e === 'generada' ? 'pendiente' : e === 'enviada' ? 'activo' : 'hecho', tono: 'info' },
    { nombre: e === 'rechazada' ? 'Rechazada' : 'Autorizada', ico: e === 'rechazada' ? 'x' : 'check', est: e === 'autorizada' ? 'hecho' : e === 'rechazada' ? 'error' : 'pendiente', tono: e === 'rechazada' ? 'mal' : 'ok' },
  ];
  return h('ol', { class: 'pasos', 'aria-label': 'Estado del documento' }, fases.map((f) =>
    h('li', { class: `paso paso--${f.est} paso--t-${f.tono}`, 'aria-current': f.est === 'activo' ? 'step' : null },
      h('span', { class: 'paso__punto' }, icono(f.ico, { size: 16 })),
      h('span', { class: 'paso__nombre' }, f.nombre, h('span', { class: 'sr-only' }, `: ${LEYENDA_PASO[f.est]}`)),
      f.nota ? h('small', { class: 'paso__nota' }, f.nota) : null)));
}

/** Aviso del último rechazo y formulario para corregir y reenviar. */
export function renderRechazo(doc) {
  const r = doc.rechazos[doc.rechazos.length - 1];
  if (!r) return h('div');
  const msg = h('p', { class: 'field__error', role: 'alert' });
  const reenviar = (cambios) => {
    const res = corregirYReenviar(doc.id, cambios);
    if (!res.ok) { msg.textContent = res.error; return; }
    msg.textContent = '';
    toast('Documento corregido y reenviado al PAC simulado.', { kind: 'ok' });
  };
  let editor;
  if (r.tipo === 'ruc_dv' || r.tipo === 'formato_ruc') {
    const guardado = neg().clientes.find((c) => c.ruc === doc.cliente.ruc);
    const rucF = campo({ etiqueta: 'RUC del cliente', valor: doc.cliente.ruc, foco: `rech-ruc-${doc.id}` });
    const dvF = campo({ etiqueta: 'DV (2 dígitos)', valor: doc.cliente.dv, maxlength: 2, inputmode: 'numeric', foco: `rech-dv-${doc.id}`, ayuda: guardado ? `El cliente guardado tiene el DV ${guardado.dv}.` : 'Revise el DV en el RUC del cliente.' });
    editor = h('div', { class: 'corrector__campos' }, rucF.el, dvF.el,
      guardado ? h('button', { class: 'btn btn--sm', type: 'button', onclick: () => { dvF.input.value = guardado.dv; } }, 'Usar el DV guardado') : null,
      h('button', { class: 'btn btn--primary', type: 'button', onclick: () => reenviar({ ruc: rucF.input.value, dv: dvF.input.value }) }, icono('send', { size: 16 }), 'Corregir y reenviar'));
  } else if (r.tipo === 'totales') {
    editor = h('div', { class: 'corrector__campos' },
      h('p', null, `Total enviado: ${fmt(doc.total)}. El sistema vuelve a sumar las líneas y corrige el total.`),
      h('button', { class: 'btn btn--primary', type: 'button', onclick: () => reenviar({ recalcular: true }) }, icono('refresh', { size: 16 }), 'Recalcular totales y reenviar'));
  } else if (r.tipo === 'fecha') {
    editor = h('div', { class: 'corrector__campos' },
      h('p', null, `Fecha enviada: ${fechaCorta(doc.fecha)}. Hoy es ${fechaCorta(todayKey())}.`),
      h('button', { class: 'btn btn--primary', type: 'button', onclick: () => reenviar({ fechaHoy: true }) }, icono('refresh', { size: 16 }), 'Usar la fecha de hoy y reenviar'));
  } else {
    editor = h('button', { class: 'btn btn--primary', type: 'button', onclick: () => reenviar({ recalcular: true }) }, 'Reenviar');
  }
  return h('section', { class: 'alerta alerta--mal corrector', 'aria-labelledby': `rech-${doc.id}` },
    h('h3', { id: `rech-${doc.id}` }, icono('x', { size: 18 }), ' El PAC rechazó este documento'),
    h('p', { class: 'corrector__motivo' }, r.motivo),
    editor, msg);
}

export function renderEnCola(doc) {
  const s = getState();
  return h('section', { class: 'alerta alerta--cola' },
    h('h3', null, icono('clock', { size: 18 }), ' Sin conexión: la venta quedó en cola'),
    h('p', null, 'La factura ya tiene número y se envía sola al PAC cuando vuelva internet. Puede seguir vendiendo.'),
    s.offline ? h('button', { class: 'btn btn--sm', type: 'button', onclick: () => ponerSinConexion(false) }, icono('wifi', { size: 16 }), 'Volver a conectar') : h('button', { class: 'btn btn--sm', type: 'button', onclick: () => vaciarCola() }, icono('send', { size: 16 }), 'Enviar ahora'));
}

/** Botones de imprimir, WhatsApp y correo (activos solo con el documento autorizado). */
export function renderAccionesComprobante(doc, extra = []) {
  const n = neg();
  const ok = doc.estado === 'autorizada';
  const titulo = ok ? null : 'Disponible cuando el documento esté autorizado';
  return h('div', { class: 'acciones-doc' },
    h('button', { class: 'btn', type: 'button', disabled: !ok, title: titulo, onclick: () => imprimirCafe(doc, n) }, icono('printer', { size: 16 }), 'Imprimir CAFE'),
    h('button', { class: 'btn', type: 'button', disabled: !ok, title: titulo, onclick: () => enviarPorWhatsApp(doc, n) }, icono('chat', { size: 16 }), 'WhatsApp'),
    h('button', { class: 'btn', type: 'button', disabled: !ok, title: titulo, onclick: () => enviarPorCorreo(doc, n) }, icono('mail', { size: 16 }), 'Correo'),
    extra);
}

