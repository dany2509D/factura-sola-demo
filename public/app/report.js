// Agregaciones del panel del contador (puro). Los totales fiscales cuentan solo documentos
// autorizados; las notas de crédito restan. La exportación usa las mismas funciones, así que
// panel y archivo cuadran al centavo.
import { toCents, fromCents } from './money.js';
import { TASAS } from './config.js';
import { signo, cuentaFiscal } from './docs.js';
import { addDays, dateKey } from '../shared/time/panama.js';

export const mesDe = (doc) => doc.fecha.slice(0, 7);

export function mesesConDatos(docs, mesActual) {
  const set = new Set([mesActual]);
  for (const d of docs) set.add(mesDe(d));
  return [...set].sort().reverse();
}

function diasDelMes(ym, hoyKey) {
  const [y, m] = ym.split('-').map(Number);
  const primero = `${ym}-01`;
  const ultimo = dateKey(new Date(Date.UTC(y, m, 0)));
  const fin = ym === hoyKey.slice(0, 7) && hoyKey < ultimo ? hoyKey : ultimo;
  const out = [];
  for (let d = primero; d <= fin; d = addDays(d, 1)) out.push(d);
  return out;
}

export function resumenMes(docs, ym, hoyKey) {
  const delMes = docs.filter((d) => mesDe(d) === ym);
  const fiscales = delMes.filter(cuentaFiscal);

  const dia = new Map(diasDelMes(ym, hoyKey).map((k) => [k, { dia: k, ventasC: 0, itbmsC: 0, totalC: 0, docs: 0 }]));
  const tasa = Object.fromEntries(TASAS.map((t) => [String(t), { baseC: 0, itbmsC: 0 }]));
  let baseC = 0; let itbmsC = 0; let totalC = 0;

  for (const d of fiscales) {
    const s = signo(d);
    const r = dia.get(d.fecha.slice(0, 10));
    if (r) { r.ventasC += s * toCents(d.subtotal); r.itbmsC += s * toCents(d.itbmsTotal); r.totalC += s * toCents(d.total); r.docs += 1; }
    for (const t of TASAS) {
      tasa[String(t)].baseC += s * toCents(d.basePorTasa?.[String(t)] ?? 0);
      tasa[String(t)].itbmsC += s * toCents(d.itbmsPorTasa?.[String(t)] ?? 0);
    }
    baseC += s * toCents(d.subtotal); itbmsC += s * toCents(d.itbmsTotal); totalC += s * toCents(d.total);
  }

  const eventosRechazo = [];
  for (const d of docs) for (const r of d.rechazos || []) if (r.fecha.startsWith(ym)) eventosRechazo.push({ doc: d, rechazo: r });

  return {
    mes: ym,
    porDia: [...dia.values()].map((r) => ({ dia: r.dia, ventas: fromCents(r.ventasC), itbms: fromCents(r.itbmsC), total: fromCents(r.totalC), docs: r.docs })),
    porTasa: Object.fromEntries(Object.entries(tasa).map(([k, v]) => [k, { base: fromCents(v.baseC), itbms: fromCents(v.itbmsC) }])),
    totales: { base: fromCents(baseC), itbms: fromCents(itbmsC), total: fromCents(totalC) },
    conteos: {
      facturas: fiscales.filter((d) => d.tipo === 'factura').length,
      creditos: fiscales.filter((d) => d.tipo === 'nota_credito').length,
      debitos: fiscales.filter((d) => d.tipo === 'nota_debito').length,
      enCola: delMes.filter((d) => d.estado === 'en_cola').length,
      rechazos: eventosRechazo.length,
      rechazosAbiertos: delMes.filter((d) => d.estado === 'rechazada').length,
    },
    eventosRechazo,
    docs: delMes,
    fiscales,
  };
}

