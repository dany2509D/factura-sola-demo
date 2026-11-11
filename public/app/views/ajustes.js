// Ajustes: datos del emisor (ficticios), PAC genérico, sucursales y puntos de facturación, y las
// opciones del medidor. Todo lo que dependa de una regla fiscal queda editable aquí.
import { h, clear } from '../../shared/ui/dom.js';
import { neg, subscribe } from '../state.js';
import * as C from '../controller.js';
import { PACS, LIMITE_ANUAL, LIMITE_DOCS_MES, BASE_MEDIDOR_DEFECTO, REGLAS_REDONDEO, REGLA_REDONDEO_DEFECTO } from '../config.js';
import { icono, campo, selector, opcionRadio } from '../ui-kit.js';
import { toast, confirmDialog } from '../../shared/ui/ui.js';

export function montar(raiz) {
  const cont = h('div', { class: 'ajustes' });
  const secciones = {}; const firmas = {};
  raiz.append(h('section', { class: 'admin', 'aria-labelledby': 'tit-ajustes' },
    h('div', { class: 'pagina-cab' }, h('div', null, h('p', { class: 'eyebrow' }, 'Panel del contador'), h('h1', { id: 'tit-ajustes' }, 'Ajustes'),
      h('p', { class: 'lead lead--chico' }, 'Datos ficticios del emisor y de la demo. Lo que dependa de la DGI queda editable y se anota como "validar con la ficha técnica".'))),
    cont));

  const seccion = (id, titulo, construir, firmaFn) => {
    const el = (secciones[id] ||= h('section', { class: 'card ajuste', 'aria-labelledby': `aj-${id}` }));
    cont.append(el);
    return () => {
      const f = JSON.stringify(firmaFn());
      if (f === firmas[id]) return; firmas[id] = f;
      clear(el).append(h('h2', { id: `aj-${id}`, class: 'h-peq' }, titulo), construir());
    };
  };

  const pintaEmisor = seccion('emisor', 'Datos del emisor (ficticios)', () => {
    const e = neg().emisor;
    const rs = campo({ etiqueta: 'Razón social', valor: e.razonSocial, requerido: true });
    const ruc = campo({ etiqueta: 'RUC', valor: e.ruc, requerido: true });
    const dv = campo({ etiqueta: 'DV', valor: e.dv, requerido: true, maxlength: 2, inputmode: 'numeric' });
    const dir = campo({ etiqueta: 'Dirección', valor: e.direccion });
    return h('form', { class: 'form-ajuste', novalidate: true, onsubmit: (ev) => {
      ev.preventDefault();
      const r = C.guardarEmisor({ razonSocial: rs.input.value, ruc: ruc.input.value, dv: dv.input.value, direccion: dir.input.value });
      rs.error(r.errores?.razonSocial); ruc.error(r.errores?.ruc); dv.error(r.errores?.dv);
      if (r.ok) toast('Datos del emisor guardados.', { kind: 'ok' });
    } }, rs.el, h('div', { class: 'fila-2' }, ruc.el, dv.el), dir.el,
    h('p', { class: 'field__hint' }, 'Solo se valida el formato del RUC y del DV. Datos ficticios: no escriba información real.'),
    h('button', { class: 'btn btn--primary', type: 'submit' }, 'Guardar datos del emisor'));
  }, () => [neg().id, neg().emisor]);

  const pintaPac = seccion('pac', 'Proveedor autorizado de certificación (PAC)', () => h('div', null,
    h('div', { class: 'opciones opciones--2', role: 'radiogroup', 'aria-label': 'PAC seleccionado' }, PACS.map((p) => opcionRadio({ nombre: 'pac', valor: p.id, texto: p.nombre, marcado: neg().pacId === p.id, foco: `pac-${p.id}`, alCambiar: C.fijarPac, ico: 'shield' }))),
    h('p', { class: 'field__hint' }, 'Nombres genéricos: la demo no se conecta a ningún PAC real. El elegido aparece en el comprobante como "Autorizado por".')),
  () => [neg().id, neg().pacId]);

  const pintaSucursales = seccion('sucursales', 'Sucursales', () => {
    const n = neg(); const nombre = campo({ etiqueta: 'Nueva sucursal', foco: 'suc-nueva' });
    const msg = h('p', { class: 'field__error', role: 'alert' });
    return h('div', null,
      h('ul', { class: 'lista-ajuste' }, n.sucursales.map((s) => h('li', null, h('span', null, s.nombre),
        h('button', { class: 'btn btn--ghost btn--sm', type: 'button', 'aria-label': `Quitar la sucursal ${s.nombre}`, onclick: () => { const r = C.quitarSucursal(s.id); if (!r.ok) toast(r.error, { kind: 'warn' }); } }, icono('trash', { size: 16 }), 'Quitar')))),
      h('form', { class: 'fila-agregar', onsubmit: (e) => { e.preventDefault(); const r = C.agregarSucursal(nombre.input.value); if (!r.ok) msg.textContent = r.error; } },
        nombre.el, h('button', { class: 'btn', type: 'submit' }, icono('plus', { size: 16 }), 'Agregar')), msg);
  }, () => [neg().id, neg().sucursales, neg().puntos.length]);

  const pintaPuntos = seccion('puntos', 'Puntos de facturación', () => {
    const n = neg(); const msg = h('p', { class: 'field__error', role: 'alert' });
    const codigo = campo({ etiqueta: 'Código', foco: 'pto-codigo', maxlength: 6, placeholder: 'PF4' });
    const nombre = campo({ etiqueta: 'Nombre', foco: 'pto-nombre', placeholder: 'Caja 3' });
    const suc = selector({ etiqueta: 'Sucursal', valor: n.sucursales[0]?.id, opciones: n.sucursales.map((s) => ({ valor: s.id, texto: s.nombre })) });
    return h('div', null,
      h('ul', { class: 'lista-ajuste' }, n.puntos.map((p) => h('li', null,
        h('span', null, h('strong', { class: 'mono' }, p.codigo), ` · ${p.nombre} · ${n.sucursales.find((s) => s.id === p.sucursalId)?.nombre ?? ''}`,
          p.web ? h('small', null, ' (pedidos de la tienda en línea)') : null, n.puntoActivo === p.id ? h('span', { class: 'est est--autorizada' }, 'En uso en caja') : null),
        h('span', { class: 'lista-ajuste__acc' },
          !p.web && n.puntoActivo !== p.id ? h('button', { class: 'btn btn--sm', type: 'button', onclick: () => C.fijarPuntoActivo(p.id) }, 'Usar en caja') : null,
          !p.web ? h('button', { class: 'btn btn--ghost btn--sm', type: 'button', 'aria-label': `Quitar el punto ${p.codigo}`, onclick: () => { const r = C.quitarPunto(p.id); if (!r.ok) toast(r.error, { kind: 'warn' }); } }, icono('trash', { size: 16 }), 'Quitar') : null)))),
      h('form', { class: 'fila-agregar fila-agregar--3', onsubmit: (e) => { e.preventDefault(); const r = C.agregarPunto({ codigo: codigo.input.value, nombre: nombre.input.value, sucursalId: suc.select.value }); if (!r.ok) msg.textContent = r.error; } },
        codigo.el, nombre.el, suc.el, h('button', { class: 'btn', type: 'submit' }, icono('plus', { size: 16 }), 'Agregar')), msg);
  }, () => [neg().id, neg().puntos.map((p) => [p.id, p.codigo, p.nombre, p.sucursalId, p.web]), neg().puntoActivo, neg().sucursales]);

  const pintaRedondeo = seccion('redondeo', 'Redondeo del ITBMS', () => h('div', null,
    h('fieldset', { class: 'bloque' }, h('legend', null, 'Regla de redondeo'),
      h('div', { class: 'opciones opciones--2', role: 'radiogroup', 'aria-label': 'Regla de redondeo del ITBMS' }, REGLAS_REDONDEO.map((r) => opcionRadio({
        nombre: 'redondeo', valor: r.id, texto: r.nombre, detalle: r.detalle, marcado: (neg().emisor.reglaRedondeo || REGLA_REDONDEO_DEFECTO) === r.id, foco: `redondeo-${r.id}`, alCambiar: C.fijarReglaRedondeo,
      })))),
    h('p', { class: 'field__hint' }, 'Rige para los documentos nuevos; los ya emitidos conservan la suya. Con el redondeo por línea, el ITBMS por tasa puede diferir por centavos de base × tasa. Validar la regla con la ficha técnica de la DGI.')),
  () => [neg().id, neg().emisor.reglaRedondeo]);

  const pintaMedidor = seccion('medidor', 'Medidor del facturador gratuito', () => {
    const n = neg();
    const anio = campo({ etiqueta: 'Límite de ingresos brutos al año (B/.)', tipo: 'number', valor: String(n.ajustes.limiteAnio), min: '0', step: '1', foco: 'lim-anio', alCambiar: (v) => { if (Number(v) > 0) C.fijarAjuste('limiteAnio', Number(v)); } });
    const docs = campo({ etiqueta: 'Límite de documentos al mes', tipo: 'number', valor: String(n.ajustes.limiteDocs), min: '0', step: '1', foco: 'lim-docs', alCambiar: (v) => { if (Number(v) > 0) C.fijarAjuste('limiteDocs', Number(v)); } });
    return h('div', null,
      h('fieldset', { class: 'bloque' }, h('legend', null, 'Qué cuenta como "ventas"'),
        h('div', { class: 'opciones opciones--2' },
          opcionRadio({ nombre: 'base-med', valor: 'sin_itbms', texto: 'Ventas sin ITBMS', marcado: n.ajustes.baseMedidor === 'sin_itbms', foco: 'base-sin', alCambiar: (v) => C.fijarAjuste('baseMedidor', v) }),
          opcionRadio({ nombre: 'base-med', valor: 'con_itbms', texto: 'Total con ITBMS', marcado: n.ajustes.baseMedidor === 'con_itbms', foco: 'base-con', alCambiar: (v) => C.fijarAjuste('baseMedidor', v) }))),
      h('div', { class: 'fila-2' }, anio.el, docs.el),
      h('p', { class: 'field__hint' }, `Valores de la demo: ${LIMITE_ANUAL.toLocaleString('en-US')} al año y ${LIMITE_DOCS_MES} documentos al mes, con base "${BASE_MEDIDOR_DEFECTO === 'sin_itbms' ? 'sin ITBMS' : 'con ITBMS'}". Validar con la ficha técnica de la DGI.`),
      h('button', { class: 'btn btn--sm', type: 'button', onclick: () => { C.fijarAjuste('limiteAnio', LIMITE_ANUAL); C.fijarAjuste('limiteDocs', LIMITE_DOCS_MES); C.fijarAjuste('baseMedidor', BASE_MEDIDOR_DEFECTO); } }, icono('refresh', { size: 16 }), 'Volver a los valores de la demo'));
  }, () => [neg().id, neg().ajustes]);

  const pintaDatos = seccion('datos', 'Datos de la demo', () => h('div', null,
    h('p', null, 'Todo vive en este navegador (localStorage); si no está disponible, la demo sigue funcionando en memoria. Nada se envía a ningún servidor.'),
    h('button', { class: 'btn btn--danger', type: 'button', onclick: async () => {
      if (await confirmDialog({ title: 'Reiniciar la demo', text: 'Se borran los cambios y se vuelve a cargar el estado inicial de los tres negocios.', confirmLabel: 'Reiniciar demo', danger: true })) { C.reiniciarDemo(); toast('Demo reiniciada.', { kind: 'ok' }); }
    } }, icono('refresh', { size: 16 }), 'Reiniciar demo')), () => ['datos']);

  const todo = () => { pintaEmisor(); pintaPac(); pintaSucursales(); pintaPuntos(); pintaRedondeo(); pintaMedidor(); pintaDatos(); };
  todo();
  const baja = subscribe(() => todo());
  return () => baja();
}
