// Actividad en vivo (FAC-RF-14): ventas de mostrador y pedidos de la tienda que entran solos, para
// mostrar la automatización. Está APAGADA por defecto; la enciende el vendedor (interruptor en los
// controles de la demo) o el modo Presentación, que la apaga al salir. El estado vive en `_ui`, así
// que al reiniciar la demo vuelve a quedar apagada.
import { ui, subscribe, getState } from './state.js';
import { pedidoDeTienda, ventaAlAzar, avisar } from './controller.js';
import { fmt } from './money.js';
import { INTERVALOS_VIVO } from './config.js';

const MAX_EVENTOS = 60; // tope de seguridad por encendido, para no inflar los datos guardados
let timer = null;
const oyentes = new Set();
const emitir = () => { for (const f of [...oyentes]) { try { f(); } catch (e) { console.error(e); } } };

export const estadoVivo = () => ui().vivo;
export const alCambiarVivo = (fn) => { oyentes.add(fn); return () => oyentes.delete(fn); };
export const etiquetaIntervalo = (s) => (s < 60 ? `${s} s` : s === 60 ? '1 min' : `${s / 60} min`);

function programar() {
  clearTimeout(timer); timer = null;
  const v = ui()?.vivo;
  if (!v?.activo) return;
  timer = setTimeout(tick, v.intervalo * 1000 * (0.8 + Math.random() * 0.4));
}

function tick() {
  const v = ui().vivo;
  // No entra nada con la pestaña oculta ni sin conexión: la cola y sus cifras las maneja la persona.
  if (v.activo && !document.hidden && !getState().offline) {
    v.eventos += 1;
    if (Math.random() < 0.4) pedidoDeTienda();
    else { const r = ventaAlAzar(); avisar(`Venta ${r.numero} por ${fmt(r.total)}: facturada sola.`, 'info'); }
    if (v.eventos >= MAX_EVENTOS) { v.activo = false; avisar('Actividad en vivo apagada: ya entraron muchas ventas de ejemplo.', 'info'); emitir(); }
  }
  programar();
}

export function fijarVivo(activo) {
  const v = ui().vivo;
  v.activo = Boolean(activo);
  if (v.activo) v.eventos = 0;
  programar(); emitir();
}

export function fijarIntervalo(segundos) {
  if (!INTERVALOS_VIVO.includes(segundos)) return;
  ui().vivo.intervalo = segundos;
  programar(); emitir();
}

// Reiniciar la demo crea una interfaz nueva (vivo apagado): hay que soltar el temporizador.
subscribe((_, alcance) => { if (alcance === 'reinicio') { programar(); emitir(); } });
