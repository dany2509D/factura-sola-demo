// Datos ficticios y deterministas: CUFE, protocolo y un QR ilustrativo. Nada de esto es válido
// ante la DGI ni se puede verificar en ningún portal; son solo para la demostración.

export function hash32(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Generador pseudoaleatorio reproducible (mulberry32). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** CUFE ficticio: 64 caracteres hexadecimales. */
export function cufeFicticio(seed) {
  const r = mulberry32(hash32(`cufe|${seed}`));
  let s = '';
  for (let i = 0; i < 64; i++) s += Math.floor(r() * 16).toString(16);
  return s.toUpperCase();
}
export const cufeAgrupado = (c) => (c || '').match(/.{1,8}/g)?.join(' ') ?? '';

/** Número de protocolo de autorización ficticio: 12 dígitos. */
export function protocoloFicticio(seed) {
  const r = mulberry32(hash32(`prot|${seed}`));
  let s = '';
  for (let i = 0; i < 12; i++) s += Math.floor(r() * 10);
  return s;
}

/**
 * Matriz de un QR ILUSTRATIVO (29×29, con los tres cuadros de posición, los patrones de
 * temporización y de alineación). Parece un QR, pero NO codifica nada que se pueda leer.
 */
export function qrMatrix(texto, n = 29) {
  const r = mulberry32(hash32(`qr|${texto}`));
  const m = Array.from({ length: n }, () => Array.from({ length: n }, () => r() > 0.5));
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < n && y < n) m[y][x] = v; };
  // Zonas reservadas: separadores en blanco y cuadros de posición.
  const finder = (ox, oy) => {
    for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++) {
      const edge = x === -1 || y === -1 || x === 7 || y === 7;
      const ring = x === 0 || y === 0 || x === 6 || y === 6;
      const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      set(ox + x, oy + y, edge ? false : ring || core);
    }
  };
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  for (let i = 8; i < n - 8; i++) { set(i, 6, i % 2 === 0); set(6, i, i % 2 === 0); }
  // Patrón de alineación 5×5 cerca de la esquina inferior derecha.
  const ax = n - 7; const ay = n - 7;
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) {
    set(ax + x, ay + y, Math.max(Math.abs(x), Math.abs(y)) !== 1);
  }
  set(8, n - 8, true);
  return m;
}

/** SVG (texto) del QR ilustrativo, con zona de silencio. */
export function qrSvg(texto, { size = 132, label = 'Código QR ilustrativo del comprobante' } = {}) {
  const m = qrMatrix(texto);
  const n = m.length; const q = 2;
  let d = '';
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (!m[y][x]) { x++; continue; }
      let w = 0;
      while (x + w < n && m[y][x + w]) w++;
      d += `M${x + q} ${y + q}h${w}v1h-${w}z`;
      x += w;
    }
  }
  const t = n + q * 2;
  return `<svg class="qr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" width="${size}" height="${size}" role="img" aria-label="${label}" shape-rendering="crispEdges"><rect width="${t}" height="${t}" fill="#fff"/><path d="${d}" fill="#111"/></svg>`;
}
