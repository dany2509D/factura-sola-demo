// Arranque: armazón de la aplicación, banner de demo, navegación por hash (#/ruta) y modo
// Presentación. Escritorio: barra lateral oscura. Móvil: barra superior + navegación inferior.
import { h, $, clear } from '../shared/ui/dom.js';
import { mountBanner, toast, confirmDialog } from '../shared/ui/ui.js';
import { createPresentation } from '../shared/ui/presentation.js';
import { cargar, getState, neg, subscribe, persistente } from './state.js';
import * as C from './controller.js';
import { AVISO_SIM, CONTACTO, INTERVALOS_VIVO } from './config.js';
import { ORDEN_NEGOCIOS } from './data/catalogs.js';
import { icono, logoApp, logoNegocio, cerrarHojas, conservarFoco } from './ui-kit.js';
import { crearGuion } from './guion.js';
import { animarEntrada } from './motion.js';
import { estadoVivo, fijarVivo, fijarIntervalo, alCambiarVivo, etiquetaIntervalo } from './vivo.js';
import { vigilarTablas } from './tablas.js';
import * as portada from './views/portada.js';
import * as venta from './views/venta.js';
import * as documentos from './views/documentos.js';
import * as tienda from './views/tienda.js';
import * as admin from './views/admin.js';
import * as ajustes from './views/ajustes.js';

cargar();
C.alAvisar((msg, kind) => toast(msg, { kind }));

// ------------------------------------------------------------------ estructura

const shell = $('#shell');
mountBanner($('#banner-root'), { whatsapp: CONTACTO.whatsapp });

const estadoPill = h('p', { class: 'estado-conexion', role: 'status' });
const marcaRail = h('a', { class: 'marca', href: '#/', 'aria-label': 'Factura sola, inicio' }, logoApp(34), h('span', null, h('strong', null, 'Factura sola'), h('small', null, 'Demo')));
const insigniaVista = h('p', { class: 'rail__vista', hidden: true }, 'Vista de administrador');
const railNegocios = h('div', { class: 'rail__negocios', role: 'group', 'aria-label': 'Negocio de la demo' });
const railNav = h('nav', { class: 'rail__nav', 'aria-label': 'Secciones' });
const railDemo = h('div', { class: 'rail__demo' });
const rail = h('aside', { class: 'rail' }, marcaRail, insigniaVista, h('p', { class: 'rail__tit' }, 'Negocio'), railNegocios, h('p', { class: 'rail__tit' }, 'Secciones'), railNav, railDemo);

const topNegocios = h('div', { class: 'topbar__negocios', role: 'group', 'aria-label': 'Negocio de la demo' });
const menuDemo = h('div', { class: 'menu-demo', id: 'menu-demo', hidden: true });
const menuBtn = h('button', { class: 'btn btn--icon topbar__menu', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'menu-demo', 'aria-label': 'Controles de la demo', onclick: () => alternarMenu() }, icono('more', { size: 20 }));
const topbar = h('header', { class: 'topbar' },
  h('a', { class: 'marca', href: '#/', 'aria-label': 'Factura sola, inicio' }, logoApp(32), h('strong', null, 'Factura sola')),
  topNegocios, menuBtn, menuDemo);
const bottomNav = h('nav', { class: 'bottomnav', 'aria-label': 'Secciones' });

const main = h('main', { id: 'main', class: 'main', tabindex: '-1' });
const pie = h('footer', { class: 'pie' });
const franja = h('div', { class: 'franja' }, h('p', { class: 'sim-aviso', role: 'note' }, icono('shield', { size: 16 }), h('span', null, AVISO_SIM)), estadoPill);
shell.append(h('div', { class: 'app' }, rail, topbar, h('div', { class: 'contenido' }, franja, main, pie), bottomNav));
vigilarTablas(main);

function alternarMenu(forzar) {
  const abrir = forzar ?? menuDemo.hidden;
  menuDemo.hidden = !abrir;
  menuBtn.setAttribute('aria-expanded', String(abrir));
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menuDemo.hidden) { alternarMenu(false); menuBtn.focus(); } });
document.addEventListener('click', (e) => { if (!menuDemo.hidden && !menuDemo.contains(e.target) && !menuBtn.contains(e.target)) alternarMenu(false); });

async function reiniciar() {
  alternarMenu(false);
  const ok = await confirmDialog({ title: 'Reiniciar la demo', text: 'Se borran los cambios y se vuelve a cargar el estado inicial de los tres negocios.', confirmLabel: 'Reiniciar demo', danger: true });
  if (!ok) return;
  C.ponerSinConexion(false); C.reiniciarDemo(); location.hash = '#/'; toast('Demo reiniciada: datos de ejemplo cargados.', { kind: 'ok' });
}

// ------------------------------------------------------------------ rutas

const RUTAS_CLIENTE = [['#/', 'Inicio', 'home'], ['#/venta', 'Vender', 'cart'], ['#/documentos', 'Documentos', 'receipt'], ['#/tienda', 'Tienda en línea', 'store']];
const RUTAS_ADMIN = [['#/admin', 'Resumen', 'chart'], ['#/admin/facturas', 'Facturas', 'receipt'], ['#/admin/notas', 'Notas', 'file'], ['#/admin/rechazos', 'Rechazos', 'alert'], ['#/admin/ajustes', 'Ajustes', 'sliders']];

function parseRuta() {
  const [ruta = '', extra = ''] = (location.hash || '#/').replace(/^#\/?/, '').split(/\/(.*)/s);
  if (ruta === '') return { id: 'inicio', hash: '#/', titulo: 'Inicio' };
  if (ruta === 'venta') return { id: 'venta', hash: '#/venta', titulo: 'Punto de venta' };
  if (ruta === 'documentos') return extra ? { id: 'detalle', hash: '#/documentos', titulo: 'Documento', params: { id: decodeURIComponent(extra) } } : { id: 'documentos', hash: '#/documentos', titulo: 'Documentos' };
  if (ruta === 'tienda') return { id: 'tienda', hash: '#/tienda', titulo: 'Tienda en línea' };
  if (ruta === 'admin') {
    const sub = extra.split('/')[0];
    if (sub === 'ajustes') return { id: 'ajustes', hash: '#/admin/ajustes', titulo: 'Ajustes', admin: true };
    if (['facturas', 'notas', 'rechazos'].includes(sub)) return { id: 'admin', hash: `#/admin/${sub}`, titulo: `Panel del contador · ${sub}`, admin: true, params: { sub } };
    return { id: 'admin', hash: '#/admin', titulo: 'Panel del contador', admin: true, params: { sub: '' } };
  }
  return null;
}

let rutaActual = null; let limpiar = null; let primera = true; let negocioMostrado = null;

function enrutar() {
  const r = parseRuta();
  if (!r) { location.replace('#/'); return; }
  limpiar?.(); limpiar = null; cerrarHojas(); alternarMenu(false);
  rutaActual = r;
  clear(main);
  const vista = { inicio: () => portada.montar(main), venta: () => venta.montar(main), documentos: () => documentos.montarLista(main), detalle: () => documentos.montarDetalle(main, r.params), tienda: () => tienda.montar(main), admin: () => admin.montar(main, r.params), ajustes: () => ajustes.montar(main) }[r.id];
  limpiar = vista();
  animarEntrada(main);
  document.body.dataset.vista = r.admin ? 'admin' : 'cliente';
  document.title = `${r.titulo} · Factura sola · Demo`;
  pintaNav();
  if (!primera) { window.scrollTo({ top: 0 }); if (!document.body.classList.contains('is-presenting')) main.focus({ preventScroll: true }); }
  primera = false;
}

// ------------------------------------------------------------------ navegación y controles

function botonNegocio(id, mini) {
  const n = neg(); const x = getState().negocios[id]; const on = id === n.id;
  return h('button', {
    class: `negocio-btn${mini ? ' negocio-btn--mini' : ''}${on ? ' negocio-btn--on' : ''}`, type: 'button', 'aria-pressed': String(on),
    'aria-label': mini ? `${x.nombre}, ${x.tipo}` : null, title: mini ? x.nombre : null, 'data-foco': `${mini ? 'mini' : 'rail'}-neg-${id}`, onclick: () => C.seleccionarNegocio(id),
  }, logoNegocio(id, mini ? 28 : 34), mini ? null : h('span', null, h('strong', null, x.corto), h('small', null, x.tipo)));
}

function itemsNav() {
  const r = rutaActual; const n = neg();
  const lista = r.admin ? RUTAS_ADMIN : RUTAS_CLIENTE;
  const activa = r.id === 'detalle' ? '#/documentos' : r.hash;
  const rechazos = n.documentos.filter((d) => d.estado === 'rechazada').length;
  const cola = C.enCola(n.id).length;
  return lista.map(([hash, texto, ico]) => {
    const insignia = hash === '#/admin/rechazos' ? rechazos : hash === '#/documentos' ? cola : 0;
    return { hash, texto, ico, on: hash === activa, insignia, esCola: hash === '#/documentos' };
  });
}

const enlaceNav = (it, clase) => h('a', { class: `${clase}${it.on ? ` ${clase}--on` : ''}`, href: it.hash, 'aria-current': it.on ? 'page' : null, 'data-foco': `${clase}-${it.hash}` },
  icono(it.ico, { size: clase === 'bottomnav__item' ? 22 : 18 }), h('span', null, it.texto),
  it.insignia ? h('b', { class: `insignia${it.esCola ? ' insignia--cola' : ''}`, 'aria-label': it.esCola ? `${it.insignia} en cola` : `${it.insignia} abiertos` }, String(it.insignia)) : null);

/** Interruptor de "Actividad en vivo" y cada cuánto entra una venta (FAC-RF-14). Apagado por defecto. */
function controlVivo(sufijo) {
  const v = estadoVivo(); const idInt = `vivo-int-${sufijo}`;
  return h('div', { class: 'ctl-vivo' },
    h('button', {
      class: `ctl ctl--vivo${v.activo ? ' ctl--on' : ''}`, type: 'button', role: 'switch', 'aria-checked': String(v.activo), 'data-foco': `ctl-vivo-${sufijo}`,
      title: 'Cuando está encendida, entran ventas y pedidos de la tienda solos. Apagada, la demo no se mueve sin que usted la toque.',
      onclick: () => fijarVivo(!estadoVivo().activo),
    }, h('span', { class: 'vivo__punto', 'aria-hidden': 'true' }), 'Actividad en vivo', h('span', { class: 'ctl__pista', 'aria-hidden': 'true' }, h('i'))),
    h('label', { class: 'ctl-vivo__int', for: idInt }, 'Cada',
      h('select', { id: idInt, 'aria-label': 'Cada cuánto entra una venta o pedido solo', 'data-foco': `ctl-vivo-int-${sufijo}`, onchange: (e) => fijarIntervalo(Number(e.target.value)) },
        ...INTERVALOS_VIVO.map((seg) => h('option', { value: String(seg), selected: seg === v.intervalo }, etiquetaIntervalo(seg))))));
}

function controlesDemo(sufijo) {
  const s = getState(); const r = rutaActual;
  return [
    h('button', { class: 'ctl ctl--pres', type: 'button', title: 'Recorre la demo paso a paso (empieza desde los datos de ejemplo)', 'data-foco': `ctl-pres-${sufijo}`, onclick: () => { alternarMenu(false); presentacion.start(); } }, icono('play', { size: 14 }), 'Presentación'),
    controlVivo(sufijo),
    h('button', { class: `ctl${s.offline ? ' ctl--on' : ''}`, type: 'button', 'aria-pressed': String(s.offline), 'data-foco': `ctl-off-${sufijo}`, onclick: () => C.ponerSinConexion(!getState().offline) },
      icono(s.offline ? 'wifi' : 'wifioff', { size: 16 }), s.offline ? 'Volver a conectar' : 'Simular caída de internet'),
    h('button', { class: 'ctl', type: 'button', 'data-foco': `ctl-reset-${sufijo}`, onclick: reiniciar }, icono('refresh', { size: 16 }), 'Reiniciar demo'),
    h('a', { class: 'ctl ctl--vista', href: r.admin ? '#/' : '#/admin', 'data-foco': `ctl-vista-${sufijo}` }, icono(r.admin ? 'back' : 'user', { size: 16 }), r.admin ? 'Volver a la vista de cliente' : 'Entrar como administrador'),
  ];
}

function pintaNav() {
  const s = getState(); const r = rutaActual; if (!r) return;
  document.documentElement.dataset.negocio = neg().id;
  if (negocioMostrado && negocioMostrado !== neg().id) animarEntrada(main);
  negocioMostrado = neg().id;
  const items = itemsNav();
  insigniaVista.hidden = !r.admin;
  conservarFoco(rail, () => {
    clear(railNegocios).append(...ORDEN_NEGOCIOS.map((id) => botonNegocio(id, false)));
    clear(railNav).append(...items.map((it) => enlaceNav(it, 'rail__item')));
    clear(railDemo).append(h('p', { class: 'rail__tit' }, 'Controles de la demo'), ...controlesDemo('rail'));
  });
  conservarFoco(topbar, () => {
    clear(topNegocios).append(...ORDEN_NEGOCIOS.map((id) => botonNegocio(id, true)));
    clear(menuDemo).append(h('p', { class: 'rail__tit' }, 'Controles de la demo'), ...controlesDemo('menu'));
  });
  conservarFoco(bottomNav, () => clear(bottomNav).append(...items.map((it) => enlaceNav(it, 'bottomnav__item'))));
  const falta = C.enColaTotal();
  estadoPill.className = `estado-conexion ${s.offline ? 'estado-conexion--off' : falta ? 'estado-conexion--cola' : 'estado-conexion--on'}`;
  estadoPill.replaceChildren(icono(s.offline ? 'wifioff' : 'wifi', { size: 16 }),
    s.offline ? `Sin conexión${falta ? ` · ${falta} en cola` : ''}` : falta ? `Enviando… faltan ${falta}` : 'En línea');
  clear(pie).append(h('p', null, persistente() ? 'Los cambios se guardan en este navegador (localStorage).' : 'Su navegador no permite guardar datos: la demo funciona en memoria y se reinicia al recargar.'),
    h('p', null, 'Hora de Panamá. Datos, personas, teléfonos y RUC ficticios. Pagos y WhatsApp simulados.'));
}

subscribe((_, alcance) => { if (alcance !== 'ui') pintaNav(); });
alCambiarVivo(() => pintaNav());

// ------------------------------------------------------------------ presentación

const guion = crearGuion();
const presentacion = createPresentation({
  getSteps: () => guion.pasos,
  // El modo Presentación enciende la actividad en vivo (FAC-HU5.1) y la apaga al salir.
  onStart: async ({ silent }) => { cerrarHojas(); await guion.iniciar(); fijarVivo(true); if (!silent) toast('Modo Presentación: empieza desde los datos de ejemplo.', { kind: 'info' }); },
  onStop: () => { guion.terminar(); fijarVivo(false); },
});

addEventListener('hashchange', enrutar);
enrutar();
