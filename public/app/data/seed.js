// Datos semilla: por negocio, 30 productos, 60 ventas del mes en curso (más dos meses anteriores
// más livianos para que el filtro por mes tenga qué mostrar), 2 rechazos y 1 nota de crédito.
// Las fechas son relativas a "hoy" en Panamá y la generación es determinista.
import { NEGOCIOS, ORDEN_NEGOCIOS, CLIENTES_SEMILLA, COMPRADORES_TIENDA } from './catalogs.js';
import { construirFactura, construirNotaCredito, clienteConsumidor, numeroDe, masReciente } from '../docs.js';
import { autorizar, aplicarSimulacion, validarDocumento } from '../pac.js';
import { baseParaObjetivo } from '../meter.js';
import { hash32, mulberry32 } from '../fake.js';
import { addDays, addMin, addMonths, dateKey, nowStamp, toMin } from '../../shared/time/panama.js';
import { BASE_MEDIDOR_DEFECTO, LIMITE_ANUAL, LIMITE_DOCS_MES, VERSION_DATOS } from '../config.js';

const METODOS = ['efectivo', 'efectivo', 'tarjeta', 'tarjeta', 'yappy', 'ach'];
const VENTAS_MES = { actual: 60, previo: 40, previo2: 34 };

function diasDeMes(ym, hoyKey) {
  const [y, m] = ym.split('-').map(Number);
  const ultimo = dateKey(new Date(Date.UTC(y, m, 0)));
  const fin = ym === hoyKey.slice(0, 7) ? hoyKey : ultimo;
  const out = [];
  for (let d = `${ym}-01`; d <= fin; d = addDays(d, 1)) out.push(d);
  return out;
}

function sembrarNegocio(def, hoy) {
  const rnd = mulberry32(hash32(`semilla|${def.id}`));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const hoyKey = hoy.slice(0, 10);
  const nowMin = toMin(hoy.slice(11, 16));
  const puntosMostrador = def.puntos.filter((p) => !p.web);
  const puntoWeb = def.puntos.find((p) => p.web);
  const pac = 'pac-a';

  const meses = [
    { ym: addMonths(hoyKey, 0).slice(0, 7), n: VENTAS_MES.actual },
    { ym: addMonths(hoyKey, -1).slice(0, 7), n: VENTAS_MES.previo },
    { ym: addMonths(hoyKey, -2).slice(0, 7), n: VENTAS_MES.previo2 },
  ];

  const crudos = [];
  let pedidoN = 1000;
  for (const { ym, n } of meses) {
    const dias = diasDeMes(ym, hoyKey);
    for (let i = 0; i < n; i++) {
      const dia = pick(dias);
      const tMax = dia === hoyKey ? Math.max(1, nowMin - 1) : 18 * 60;
      const tMin = Math.min(8 * 60, tMax);
      const minutos = tMin + Math.floor(rnd() * (tMax - tMin + 1));
      const seg = String(Math.floor(rnd() * 60)).padStart(2, '0');
      const fecha = `${dia}T${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}:${seg}`;
      const nLineas = def.ticket.min + Math.floor(rnd() * (def.ticket.max - def.ticket.min + 1));
      const usados = new Set(); const items = [];
      while (items.length < nLineas) {
        const p = pick(def.productos);
        if (usados.has(p.codigo)) continue;
        usados.add(p.codigo);
        items.push({ ...p, cantidad: 1 + Math.floor(rnd() * def.ticket.qtyMax), descuentoPct: rnd() < 0.08 ? 5 : 0 });
      }
      const web = rnd() < def.pctTienda;
      const cliente = !web && rnd() < 0.22 ? { ...pick(CLIENTES_SEMILLA) } : null;
      crudos.push({ fecha, items, web, cliente, metodoPago: pick(METODOS), punto: web ? puntoWeb : pick(puntosMostrador) });
    }
  }
  crudos.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  // Los números definitivos (por punto y tipo, sin huecos) se asignan al final, ya con todo en orden cronológico.

  const contadores = { factura: 0, nota_credito: 0, nota_debito: 0, pedido: 1000 };
  const documentos = [];
  for (const c of crudos) {
    contadores.factura += 1;
    let cliente = c.cliente ? { ...c.cliente } : clienteConsumidor();
    let pedido;
    if (c.web) {
      const [nombre, correo] = pick(COMPRADORES_TIENDA);
      cliente = { tipo: 'consumidor', nombre, correo };
      pedido = `T-${(pedidoN += 1)}`;
    }
    const doc = construirFactura({
      id: `${def.id}-f${contadores.factura}`, numero: numeroDe(c.punto, contadores.factura), fecha: c.fecha, cliente,
      items: c.items, metodoPago: c.metodoPago, origen: c.web ? 'tienda' : 'POS', punto: c.punto, pac, pedido,
    });
    Object.assign(doc, autorizar(doc, addMin(c.fecha, 1)));
    doc.estado = 'autorizada';
    doc.historial.push({ estado: 'enviada', t: c.fecha }, { estado: 'autorizada', t: doc.fechaAutorizacion });
    documentos.push(doc);
  }
  contadores.pedido = pedidoN;

  // Rechazo 1 (ya corregido): una factura del mes con RUC cuyo DV viajó mal y se reenvió bien.
  const delMes = documentos.filter((d) => d.fecha.startsWith(hoyKey.slice(0, 7)) && d.cliente.tipo === 'contribuyente');
  const corregido = delMes[Math.floor(delMes.length / 2)] || documentos.find((d) => d.cliente.tipo === 'contribuyente');
  if (corregido) {
    const dvMal = String((parseInt(corregido.cliente.dv, 10) + 37) % 100).padStart(2, '0');
    corregido.rechazos.push({
      tipo: 'ruc_dv', fecha: addMin(corregido.fecha, 1), corregido: true, corregidoEn: addMin(corregido.fecha, 7),
      motivo: `El PAC no reconoce el DV ${dvMal} para el RUC ${corregido.cliente.ruc}. Revise el DV del cliente y vuelva a enviar.`,
    });
    corregido.historial.splice(2, 0,
      { estado: 'rechazada', t: addMin(corregido.fecha, 1), motivo: `DV ${dvMal} no válido para el RUC ${corregido.cliente.ruc}` },
      { estado: 'generada', t: addMin(corregido.fecha, 6), cambio: `DV ${dvMal} → ${corregido.cliente.dv}` },
      { estado: 'enviada', t: addMin(corregido.fecha, 7) });
  }

  // Rechazo 2 (abierto): una venta de hoy cuyos totales no cuadran, esperando corrección.
  contadores.factura += 1;
  const fechaAbierto = `${addMin(hoy, -Math.min(25, Math.max(0, nowMin - 2)))}:20`;
  const itemsAbierto = [pick(def.productos), pick(def.productos)].map((p, i) => ({ ...p, cantidad: i + 1, descuentoPct: 0 }));
  const abierto = construirFactura({
    id: `${def.id}-f${contadores.factura}`, numero: numeroDe(puntosMostrador[0], contadores.factura), fecha: fechaAbierto,
    cliente: clienteConsumidor(), items: itemsAbierto, metodoPago: 'tarjeta', origen: 'POS', punto: puntosMostrador[0], pac,
  });
  aplicarSimulacion(abierto, 'totales');
  const problema = validarDocumento(abierto, hoyKey);
  abierto.estado = 'rechazada';
  abierto.rechazos.push({ tipo: 'totales', fecha: fechaAbierto, corregido: false, motivo: problema?.motivo ?? 'Los totales no cuadran.' });
  abierto.historial.push({ estado: 'enviada', t: fechaAbierto }, { estado: 'rechazada', t: fechaAbierto, motivo: problema?.motivo ?? 'Los totales no cuadran.' });
  documentos.push(abierto);

  // Nota de crédito: una devolución de una unidad sobre una venta del mes (no de hoy, si se puede).
  const candidatas = documentos.filter((d) => d.estado === 'autorizada' && d.fecha.startsWith(hoyKey.slice(0, 7)) && d.fecha.slice(0, 10) < hoyKey && d.cliente.tipo !== 'contribuyente');
  const base = candidatas[Math.floor(candidatas.length / 3)] || documentos.find((d) => d.estado === 'autorizada');
  contadores.nota_credito += 1;
  const fechaNota = (() => { const f = addMin(base.fecha, 26 * 60); return f > hoy ? `${addMin(hoy, -1)}:40` : `${f}:40`; })();
  const nota = construirNotaCredito({
    id: `${def.id}-nc${contadores.nota_credito}`, numero: numeroDe(base.punto === 'WEB' ? puntoWeb : puntosMostrador[0], contadores.nota_credito),
    fecha: fechaNota, factura: base, items: [{ codigo: base.lineas[0].codigo, cantidad: 1 }],
    motivo: 'Devolución de mercancía', punto: base.punto === 'WEB' ? puntoWeb : puntosMostrador[0], pac,
  });
  Object.assign(nota, autorizar(nota, addMin(fechaNota, 1)));
  nota.estado = 'autorizada';
  nota.historial.push({ estado: 'enviada', t: fechaNota }, { estado: 'autorizada', t: nota.fechaAutorizacion });
  documentos.push(nota);

  // Cada punto de facturación lleva su propia serie por tipo de documento, de 1 en adelante y sin huecos (FAC-RF-13).
  // Se numera en orden cronológico; el rechazado abierto también ocupa su número, porque se reenvía con el mismo.
  documentos.sort((a, b) => -masReciente(a, b));
  const puntos = def.puntos.map((p) => ({ ...p, consecutivos: { factura: 0, nota_credito: 0, nota_debito: 0 } }));
  for (const d of documentos) {
    const p = puntos.find((x) => x.codigo === d.punto);
    p.consecutivos[d.tipo] += 1;
    d.numero = numeroDe(p, p.consecutivos[d.tipo]);
  }
  for (const d of documentos) {
    if (d.documentoReferenciaId) d.documentoReferenciaNumero = documentos.find((x) => x.id === d.documentoReferenciaId).numero;
  }

  const neg = {
    id: def.id, nombre: def.nombre, corto: def.corto, tipo: def.tipo, descripcion: def.descripcion,
    emisor: { ...def.emisor, reglaRedondeo: 'linea' },
    pacId: 'pac-a',
    sucursales: def.sucursales.map((s) => ({ ...s })),
    puntos,
    puntoActivo: puntosMostrador[0].id,
    ajustes: { baseMedidor: BASE_MEDIDOR_DEFECTO, limiteAnio: LIMITE_ANUAL, limiteDocs: LIMITE_DOCS_MES },
    productos: def.productos.map((p) => ({ ...p })),
    clientes: CLIENTES_SEMILLA.map((c) => ({ ...c })),
    documentos,
    contadores,
    medidorBase: { ventasAnio: 0, docsMes: 0 },
    prospecto: null,
  };
  neg.medidorBase = baseParaObjetivo(neg, hoyKey, { ventasAnio: def.ventasAnioObjetivo, docsMes: null });
  neg.medidorBaseSemilla = { ...neg.medidorBase };
  return neg;
}

/** Estado completo de la demo, con todas las cifras de ejemplo. */
export function crearEstadoInicial(hoy = nowStamp()) {
  return {
    version: VERSION_DATOS,
    negocioId: 'tornillo',
    offline: false,
    negocios: Object.fromEntries(ORDEN_NEGOCIOS.map((id) => [id, sembrarNegocio(NEGOCIOS[id], hoy)])),
  };
}

