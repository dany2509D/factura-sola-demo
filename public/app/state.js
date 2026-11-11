// Almacén de estado: carga/guarda en localStorage (con respaldo en memoria), avisa a las vistas
// y reinicia con la semilla. Lo que cuelga de `_ui` es transitorio: el envoltorio de
// almacenamiento nunca guarda claves que empiezan con "_".
import { createStorage } from '../shared/storage/storage.js';
import { crearEstadoInicial } from './data/seed.js';
import { STORAGE_KEY, VERSION_DATOS, INTERVALO_VIVO_DEFECTO } from './config.js';
import { todayKey } from '../shared/time/panama.js';

const storage = createStorage(STORAGE_KEY);
let state = null;
const subs = new Set();
let timer = null;

const carritoVacio = () => ({
  lineas: [],
  cliente: { modo: 'consumidor', clienteId: '', nombre: '', ruc: '', dv: '', correo: '', telefono: '' },
  metodoPago: 'efectivo',
  simulacion: 'ninguna',
  errores: {},
});

const uiNuevo = () => ({ carritos: {}, emisionDocId: null, mes: null, carritoAbierto: false, tienda: { carrito: [] }, vivo: { activo: false, intervalo: INTERVALO_VIVO_DEFECTO, eventos: 0 } });

function normalizar(s) {
  // Documentos que quedaron "en trámite" si se recargó la página: vuelven a la cola.
  for (const n of Object.values(s.negocios)) {
    for (const d of n.documentos) {
      if (d.estado === 'generada' || d.estado === 'enviada') {
        d.estado = 'en_cola';
        d.historial.push({ estado: 'en_cola', t: d.fecha });
      }
    }
  }
  return s;
}

export function cargar() {
  const guardado = storage.load();
  if (guardado && guardado.version === VERSION_DATOS && guardado.negocios) state = normalizar(guardado);
  else { state = crearEstadoInicial(); storage.save(state); }
  state._ui = uiNuevo();
  state._ui.mes = todayKey().slice(0, 7);
  if (typeof addEventListener === 'function') addEventListener('pagehide', guardarYa);
  return state;
}

export const getState = () => state;
export const neg = (id) => state.negocios[id || state.negocioId];
export const ui = () => state._ui;
export const carritoDe = (id) => {
  const k = id || state.negocioId;
  return (state._ui.carritos[k] ||= carritoVacio());
};
export const persistente = () => storage.persistent;

export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
const emit = (alcance) => { for (const fn of [...subs]) { try { fn(state, alcance); } catch (e) { console.error(e); } } };

function guardarYa() { clearTimeout(timer); timer = null; storage.save(state); }
function guardarPronto() { if (timer) return; timer = setTimeout(guardarYa, 120); }

/** Cambia datos y los guarda. `alcance` 'datos' (por defecto) o 'ui' (no se guarda). */
export function update(fn, alcance = 'datos') {
  fn(state);
  if (alcance === 'datos') guardarPronto();
  emit(alcance);
}

export function reiniciar() {
  storage.clear();
  state = crearEstadoInicial();
  storage.save(state);
  state._ui = uiNuevo();
  state._ui.mes = todayKey().slice(0, 7);
  emit('reinicio');
}

export const nuevoCarrito = carritoVacio;
