// Exportación a CSV y Excel (.xlsx) sin librerías: el .xlsx se arma a mano (XML + ZIP sin
// compresión). Las filas salen de los mismos documentos y signos que usa el panel, así que los
// totales cuadran al centavo. Las notas de crédito van en negativo.
import { TASAS, TIPOS_DOC, ESTADOS, METODOS_PAGO } from './config.js';
import { signo } from './docs.js';
import { toCents, fromCents } from './money.js';

const firmado = (doc, n) => fromCents(signo(doc) * toCents(n ?? 0));
const metodo = (id) => METODOS_PAGO.find((m) => m.id === id)?.nombre ?? id;

/** [{ key, titulo, tipo: 'texto' | 'dinero' | 'entero', ancho }] */
export const COLUMNAS_DOCUMENTOS = [
  { key: 'tipo', titulo: 'Tipo', tipo: 'texto', ancho: 24 },
  { key: 'numero', titulo: 'Número', tipo: 'texto', ancho: 16 },
  { key: 'fecha', titulo: 'Fecha', tipo: 'texto', ancho: 12 },
  { key: 'hora', titulo: 'Hora', tipo: 'texto', ancho: 8 },
  { key: 'estado', titulo: 'Estado', tipo: 'texto', ancho: 12 },
  { key: 'origen', titulo: 'Origen', tipo: 'texto', ancho: 9 },
  { key: 'punto', titulo: 'Punto de facturación', tipo: 'texto', ancho: 12 },
  { key: 'cliente', titulo: 'Cliente', tipo: 'texto', ancho: 30 },
  { key: 'ruc', titulo: 'RUC', tipo: 'texto', ancho: 18 },
  { key: 'dv', titulo: 'DV', tipo: 'texto', ancho: 5 },
  { key: 'metodoPago', titulo: 'Método de pago', tipo: 'texto', ancho: 14 },
  { key: 'referencia', titulo: 'Documento de referencia', tipo: 'texto', ancho: 16 },
  { key: 'motivoNota', titulo: 'Motivo de la nota', tipo: 'texto', ancho: 28 },
  ...TASAS.map((t) => ({ key: `base${t}`, titulo: `Base ITBMS ${t}%`, tipo: 'dinero', ancho: 14 })),
  ...TASAS.map((t) => ({ key: `itbms${t}`, titulo: `ITBMS ${t}%`, tipo: 'dinero', ancho: 12 })),
  { key: 'subtotal', titulo: 'Subtotal', tipo: 'dinero', ancho: 12 },
  { key: 'itbmsTotal', titulo: 'ITBMS total', tipo: 'dinero', ancho: 12 },
  { key: 'total', titulo: 'Total', tipo: 'dinero', ancho: 12 },
  { key: 'cufe', titulo: 'CUFE (ficticio)', tipo: 'texto', ancho: 68 },
  { key: 'protocolo', titulo: 'Protocolo (ficticio)', tipo: 'texto', ancho: 16 },
];

export const COLUMNAS_LINEAS = [
  { key: 'tipo', titulo: 'Tipo', tipo: 'texto', ancho: 24 },
  { key: 'numero', titulo: 'Número', tipo: 'texto', ancho: 16 },
  { key: 'fecha', titulo: 'Fecha', tipo: 'texto', ancho: 12 },
  { key: 'estado', titulo: 'Estado', tipo: 'texto', ancho: 12 },
  { key: 'linea', titulo: 'Línea', tipo: 'entero', ancho: 7 },
  { key: 'codigo', titulo: 'Código', tipo: 'texto', ancho: 12 },
  { key: 'descripcion', titulo: 'Descripción', tipo: 'texto', ancho: 38 },
  { key: 'cantidad', titulo: 'Cantidad', tipo: 'entero', ancho: 10 },
  { key: 'precio', titulo: 'Precio unitario', tipo: 'dinero', ancho: 14 },
  { key: 'descuentoPct', titulo: 'Descuento %', tipo: 'dinero', ancho: 12 },
  { key: 'tasa', titulo: 'Tasa ITBMS %', tipo: 'entero', ancho: 12 },
  { key: 'base', titulo: 'Base', tipo: 'dinero', ancho: 12 },
  { key: 'itbms', titulo: 'ITBMS', tipo: 'dinero', ancho: 12 },
  { key: 'total', titulo: 'Total de la línea', tipo: 'dinero', ancho: 16 },
];

export function filasDocumentos(docs) {
  return docs.map((d) => {
    const fila = {
      tipo: TIPOS_DOC[d.tipo]?.nombre ?? d.tipo,
      numero: d.numero,
      fecha: d.fecha.slice(0, 10),
      hora: d.fecha.slice(11, 16),
      estado: ESTADOS[d.estado]?.nombre ?? d.estado,
      origen: d.origen === 'tienda' ? 'Tienda' : 'POS',
      punto: d.punto,
      cliente: d.cliente?.nombre ?? '',
      ruc: d.cliente?.ruc ?? '',
      dv: d.cliente?.dv ?? '',
      metodoPago: metodo(d.metodoPago),
      referencia: d.documentoReferenciaNumero ?? '',
      motivoNota: d.motivoNota ?? '',
      subtotal: firmado(d, d.subtotal),
      itbmsTotal: firmado(d, d.itbmsTotal),
      total: firmado(d, d.total),
      cufe: d.cufe ?? '',
      protocolo: d.protocolo ?? '',
    };
    for (const t of TASAS) {
      fila[`base${t}`] = firmado(d, d.basePorTasa?.[String(t)]);
      fila[`itbms${t}`] = firmado(d, d.itbmsPorTasa?.[String(t)]);
    }
    return fila;
  });
}

export function filasLineas(docs) {
  const out = [];
  for (const d of docs) {
    d.lineas.forEach((l, i) => out.push({
      tipo: TIPOS_DOC[d.tipo]?.nombre ?? d.tipo,
      numero: d.numero,
      fecha: d.fecha.slice(0, 10),
      estado: ESTADOS[d.estado]?.nombre ?? d.estado,
      linea: i + 1,
      codigo: l.codigo,
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      precio: l.precio,
      descuentoPct: l.descuentoPct || 0,
      tasa: l.tasa,
      base: firmado(d, l.base),
      itbms: firmado(d, l.itbms),
      total: firmado(d, l.total),
    }));
  }
  return out;
}

export const COLUMNAS_DIA = [
  { key: 'dia', titulo: 'Día', tipo: 'texto', ancho: 12 },
  { key: 'docs', titulo: 'Documentos autorizados', tipo: 'entero', ancho: 22 },
  { key: 'ventas', titulo: 'Ventas (base)', tipo: 'dinero', ancho: 16 },
  { key: 'itbms', titulo: 'ITBMS', tipo: 'dinero', ancho: 12 },
  { key: 'total', titulo: 'Total', tipo: 'dinero', ancho: 12 },
];
export const COLUMNAS_TASA = [
  { key: 'tasa', titulo: 'Tasa ITBMS', tipo: 'texto', ancho: 12 },
  { key: 'base', titulo: 'Base', tipo: 'dinero', ancho: 14 },
  { key: 'itbms', titulo: 'ITBMS', tipo: 'dinero', ancho: 12 },
];

export function filasResumenDia(resumen) { return resumen.porDia.map((r) => ({ ...r })); }
export function filasResumenTasa(resumen) {
  return [
    ...TASAS.map((t) => ({ tasa: `${t}%`, base: resumen.porTasa[String(t)].base, itbms: resumen.porTasa[String(t)].itbms })),
    { tasa: 'Total', base: resumen.totales.base, itbms: resumen.totales.itbms },
  ];
}

// ---------------------------------------------------------------- CSV

const INICIO_PELIGROSO = /^[=+\-@\t\r]/;
function celdaCsv(valor, tipo) {
  if (valor == null) return '';
  if (tipo === 'dinero') return Number(valor).toFixed(2);
  if (tipo === 'entero') return String(valor);
  let s = String(valor);
  if (INICIO_PELIGROSO.test(s)) s = `'${s}`; // evita que Excel lo interprete como fórmula
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV con BOM UTF-8 (para que Excel respete las tildes) y saltos de línea CRLF. */
export function aCsv(columnas, filas) {
  const lineas = [columnas.map((c) => celdaCsv(c.titulo, 'texto')).join(',')];
  for (const f of filas) lineas.push(columnas.map((c) => celdaCsv(f[c.key], c.tipo)).join(','));
  return `﻿${lineas.join('\r\n')}\r\n`;
}

// ---------------------------------------------------------------- XLSX (OOXML + ZIP sin compresión)

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABLA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const enc = new TextEncoder();
const escXml = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]))
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

const colLetra = (i) => { let s = ''; let n = i + 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };

/** ZIP "store" (sin compresión). `archivos`: [{ nombre, datos: Uint8Array }]. */
export function zipSinCompresion(archivos) {
  const DOS_FECHA = ((2026 - 1980) << 9) | (11 << 5) | 10;
  const partes = []; const central = []; let offset = 0;
  const u16 = (n) => [n & 255, (n >>> 8) & 255];
  const u32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  for (const a of archivos) {
    const nombre = enc.encode(a.nombre); const crc = crc32(a.datos); const tam = a.datos.length;
    const local = Uint8Array.from([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(DOS_FECHA), ...u32(crc), ...u32(tam), ...u32(tam), ...u16(nombre.length), ...u16(0)]);
    partes.push(local, nombre, a.datos);
    central.push(Uint8Array.from([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(DOS_FECHA), ...u32(crc), ...u32(tam), ...u32(tam), ...u16(nombre.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), nombre);
    offset += local.length + nombre.length + tam;
  }
  const tamCentral = central.reduce((s, p) => s + p.length, 0);
  const fin = Uint8Array.from([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(archivos.length), ...u16(archivos.length), ...u32(tamCentral), ...u32(offset), ...u16(0)]);
  const todo = [...partes, ...central, fin];
  const out = new Uint8Array(todo.reduce((s, p) => s + p.length, 0));
  let pos = 0; for (const p of todo) { out.set(p, pos); pos += p.length; }
  return out;
}

function xmlHoja(columnas, filas) {
  const cols = columnas.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.ancho || 14}" customWidth="1"/>`).join('');
  const celda = (valor, tipo, ref, estilo) => {
    if (valor == null || valor === '') return '';
    if (tipo === 'texto') return `<c r="${ref}" t="inlineStr"${estilo ? ` s="${estilo}"` : ''}><is><t xml:space="preserve">${escXml(valor)}</t></is></c>`;
    return `<c r="${ref}"${estilo ? ` s="${estilo}"` : ''}><v>${Number(valor)}</v></c>`;
  };
  let filasXml = `<row r="1">${columnas.map((c, i) => celda(c.titulo, 'texto', `${colLetra(i)}1`, 1)).join('')}</row>`;
  filas.forEach((f, r) => {
    const n = r + 2;
    filasXml += `<row r="${n}">${columnas.map((c, i) => celda(f[c.key], c.tipo, `${colLetra(i)}${n}`, c.tipo === 'dinero' ? 2 : 0)).join('')}</row>`;
  });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${filasXml}</sheetData></worksheet>`;
}

/** `hojas`: [{ nombre, columnas, filas }] -> Uint8Array con el contenido de un .xlsx válido. */
export function aXlsx(hojas) {
  const limpio = (n, i) => (String(n).replace(/[\[\]:*?/\\]/g, ' ').trim().slice(0, 31) || `Hoja ${i + 1}`);
  const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const archivos = [
    { nombre: '[Content_Types].xml', texto: `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
    { nombre: '_rels/.rels', texto: `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { nombre: 'xl/workbook.xml', texto: `${XML}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${hojas.map((h, i) => `<sheet name="${escXml(limpio(h.nombre, i))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` },
    { nombre: 'xl/_rels/workbook.xml.rels', texto: `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { nombre: 'xl/styles.xml', texto: `${XML}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>` },
    ...hojas.map((h, i) => ({ nombre: `xl/worksheets/sheet${i + 1}.xml`, texto: xmlHoja(h.columnas, h.filas) })),
  ].map((a) => ({ nombre: a.nombre, datos: enc.encode(a.texto) }));
  return zipSinCompresion(archivos);
}

/** Libro completo del mes: resumen por día, ITBMS por tasa, documentos y líneas. */
export function libroDelMes(resumen, docs) {
  return aXlsx([
    { nombre: 'Ventas por día', columnas: COLUMNAS_DIA, filas: filasResumenDia(resumen) },
    { nombre: 'ITBMS por tasa', columnas: COLUMNAS_TASA, filas: filasResumenTasa(resumen) },
    { nombre: 'Documentos', columnas: COLUMNAS_DOCUMENTOS, filas: filasDocumentos(docs) },
    { nombre: 'Líneas', columnas: COLUMNAS_LINEAS, filas: filasLineas(docs) },
  ]);
}

// ---------------------------------------------------------------- Descarga

export function descargar(nombre, contenido, tipo) {
  try {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre; a.rel = 'noopener';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch { return false; }
}
export const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const TIPO_CSV = 'text/csv;charset=utf-8';
