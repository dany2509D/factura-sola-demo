// El "PAC simulado": valida un documento y, si está bien, lo autoriza con CUFE y protocolo
// ficticios. No se conecta a nada. Los rechazos pueden ser reales (datos mal armados) o
// provocados con "Simular rechazo", que altera el documento a propósito y guarda lo que habría
// que corregir.
import { calcDocumento, totalDeLineas } from './calc.js';
import { fmt, round2 } from './money.js';
import { validarContribuyente, normalizaRuc, normalizaDv } from './ruc.js';
import { cufeFicticio, protocoloFicticio } from './fake.js';
import { addDays, parse } from '../shared/time/panama.js';
import { FECHA_DIAS_ATRAS, FECHA_DIAS_ADELANTE, FECHA_DESFASE_SIM } from './config.js';

const diaSlash = (key) => { const [y, m, d] = key.split('-'); return `${d}/${m}/${y}`; };
const diasEntre = (a, b) => Math.round((parse(a) - parse(b)) / 86400000);

/** Dos dígitos distintos del DV dado (para fingir un DV equivocado). */
export const dvEquivocado = (dv) => String((parseInt(dv, 10) + 37) % 100).padStart(2, '0');

/** Altera un documento recién armado para que el PAC lo rechace. Devuelve false si no aplica. */
export function aplicarSimulacion(doc, tipo) {
  if (tipo === 'ruc_dv') {
    if (doc.cliente.tipo !== 'contribuyente') return false;
    doc.simulacion = { tipo, dvCorrecto: doc.cliente.dv };
    doc.cliente = { ...doc.cliente, dv: dvEquivocado(doc.cliente.dv) };
    return true;
  }
  if (tipo === 'totales') {
    doc.simulacion = { tipo, totalCorrecto: doc.total };
    doc.total = round2(doc.total + 0.1);
    return true;
  }
  if (tipo === 'fecha') {
    doc.simulacion = { tipo, fechaCorrecta: doc.fecha };
    doc.fecha = `${addDays(doc.fecha.slice(0, 10), -FECHA_DESFASE_SIM)}T${doc.fecha.slice(11, 16)}`;
    return true;
  }
  return false;
}

/** Primer problema que encuentra el PAC, o null si el documento es válido. */
export function validarDocumento(doc, hoyKey) {
  if (doc.cliente?.tipo === 'contribuyente') {
    if (doc.simulacion?.tipo === 'ruc_dv' && normalizaDv(doc.cliente.dv) !== doc.simulacion.dvCorrecto) {
      return { tipo: 'ruc_dv', motivo: `El PAC no reconoce el DV ${doc.cliente.dv} para el RUC ${doc.cliente.ruc}. Revise el DV del cliente y vuelva a enviar.` };
    }
    const v = validarContribuyente(doc.cliente);
    if (!v.ok) return { tipo: 'formato_ruc', motivo: `Datos del cliente inválidos: ${Object.values(v.errores).join(' ')}` };
  }
  const suma = totalDeLineas(doc.lineas, doc.reglaRedondeo || 'linea');
  if (Math.abs(suma - doc.total) > 0.0049) {
    return { tipo: 'totales', motivo: `Los totales no cuadran: las líneas suman ${fmt(suma)} y el documento declara ${fmt(doc.total)}.` };
  }
  const dif = diasEntre(doc.fecha.slice(0, 10), hoyKey);
  if (dif < -FECHA_DIAS_ATRAS || dif > FECHA_DIAS_ADELANTE) {
    return { tipo: 'fecha', motivo: `La fecha del documento (${diaSlash(doc.fecha.slice(0, 10))}) está fuera del rango que acepta el PAC. Use la fecha de hoy (${diaSlash(hoyKey)}).` };
  }
  return null;
}

/** Datos de la autorización (ficticios) para un documento válido. */
export function autorizar(doc, fecha) {
  const semilla = `${doc.id}|${doc.numero}|${doc.total}`;
  return { cufe: cufeFicticio(semilla), protocolo: protocoloFicticio(semilla), fechaAutorizacion: fecha };
}

/**
 * Cambios que corrigen un rechazo. `cambios`: { ruc, dv } para RUC/DV, { recalcular: true } para
 * totales y { fechaHoy: true } para fecha. Devuelve el documento corregido (copia).
 */
export function corregirDocumento(doc, cambios, ahora) {
  const out = { ...doc, cliente: { ...doc.cliente } };
  if (cambios.ruc != null) out.cliente.ruc = normalizaRuc(cambios.ruc);
  if (cambios.dv != null) out.cliente.dv = normalizaDv(cambios.dv);
  if (cambios.nombre != null) out.cliente.nombre = String(cambios.nombre).trim();
  if (cambios.recalcular) Object.assign(out, calcDocumento(out.lineas, out.reglaRedondeo || 'linea'));
  if (cambios.fechaHoy) out.fecha = ahora;
  return out;
}

