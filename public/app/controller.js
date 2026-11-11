// Acciones de la demo: carrito, cobro, emisión por el PAC simulado, rechazos y correcciones,
// notas de crédito y débito, pedidos de la tienda, cola sin conexión, medidor y ajustes.
// Las vistas llaman a estas funciones y se redibujan cuando el almacén avisa.
import { getState, neg, ui, update, carritoDe, nuevoCarrito, reiniciar as reiniciarEstado } from './state.js';
import { construirFactura, construirNotaCredito, construirNotaDebito, clienteConsumidor, numeroDe, lineasDevolvibles } from './docs.js';
import { aplicarSimulacion, validarDocumento, autorizar, corregirDocumento } from './pac.js';
import { validarContribuyente, validarTelefono, normalizaRuc, normalizaDv } from './ruc.js';
import { fmt } from './money.js';
import { calcMedidor } from './meter.js';
import { calcDocumento } from './calc.js';
import { DV_REGEX, SIMULACIONES, TASAS, TIEMPOS } from './config.js';
import { COMPRADORES_TIENDA, ORDEN_NEGOCIOS } from './data/catalogs.js';
import { nowStamp, nowStampSeg, todayKey } from '../shared/time/panama.js';
import { sleep, reducedMotion, uid } from '../shared/ui/dom.js';
import { mulberry32, hash32 } from './fake.js';

// ------------------------------------------------------------------ utilidades

let notificar = () => {};
/** La interfaz registra aquí cómo mostrar avisos (toast) que nacen en tareas de fondo. */
export const alAvisar = (fn) => { notificar = fn; };

let velocidad = 1;
/** 1 = animación normal; 0 = sin esperas (pruebas y modo "instantáneo" de la presentación). */
export const fijarVelocidad = (v) => { velocidad = v; };
const espera = (ms) => {
  const t = velocidad === 0 ? 0 : reducedMotion() ? ms * 0.3 : ms * velocidad;
  return t > 0 ? sleep(t) : Promise.resolve();
};

const docDe = (negId, id) => neg(negId).documentos.find((d) => d.id === id);
const puntoActivo = (n) => n.puntos.find((p) => p.id === n.puntoActivo) || n.puntos.find((p) => !p.web) || n.puntos[0];
const puntoWeb = (n) => n.puntos.find((p) => p.web) || puntoActivo(n);
const ahora = () => nowStampSeg();
const reglaDe = (n) => n.emisor.reglaRedondeo || 'linea';
const dmy = (f) => { const [y, m, d] = f.slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
/** Aviso emergente para módulos que no son vistas (por ejemplo la actividad en vivo). */
export const avisar = (mensaje, tipo) => notificar(mensaje, tipo);

/**
 * Siguiente consecutivo de un punto de facturación y tipo de documento (FAC-RF-13): cada punto
 * (PF1, PF2, PF3, WEB) lleva su propia serie por factura, nota de crédito y nota de débito.
 * Devuelve también el contador interno que se usa para el id del documento.
 */
function proximo(n, tipo, punto) {
  n.contadores[tipo] = (n.contadores[tipo] || 0) + 1;
  const p = n.puntos.find((x) => x.codigo === punto.codigo) || punto;
  p.consecutivos ||= { factura: 0, nota_credito: 0, nota_debito: 0 };
  p.consecutivos[tipo] = (p.consecutivos[tipo] || 0) + 1;
  return { idN: n.contadores[tipo], numero: numeroDe(p, p.consecutivos[tipo]) };
}

// ------------------------------------------------------------------ negocio y conexión

export function seleccionarNegocio(id) {
  if (!getState().negocios[id]) return;
  update((s) => { s.negocioId = id; s._ui.emisionDocId = null; }, 'datos');
}

export function reiniciarDemo() { reiniciarEstado(); }

// ------------------------------------------------------------------ carrito

const carrito = () => carritoDe();
const aUi = (fn) => update(fn, 'ui');

export function agregarAlCarrito(codigo, cantidad = 1) {
  const n = neg();
  if (!n.productos.some((p) => p.codigo === codigo)) return;
  aUi(() => {
    const c = carrito(); const l = c.lineas.find((x) => x.codigo === codigo);
    if (l) l.cantidad = Math.min(999, l.cantidad + cantidad); else c.lineas.push({ codigo, cantidad, descuentoPct: 0 });
    c.errores = {};
    ui().emisionDocId = null;
  });
}
export function fijarCantidad(codigo, cantidad) {
  aUi(() => {
    const c = carrito(); const q = Math.max(0, Math.min(999, Math.floor(Number(cantidad) || 0)));
    if (q === 0) c.lineas = c.lineas.filter((x) => x.codigo !== codigo);
    else { const l = c.lineas.find((x) => x.codigo === codigo); if (l) l.cantidad = q; }
  });
}
export function fijarDescuento(codigo, pct) {
  aUi(() => { const l = carrito().lineas.find((x) => x.codigo === codigo); if (l) l.descuentoPct = Math.min(100, Math.max(0, Number(pct) || 0)); });
}
export function quitarDelCarrito(codigo) { fijarCantidad(codigo, 0); }
export function vaciarCarrito() { aUi(() => { const k = getState().negocioId; getState()._ui.carritos[k] = nuevoCarrito(); }); }
export function fijarCliente(parche) {
  aUi(() => { const c = carrito(); Object.assign(c.cliente, parche); c.errores = {}; });
}
export function elegirClienteGuardado(id) {
  const g = neg().clientes.find((x) => x.id === id);
  aUi(() => {
    const c = carrito();
    if (!g) { Object.assign(c.cliente, { clienteId: '', nombre: '', ruc: '', dv: '', correo: '', telefono: '' }); return; }
    Object.assign(c.cliente, { modo: 'ruc', clienteId: g.id, nombre: g.nombre, ruc: g.ruc, dv: g.dv, correo: g.correo || '', telefono: g.telefonoWhatsApp || '' });
    c.errores = {};
  });
}
/** Escribe en el formulario del cliente sin redibujar (para no perder el cursor al teclear). */
export function escribirCliente(parche) { Object.assign(carrito().cliente, parche); }
export function fijarMetodoPago(m) { aUi(() => { carrito().metodoPago = m; }); }
export function fijarSimulacion(s) { aUi(() => { if (SIMULACIONES.some((x) => x.id === s)) carrito().simulacion = s; }); }
export function abrirCarrito(v) { aUi(() => { ui().carritoAbierto = v; }); }

/** Líneas del carrito con precio, descripción y tasa del catálogo (listas para calcular). */
export function itemsDelCarrito(negId) {
  const n = neg(negId); const c = carritoDe(negId);
  return c.lineas.map((l) => { const p = n.productos.find((x) => x.codigo === l.codigo); return { ...p, cantidad: l.cantidad, descuentoPct: l.descuentoPct }; }).filter((l) => l.codigo);
}
export const totalesDelCarrito = (negId) => calcDocumento(itemsDelCarrito(negId), reglaDe(neg(negId)));

// ------------------------------------------------------------------ envío al PAC simulado

function encolar(negId, id) {
  update(() => {
    const d = docDe(negId, id); if (!d || d.estado === 'en_cola') return;
    d.estado = 'en_cola'; d.historial.push({ estado: 'en_cola', t: nowStamp() });
  });
}

function resolver(negId, id) {
  update(() => {
    const d = docDe(negId, id); if (!d) return;
    const problema = validarDocumento(d, todayKey());
    const t = nowStamp();
    if (!problema) {
      Object.assign(d, autorizar(d, t));
      d.estado = 'autorizada';
      d.historial.push({ estado: 'autorizada', t });
      const ultimo = d.rechazos[d.rechazos.length - 1];
      if (ultimo && !ultimo.corregido) { ultimo.corregido = true; ultimo.corregidoEn = t; }
    } else {
      d.estado = 'rechazada';
      d.historial.push({ estado: 'rechazada', t, motivo: problema.motivo });
      const ultimo = d.rechazos[d.rechazos.length - 1];
      if (ultimo && !ultimo.corregido && ultimo.tipo === problema.tipo) { ultimo.motivo = problema.motivo; ultimo.fecha = t; }
      else d.rechazos.push({ tipo: problema.tipo, motivo: problema.motivo, fecha: t, corregido: false });
    }
  });
}

/**
 * Lleva un documento por Generada → Enviada → Autorizada (o Rechazada). Si no hay conexión, queda
 * "En cola". Es seguro llamarlo con un documento que ya está en cola (lo retoma en "Enviada").
 */
export async function enviarAlPac(negId, id) {
  let d = docDe(negId, id); if (!d) return;
  if (getState().offline) return encolar(negId, id);
  if (d.estado === 'generada') {
    await espera(TIEMPOS.aEnviada);
    d = docDe(negId, id); if (!d) return;
    if (getState().offline) return encolar(negId, id);
    update(() => { d.estado = 'enviada'; d.historial.push({ estado: 'enviada', t: nowStamp() }); });
  } else if (d.estado === 'en_cola') {
    update(() => { d.estado = 'enviada'; d.historial.push({ estado: 'enviada', t: nowStamp() }); });
  } else if (d.estado !== 'enviada') return;
  await espera(TIEMPOS.aResultado);
  if (!docDe(negId, id)) return;
  if (getState().offline) return encolar(negId, id);
  resolver(negId, id);
}

// ------------------------------------------------------------------ cobro

/** Valida, arma la factura y la manda al PAC. Devuelve { ok, id?, errores?, listo? }. */
export function cobrar() {
  const s = getState(); const n = neg(); const c = carrito();
  const errores = {};
  if (!c.lineas.length) errores.carrito = 'Agregue al menos un artículo antes de cobrar.';
  let cliente = clienteConsumidor();
  if (c.cliente.modo === 'ruc') {
    const v = validarContribuyente(c.cliente);
    if (!v.ok) Object.assign(errores, v.errores);
    else cliente = { tipo: 'contribuyente', nombre: c.cliente.nombre.trim(), ruc: normalizaRuc(c.cliente.ruc), dv: normalizaDv(c.cliente.dv), correo: c.cliente.correo.trim() || undefined };
  } else if (c.cliente.correo) cliente = { ...cliente, correo: c.cliente.correo.trim() };
  if (c.simulacion === 'ruc_dv' && cliente.tipo !== 'contribuyente') errores.simulacion = 'Para simular un RUC o DV inválido, elija "Cliente con RUC".';
  const tel = validarTelefono(c.cliente.telefono);
  if (!tel.ok) errores.telefono = tel.error;
  else if (tel.valor) cliente = { ...cliente, telefonoWhatsApp: tel.valor };
  if (Object.keys(errores).length) { aUi(() => { c.errores = errores; }); return { ok: false, errores }; }

  const items = itemsDelCarrito();
  const punto = puntoActivo(n);
  const { idN, numero } = proximo(n, 'factura', punto);
  const doc = construirFactura({
    id: `${n.id}-f${idN}`, numero, fecha: ahora(), cliente, items,
    metodoPago: c.metodoPago, origen: 'POS', punto, pac: n.pacId, regla: reglaDe(n),
  });
  if (c.simulacion !== 'ninguna') aplicarSimulacion(doc, c.simulacion);
  const negId = n.id;
  update(() => {
    n.documentos.push(doc);
    if (cliente.tipo === 'contribuyente' && !n.clientes.some((x) => normalizaRuc(x.ruc) === cliente.ruc)) {
      n.clientes.push({ id: uid('c'), ...cliente, dv: doc.simulacion?.dvCorrecto ?? cliente.dv });
    }
    s._ui.carritos[negId] = nuevoCarrito();
    s._ui.emisionDocId = doc.id;
    s._ui.carritoAbierto = true;
  });
  return { ok: true, id: doc.id, listo: enviarAlPac(negId, doc.id) };
}

/** Empieza otra venta: sale del comprobante y, en el celular, cierra la hoja del carrito para volver al catálogo. */
export function nuevaVenta() { aUi(() => { ui().emisionDocId = null; ui().carritoAbierto = false; }); }
/** Deja un comprobante a la vista en el panel del punto de venta (lo usa el modo Presentación). */
export function mostrarEmision(docId) { aUi(() => { ui().emisionDocId = docId; }); }

/** Deja constancia de que el comprobante se mandó (simulado) por WhatsApp o correo. */
export function registrarEnvio(docId, canal, a) {
  const n = neg();
  update(() => { const d = docDe(n.id, docId); if (d) (d.envios ||= []).push({ canal, a, t: nowStamp() }); });
}

/** Guarda el teléfono de WhatsApp del cliente de un documento (se pide al enviar si falta). */
export function fijarTelefonoDoc(docId, telefono) {
  const n = neg(); const d = docDe(n.id, docId);
  if (!d) return { ok: false, error: 'No existe ese documento.' };
  const t = validarTelefono(telefono);
  if (!t.ok) return t;
  if (!t.valor) return { ok: false, error: 'Escriba el número de WhatsApp del cliente.' };
  update(() => { d.cliente.telefonoWhatsApp = t.valor; });
  return { ok: true, valor: t.valor };
}

// ------------------------------------------------------------------ corrección de rechazos

/** `cambios`: { ruc, dv } | { recalcular: true } | { fechaHoy: true }. */
export function corregirYReenviar(id, cambios, negId = getState().negocioId) {
  const d = docDe(negId, id);
  if (!d || d.estado !== 'rechazada') return { ok: false, error: 'Este documento no está rechazado.' };
  if (cambios.dv != null && !DV_REGEX.test(normalizaDv(cambios.dv))) return { ok: false, error: 'El DV debe tener exactamente 2 dígitos.' };
  if (cambios.ruc != null) {
    const v = validarContribuyente({ nombre: d.cliente.nombre, ruc: cambios.ruc, dv: cambios.dv ?? d.cliente.dv });
    if (v.errores.ruc) return { ok: false, error: v.errores.ruc };
  }
  update(() => {
    const antes = { cliente: { ...d.cliente }, total: d.total, fecha: d.fecha };
    const nuevo = corregirDocumento(d, cambios, ahora());
    Object.assign(d, nuevo);
    const partes = [];
    if (antes.cliente.ruc !== nuevo.cliente.ruc) partes.push(`RUC ${antes.cliente.ruc} → ${nuevo.cliente.ruc}`);
    if (antes.cliente.dv !== nuevo.cliente.dv) partes.push(`DV ${antes.cliente.dv} → ${nuevo.cliente.dv}`);
    if (antes.total !== nuevo.total) partes.push(`Total ${fmt(antes.total)} → ${fmt(nuevo.total)}`);
    if (antes.fecha.slice(0, 10) !== nuevo.fecha.slice(0, 10)) partes.push(`Fecha ${dmy(antes.fecha)} → ${dmy(nuevo.fecha)}`);
    d.estado = 'generada';
    d.historial.push({ estado: 'generada', t: ahora(), cambio: partes.join(' · ') || 'Reenviado sin cambios' });
  });
  return { ok: true, listo: enviarAlPac(negId, id) };
}

// ------------------------------------------------------------------ notas de crédito y débito

export function emitirNotaCredito(facturaId, items, motivo) {
  const n = neg(); const f = docDe(n.id, facturaId);
  if (!f || f.tipo !== 'factura' || f.estado !== 'autorizada') return { ok: false, error: 'Solo se puede emitir una nota de crédito sobre una factura autorizada.' };
  const disp = Object.fromEntries(lineasDevolvibles(n.documentos, f).map((l) => [l.codigo, l.disponible]));
  const pedidos = items.map((i) => ({ codigo: i.codigo, cantidad: Math.floor(Number(i.cantidad) || 0) })).filter((i) => i.cantidad > 0);
  if (!pedidos.length) return { ok: false, error: 'Indique la cantidad que se devuelve de al menos un artículo.' };
  const exceso = pedidos.find((i) => i.cantidad > (disp[i.codigo] ?? 0));
  if (exceso) return { ok: false, error: `No se puede devolver más de lo vendido (quedan ${disp[exceso.codigo] ?? 0} de ${exceso.codigo}).` };
  const punto = puntoActivo(n);
  const { idN, numero } = proximo(n, 'nota_credito', punto);
  const doc = construirNotaCredito({ id: `${n.id}-nc${idN}`, numero, fecha: ahora(), factura: f, items: pedidos, motivo, punto, pac: n.pacId, regla: reglaDe(n) });
  update(() => { n.documentos.push(doc); });
  return { ok: true, id: doc.id, listo: enviarAlPac(n.id, doc.id) };
}

export function emitirNotaDebito(facturaId, { concepto, monto, tasa, motivo }) {
  const n = neg(); const f = docDe(n.id, facturaId);
  if (!f || f.tipo !== 'factura' || f.estado !== 'autorizada') return { ok: false, error: 'Solo se puede emitir una nota de débito sobre una factura autorizada.' };
  const m = Number(monto);
  if (!String(concepto || '').trim()) return { ok: false, error: 'Escriba el concepto del cargo adicional.' };
  if (!(m > 0)) return { ok: false, error: 'El monto debe ser mayor que cero.' };
  const t = TASAS.includes(Number(tasa)) ? Number(tasa) : 7;
  const punto = puntoActivo(n);
  const { idN, numero } = proximo(n, 'nota_debito', punto);
  const doc = construirNotaDebito({ id: `${n.id}-nd${idN}`, numero, fecha: ahora(), regla: reglaDe(n), factura: f, concepto: String(concepto).trim(), monto: m, tasa: t, motivo: motivo || 'Cargo adicional', punto, pac: n.pacId });
  update(() => { n.documentos.push(doc); });
  return { ok: true, id: doc.id, listo: enviarAlPac(n.id, doc.id) };
}

// ------------------------------------------------------------------ tienda en línea

/** Un pedido de la tienda simulada: se factura solo, sin que nadie lo toque. */
export function pedidoDeTienda({ items, comprador } = {}) {
  const n = neg();
  const rnd = mulberry32(hash32(`pedido|${Date.now()}|${n.contadores.pedido}`));
  const elegidos = items?.length ? items : (() => {
    const k = 1 + Math.floor(rnd() * 3); const usados = new Set(); const out = [];
    while (out.length < k) { const p = n.productos[Math.floor(rnd() * n.productos.length)]; if (!usados.has(p.codigo)) { usados.add(p.codigo); out.push({ ...p, cantidad: 1 + Math.floor(rnd() * 2), descuentoPct: 0 }); } }
    return out;
  })();
  const [nombre, correo] = comprador ? [comprador.nombre, comprador.correo] : COMPRADORES_TIENDA[Math.floor(rnd() * COMPRADORES_TIENDA.length)];
  const punto = puntoWeb(n);
  const { idN, numero } = proximo(n, 'factura', punto);
  n.contadores.pedido += 1;
  const pedido = `T-${n.contadores.pedido}`;
  const metodos = ['tarjeta', 'yappy', 'ach'];
  const doc = construirFactura({
    id: `${n.id}-f${idN}`, numero, fecha: ahora(), cliente: { tipo: 'consumidor', nombre, correo },
    items: elegidos, metodoPago: metodos[Math.floor(rnd() * metodos.length)], origen: 'tienda', punto, pac: n.pacId, pedido, regla: reglaDe(n),
  });
  const negId = n.id;
  update(() => { n.documentos.push(doc); });
  return { ok: true, id: doc.id, pedido, listo: enviarAlPac(negId, doc.id).then(() => notificar(`Pedido ${pedido} facturado solo.`, 'ok')) };
}

/** Carrito de la tienda simulada (no se guarda). */
export function tiendaAgregar(codigo) {
  aUi(() => { const t = ui().tienda; const l = t.carrito.find((x) => x.codigo === codigo); if (l) l.cantidad += 1; else t.carrito.push({ codigo, cantidad: 1 }); });
}
export function tiendaCantidad(codigo, q) {
  aUi(() => { const t = ui().tienda; const n = Math.max(0, Math.min(99, Math.floor(Number(q) || 0))); t.carrito = n === 0 ? t.carrito.filter((x) => x.codigo !== codigo) : t.carrito.map((x) => (x.codigo === codigo ? { ...x, cantidad: n } : x)); });
}
export function tiendaVaciar() { aUi(() => { ui().tienda.carrito = []; }); }

/** Una venta de mostrador al azar (la usa la "actividad en vivo"). */
export function ventaAlAzar() {
  const n = neg();
  const rnd = mulberry32(hash32(`azar|${Date.now()}|${n.contadores.factura}`));
  const k = 1 + Math.floor(rnd() * 3); const usados = new Set(); const items = [];
  while (items.length < k) {
    const p = n.productos[Math.floor(rnd() * n.productos.length)];
    if (!usados.has(p.codigo)) { usados.add(p.codigo); items.push({ ...p, cantidad: 1 + Math.floor(rnd() * 3), descuentoPct: 0 }); }
  }
  const cliente = rnd() < 0.25 && n.clientes.length ? { ...n.clientes[Math.floor(rnd() * n.clientes.length)] } : clienteConsumidor();
  const punto = puntoActivo(n);
  const { idN, numero } = proximo(n, 'factura', punto);
  const metodos = ['efectivo', 'tarjeta', 'yappy', 'ach'];
  const doc = construirFactura({
    id: `${n.id}-f${idN}`, numero, fecha: ahora(), cliente, items,
    metodoPago: metodos[Math.floor(rnd() * metodos.length)], origen: 'POS', punto, pac: n.pacId, regla: reglaDe(n),
  });
  const negId = n.id;
  update(() => { n.documentos.push(doc); });
  return { ok: true, id: doc.id, numero: doc.numero, total: doc.total, listo: enviarAlPac(negId, doc.id) };
}

// ------------------------------------------------------------------ sin conexión

let colaEnCurso = null;
export const enCola = (negId) => neg(negId).documentos.filter((d) => d.estado === 'en_cola');
export const enColaTotal = () => ORDEN_NEGOCIOS.reduce((s, id) => s + enCola(id).length, 0);

export function ponerSinConexion(v) {
  const s = getState();
  if (!!s.offline === !!v) return;
  update(() => { s.offline = !!v; });
  if (v) notificar('Sin conexión. Las ventas seguirán, quedan en cola y se envían solas al volver.', 'warn');
  else { notificar('Conexión restablecida. Enviando los documentos en cola…', 'ok'); vaciarCola(); }
}

/** Envía todo lo que está en cola. Si ya hay un envío en marcha, devuelve ese mismo (se puede esperar). */
export function vaciarCola() {
  if (colaEnCurso) return colaEnCurso;
  colaEnCurso = (async () => {
    const orden = [getState().negocioId, ...ORDEN_NEGOCIOS.filter((x) => x !== getState().negocioId)];
    let enviados = 0;
    for (const negId of orden) {
      const pendientes = enCola(negId).sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).map((d) => d.id);
      for (const id of pendientes) {
        if (getState().offline) return;
        await enviarAlPac(negId, id);
        enviados += 1;
        await espera(TIEMPOS.entreCola);
      }
    }
    if (enviados && !getState().offline) notificar(`Cola vacía: ${enviados} ${enviados === 1 ? 'documento enviado' : 'documentos enviados'}.`, 'ok');
  })().finally(() => { colaEnCurso = null; });
  return colaEnCurso;
}

// ------------------------------------------------------------------ medidor

/**
 * Pone las cifras del prospecto (FAC-RF-02). El medidor pasa a "modo prospecto": esas cifras quedan
 * fijas aunque la demo emita documentos, hasta pulsar "Datos de la demo".
 */
export function fijarMedidor(valores) {
  const n = neg();
  const actual = calcMedidor(n, todayKey());
  update(() => { n.prospecto = { ventasAnio: valores.ventasAnio ?? actual.ventasAnio, docsMes: valores.docsMes ?? actual.docsMes }; });
}
export function restaurarMedidor() {
  const n = neg();
  update(() => { n.prospecto = null; n.medidorBase = { ...n.medidorBaseSemilla }; });
}

// ------------------------------------------------------------------ ajustes

export function guardarEmisor(campos) {
  const n = neg();
  const v = validarContribuyente({ nombre: campos.razonSocial, ruc: campos.ruc, dv: campos.dv });
  if (!v.ok) return { ok: false, errores: { razonSocial: v.errores.nombre, ruc: v.errores.ruc, dv: v.errores.dv } };
  update(() => { Object.assign(n.emisor, { razonSocial: campos.razonSocial.trim(), ruc: normalizaRuc(campos.ruc), dv: normalizaDv(campos.dv), direccion: (campos.direccion || '').trim() }); });
  return { ok: true };
}
export function fijarPac(id) { update(() => { neg().pacId = id; }); }
/** Regla de redondeo del ITBMS ('linea' o 'base'). Rige para los documentos nuevos. */
export function fijarReglaRedondeo(regla) { if (regla === 'linea' || regla === 'base') update(() => { neg().emisor.reglaRedondeo = regla; }); }
export function fijarAjuste(clave, valor) { update(() => { neg().ajustes[clave] = valor; }); }
export function fijarPuntoActivo(id) { update(() => { const n = neg(); if (n.puntos.some((p) => p.id === id && !p.web)) n.puntoActivo = id; }); }

export function agregarSucursal(nombre) {
  const t = String(nombre || '').trim(); if (!t) return { ok: false, error: 'Escriba el nombre de la sucursal.' };
  update(() => { neg().sucursales.push({ id: uid('s'), nombre: t }); });
  return { ok: true };
}
export function quitarSucursal(id) {
  const n = neg();
  if (n.puntos.some((p) => p.sucursalId === id)) return { ok: false, error: 'Esa sucursal tiene puntos de facturación. Quítelos primero.' };
  update(() => { n.sucursales = n.sucursales.filter((s) => s.id !== id); });
  return { ok: true };
}
export function agregarPunto({ codigo, nombre, sucursalId }) {
  const n = neg();
  const c = String(codigo || '').trim().toUpperCase(); const t = String(nombre || '').trim();
  if (!c || !t) return { ok: false, error: 'Escriba el código y el nombre del punto de facturación.' };
  if (n.puntos.some((p) => p.codigo === c)) return { ok: false, error: `Ya existe un punto con el código ${c}.` };
  if (!n.sucursales.some((s) => s.id === sucursalId)) return { ok: false, error: 'Elija una sucursal.' };
  update(() => { n.puntos.push({ id: uid('p'), codigo: c, nombre: t, sucursalId, consecutivos: { factura: 0, nota_credito: 0, nota_debito: 0 } }); });
  return { ok: true };
}
export function quitarPunto(id) {
  const n = neg(); const p = n.puntos.find((x) => x.id === id);
  if (!p) return { ok: false, error: 'No existe ese punto.' };
  if (p.web) return { ok: false, error: 'El punto de la tienda en línea no se puede quitar.' };
  if (n.puntos.filter((x) => !x.web).length <= 1) return { ok: false, error: 'Debe quedar al menos un punto de facturación en mostrador.' };
  update(() => { n.puntos = n.puntos.filter((x) => x.id !== id); if (n.puntoActivo === id) n.puntoActivo = n.puntos.find((x) => !x.web).id; });
  return { ok: true };
}

export function fijarMes(ym) { update(() => { ui().mes = ym; }, 'ui'); }
