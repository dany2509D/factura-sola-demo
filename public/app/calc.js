// Cálculo de líneas y totales (puro). Redondeo a 2 decimales por línea; los totales son la suma
// de las líneas ya redondeadas, de modo que nunca hay diferencia de centavos.
import { toCents, fromCents } from './money.js';
import { TASAS } from './config.js';

const clampPct = (p) => Math.min(100, Math.max(0, Number(p) || 0));

/** Una línea: precio unitario, cantidad entera, descuento en % y tasa de ITBMS. */
export function calcLinea({ precio, cantidad, descuentoPct = 0, tasa = 7 }) {
  const qty = Math.max(0, Math.floor(Number(cantidad) || 0));
  const brutoC = toCents(precio) * qty;
  const descC = Math.round((brutoC * clampPct(descuentoPct)) / 100 + 1e-9);
  const baseC = brutoC - descC;
  const itbmsC = Math.floor((baseC * Number(tasa) + 50) / 100);
  return {
    bruto: fromCents(brutoC),
    descuento: fromCents(descC),
    base: fromCents(baseC),
    itbms: fromCents(itbmsC),
    total: fromCents(baseC + itbmsC),
  };
}

/**
 * Totales de un documento a partir de sus líneas (agrega los campos calculados a cada una).
 * `regla` 'linea' (por defecto): el ITBMS es la suma de las líneas ya redondeadas.
 * `regla` 'base': el ITBMS de cada tasa se calcula una vez sobre su base (puede diferir por centavos).
 */
export function calcDocumento(lineas, regla = 'linea') {
  const out = lineas.map((l) => ({ ...l, ...calcLinea(l) }));
  const base = Object.fromEntries(TASAS.map((t) => [String(t), 0]));
  const itbms = Object.fromEntries(TASAS.map((t) => [String(t), 0]));
  let subC = 0; let descC = 0; let itbmsC = 0;
  for (const l of out) {
    const k = String(l.tasa);
    base[k] = (base[k] || 0) + toCents(l.base);
    itbms[k] = (itbms[k] || 0) + toCents(l.itbms);
    subC += toCents(l.base);
    descC += toCents(l.descuento);
    itbmsC += toCents(l.itbms);
  }
  if (regla === 'base') {
    itbmsC = 0;
    for (const k of Object.keys(base)) { itbms[k] = Math.floor((base[k] * Number(k) + 50) / 100); itbmsC += itbms[k]; }
  }
  const conv = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fromCents(v)]));
  return {
    lineas: out,
    subtotal: fromCents(subC),
    descuentoTotal: fromCents(descC),
    basePorTasa: conv(base),
    itbmsPorTasa: conv(itbms),
    itbmsTotal: fromCents(itbmsC),
    total: fromCents(subC + itbmsC),
  };
}

/** Suma de líneas + ITBMS recalculada desde cero (la usa el PAC simulado para validar). */
export function totalDeLineas(lineas, regla = 'linea') {
  return calcDocumento(lineas, regla).total;
}
