// Configuración de la demo. Todo lo que dependa de una regla fiscal vive aquí, a la vista, para
// poder ajustarlo sin tocar el resto del código.
//
// VALIDAR CON LA FICHA TÉCNICA DE LA DGI: cada valor marcado así es un supuesto de la demo, no
// una regla confirmada. Ver README, sección "Validar con la ficha técnica de la DGI".

/** Límites del facturador gratuito desde el 1 de enero de 2026 (Resolución DGI 201-6299, según la especificación). */
export const LIMITE_ANUAL = 36000;        // B/. de ingresos brutos al año
export const LIMITE_DOCS_MES = 100;       // documentos al mes
export const UMBRAL_AVISO = 0.8;          // amarillo desde el 80 %; rojo al superar el límite

/** Tasas de ITBMS que admite el catálogo. */
export const TASAS = [0, 7, 10, 15];

/** VALIDAR CON LA FICHA TÉCNICA DE LA DGI: solo se valida el formato, no un dígito verificador. */
export const DV_REGEX = /^\d{2}$/;
/**
 * Patrones de RUC (configurables). VALIDAR CON LA FICHA TÉCNICA DE LA DGI: son formatos de ejemplo
 * para esta demo, no la regla oficial. Un RUC como "155-1-2" no pasa ninguno.
 */
export const PATRONES_RUC = [
  { id: 'natural', nombre: 'Persona natural', regex: /^(?:\d{1,2}|[A-Z]{1,2}|\d{1,2}[A-Z]{1,2})-\d{1,4}-\d{1,6}$/, ejemplo: '8-123-4567' },
  { id: 'juridica', nombre: 'Persona jurídica', regex: /^\d{5,10}-\d{1,4}-\d{4,8}$/, ejemplo: '1556789-1-2018' },
  { id: 'extranjero', nombre: 'Extranjero', regex: /^E-\d{1,4}-\d{1,8}$/, ejemplo: 'E-8-123456' },
];
export const RUC_EJEMPLO = PATRONES_RUC[0].ejemplo;

/** Regla de redondeo del ITBMS: 'linea' (cada línea al centavo y se suman) o 'base' (sobre la base de cada tasa). VALIDAR CON LA FICHA TÉCNICA. */
export const REGLA_REDONDEO_DEFECTO = 'linea';
export const REGLAS_REDONDEO = [
  { id: 'linea', nombre: 'Por línea', detalle: 'Cada línea se redondea al centavo y el ITBMS es la suma de las líneas. El total siempre cuadra con las líneas.' },
  { id: 'base', nombre: 'Sobre la base por tasa', detalle: 'El ITBMS de cada tasa se calcula una sola vez sobre su base. Puede diferir por centavos de la suma de las líneas.' },
];

/** Etiqueta corta del tipo de documento que acompaña al número (FAC-RF-13). */
export const ETIQUETA_TIPO = { factura: 'FAC', nota_credito: 'NC', nota_debito: 'ND' };

/** Actividad en vivo (FAC-RF-14): intervalo por defecto y opciones, en segundos. */
export const INTERVALO_VIVO_DEFECTO = 120;
export const INTERVALOS_VIVO = [15, 30, 60, 120, 300];

/** Contacto (FAC-RF-16). */
export const CONTACTO = {
  whatsapp: 'https://wa.me/50766632666?text=' + encodeURIComponent('Hola, vi la demo Factura sola y quiero un diagnóstico'),
};

/** VALIDAR CON LA FICHA TÉCNICA DE LA DGI: ventana de fechas que acepta el PAC simulado (días hacia atrás y adelante). */
export const FECHA_DIAS_ATRAS = 3;
export const FECHA_DIAS_ADELANTE = 0;
/** Desfase con que "Simular rechazo → fecha fuera de rango" altera la fecha del documento. */
export const FECHA_DESFASE_SIM = 45;

/** Qué cuenta el medidor como "ventas": 'sin_itbms' (base) o 'con_itbms' (total). Editable en Ajustes. */
export const BASE_MEDIDOR_DEFECTO = 'sin_itbms';

export const PACS = [
  { id: 'pac-a', nombre: 'PAC A' },
  { id: 'pac-b', nombre: 'PAC B' },
];

export const METODOS_PAGO = [
  { id: 'efectivo', nombre: 'Efectivo' },
  { id: 'tarjeta', nombre: 'Tarjeta' },
  { id: 'yappy', nombre: 'Yappy' },
  { id: 'ach', nombre: 'ACH' },
];

export const AVISO_SIM = 'Simulación. No se conecta a la DGI ni a ningún PAC. CUFE y protocolos ficticios, sin validez fiscal.';

export const TIPOS_DOC = {
  factura: { nombre: 'Factura de operación interna', corto: 'Factura', signo: 1 },
  nota_credito: { nombre: 'Nota de crédito', corto: 'Nota de crédito', signo: -1 },
  nota_debito: { nombre: 'Nota de débito', corto: 'Nota de débito', signo: 1 },
};

/**
 * Estados del documento. Cada uno lleva un tono (verde, ámbar, azul, rojo o gris) y un ícono, y se ve
 * igual en la lista, el comprobante, la línea de tiempo y el medidor (sección 12 de la especificación).
 */
export const ESTADOS = {
  generada: { nombre: 'Generada', ico: 'file', tono: 'neutro' },
  enviada: { nombre: 'Enviada', ico: 'send', tono: 'info' },
  autorizada: { nombre: 'Autorizada', ico: 'check', tono: 'ok' },
  rechazada: { nombre: 'Rechazada', ico: 'x', tono: 'mal' },
  en_cola: { nombre: 'En cola', ico: 'clock', tono: 'aviso' },
};

/**
 * Marca de cada negocio (color y tinta del texto que va encima). Los mismos valores están en app.css
 * como variables `--marca*` por negocio; los logos los usan tal cual. Contraste AA verificado.
 */
export const MARCAS = {
  tornillo: { color: '#F2B33D', tinta: '#1F2328' },
  ceiba: { color: '#2F6B4F', tinta: '#FFFFFF' },
  brisa: { color: '#1E4E8C', tinta: '#FFFFFF' },
};

/** Negocios cuyo catálogo del punto de venta se muestra en tarjetas con ícono (en vez de lista). */
export const CATALOGO_EN_TARJETAS = ['ceiba'];

export const MOTIVOS_NOTA_CREDITO = ['Devolución de mercancía', 'Producto con falla', 'Error en la cantidad', 'Descuento posterior a la venta'];

export const SIMULACIONES = [
  { id: 'ninguna', nombre: 'No simular (el PAC autoriza)' },
  { id: 'ruc_dv', nombre: 'RUC o DV inválido', requiereRuc: true },
  { id: 'totales', nombre: 'Totales que no cuadran' },
  { id: 'fecha', nombre: 'Fecha fuera de rango' },
];

/** Tiempos de la animación del PAC simulado (ms). Suman menos de 3 s. */
export const TIEMPOS = { aEnviada: 650, aResultado: 1100, entreCola: 450 };

export const STORAGE_KEY = 'factura-sola.v1';
export const VERSION_DATOS = 3; // súbalo cuando cambie la semilla: obliga a recargar los datos de ejemplo
