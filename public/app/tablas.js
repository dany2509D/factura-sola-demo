// Tablas que se vuelven tarjetas solo cuando no caben en su contenedor (FAC-RNF-04): así nunca quedan
// cortadas ni obligan a desplazar de lado, y en pantallas amplias siguen siendo tablas. Mide la tabla
// real (no un ancho de pantalla fijo), por eso sirve igual con 7 columnas que con 3.

const anchos = new WeakMap();
let ro = null;
let pendiente = false;

function ajusta(wrap) {
  const t = wrap.querySelector('table.tabla--apilar');
  if (!t) return;
  t.classList.remove('tabla--apilada'); wrap.classList.remove('tabla-wrap--apilada');
  if (t.offsetWidth > wrap.clientWidth + 1) { t.classList.add('tabla--apilada'); wrap.classList.add('tabla-wrap--apilada'); }
}

/** Observa `raiz` y reacomoda sus tablas cuando cambia el contenido o el ancho disponible. */
export function vigilarTablas(raiz) {
  const pasada = () => {
    pendiente = false;
    for (const w of raiz.querySelectorAll('.tabla-wrap')) {
      ajusta(w);
      if (!anchos.has(w)) { anchos.set(w, Math.round(w.clientWidth)); ro?.observe(w); }
    }
  };
  const programar = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(pasada); } };
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver((entradas) => {
      for (const e of entradas) {
        const ancho = Math.round(e.contentRect.width);
        if (anchos.get(e.target) !== ancho) { anchos.set(e.target, ancho); programar(); }
      }
    });
  }
  new MutationObserver(programar).observe(raiz, { childList: true, subtree: true });
  addEventListener('resize', programar);
  programar();
}
