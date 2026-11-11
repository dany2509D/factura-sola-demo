import test from 'node:test';
import assert from 'node:assert/strict';
import { calcLinea, calcDocumento, totalDeLineas } from '../public/app/calc.js';
import { validarContribuyente, validarTelefono } from '../public/app/ruc.js';
import { masReciente, numeroConTipo } from '../public/app/docs.js';
import { fmt, toCents } from '../public/app/money.js';
import { nivel, calcMedidor } from '../public/app/meter.js';
import { resumenMes } from '../public/app/report.js';
import { filasDocumentos, filasLineas, aCsv, COLUMNAS_DOCUMENTOS, aXlsx, libroDelMes, crc32 } from '../public/app/export.js';
import { crearEstadoInicial } from '../public/app/data/seed.js';
import { validarDocumento } from '../public/app/pac.js';
import { qrMatrix, cufeFicticio } from '../public/app/fake.js';
import { todayKey } from '../public/shared/time/panama.js';

test('calcLinea: las cuatro tasas de ITBMS', () => {
  assert.deepEqual(calcLinea({ precio: 10, cantidad: 1, tasa: 0 }), { bruto: 10, descuento: 0, base: 10, itbms: 0, total: 10 });
  assert.equal(calcLinea({ precio: 10, cantidad: 1, tasa: 7 }).itbms, 0.7);
  assert.equal(calcLinea({ precio: 10, cantidad: 1, tasa: 10 }).itbms, 1);
  assert.equal(calcLinea({ precio: 10, cantidad: 1, tasa: 15 }).itbms, 1.5);
});

test('calcLinea: descuento por línea y redondeo por línea', () => {
  const l = calcLinea({ precio: 3.5, cantidad: 3, descuentoPct: 10, tasa: 7 });
  assert.equal(l.bruto, 10.5); assert.equal(l.descuento, 1.05); assert.equal(l.base, 9.45);
  assert.equal(l.itbms, 0.66); assert.equal(l.total, 10.11);
  assert.equal(calcLinea({ precio: 0.65, cantidad: 1, tasa: 7 }).itbms, 0.05); // 0.0455 -> 0.05
});

test('calcDocumento: el total siempre cuadra con las líneas (500 documentos al azar)', () => {
  let semilla = 7; const r = () => { semilla = (semilla * 1664525 + 1013904223) % 4294967296; return semilla / 4294967296; };
  for (let i = 0; i < 500; i++) {
    const lineas = Array.from({ length: 1 + Math.floor(r() * 6) }, () => ({ precio: Math.round(r() * 5000) / 100, cantidad: 1 + Math.floor(r() * 9), descuentoPct: r() < 0.3 ? Math.round(r() * 30) : 0, tasa: [0, 7, 10, 15][Math.floor(r() * 4)] }));
    const d = calcDocumento(lineas);
    const suma = d.lineas.reduce((s, l) => s + toCents(l.total), 0);
    assert.equal(toCents(d.total), suma);
    assert.equal(toCents(d.total), toCents(d.subtotal) + toCents(d.itbmsTotal));
    assert.equal(Object.values(d.itbmsPorTasa).reduce((s, v) => s + toCents(v), 0), toCents(d.itbmsTotal));
    assert.equal(Object.values(d.basePorTasa).reduce((s, v) => s + toCents(v), 0), toCents(d.subtotal));
  }
});

test('formato de moneda: B/. con coma de miles', () => {
  assert.equal(fmt(36000), 'B/.36,000.00'); assert.equal(fmt(-12.5), '−B/.12.50'); assert.equal(fmt(0), 'B/.0.00');
});

test('validarContribuyente: formato de RUC y DV', () => {
  assert.equal(validarContribuyente({ nombre: 'Ana', ruc: '8-123-4567', dv: '07' }).ok, true);
  assert.equal(validarContribuyente({ nombre: 'Ana', ruc: '1556789-1-2018', dv: '41' }).ok, true);
  const mal = validarContribuyente({ nombre: '', ruc: '12345', dv: '7' });
  assert.equal(mal.ok, false); assert.ok(mal.errores.nombre && mal.errores.ruc && mal.errores.dv);
  assert.ok(validarContribuyente({ nombre: 'A', ruc: '8-123-4567', dv: '123' }).errores.dv);
});

test('medidor: amarillo desde el 80 %, rojo al superar el límite', () => {
  assert.equal(nivel(28799, 36000), 'ok'); assert.equal(nivel(28800, 36000), 'aviso');
  assert.equal(nivel(36000, 36000), 'aviso'); assert.equal(nivel(36000.01, 36000), 'excedido');
  assert.equal(nivel(79, 100), 'ok'); assert.equal(nivel(80, 100), 'aviso'); assert.equal(nivel(101, 100), 'excedido');
});

const estado = crearEstadoInicial();
const hoy = todayKey();

test('semilla: 30 productos, 60 ventas del mes, 2 rechazos y 1 nota de crédito por negocio', () => {
  for (const n of Object.values(estado.negocios)) {
    assert.equal(n.productos.length, 30, n.id);
    for (const t of [0, 7, 10, 15]) assert.ok(n.productos.some((p) => p.tasa === t), `${n.id} tiene tasa ${t}`);
    const mes = n.documentos.filter((d) => d.fecha.startsWith(hoy.slice(0, 7)));
    assert.equal(mes.filter((d) => d.tipo === 'factura' && d.estado === 'autorizada').length, 60, `${n.id} ventas`);
    assert.equal(mes.filter((d) => d.tipo === 'nota_credito').length, 1, `${n.id} nota`);
    assert.equal(mes.reduce((s, d) => s + d.rechazos.length, 0), 2, `${n.id} rechazos`);
    assert.equal(mes.filter((d) => d.estado === 'rechazada').length, 1, `${n.id} rechazo abierto`);
    assert.ok(n.documentos.every((d) => d.fecha <= `${hoy}T23:59`), 'sin fechas futuras');
  }
});

test('semilla: cada negocio muestra un estado distinto del medidor y respeta los límites', () => {
  const m = Object.fromEntries(Object.entries(estado.negocios).map(([k, n]) => [k, calcMedidor(n, hoy)]));
  assert.equal(m.tornillo.nivelAnio, 'ok'); assert.equal(m.ceiba.nivelAnio, 'aviso'); assert.equal(m.brisa.nivelAnio, 'excedido');
  for (const k of Object.keys(m)) assert.ok(m[k].docsMes < 80, `${k} docs ${m[k].docsMes}`);
  assert.ok(Math.abs(m.tornillo.ventasAnio - 21480) < 0.01);
});

test('semilla: los documentos autorizados pasan la validación del PAC (totales)', () => {
  for (const n of Object.values(estado.negocios)) {
    for (const d of n.documentos.filter((x) => x.estado === 'autorizada')) {
      const p = validarDocumento({ ...d, fecha: `${hoy}T10:00` }, hoy);
      assert.equal(p, null, `${d.numero}: ${p?.motivo}`);
      assert.ok(d.cufe && d.protocolo);
    }
  }
});

test('panel y exportación cuadran al centavo (incluida la nota de crédito en negativo)', () => {
  for (const n of Object.values(estado.negocios)) {
    const ym = hoy.slice(0, 7);
    const r = resumenMes(n.documentos, ym, hoy);
    const filas = filasDocumentos(r.docs).filter((f) => f.estado === 'Autorizada');
    const suma = (k) => filas.reduce((s, f) => s + toCents(f[k]), 0);
    assert.equal(suma('total'), toCents(r.totales.total)); assert.equal(suma('itbmsTotal'), toCents(r.totales.itbms)); assert.equal(suma('subtotal'), toCents(r.totales.base));
    assert.equal(r.porDia.reduce((s, d) => s + toCents(d.total), 0), toCents(r.totales.total));
    for (const t of [0, 7, 10, 15]) assert.equal(suma(`itbms${t}`), toCents(r.porTasa[String(t)].itbms));
    assert.equal(Object.values(r.porTasa).reduce((s, v) => s + toCents(v.itbms), 0), toCents(r.totales.itbms));
    const lineas = filasLineas(r.docs).filter((f) => f.estado === 'Autorizada');
    assert.equal(lineas.reduce((s, f) => s + toCents(f.total), 0), toCents(r.totales.total));
    assert.ok(filas.some((f) => f.total < 0), 'hay una nota de crédito negativa');
  }
});

test('CSV: comillas, BOM y protección contra fórmulas', () => {
  const csv = aCsv([{ key: 'a', titulo: 'A', tipo: 'texto' }, { key: 'b', titulo: 'B', tipo: 'dinero' }], [{ a: 'dice "hola", ok', b: 1.5 }, { a: '=SUMA(1)', b: -2 }]);
  assert.ok(csv.startsWith('﻿A,B\r\n'));
  assert.ok(csv.includes('"dice ""hola"", ok",1.50')); assert.ok(csv.includes("'=SUMA(1),-2.00"));
  assert.ok(aCsv(COLUMNAS_DOCUMENTOS, filasDocumentos(estado.negocios.tornillo.documentos.slice(0, 3))).split('\r\n').length >= 4);
});

test('XLSX: archivo ZIP válido con CRC correcto y las hojas esperadas', () => {
  const n = estado.negocios.ceiba; const r = resumenMes(n.documentos, hoy.slice(0, 7), hoy);
  const bytes = libroDelMes(r, r.docs);
  assert.equal(bytes[0], 0x50); assert.equal(bytes[1], 0x4b);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = bytes.length - 22; assert.equal(dv.getUint32(eocd, true), 0x06054b50);
  const entradas = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true); const nombres = [];
  for (let i = 0; i < entradas; i++) {
    assert.equal(dv.getUint32(p, true), 0x02014b50);
    const crc = dv.getUint32(p + 16, true); const tam = dv.getUint32(p + 24, true); const ln = dv.getUint16(p + 28, true); const le = dv.getUint16(p + 30, true); const lc = dv.getUint16(p + 32, true); const off = dv.getUint32(p + 42, true);
    nombres.push(new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + ln)));
    const lnLocal = dv.getUint16(off + 26, true); const leLocal = dv.getUint16(off + 28, true);
    const datos = bytes.subarray(off + 30 + lnLocal + leLocal, off + 30 + lnLocal + leLocal + tam);
    assert.equal(crc32(datos), crc, nombres.at(-1));
    p += 46 + ln + le + lc;
  }
  for (const f of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/styles.xml', 'xl/worksheets/sheet4.xml']) assert.ok(nombres.includes(f), f);
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});

test('datos ficticios: CUFE de 64 hex, QR 29×29 con cuadros de posición, todo determinista', () => {
  assert.match(cufeFicticio('x'), /^[0-9A-F]{64}$/); assert.equal(cufeFicticio('x'), cufeFicticio('x')); assert.notEqual(cufeFicticio('x'), cufeFicticio('y'));
  const m = qrMatrix('x'); assert.equal(m.length, 29);
  assert.ok(m[0][0] && m[0][6] && m[6][0] && m[3][3] && !m[1][1]);
});

test('RUC: formatos válidos por tipo de contribuyente; "155-1-2" ya no pasa', () => {
  for (const ruc of ['8-123-4567', 'PE-12-3456', 'E-8-123456', '1556789-1-2018', '15567-1-2018']) {
    assert.equal(validarContribuyente({ nombre: 'A', ruc, dv: '07' }).ok, true, ruc);
  }
  for (const ruc of ['155-1-2', '12345', '8-123', '--', 'ABC-1-2', '8-12345-1']) {
    const r = validarContribuyente({ nombre: 'A', ruc, dv: '07' });
    assert.equal(r.ok, false, ruc); assert.match(r.errores.ruc, /Ejemplos/);
  }
});

test('teléfono de WhatsApp: vacío vale, 7 a 15 dígitos, sin letras', () => {
  assert.equal(validarTelefono('').ok, true); assert.equal(validarTelefono(undefined).ok, true);
  assert.deepEqual(validarTelefono(' +507 6123-4567 '), { ok: true, valor: '+507 6123-4567' });
  for (const t of ['123', 'abc', '+507 61a3-4567', '1234567890123456']) assert.equal(validarTelefono(t).ok, false, t);
});

test('redondeo: la regla "base" calcula el ITBMS una vez por tasa y puede diferir por centavos', () => {
  const lineas = Array.from({ length: 3 }, (_, i) => ({ codigo: `X${i}`, descripcion: 'x', precio: 0.5, cantidad: 1, tasa: 7 }));
  const porLinea = calcDocumento(lineas);
  const porBase = calcDocumento(lineas, 'base');
  assert.equal(porLinea.itbmsTotal, 0.12); assert.equal(porBase.itbmsTotal, 0.11);
  assert.equal(porLinea.subtotal, porBase.subtotal);
  for (const d of [porLinea, porBase]) {
    assert.equal(toCents(d.total), toCents(d.subtotal) + toCents(d.itbmsTotal));
    assert.equal(Object.values(d.itbmsPorTasa).reduce((s, v) => s + toCents(v), 0), toCents(d.itbmsTotal));
  }
  assert.equal(totalDeLineas(lineas, 'base'), porBase.total);
});

test('semilla: numeración por punto y tipo, de 1 en adelante, en orden cronológico y sin huecos', () => {
  for (const n of Object.values(estado.negocios)) {
    for (const p of n.puntos) {
      for (const tipo of ['factura', 'nota_credito', 'nota_debito']) {
        const docs = n.documentos.filter((d) => d.punto === p.codigo && d.tipo === tipo);
        const nums = docs.map((d) => Number(d.numero.split('-').pop())).sort((a, b) => a - b);
        assert.deepEqual(nums, nums.map((_, i) => i + 1), `${n.id} ${p.codigo} ${tipo}`);
        assert.equal(p.consecutivos[tipo], docs.length, `${n.id} ${p.codigo} ${tipo} contador`);
        assert.ok(docs.every((d) => d.numero.startsWith(`${p.codigo}-`)));
        const porFecha = [...docs].sort((a, b) => -masReciente(a, b));
        assert.deepEqual(porFecha.map((d) => d.numero), [...docs].sort((a, b) => Number(a.numero.split('-').pop()) - Number(b.numero.split('-').pop())).map((d) => d.numero), `${n.id} ${p.codigo} ${tipo} cronológico`);
      }
    }
    for (const d of n.documentos.filter((x) => x.documentoReferenciaId)) {
      assert.equal(d.documentoReferenciaNumero, n.documentos.find((x) => x.id === d.documentoReferenciaId).numero);
    }
    assert.equal(new Set(n.documentos.map((d) => d.id)).size, n.documentos.length, 'ids únicos');
  }
});

test('semilla: el historial del rechazo explica el motivo y qué se cambió al corregirlo', () => {
  for (const n of Object.values(estado.negocios)) {
    const corregido = n.documentos.find((d) => d.rechazos.some((r) => r.corregido));
    assert.deepEqual(corregido.historial.map((h) => h.estado), ['generada', 'enviada', 'rechazada', 'generada', 'enviada', 'autorizada'], n.id);
    assert.match(corregido.historial[2].motivo, /^DV \d{2} no válido/);
    assert.match(corregido.historial[3].cambio, /^DV \d{2} → \d{2}$/);
    const abierto = n.documentos.find((d) => d.estado === 'rechazada');
    assert.ok(abierto.historial.at(-1).motivo, n.id);
    assert.equal(n.emisor.reglaRedondeo, 'linea'); assert.equal(n.prospecto, null);
    assert.ok(n.documentos.every((d) => d.fecha.length === 19), 'todas las fechas llevan segundos');
  }
});

test('masReciente y numeroConTipo: orden por fecha con segundos y número siempre con su tipo (FAC-RNF-06, FAC-RF-13)', () => {
  const a = { fecha: '2026-11-10T10:05:30', numero: 'PF1-000009' };
  const b = { fecha: '2026-11-10T10:05:10', numero: 'PF1-000010' };
  const c = { fecha: '2026-11-10T10:05', numero: 'PF1-000011' };
  assert.deepEqual([b, a, c].sort(masReciente).map((d) => d.numero), ['PF1-000009', 'PF1-000010', 'PF1-000011'], 'del más reciente al más antiguo; sin segundos cuenta como :00');
  const mismo = [{ fecha: '2026-11-10T10:05:10', numero: 'PF1-000002' }, { fecha: '2026-11-10T10:05:10', numero: 'PF1-000003' }];
  assert.equal([...mismo].sort(masReciente)[0].numero, 'PF1-000003', 'en empate gana el número mayor');
  assert.equal(numeroConTipo({ tipo: 'nota_credito', numero: 'PF1-000002' }), 'NC · PF1-000002');
  assert.equal(numeroConTipo({ tipo: 'factura', numero: 'WEB-000007' }), 'FAC · WEB-000007');
  assert.equal(numeroConTipo({ tipo: 'nota_debito', numero: 'PF2-000001' }), 'ND · PF2-000001');
});
