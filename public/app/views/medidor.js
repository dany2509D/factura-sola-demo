// Medidor del facturador gratuito: dos barras horizontales (ventas del año y documentos del mes) con
// marcas al 80 % y al 100 %, la cifra a la derecha y una frase de estado grande en verde, ámbar o
// rojo. Las cifras son editables para hacer el ejercicio con los números del prospecto.
import { h } from '../../shared/ui/dom.js';
import { fmtEntero, fmt, fmtPct } from '../money.js';
import { calcMedidor } from '../meter.js';
import { UMBRAL_AVISO } from '../config.js';
import { todayKey } from '../../shared/time/panama.js';
import { icono } from '../ui-kit.js';
import { fijarMedidor, restaurarMedidor } from '../controller.js';
import { animarNumero } from '../motion.js';

// Mismo lenguaje de color que los estados del documento: verde, ámbar y rojo, siempre con ícono y texto.
const NIVELES = {
  ok: { ico: 'check', texto: 'Dentro del límite' },
  aviso: { ico: 'alert', texto: 'Cerca del límite (80 % o más)' },
  excedido: { ico: 'x', texto: 'Superó el límite' },
};

const EJEMPLOS = [
  { id: 'chico', nombre: 'Negocio chico', ventasAnio: 9800, docsMes: 24 },
  { id: 'cerca', nombre: 'Cerca del tope', ventasAnio: 30200, docsMes: 86 },
  { id: 'pasado', nombre: 'Ya pasó el tope', ventasAnio: 41500, docsMes: 118 },
];
export const EJEMPLO = Object.fromEntries(EJEMPLOS.map((e) => [e.id, e]));

const PUNTO_AVISO = `${UMBRAL_AVISO * 100}%`;

function barra({ titulo, id }) {
  const valor = h('strong', { class: 'med__valor num' });
  const limite = h('span', { class: 'med__limite' });
  const relleno = h('i', { class: 'med__relleno' });
  const pista = h('div', { class: 'med__pista', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-labelledby': `${id}-t` },
    relleno,
    h('i', { class: 'med__marca', style: `left:${PUNTO_AVISO}`, 'aria-hidden': 'true' }),
    h('i', { class: 'med__marca med__marca--100', 'aria-hidden': 'true' }));
  const regla = h('div', { class: 'med__regla', 'aria-hidden': 'true' }, h('span', null, '0'), h('span', { style: `left:${PUNTO_AVISO}` }, `${UMBRAL_AVISO * 100} %`), h('span', null, '100 %'));
  const pct = h('span', { class: 'med__pct num' });
  const estado = h('p', { class: 'med__estado' });
  const el = h('div', { class: 'med' },
    h('h3', { id: `${id}-t`, class: 'med__tit' }, titulo), pista,
    h('div', { class: 'med__cifra' }, valor, limite), regla, estado);
  return { el, valor, limite, pct, pista, estado, relleno, pintado: false };
}

function pintaBarra(b, { valor, formato, limiteTxt, ratio, nivel }) {
  b.el.dataset.nivel = nivel;
  animarNumero(b.valor, valor, { formato });
  animarNumero(b.pct, ratio * 100, { formato: (v) => `${Math.round(v)} % del límite` });
  b.limite.textContent = `de ${limiteTxt}`;
  const llenar = () => { b.relleno.style.width = `${Math.min(1, ratio) * 100}%`; };
  if (!b.pintado) { b.pintado = true; requestAnimationFrame(() => requestAnimationFrame(llenar)); } else llenar();
  b.pista.setAttribute('aria-valuenow', String(Math.round(Math.min(100, ratio * 100))));
  b.pista.setAttribute('aria-valuetext', `${fmtPct(ratio)} del límite. ${NIVELES[nivel].texto}`);
  b.estado.replaceChildren(icono(NIVELES[nivel].ico, { size: 18 }), h('span', null, NIVELES[nivel].texto), b.pct);
}

/** Devuelve { el, actualizar(neg) }. `editable` agrega los campos y los ejemplos. */
export function crearMedidor({ editable = true } = {}) {
  const anio = barra({ titulo: 'Ventas del año', id: 'med-anio' });
  const docs = barra({ titulo: 'Documentos del mes', id: 'med-docs' });
  const veredicto = h('div', { class: 'veredicto', role: 'status' });
  const ayuda = h('p', { class: 'med__nota' });
  const modo = h('p', { class: 'med__modo', role: 'status' });

  const inVentas = h('input', { id: 'med-in-ventas', type: 'number', min: '0', step: '1', inputmode: 'numeric', 'data-foco': 'med-ventas' });
  const inDocs = h('input', { id: 'med-in-docs', type: 'number', min: '0', step: '1', inputmode: 'numeric', 'data-foco': 'med-docs' });
  inVentas.addEventListener('input', () => { if (inVentas.value !== '') fijarMedidor({ ventasAnio: Number(inVentas.value), docsMes: null }); });
  inDocs.addEventListener('input', () => { if (inDocs.value !== '') fijarMedidor({ ventasAnio: null, docsMes: Number(inDocs.value) }); });

  const ejemplos = h('div', { class: 'med__ejemplos', role: 'group', 'aria-label': 'Cifras de ejemplo' },
    h('span', null, 'Probar con:'),
    EJEMPLOS.map((e) => h('button', { class: 'chip', type: 'button', onclick: () => fijarMedidor({ ventasAnio: e.ventasAnio, docsMes: e.docsMes }) }, e.nombre)),
    h('button', { class: 'chip chip--suave', type: 'button', onclick: () => restaurarMedidor() }, icono('refresh', { size: 14 }), 'Datos de la demo'));

  const campos = editable ? h('div', { class: 'med__campos' },
    h('div', { class: 'field' }, h('label', { for: 'med-in-ventas' }, 'Ventas del año del prospecto (B/.)'), inVentas),
    h('div', { class: 'field' }, h('label', { for: 'med-in-docs' }, 'Documentos emitidos este mes'), inDocs),
    ejemplos) : null;

  const izquierda = h('div', { class: 'medidor__izq' }, h('div', { class: 'medidor__barras' }, anio.el, docs.el), veredicto);
  const el = h('div', { class: 'medidor' }, modo, h('div', { class: `medidor__cuerpo${editable ? ' medidor__cuerpo--campos' : ''}` }, izquierda, campos), ayuda);
  let nivelAnterior = null;

  function actualizar(neg) {
    const m = calcMedidor(neg, todayKey());
    modo.dataset.modo = m.modo;
    modo.replaceChildren(m.modo === 'prospecto'
      ? h('span', null, h('strong', null, 'Cifras del prospecto.'), ' Quedan fijas aunque la demo emita documentos.')
      : h('span', null, h('strong', null, 'Datos de la demo.'), editable ? ' Se suman los documentos que emita aquí. Escriba las cifras del prospecto para fijarlas.' : ' Se suman los documentos emitidos.'));
    pintaBarra(anio, { valor: m.ventasAnio, formato: fmt, limiteTxt: fmtEntero(m.limiteAnio), ratio: m.pctAnio, nivel: m.nivelAnio });
    pintaBarra(docs, { valor: m.docsMes, formato: (v) => String(Math.round(v)), limiteTxt: `${m.limiteDocs} documentos`, ratio: m.pctDocs, nivel: m.nivelDocs });
    veredicto.dataset.nivel = m.nivelGlobal;
    const msg = {
      ok: ['Su negocio está dentro de los límites del facturador gratuito.', 'Aun así, cada venta puede facturarse sola desde hoy.'],
      aviso: ['Está cerca del límite del facturador gratuito.', 'Conviene dejar listo el paso a un PAC antes de superarlo.'],
      excedido: ['Debe emitir mediante un PAC o un sistema certificado.', 'Superó al menos uno de los dos límites del facturador gratuito.'],
    }[m.nivelGlobal];
    veredicto.replaceChildren(icono(NIVELES[m.nivelGlobal].ico, { size: 30, clase: 'veredicto__ico' }), h('div', null, h('strong', null, msg[0]), h('span', null, msg[1])));
    // El veredicto "late" una vez cuando cambia de nivel, para que se note el cambio.
    if (nivelAnterior && nivelAnterior !== m.nivelGlobal) { veredicto.classList.remove('veredicto--cambia'); void veredicto.offsetWidth; veredicto.classList.add('veredicto--cambia'); }
    nivelAnterior = m.nivelGlobal;
    if (editable) {
      if (document.activeElement !== inVentas) inVentas.value = String(Math.round(m.ventasAnio * 100) / 100);
      if (document.activeElement !== inDocs) inDocs.value = String(m.docsMes);
    }
    const base = neg.ajustes.baseMedidor === 'con_itbms' ? 'con ITBMS' : 'sin ITBMS';
    ayuda.textContent = `Desde el 1 de enero de 2026 el facturador gratuito de la DGI aplica solo a ingresos brutos de hasta ${fmtEntero(m.limiteAnio)} al año y hasta ${m.limiteDocs} documentos al mes (Resolución DGI 201-6299). Aquí se cuentan las ventas ${base} y los documentos emitidos o en cola, sin los rechazados. Validar con la ficha técnica de la DGI.`;
  }
  return { el, actualizar };
}
