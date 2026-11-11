// Dinero. Todo se calcula en centavos enteros y se guarda como número con 2 decimales, así la
// suma de las líneas siempre cuadra con el total mostrado (FAC-RNF-01).
// Notación única de moneda en toda la demo: B/. (balboas).

export const toCents = (n) => Math.round((Number(n) || 0) * 100);
export const fromCents = (c) => c / 100;
export const round2 = (n) => fromCents(toCents(n));

const nf = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ni = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** 1234.5 -> '1,234.50' (sin símbolo). */
export const fmtNum = (n) => nf.format(round2(n));
/** 1234.5 -> 'B/.1,234.50'; los negativos llevan el signo menos delante. */
export const fmt = (n) => {
  const v = round2(n);
  return `${v < 0 ? '−' : ''}B/.${nf.format(Math.abs(v))}`;
};
/** Sin decimales, para cifras redondas como los límites: 'B/.36,000'. */
export const fmtEntero = (n) => `B/.${ni.format(Math.round(n))}`;
export const fmtCantidad = (n) => ni.format(n);
export const fmtPct = (r) => `${Math.round(r * 100)} %`;
