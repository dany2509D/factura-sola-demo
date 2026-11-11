// Modo Presentación: el guion de 2 minutos como pasos que ejecutan acciones reales de la demo.
// Cada paso lleva una nota corta de qué se está demostrando. Al retroceder, el paso se repite
// desde el inicio con `instant: true` (sin esperas).
import * as C from './controller.js';
import { neg } from './state.js';
import { EJEMPLO } from './views/medidor.js';
import { enviarPorWhatsApp } from './views/enviar.js';
import { cerrarHojas } from './ui-kit.js';
import { CONTACTO } from './config.js';

const esperarFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 40)));

function irA(hash) {
  if (location.hash === hash) return esperarFrame();
  return new Promise((r) => {
    const f = () => { removeEventListener('hashchange', f); esperarFrame().then(r); };
    addEventListener('hashchange', f);
    location.hash = hash;
  });
}

export function crearGuion() {
  const ctx = { facturaId: null, rechazadaId: null, notaId: null };

  /** Envuelve un paso: cierra hojas abiertas y, si es una repetición, corre sin esperas. */
  const paso = (fn) => async (opts = {}) => {
    cerrarHojas();
    C.fijarVelocidad(opts.instant ? 0 : 1);
    try { await fn(opts); } finally { C.fijarVelocidad(1); }
  };
  const doc = (id) => neg().documentos.find((d) => d.id === id);

  return {
    iniciar() {
      Object.assign(ctx, { facturaId: null, rechazadaId: null, notaId: null });
      C.fijarVelocidad(1);
      C.ponerSinConexion(false);
      C.reiniciarDemo();
      C.seleccionarNegocio('tornillo');
      return irA('#/');
    },
    terminar() { cerrarHojas(); C.fijarVelocidad(1); C.ponerSinConexion(false); },
    pasos: [
      {
        title: '¿Ya pasó el tope del facturador gratuito?',
        note: 'Ponemos las cifras del prospecto: B/.30,200 al año y 86 documentos al mes. Las dos barras pasan a ámbar: está cerca del límite de B/.36,000 y 100 documentos.',
        highlight: ['.portada__medidor .medidor'], dwell: 6500,
        run: paso(async () => { await irA('#/'); C.fijarMedidor({ ventasAnio: EJEMPLO.cerca.ventasAnio, docsMes: EJEMPLO.cerca.docsMes }); }),
      },
      {
        title: 'Si lo supera…',
        note: 'Con B/.41,500 y 118 documentos pasa a rojo: "Debe emitir mediante un PAC o un sistema certificado". Aquí entra Panacea.',
        highlight: ['.veredicto'], dwell: 6000,
        run: paso(async () => { await irA('#/'); C.fijarMedidor({ ventasAnio: EJEMPLO.pasado.ventasAnio, docsMes: EJEMPLO.pasado.docsMes }); }),
      },
      {
        title: 'Cobramos tres artículos con distinta tasa de ITBMS',
        note: 'Un martillo (7 %), dos sacos de fertilizante (0 %) y una botella de ron (10 %), a un cliente con RUC. Cada línea calcula su ITBMS y el total siempre cuadra.',
        highlight: ['.panel-venta'], dwell: 6500,
        run: paso(async () => {
          C.restaurarMedidor();
          await irA('#/venta');
          C.vaciarCarrito(); C.nuevaVenta();
          C.agregarAlCarrito('TOR-001'); C.agregarAlCarrito('TOR-026', 2); C.agregarAlCarrito('TOR-028');
          C.elegirClienteGuardado('c1'); C.fijarMetodoPago('tarjeta'); C.fijarSimulacion('ninguna');
        }),
      },
      {
        title: 'Cobrar: la factura sale sola',
        note: 'Pasa de Generada a Enviada y a Autorizada en segundos, sin digitar nada dos veces. Queda con CUFE, protocolo, QR y el comprobante (CAFE), todo ficticio.',
        highlight: ['.pasos', '.cafe'], dwell: 7000,
        run: paso(async () => {
          await irA('#/venta');
          const r = C.cobrar(); ctx.facturaId = r.id; await r.listo; await esperarFrame();
        }),
      },
      {
        title: 'Llega al cliente por WhatsApp o correo',
        note: 'El comprobante sale solo, sin papel. Aquí la simulación de WhatsApp: no se conecta a ningún WhatsApp real.',
        highlight: [], dwell: 7000,
        run: paso(async () => { await irA('#/venta'); C.mostrarEmision(ctx.facturaId); const d = doc(ctx.facturaId); if (d) enviarPorWhatsApp(d, neg()); }),
      },
      {
        title: '"Simular rechazo": un DV equivocado',
        note: 'Para mostrar qué pasa cuando algo sale mal: el PAC rechaza la factura y explica el motivo en lenguaje claro, sin códigos de error.',
        highlight: ['.corrector'], dwell: 6500,
        run: paso(async () => {
          await irA('#/venta'); C.nuevaVenta(); C.vaciarCarrito();
          C.agregarAlCarrito('TOR-005'); C.elegirClienteGuardado('c1'); C.fijarSimulacion('ruc_dv');
          const r = C.cobrar(); ctx.rechazadaId = r.id; await r.listo; await esperarFrame();
        }),
      },
      {
        title: 'Se corrige y se reenvía',
        note: 'Se vuelve a poner el DV correcto y se reenvía: queda autorizada. El rechazo y su corrección quedan anotados para el contador.',
        highlight: ['.cafe'], dwell: 6000,
        run: paso(async () => {
          await irA('#/venta'); C.mostrarEmision(ctx.rechazadaId);
          const d = doc(ctx.rechazadaId); if (!d || d.estado !== 'rechazada') return;
          const guardado = neg().clientes.find((c) => c.ruc === d.cliente.ruc);
          const r = C.corregirYReenviar(d.id, { ruc: d.cliente.ruc, dv: guardado?.dv ?? d.simulacion?.dvCorrecto });
          await r.listo; await esperarFrame();
        }),
      },
      {
        title: 'Una devolución: nota de crédito',
        note: 'Desde la factura autorizada se eligen los artículos que se devuelven y se emite la nota de crédito, ligada a la factura y con su propia autorización.',
        highlight: ['.form-nota'], dwell: 6500,
        run: paso(async () => {
          C.nuevaVenta();
          await irA(`#/documentos/${ctx.facturaId}`);
          document.querySelector('.detalle__notas button[aria-expanded="false"]')?.click();
          await esperarFrame();
          const entrada = document.querySelector('.form-nota input[type="number"]:not([disabled])');
          if (entrada) { entrada.value = '1'; entrada.dispatchEvent(new Event('input', { bubbles: true })); }
        }),
      },
      {
        title: 'La nota queda ligada a la factura',
        note: 'La nota de crédito resta en el panel del contador y aparece enlazada desde la factura original.',
        highlight: ['.cafe', '.detalle__cab'], dwell: 6000,
        run: paso(async () => {
          const f = doc(ctx.facturaId);
          const lineas = f.lineas.map((l) => ({ codigo: l.codigo, cantidad: 0 }));
          lineas[0].cantidad = 1; // la misma línea que se marcó en el formulario del paso anterior
          const r = C.emitirNotaCredito(ctx.facturaId, lineas, 'Devolución de mercancía');
          if (r.ok) { ctx.notaId = r.id; await irA(`#/documentos/${r.id}`); await r.listo; await esperarFrame(); }
        }),
      },
      {
        title: 'Un pedido de la tienda en línea se factura solo',
        note: 'Entra un pedido desde la tienda simulada y aparece facturado, con origen "tienda", sin que nadie lo toque.',
        highlight: ['.tienda__negocio'], dwell: 6500,
        run: paso(async () => { await irA('#/tienda'); const r = C.pedidoDeTienda(); await r.listo; await esperarFrame(); }),
      },
      {
        title: 'Se cae el internet y se sigue vendiendo',
        note: 'Con "Simular caída de internet" las ventas quedan "En cola" y la caja no se detiene. Arriba se ve cuántas faltan por enviar.',
        highlight: ['.estado-conexion', '.cola-banner'], dwell: 7000,
        run: paso(async () => {
          await irA('#/venta');
          C.ponerSinConexion(true);
          for (const cod of ['TOR-010', 'TOR-018']) { C.nuevaVenta(); C.vaciarCarrito(); C.agregarAlCarrito(cod); const r = C.cobrar(); await r.listo; }
          await irA('#/documentos');
        }),
      },
      {
        title: 'Vuelve la conexión: se envían solas',
        note: 'Al volver internet, las ventas en cola se envían solas al PAC y el contador baja a cero.',
        highlight: ['.estado-conexion', '.tabla--docs'], dwell: 7000,
        run: paso(async () => { await irA('#/documentos'); C.ponerSinConexion(false); await C.vaciarCola(); await esperarFrame(); }),
      },
      {
        title: 'El contador recibe todo ordenado',
        note: 'Ventas por día, ITBMS por tasa, facturas, notas y rechazos con su motivo, con filtro por mes. Los totales cuadran al centavo con los documentos.',
        highlight: ['.admin__rejilla'], dwell: 7000,
        run: paso(async () => { await irA('#/admin'); await esperarFrame(); }),
      },
      {
        title: 'Y se lo lleva a Excel',
        note: 'Exportación a Excel o CSV, con una fila por documento y por línea. Las notas de crédito van en negativo.',
        highlight: ['.exportar'], dwell: 5500,
        run: paso(async () => { await irA('#/admin'); }),
      },
      {
        title: 'Cierre',
        note: 'Esto mismo, conectado al PAC que usted elija y a su sistema actual. Agende un diagnóstico gratis de 30 minutos.',
        highlight: [], dwell: 6000,
        link: { href: CONTACTO.whatsapp, label: 'Agende un diagnóstico gratis por WhatsApp' },
        run: paso(async () => { await irA('#/'); }),
      },
    ],
  };
}

