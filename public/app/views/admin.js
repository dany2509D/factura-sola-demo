// Panel del contador (#/admin): ventas por día, ITBMS por tasa, facturas, notas, rechazos con su
// motivo y exportación a CSV y Excel, con filtro por mes.
import { h, svgFrom, clear } from '../../shared/ui/dom.js';
import { neg, ui, subscribe } from '../state.js';
import * as C from '../controller.js';
import { fmt, toCents } from '../money.js';
import { TASAS, REGLAS_REDONDEO } from '../config.js';
import { masReciente } from '../docs.js';
import { resumenMes, mesesConDatos } from '../report.js';
import { todayKey } from '../../shared/time/panama.js';
import { aCsv, libroDelMes, descargar, filasDocumentos, filasLineas, COLUMNAS_DOCUMENTOS, COLUMNAS_LINEAS, TIPO_XLSX, TIPO_CSV } from '../export.js';
import { icono, badgeEstado, numeroDoc, tipoCorto, fechaHora, fechaCorta, nombreMes, selector } from '../ui-kit.js';
import { crearMedidor } from './medidor.js';
import { animarNumero } from '../motion.js';
import { toast } from '../../shared/ui/ui.js';

const importe = (d) => (d.tipo === 'nota_credito' ? `−${fmt(d.total)}` : fmt(d.total));
const recien = (docs) => [...docs].sort(masReciente);
const hoyDe = (ym) => (ym === todayKey().slice(0, 7) ? todayKey() : null);
const mesNombre = (ym) => { const s = nombreMes(ym); return s.charAt(0).toUpperCase() + s.slice(1); };

// ------------------------------------------------------------------ gráfico de barras (ventas por día)

function escalaBonita(max) {
  if (max <= 0) return { tope: 1, paso: 0.25 };
  const crudo = max / 4; const mag = 10 ** Math.floor(Math.log10(crudo));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= crudo) ?? mag * 10;
  return { tope: Math.ceil(max / paso) * paso, paso };
}
const tickTxt = (v) => (v >= 10000 ? `${Math.round(v / 1000)}K` : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(v));

function barraRedondeada(x, yTop, w, base) {
  const alto = base - yTop; const r = Math.min(2, alto / 2, w / 2);
  return `M${x} ${base}V${yTop + r}a${r} ${r} 0 0 1 ${r} ${-r}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}V${base}z`;
}

function dibujarGrafico(contenedor, tip, datos, hoy = null) {
  const esHoyTip = (d) => !!hoy && d.dia === hoy;
  const ancho = Math.max(280, contenedor.clientWidth || 640); const alto = 252;
  const m = { i: 46, d: 8, s: 22, b: 38 };
  const iw = ancho - m.i - m.d; const ih = alto - m.s - m.b;
  const max = Math.max(...datos.map((d) => d.ventas), 0);
  const { tope, paso } = escalaBonita(max);
  const y = (v) => m.s + ih - (v / tope) * ih;
  const slot = iw / datos.length; const bw = Math.max(3, Math.min(24, slot - 2));
  let ejeY = ''; let rejilla = '';
  for (let v = 0; v <= tope + 1e-9; v += paso) {
    rejilla += `<line x1="${m.i}" x2="${ancho - m.d}" y1="${y(v)}" y2="${y(v)}" class="gr-rejilla"/>`;
    ejeY += `<text x="${m.i - 8}" y="${y(v) + 4}" text-anchor="end" class="gr-eje">${tickTxt(v)}</text>`;
  }
  const cada = Math.max(1, Math.ceil(datos.length / Math.max(2, Math.floor(iw / 38))));
  const conVentas = datos.filter((d) => d.ventas > 0);
  const promedio = conVentas.length ? conVentas.reduce((a, d) => a + d.ventas, 0) / conVentas.length : 0;
  const iHoy = hoy ? datos.findIndex((d) => d.dia === hoy) : -1;
  const cxHoy = iHoy >= 0 ? m.i + slot * iHoy + slot / 2 : null;
  let ejeX = ''; let barras = ''; let zonas = ''; let etiqueta = '';
  const imax = datos.findIndex((d) => d.ventas === max && max > 0);
  datos.forEach((d, i) => {
    const cx = m.i + slot * i + slot / 2; const x = cx - bw / 2;
    const esHoy = i === iHoy;
    // El día de hoy siempre lleva su número, en negrita; los vecinos cercanos se omiten para no pisarlo.
    if (esHoy) ejeX += `<text x="${cx}" y="${alto - 8}" text-anchor="middle" class="gr-eje gr-eje--hoy">${Number(d.dia.slice(8))}</text>`;
    else if ((i % cada === 0 || i === datos.length - 1) && (cxHoy === null || Math.abs(cx - cxHoy) > 30)) ejeX += `<text x="${cx}" y="${alto - 8}" text-anchor="middle" class="gr-eje">${Number(d.dia.slice(8))}</text>`;
    if (d.ventas > 0) barras += `<path d="${barraRedondeada(x, y(d.ventas), bw, y(0))}" class="gr-barra${esHoy ? ' gr-barra--hoy' : ''}" data-i="${i}" style="--i:${i}"/>`;
    zonas += `<rect x="${m.i + slot * i}" y="${m.s}" width="${slot}" height="${ih}" class="gr-zona" tabindex="0" role="img" aria-label="${esHoy ? 'Hoy, ' : ''}${fechaCorta(d.dia)}: ${d.ventas > 0 ? fmt(d.ventas) : 'sin ventas'}, ${d.docs} documentos" data-i="${i}"/>`;
  });
  if (imax >= 0) {
    const cx = m.i + slot * imax + slot / 2; const ancla = cx > ancho - 60 ? 'end' : cx < m.i + 40 ? 'start' : 'middle';
    etiqueta = `<text x="${cx}" y="${y(max) - 6}" text-anchor="${ancla}" class="gr-valor">${fmt(max)}</text>`;
  }
  const marcaHoy = cxHoy === null ? '' : `<path class="gr-hoy-marca" d="M${cxHoy} ${y(0) + 4}l5.5 8h-11z"/>`;
  const lineaProm = promedio > 0 ? `<line x1="${m.i}" x2="${ancho - m.d}" y1="${y(promedio)}" y2="${y(promedio)}" class="gr-promedio"/><text x="${ancho - m.d - 4}" y="${y(promedio) - 6}" text-anchor="end" class="gr-promedio-tx">Promedio ${fmt(promedio)}</text>` : '';
  clear(contenedor);
  const svg = svgFrom(`<svg class="grafico" viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}" role="group" aria-label="Ventas por día del mes, en balboas, sin ITBMS${promedio > 0 ? `. Promedio de los días con ventas: ${fmt(promedio)}` : ''}">${rejilla}${ejeY}${ejeX}<line x1="${m.i}" x2="${ancho - m.d}" y1="${y(0)}" y2="${y(0)}" class="gr-base"/>${barras}${lineaProm}${marcaHoy}${etiqueta}${zonas}</svg>`);
  contenedor.append(svg, tip);
  const mostrar = (i, el) => {
    const d = datos[i]; const r = contenedor.getBoundingClientRect(); const b = el.getBoundingClientRect();
    tip.replaceChildren(h('strong', { class: 'num' }, d.ventas > 0 ? fmt(d.ventas) : 'Sin ventas'), h('span', null, `${esHoyTip(d) ? 'Hoy, ' : ''}${fechaCorta(d.dia)}, ${d.docs} ${d.docs === 1 ? 'documento' : 'documentos'}`));
    tip.hidden = false;
    const izq = Math.min(Math.max(8, b.left - r.left + b.width / 2 - tip.offsetWidth / 2), r.width - tip.offsetWidth - 8);
    tip.style.left = `${izq}px`; tip.style.top = `${Math.max(0, (d.ventas > 0 ? y(d.ventas) : y(0)) - tip.offsetHeight - 10)}px`;
    svg.querySelectorAll('.gr-barra').forEach((p) => p.classList.toggle('gr-barra--on', Number(p.dataset.i) === i));
  };
  const ocultar = () => { tip.hidden = true; svg.querySelectorAll('.gr-barra--on').forEach((p) => p.classList.remove('gr-barra--on')); };
  svg.querySelectorAll('.gr-zona').forEach((z) => {
    z.addEventListener('pointerenter', () => mostrar(Number(z.dataset.i), z));
    z.addEventListener('focus', () => mostrar(Number(z.dataset.i), z));
    z.addEventListener('pointerleave', ocultar); z.addEventListener('blur', ocultar);
  });
}

// ------------------------------------------------------------------ tablas

function tabla({ titulo, columnas, filas, pie, apilar = false }) {
  return h('table', { class: `tabla${apilar ? ' tabla--apilar' : ''}` },
    h('caption', { class: 'sr-only' }, titulo),
    h('thead', null, h('tr', null, columnas.map((c) => h('th', { scope: 'col', class: c.der ? 'der' : '' }, c.t)))),
    h('tbody', null, filas),
    pie ? h('tfoot', null, pie) : null);
}
const celda = (et, contenido, der) => h('td', { 'data-et': et, class: der ? 'der num' : '' }, contenido);

// ------------------------------------------------------------------ vistas

export function montar(raiz, { sub = '' } = {}) {
  const cuerpo = h('div', { class: 'admin__cuerpo' });
  const tip = h('div', { class: 'gr-tip', hidden: true, role: 'status' });
  const graf = h('div', { class: 'grafico-caja' });
  let obs = null; let medidor = null; let ultimoDatos = null; let firma = '';

  raiz.append(h('section', { class: 'admin', 'aria-label': 'Panel del contador' }, cuerpo));

  const barraHerramientas = (n, ym, res) => {
    const meses = mesesConDatos(n.documentos, todayKey().slice(0, 7));
    const sel = selector({ etiqueta: 'Mes', valor: ym, opciones: meses.map((m) => ({ valor: m, texto: mesNombre(m) })), alCambiar: (v) => C.fijarMes(v) });
    const base = `factura-sola_${n.id}_${ym}`;
    return h('div', { class: 'admin__barra' },
      sel.el,
      h('div', { class: 'exportar', role: 'group', 'aria-label': 'Exportar el mes' },
        h('span', { class: 'exportar__t' }, 'Exportar el mes'),
        h('button', { class: 'btn btn--sm', type: 'button', onclick: () => salida(descargar(`${base}.xlsx`, libroDelMes(res, res.docs), TIPO_XLSX), 'Excel') }, icono('download', { size: 16 }), 'Excel (.xlsx)'),
        h('button', { class: 'btn btn--sm', type: 'button', onclick: () => salida(descargar(`${base}_documentos.csv`, aCsv(COLUMNAS_DOCUMENTOS, filasDocumentos(res.docs)), TIPO_CSV), 'CSV de documentos') }, icono('download', { size: 16 }), 'CSV documentos'),
        h('button', { class: 'btn btn--sm', type: 'button', onclick: () => salida(descargar(`${base}_lineas.csv`, aCsv(COLUMNAS_LINEAS, filasLineas(res.docs)), TIPO_CSV), 'CSV de líneas') }, icono('download', { size: 16 }), 'CSV líneas')));
  };
  const salida = (ok, que) => toast(ok ? `Descarga lista: ${que}.` : 'Su navegador no permitió la descarga.', { kind: ok ? 'ok' : 'error' });

  function kpis(res) {
    const t = res.totales; const c = res.conteos;
    const tile = (et, valor, nota, enlace) => {
      const v = h('strong', { class: 'kpi__v num' }, typeof valor === 'number' ? fmt(valor) : valor);
      if (typeof valor === 'number') animarNumero(v, valor, { formato: fmt, dur: 950 });
      return h('div', { class: 'kpi' }, h('span', { class: 'kpi__et' }, et), v, enlace || h('span', { class: 'kpi__n' }, nota));
    };
    return h('div', { class: 'kpis' },
      tile('Ventas netas (sin ITBMS)', t.base, `${c.facturas} facturas y ${c.creditos + c.debitos} notas autorizadas`),
      tile('ITBMS del mes', t.itbms, 'Separado por tasa abajo'),
      tile('Total facturado', t.total, 'Facturas + débitos − créditos'),
      tile('Por revisar', String(c.rechazosAbiertos + c.enCola), '', h('span', { class: 'kpi__n' }, h('a', { href: '#/admin/rechazos' }, `${c.rechazosAbiertos} ${c.rechazosAbiertos === 1 ? 'rechazado' : 'rechazados'}`), ` y ${c.enCola} en cola`)));
  }

  /** Barra apilada del ITBMS del mes repartido por tasa (cada tramo, con su monto y su porcentaje). */
  function barraTasas(res) {
    const filas = [7, 10, 15].map((t) => ({ t, itbms: res.porTasa[String(t)].itbms })).filter((f) => f.itbms > 0);
    const total = filas.reduce((a, f) => a + f.itbms, 0);
    if (!total) return h('p', { class: 'tasas__vacio' }, 'Este mes no hay ITBMS que repartir.');
    return h('div', { class: 'tasas', role: 'group', 'aria-label': 'ITBMS del mes repartido por tasa' },
      h('div', { class: 'tasas__barra', 'aria-hidden': 'true' }, filas.map((f) => h('span', { class: `tasas__seg tasas__seg--${f.t}`, style: `flex: ${f.itbms} 1 0`, title: `${f.t} %: ${fmt(f.itbms)}` }))),
      h('ul', { class: 'tasas__leyenda' }, filas.map((f) => h('li', { class: `tasas__seg--${f.t}` },
        h('i', { class: 'tasas__color', 'aria-hidden': 'true' }), h('span', null, `Tasa ${f.t} %`), h('span', { class: 'num' }, fmt(f.itbms)), h('span', { class: 'tasas__pct num' }, `${Math.round((f.itbms / total) * 100)} %`)))));
  }

  function tablaTasas(res) {
    const filas = TASAS.map((t) => h('tr', null, h('th', { scope: 'row' }, `${t} %`), celda('Base', fmt(res.porTasa[String(t)].base), true), celda('ITBMS', fmt(res.porTasa[String(t)].itbms), true)));
    return tabla({
      titulo: 'ITBMS por tasa del mes', columnas: [{ t: 'Tasa' }, { t: 'Base', der: true }, { t: 'ITBMS', der: true }], filas,
      pie: h('tr', null, h('th', { scope: 'row' }, 'Total'), celda('Base', fmt(res.totales.base), true), celda('ITBMS', fmt(res.totales.itbms), true)),
    });
  }

  /** Explica qué regla de redondeo se usó y cuánto difiere, en el mes, de base × tasa (FAC-RNF-05). */
  function notaRedondeo(n, res) {
    const usadas = [...new Set(res.docs.filter((d) => d.estado === 'autorizada').map((d) => d.reglaRedondeo || 'linea'))];
    const reglas = usadas.length ? usadas : [n.emisor.reglaRedondeo || 'linea'];
    let dif = 0;
    for (const t of TASAS) {
      const b = toCents(res.porTasa[String(t)].base); const i = toCents(res.porTasa[String(t)].itbms);
      dif += i - Math.floor((b * t + 50) / 100);
    }
    const nombres = reglas.map((r) => REGLAS_REDONDEO.find((x) => x.id === r)?.nombre.toLowerCase() ?? r).join(' y ');
    return h('p', { class: 'field__hint nota-redondeo' }, h('strong', null, `Redondeo del ITBMS: ${nombres}. `),
      reglas.includes('linea') ? 'Cada línea redondea su ITBMS al centavo y cada tasa suma sus líneas, así que puede diferir por centavos de base × tasa. ' : '',
      reglas.includes('base') ? 'Con "sobre la base por tasa" el ITBMS de cada tasa se calcula una sola vez. ' : '',
      dif === 0 ? 'En este mes coincide con base × tasa. ' : `En este mes la diferencia frente a base × tasa es de ${fmt(dif / 100)}. `,
      'Se cambia en ', h('a', { href: '#/admin/ajustes' }, 'Ajustes'), '. Validar la regla con la ficha técnica de la DGI.');
  }

  function tablaDias(res) {
    return tabla({
      titulo: 'Ventas por día', columnas: [{ t: 'Día' }, { t: 'Documentos', der: true }, { t: 'Ventas (base)', der: true }, { t: 'ITBMS', der: true }, { t: 'Total', der: true }],
      filas: [...res.porDia].reverse().map((d) => h('tr', null, h('th', { scope: 'row', 'data-et': 'Día' }, fechaCorta(d.dia)), celda('Documentos', String(d.docs), true), celda('Ventas', fmt(d.ventas), true), celda('ITBMS', fmt(d.itbms), true), celda('Total', fmt(d.total), true))),
      pie: h('tr', null, h('th', { scope: 'row' }, 'Mes'), celda('Documentos', String(res.porDia.reduce((a, d) => a + d.docs, 0)), true), celda('Ventas', fmt(res.totales.base), true), celda('ITBMS', fmt(res.totales.itbms), true), celda('Total', fmt(res.totales.total), true)),
    });
  }

  function resumen(n, ym, res) {
    medidor = crearMedidor({ editable: false }); medidor.actualizar(n);
    ultimoDatos = res.porDia;
    return [
      kpis(res),
      h('div', { class: 'admin__rejilla' },
        h('section', { class: 'card', 'aria-labelledby': 'tit-graf' },
          h('h2', { id: 'tit-graf', class: 'h-peq' }, 'Ventas por día'),
          h('p', { class: 'subtitulo' }, mesNombre(ym)),
          h('p', { class: 'field__hint' }, 'Ventas netas en balboas (sin ITBMS), solo documentos autorizados; las notas de crédito restan.'),
          h('ul', { class: 'gr-leyenda' },
            h('li', null, h('i', { 'aria-hidden': 'true' }), 'Ventas del día'),
            ym === todayKey().slice(0, 7) ? h('li', null, h('i', { class: 'gr-ley-hoy', 'aria-hidden': 'true' }), 'Hoy (marcado con ▲)') : null,
            h('li', null, h('i', { class: 'gr-ley-prom', 'aria-hidden': 'true' }), 'Promedio de los días con ventas')),
          graf,
          h('details', { class: 'ver-tabla' }, h('summary', null, 'Ver como tabla'), h('div', { class: 'tabla-wrap' }, tablaDias(res)))),
        h('section', { class: 'card', 'aria-labelledby': 'tit-tasa' },
          h('h2', { id: 'tit-tasa', class: 'h-peq' }, 'ITBMS por tasa'),
          barraTasas(res),
          h('div', { class: 'tabla-wrap' }, tablaTasas(res)),
          notaRedondeo(n, res),
          h('p', { class: 'field__hint' }, 'Los totales de esta tabla, del gráfico y de la exportación son la misma suma, al centavo.'))),
      h('section', { class: 'card', 'aria-labelledby': 'tit-med-admin' },
        h('h2', { id: 'tit-med-admin', class: 'h-peq' }, 'Estado frente al facturador gratuito'), medidor.el),
    ];
  }

  function listaFacturas(res) {
    const f = recien(res.docs.filter((d) => d.tipo === 'factura'));
    const aut = f.filter((d) => d.estado === 'autorizada');
    const suma = (k) => fmt(aut.reduce((s, d) => s + toCents(d[k]), 0) / 100);
    return [h('section', { class: 'card' }, h('h2', { class: 'h-peq' }, 'Facturas'), h('p', { class: 'subtitulo' }, `${f.length} ${f.length === 1 ? 'documento' : 'documentos'} en el mes`),
      h('div', { class: 'tabla-wrap' }, tabla({
        titulo: 'Facturas del mes', apilar: true, columnas: [{ t: 'Número' }, { t: 'Fecha' }, { t: 'Cliente' }, { t: 'RUC' }, { t: 'Base', der: true }, { t: 'ITBMS', der: true }, { t: 'Total', der: true }, { t: 'Estado' }],
        filas: f.map((d) => h('tr', { class: `fila fila--${d.estado}` },
          h('th', { scope: 'row', 'data-et': 'Número' }, h('a', { class: 'enlace-num', href: `#/documentos/${d.id}` }, numeroDoc(d))),
          celda('Fecha', fechaHora(d.fecha)), celda('Cliente', d.cliente.nombre), celda('RUC', d.cliente.ruc ? `${d.cliente.ruc} DV ${d.cliente.dv}` : '—'),
          celda('Base', fmt(d.subtotal), true), celda('ITBMS', fmt(d.itbmsTotal), true), celda('Total', fmt(d.total), true), celda('Estado', badgeEstado(d.estado)))),
        pie: h('tr', null, h('th', { scope: 'row', colspan: 4 }, `Suma de las ${aut.length} autorizadas`), celda('Base', suma('subtotal'), true), celda('ITBMS', suma('itbmsTotal'), true), celda('Total', suma('total'), true), h('td')),
      })))];
  }

  function listaNotas(res) {
    const f = recien(res.docs.filter((d) => d.tipo !== 'factura'));
    return [h('section', { class: 'card' }, h('h2', { class: 'h-peq' }, 'Notas de crédito y de débito'), h('p', { class: 'subtitulo' }, `${f.length} ${f.length === 1 ? 'nota' : 'notas'} en el mes`),
      f.length ? h('div', { class: 'tabla-wrap' }, tabla({
        titulo: 'Notas del mes', apilar: true, columnas: [{ t: 'Número' }, { t: 'Fecha' }, { t: 'Tipo' }, { t: 'Factura de referencia' }, { t: 'Motivo' }, { t: 'Total', der: true }, { t: 'Estado' }],
        filas: f.map((d) => h('tr', { class: `fila fila--${d.estado}` },
          h('th', { scope: 'row', 'data-et': 'Número' }, h('a', { class: 'enlace-num', href: `#/documentos/${d.id}` }, numeroDoc(d))),
          celda('Fecha', fechaHora(d.fecha)), celda('Tipo', tipoCorto(d.tipo)),
          celda('Referencia', h('a', { class: 'mono', href: `#/documentos/${d.documentoReferenciaId}` }, `FAC · ${d.documentoReferenciaNumero}`)),
          celda('Motivo', d.motivoNota || '—'), celda('Total', importe(d), true), celda('Estado', badgeEstado(d.estado)))),
      })) : h('p', { class: 'vacio' }, 'No hay notas en este mes.'))];
  }

  function listaRechazos(res) {
    const ev = [...res.eventosRechazo].sort((a, b) => (a.rechazo.fecha < b.rechazo.fecha ? 1 : -1));
    return [h('section', { class: 'card' }, h('h2', { class: 'h-peq' }, 'Rechazos del PAC'), h('p', { class: 'subtitulo' }, `${ev.length} ${ev.length === 1 ? 'rechazo' : 'rechazos'} en el mes`),
      h('p', { class: 'field__hint' }, 'Cada rechazo explica el motivo en lenguaje claro. Se corrige y se reenvía desde el documento.'),
      ev.length ? h('div', { class: 'tabla-wrap' }, tabla({
        titulo: 'Rechazos del mes', apilar: true, columnas: [{ t: 'Documento' }, { t: 'Fecha' }, { t: 'Motivo' }, { t: 'Corrección' }],
        filas: ev.map(({ doc, rechazo }) => h('tr', null,
          h('th', { scope: 'row', 'data-et': 'Documento' }, h('a', { class: 'enlace-num', href: `#/documentos/${doc.id}` }, numeroDoc(doc))),
          celda('Fecha', fechaHora(rechazo.fecha)), celda('Motivo', rechazo.motivo),
          celda('Corrección', rechazo.corregido
            ? h('span', { class: 'est est--t-ok' }, icono('check', { size: 14 }), `Corregido ${fechaHora(rechazo.corregidoEn)}`)
            : h('a', { class: 'est est--t-mal', href: `#/documentos/${doc.id}` }, icono('x', { size: 14 }), 'Pendiente de corregir')))),
      })) : h('p', { class: 'vacio' }, 'No hubo rechazos en este mes.'))];
  }

  function pinta() {
    const n = neg(); const ym = ui().mes || todayKey().slice(0, 7);
    const res = resumenMes(n.documentos, ym, todayKey());
    clear(cuerpo);
    const titulos = { '': 'Resumen del mes', facturas: 'Facturas', notas: 'Notas', rechazos: 'Rechazos' };
    cuerpo.append(
      h('div', { class: 'pagina-cab' }, h('div', null, h('p', { class: 'eyebrow' }, 'Panel del contador'), h('h1', null, titulos[sub] ?? 'Resumen del mes'), h('p', { class: 'subtitulo' }, n.nombre))),
      barraHerramientas(n, ym, res),
      ...(sub === 'facturas' ? listaFacturas(res) : sub === 'notas' ? listaNotas(res) : sub === 'rechazos' ? listaRechazos(res) : resumen(n, ym, res)));
    if (!sub) dibujarGrafico(graf, tip, res.porDia, hoyDe(ym));
  }

  function refrescar() {
    const n = neg(); const ym = ui().mes;
    const nueva = JSON.stringify([n.id, ym, sub, n.medidorBase, n.prospecto, n.emisor.reglaRedondeo, n.documentos.map((d) => [d.id, d.estado, d.rechazos.length, d.total])]);
    if (nueva === firma) return;
    firma = nueva; pinta();
  }
  refrescar();
  if (typeof ResizeObserver !== 'undefined' && !sub) {
    let ancho = 0;
    obs = new ResizeObserver(() => { const w = graf.clientWidth; if (w && Math.abs(w - ancho) > 2 && ultimoDatos) { ancho = w; dibujarGrafico(graf, tip, ultimoDatos, hoyDe(ui().mes || todayKey().slice(0, 7))); } });
    obs.observe(graf);
  }
  const baja = subscribe(() => refrescar());
  return () => { baja(); obs?.disconnect(); };
}

