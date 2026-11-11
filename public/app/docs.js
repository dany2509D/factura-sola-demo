// Construcción y consulta de documentos (puro, sin DOM).
import { calcDocumento } from './calc.js';
import { TIPOS_DOC, ETIQUETA_TIPO } from './config.js';
import { toCents, fromCents } from './money.js';

export const signo = (doc) => TIPOS_DOC[doc.tipo]?.signo ?? 1;
export const esNota = (doc) => doc.tipo !== 'factura';
/** Los totales fiscales del panel y de la exportación solo cuentan documentos autorizados. */
export const cuentaFiscal = (doc) => doc.estado === 'autorizada';
/** El medidor cuenta todo lo emitido que no fue rechazado (autorizado, en cola o en trámite). */
export const cuentaMedidor = (doc) => doc.estado !== 'rechazada';

export const pad = (n, w = 6) => String(n).padStart(w, '0');
export const numeroDe = (punto, n) => `${punto.codigo}-${pad(n)}`;

const aLinea = (l) => ({
  codigo: l.codigo, descripcion: l.descripcion, cantidad: l.cantidad, precio: l.precio,
  descuentoPct: l.descuentoPct || 0, tasa: l.tasa,
});

export const clienteConsumidor = () => ({ tipo: 'consumidor', nombre: 'Consumidor final' });

function base({ id, tipo, numero, fecha, cliente, lineas, metodoPago, origen, punto, pac, regla = 'linea' }) {
  return {
    id, tipo, numero, fecha, cliente,
    ...calcDocumento(lineas, regla),
    reglaRedondeo: regla,
    metodoPago,
    estado: 'generada',
    origen: origen || 'POS',
    punto: punto.codigo,
    puntoNombre: punto.nombre,
    pac,
    rechazos: [],
    historial: [{ estado: 'generada', t: fecha }],
  };
}

export function construirFactura({ id, numero, fecha, cliente, items, metodoPago, origen, punto, pac, pedido, regla }) {
  const doc = base({ id, tipo: 'factura', numero, fecha, cliente, lineas: items.map(aLinea), metodoPago, origen, punto, pac, regla });
  if (pedido) doc.pedidoTienda = pedido;
  return doc;
}

/** Cantidad ya devuelta por código, sumando las notas de crédito no rechazadas de una factura. */
export function devueltoPorCodigo(docs, facturaId) {
  const out = {};
  for (const d of docs) {
    if (d.tipo !== 'nota_credito' || d.documentoReferenciaId !== facturaId || d.estado === 'rechazada') continue;
    for (const l of d.lineas) out[l.codigo] = (out[l.codigo] || 0) + l.cantidad;
  }
  return out;
}

export function lineasDevolvibles(docs, factura) {
  const dev = devueltoPorCodigo(docs, factura.id);
  return factura.lineas.map((l) => ({ ...l, devuelto: dev[l.codigo] || 0, disponible: l.cantidad - (dev[l.codigo] || 0) }));
}

export function construirNotaCredito({ id, numero, fecha, factura, items, motivo, punto, pac, regla }) {
  const lineas = items
    .filter((it) => it.cantidad > 0)
    .map((it) => aLinea({ ...factura.lineas.find((l) => l.codigo === it.codigo), cantidad: it.cantidad }));
  const doc = base({ id, tipo: 'nota_credito', numero, fecha, cliente: { ...factura.cliente }, lineas, metodoPago: factura.metodoPago, origen: factura.origen, punto, pac, regla: regla || factura.reglaRedondeo });
  doc.documentoReferenciaId = factura.id;
  doc.documentoReferenciaNumero = factura.numero;
  doc.motivoNota = motivo;
  return doc;
}

export function construirNotaDebito({ id, numero, fecha, factura, concepto, monto, tasa, motivo, punto, pac, regla }) {
  const lineas = [{ codigo: 'AJUSTE', descripcion: concepto, cantidad: 1, precio: monto, descuentoPct: 0, tasa }];
  const doc = base({ id, tipo: 'nota_debito', numero, fecha, cliente: { ...factura.cliente }, lineas, metodoPago: factura.metodoPago, origen: factura.origen, punto, pac, regla: regla || factura.reglaRedondeo });
  doc.documentoReferenciaId = factura.id;
  doc.documentoReferenciaNumero = factura.numero;
  doc.motivoNota = motivo;
  return doc;
}

/** Suma con signo (en centavos) de un campo de una lista de documentos. */
export function sumaFirmada(docs, campo) {
  let c = 0;
  for (const d of docs) c += signo(d) * toCents(d[campo]);
  return fromCents(c);
}

/** Nota o factura a la que apunta un documento (si existe en la lista). */
export const referencia = (docs, doc) => docs.find((d) => d.id === doc.documentoReferenciaId) || null;
export const notasDe = (docs, factura) => docs.filter((d) => d.documentoReferenciaId === factura.id);

/** Del más reciente al más antiguo: por fecha y hora con segundos y, en empate, por número descendente (FAC-RNF-06). */
export function masReciente(a, b) {
  const fa = a.fecha.length === 16 ? `${a.fecha}:00` : a.fecha;
  const fb = b.fecha.length === 16 ? `${b.fecha}:00` : b.fecha;
  if (fa !== fb) return fa < fb ? 1 : -1;
  return a.numero < b.numero ? 1 : a.numero > b.numero ? -1 : 0;
}

/** 'NC · PF1-000002': el número siempre va con su tipo (FAC-RF-13). */
export const etiquetaNumero = (tipo, numero) => `${ETIQUETA_TIPO[tipo] ?? 'DOC'} · ${numero}`;
export const numeroConTipo = (doc) => etiquetaNumero(doc.tipo, doc.numero);
