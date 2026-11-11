// Medidor del facturador gratuito (puro). Compara las ventas del año y los documentos del mes con
// los límites: amarillo desde el 80 %, rojo al superarlos.
import { toCents, fromCents } from './money.js';
import { UMBRAL_AVISO, LIMITE_ANUAL, LIMITE_DOCS_MES } from './config.js';
import { signo, cuentaMedidor } from './docs.js';

export function nivel(valor, limite) {
  if (valor > limite) return 'excedido';
  if (valor >= limite * UMBRAL_AVISO) return 'aviso';
  return 'ok';
}
const ORDEN = { ok: 0, aviso: 1, excedido: 2 };
const peor = (a, b) => (ORDEN[a] >= ORDEN[b] ? a : b);

/** Ventas y documentos que aportan los documentos guardados (sin la base editable). */
export function aporteDocumentos(docs, hoyKey, baseMedidor = 'sin_itbms') {
  const anio = hoyKey.slice(0, 4); const mes = hoyKey.slice(0, 7);
  let ventasC = 0; let docsMes = 0;
  for (const d of docs) {
    if (!cuentaMedidor(d)) continue;
    if (d.fecha.startsWith(anio)) ventasC += signo(d) * toCents(baseMedidor === 'con_itbms' ? d.total : d.subtotal);
    if (d.fecha.startsWith(mes)) docsMes += 1;
  }
  return { ventasAnio: fromCents(ventasC), docsMes };
}

/**
 * Estado del medidor de un negocio. Lo que se muestra es (base editable + lo que aportan los
 * documentos); así, al escribir una cifra, las ventas nuevas se le suman.
 */
export function calcMedidor(neg, hoyKey) {
  const aporte = aporteDocumentos(neg.documentos, hoyKey, neg.ajustes.baseMedidor);
  const limiteAnio = neg.ajustes.limiteAnio ?? LIMITE_ANUAL;
  const limiteDocs = neg.ajustes.limiteDocs ?? LIMITE_DOCS_MES;
  // Modo prospecto: las cifras escritas por el vendedor se quedan fijas aunque la demo emita documentos.
  const p = neg.prospecto;
  const ventasAnio = p ? Number(p.ventasAnio) : fromCents(toCents(neg.medidorBase.ventasAnio) + toCents(aporte.ventasAnio));
  const docsMes = p ? Math.round(Number(p.docsMes)) : neg.medidorBase.docsMes + aporte.docsMes;
  const nivelAnio = nivel(ventasAnio, limiteAnio);
  const nivelDocs = nivel(docsMes, limiteDocs);
  return {
    ventasAnio, docsMes, limiteAnio, limiteDocs,
    pctAnio: limiteAnio ? ventasAnio / limiteAnio : 0,
    pctDocs: limiteDocs ? docsMes / limiteDocs : 0,
    nivelAnio, nivelDocs, nivelGlobal: peor(nivelAnio, nivelDocs),
    modo: p ? 'prospecto' : 'demo',
    aporte,
  };
}

/** Base nueva para que el medidor muestre exactamente las cifras que escribió la persona. */
export function baseParaObjetivo(neg, hoyKey, { ventasAnio, docsMes }) {
  const aporte = aporteDocumentos(neg.documentos, hoyKey, neg.ajustes.baseMedidor);
  return {
    ventasAnio: ventasAnio == null ? neg.medidorBase.ventasAnio : fromCents(toCents(ventasAnio) - toCents(aporte.ventasAnio)),
    docsMes: docsMes == null ? neg.medidorBase.docsMes : Math.round(docsMes) - aporte.docsMes,
  };
}
