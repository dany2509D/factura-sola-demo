// Fechas y horas en la zona America/Panama (UTC-5 fijo, sin horario de verano).
//
// Convención: una "hora de pared" se guarda como texto 'YYYY-MM-DDTHH:mm' (sin zona) y se
// opera con un Date "falso UTC" cuyos campos UTC son la hora de pared de Panamá. Así el
// resultado no depende de la zona horaria del navegador ni de su horario de verano.

export const TZ = 'America/Panama';
const OFFSET_MS = 5 * 3600 * 1000;

export const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const DAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const defaultNow = () => new Date(Date.now() - OFFSET_MS);
let nowFn = defaultNow;

/** Hora de pared actual de Panamá (Date "falso UTC"). */
export const now = () => nowFn();
/** Solo para pruebas: fija el reloj. Sin argumento vuelve al reloj real. */
export const setNow = (fn) => { nowFn = fn || defaultNow; };
/** Milisegundos reales (epoch) del instante actual, coherentes con setNow. */
export const epochNow = () => nowFn().getTime() + OFFSET_MS;

/** Instante real (epoch ms) de una hora de pared de Panamá 'YYYY-MM-DDTHH:mm'. */
export const epochOf = (s) => {
  const [d, t = '00:00'] = String(s).split('T');
  const [y, m, dd] = d.split('-').map(Number);
  const [h, mi] = t.split(':').map(Number);
  return Date.UTC(y, m - 1, dd, h || 0, mi || 0) + OFFSET_MS;
};

export const pad2 = (n) => String(n).padStart(2, '0');
export const dateKey = (d) => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
export const clock = (d) => `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
export const stamp = (d) => `${dateKey(d)}T${clock(d)}`;
export const nowStamp = () => stamp(now());
/** Con segundos ('YYYY-MM-DDTHH:mm:ss'): para ordenar documentos emitidos en el mismo minuto. */
export const stampSeg = (d) => `${stamp(d)}:${pad2(d.getUTCSeconds())}`;
export const nowStampSeg = () => stampSeg(now());
export const todayKey = () => dateKey(now());

export function parse(s) {
  const [d, t = '00:00'] = String(s).split('T');
  const [y, m, dd] = d.split('-').map(Number);
  const [h, mi] = t.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, dd, h || 0, mi || 0));
}

export const addMin = (s, n) => stamp(new Date(parse(s).getTime() + n * 60000));
export const diffMin = (a, b) => Math.round((parse(a) - parse(b)) / 60000);
export const addDays = (key, n) => dateKey(new Date(parse(key).getTime() + n * 86400000));
export const dayOfWeek = (key) => parse(key).getUTCDay();
export const mondayOf = (key) => addDays(key, -((dayOfWeek(key) + 6) % 7));
export const weekDays = (key) => Array.from({ length: 7 }, (_, i) => addDays(mondayOf(key), i));

export function addMonths(key, n) {
  const d = parse(key);
  const day = d.getUTCDate();
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(day, last));
  return dateKey(t);
}

export const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const fromMin = (n) => `${pad2(Math.floor(n / 60))}:${pad2(n % 60)}`;

/** '13:30' -> '1:30 p. m.' */
export function time12(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const suf = h < 12 ? 'a. m.' : 'p. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad2(m)} ${suf}`;
}

export function dateLong(key) {
  const d = parse(key);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`;
}
export function dateShort(key) {
  const d = parse(key);
  return `${DAYS_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}
/** '2026-11-10T10:00' -> 'mar 10 nov · 10:00 a. m.' */
export function stampShort(s) { return `${dateShort(s.slice(0, 10))} · ${time12(s.slice(11, 16))}`; }
export function stampLong(s) { return `${dateLong(s.slice(0, 10))} a las ${time12(s.slice(11, 16))}`; }

/** Hora de pared de Panamá de un instante real (epoch ms), como '10:42 a. m.'. */
export function clockOfEpoch(ms) { return time12(clock(new Date(ms - OFFSET_MS))); }
export function dateKeyOfEpoch(ms) { return dateKey(new Date(ms - OFFSET_MS)); }
