// Envío del comprobante por WhatsApp y por correo. Ambos son SIMULADOS dentro de la página: no se
// conecta WhatsApp real ni se envía ningún correo.
import { h, reducedMotion } from '../../shared/ui/dom.js';
import { fmt } from '../money.js';
import { abrirHoja, icono, logoNegocio, hora12, campo, nombreTipo } from '../ui-kit.js';
import { renderCafe, nombreArchivo } from './cafe.js';
import { registrarEnvio, fijarTelefonoDoc } from '../controller.js';
import { nowStamp } from '../../shared/time/panama.js';

/** Cierra una frase con punto solo si no termina ya en puntuación: "S. A." no queda "S. A.." (FAC-HU2.3). */
export const fin = (t) => (/[.!?…]$/.test(String(t).trim()) ? String(t).trim() : `${String(t).trim()}.`);
const saludo = (doc) => (doc.cliente.nombre && doc.cliente.nombre !== 'Consumidor final' ? fin(`Hola, ${doc.cliente.nombre}`) : 'Hola.');
const nombreDoc = (doc) => (doc.tipo === 'factura' ? 'factura electrónica' : nombreTipo(doc.tipo).toLowerCase());

function ticks(estado) {
  const doble = estado !== 'enviado';
  const color = estado === 'leido' ? '#1c7fd6' : '#667781';
  const svg = `<svg viewBox="0 0 18 11" width="17" height="11" role="img" aria-label="${estado === 'leido' ? 'Leído' : estado === 'entregado' ? 'Entregado' : 'Enviado'}"><g fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 6l3 3L10.5 1.5"/>${doble ? '<path d="M7 8.2l1.3 1.3L15 1.5"/>' : ''}</g></svg>`;
  const t = document.createElement('template'); t.innerHTML = svg; return t.content.firstElementChild;
}

/** WhatsApp: se envía al número del cliente; si falta, se pide en ese momento y nunca se inventa uno (FAC-RF-15). */
export function enviarPorWhatsApp(doc, n) {
  if (doc.estado !== 'autorizada') return null;
  return doc.cliente.telefonoWhatsApp ? conversacion(doc, n) : pedirTelefono(doc, n);
}

function pedirTelefono(doc, n) {
  const f = campo({ etiqueta: 'WhatsApp del cliente', tipo: 'tel', inputmode: 'tel', requerido: true, foco: 'envio-tel', ayuda: 'Ej.: +507 6123-4567. Queda guardado en el documento.' });
  const formulario = h('form', { class: 'envio envio--pide', novalidate: true },
    h('p', null, 'Este cliente no tiene un número de WhatsApp. Escríbalo para enviarle el comprobante.'),
    f.el,
    h('div', { class: 'envio__acciones' }, h('button', { class: 'btn btn--primary', type: 'submit' }, icono('chat', { size: 16 }), 'Enviar por WhatsApp')));
  const hoja = abrirHoja({ titulo: 'Número de WhatsApp del cliente', cuerpo: formulario, clase: 'hoja--estrecha' });
  formulario.addEventListener('submit', (e) => {
    e.preventDefault();
    const r = fijarTelefonoDoc(doc.id, f.input.value);
    if (!r.ok) { f.error(r.error); f.input.focus(); return; }
    hoja.cerrar();
    conversacion(doc, n);
  });
  f.input.focus();
  return hoja;
}

function conversacion(doc, n) {
  const tel = doc.cliente.telefonoWhatsApp;
  const chat = h('div', { class: 'tel__chat', role: 'log', 'aria-live': 'polite', 'aria-label': 'Conversación de WhatsApp simulada' });
  const timers = [];
  const cuerpo = h('div', { class: 'envio' },
    h('p', { class: 'envio__nota' }, icono('shield', { size: 16 }), ' Simulación de WhatsApp para la demo. No se envía ningún mensaje real.'),
    h('div', { class: 'tel', role: 'group', 'aria-label': 'Teléfono simulado' },
      h('div', { class: 'tel__cab' }, h('span', { class: 'tel__avatar' }, logoNegocio(n.id, 36)),
        h('span', { class: 'tel__quien' }, h('strong', null, n.nombre), h('small', null, `Para ${tel}`))),
      chat),
    h('p', { class: 'envio__ayuda' }, 'El cliente recibe el comprobante (CAFE) en PDF y el resumen de la compra, sin que nadie lo reenvíe a mano.'));
  const hoja = abrirHoja({ titulo: 'Enviar comprobante por WhatsApp', cuerpo, clase: 'hoja--estrecha', alCerrar: () => timers.forEach(clearTimeout) });

  const instantaneo = reducedMotion();
  const quien = (ms, fn) => (instantaneo ? fn() : timers.push(setTimeout(fn, ms)));
  const escribiendo = h('div', { class: 'burb burb--ent burb--escribe', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
  chat.append(h('p', { class: 'tel__dia' }, 'Hoy'));
  quien(250, () => chat.append(escribiendo));
  quien(900, () => {
    escribiendo.remove();
    const marca = h('time', null, hora12(nowStamp()));
    let estado = ticks('enviado');
    const meta = h('span', { class: 'burb__pie' }, marca, estado);
    chat.append(h('div', { class: 'burb burb--sal' },
      h('div', { class: 'burb__adjunto' }, h('span', { class: 'burb__pdf', 'aria-hidden': 'true' }, 'PDF'), h('span', null, nombreArchivo(doc), h('small', null, '1 página · 38 KB'))),
      h('p', null, `${saludo(doc)} ${fin(`Gracias por su compra en ${n.nombre}`)} Le adjuntamos su ${nombreDoc(doc)} N.º ${doc.numero} por ${fmt(doc.total)}.`),
      h('p', null, 'Una persona del equipo le atiende si tiene alguna consulta.'),
      meta));
    registrarEnvio(doc.id, 'whatsapp', tel);
    const poner = (e) => { const nuevo = ticks(e); estado.replaceWith(nuevo); estado = nuevo; };
    quien(900, () => poner('entregado'));
    quien(2100, () => poner('leido'));
  });
  return hoja;
}

export function enviarPorCorreo(doc, n) {
  if (doc.estado !== 'autorizada') return null;
  const para = doc.cliente.correo || 'cliente@ejemplo.com';
  const estado = h('p', { class: 'envio__estado', role: 'status' });
  const boton = h('button', { class: 'btn btn--primary', type: 'button' }, icono('send', { size: 16 }), 'Enviar correo (simulado)');
  boton.addEventListener('click', () => {
    boton.disabled = true;
    registrarEnvio(doc.id, 'correo', para);
    estado.replaceChildren(icono('check', { size: 16 }), ` Correo enviado a ${para} (simulado).`);
  });
  const cuerpo = h('div', { class: 'envio' },
    h('p', { class: 'envio__nota' }, icono('shield', { size: 16 }), ' Simulación de correo para la demo. No se envía ningún correo real.'),
    h('dl', { class: 'correo' },
      h('dt', null, 'De'), h('dd', null, `${n.nombre} <facturas@ejemplo.pa>`),
      h('dt', null, 'Para'), h('dd', null, para),
      h('dt', null, 'Asunto'), h('dd', null, `Su ${nombreDoc(doc)} N.º ${doc.numero} · ${n.nombre}`)),
    h('p', null, `${saludo(doc)} Gracias por su compra. Adjuntamos su comprobante (CAFE) por ${fmt(doc.total)}.`),
    h('p', { class: 'burb__adjunto burb__adjunto--correo' }, h('span', { class: 'burb__pdf', 'aria-hidden': 'true' }, 'PDF'), h('span', null, nombreArchivo(doc))),
    h('div', { class: 'envio__cafe' }, renderCafe(doc, n)),
    h('div', { class: 'envio__acciones' }, boton), estado);
  return abrirHoja({ titulo: 'Enviar comprobante por correo', cuerpo });
}
