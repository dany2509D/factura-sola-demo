import test from 'node:test';
import assert from 'node:assert/strict';
import { cargar, neg, getState } from '../public/app/state.js';
import * as C from '../public/app/controller.js';
import { calcMedidor } from '../public/app/meter.js';
import { estadoVivo, fijarVivo, fijarIntervalo } from '../public/app/vivo.js';
import { INTERVALO_VIVO_DEFECTO } from '../public/app/config.js';
import { todayKey } from '../public/shared/time/panama.js';

cargar();
C.fijarVelocidad(0);
const doc = (id) => neg().documentos.find((d) => d.id === id);

test('cobrar sin artículos o con RUC inválido no emite nada', () => {
  const antes = neg().documentos.length;
  assert.equal(C.cobrar().ok, false);
  C.agregarAlCarrito('TOR-001');
  C.fijarCliente({ modo: 'ruc', nombre: 'Ana', ruc: '12345', dv: '7' });
  const r = C.cobrar();
  assert.equal(r.ok, false); assert.ok(r.errores.ruc && r.errores.dv);
  assert.equal(neg().documentos.length, antes);
  C.vaciarCarrito();
});

test('venta normal: Generada → Enviada → Autorizada con CUFE y protocolo', async () => {
  C.agregarAlCarrito('TOR-001'); C.agregarAlCarrito('TOR-026', 2); C.agregarAlCarrito('TOR-028');
  const r = C.cobrar(); assert.ok(r.ok);
  assert.equal(doc(r.id).estado, 'generada');
  await r.listo;
  const d = doc(r.id);
  assert.equal(d.estado, 'autorizada'); assert.match(d.cufe, /^[0-9A-F]{64}$/); assert.match(d.protocolo, /^\d{12}$/);
  assert.deepEqual(d.historial.map((h) => h.estado), ['generada', 'enviada', 'autorizada']);
  assert.ok(d.itbmsPorTasa['0'] === 0 && d.itbmsPorTasa['7'] > 0 && d.itbmsPorTasa['10'] > 0);
  assert.equal(getState()._ui.carritos.tornillo.lineas.length, 0, 'el carrito queda vacío');
});

test('rechazo por DV equivocado y corrección', async () => {
  C.agregarAlCarrito('TOR-005'); C.elegirClienteGuardado('c1'); C.fijarSimulacion('ruc_dv');
  const r = C.cobrar(); assert.ok(r.ok); await r.listo;
  let d = doc(r.id);
  assert.equal(d.estado, 'rechazada'); assert.match(d.rechazos[0].motivo, /DV/); assert.notEqual(d.cliente.dv, '41');
  const mal = C.corregirYReenviar(r.id, { ruc: d.cliente.ruc, dv: '7' }); assert.equal(mal.ok, false);
  const otra = C.corregirYReenviar(r.id, { ruc: d.cliente.ruc, dv: '99' }); await otra.listo;
  d = doc(r.id); assert.equal(d.estado, 'rechazada', 'un DV que tampoco coincide vuelve a rechazarse');
  assert.equal(d.rechazos.length, 1, 'no duplica el rechazo del mismo tipo');
  const ok = C.corregirYReenviar(r.id, { ruc: d.cliente.ruc, dv: '41' }); await ok.listo;
  d = doc(r.id); assert.equal(d.estado, 'autorizada'); assert.equal(d.rechazos[0].corregido, true);
});

test('rechazo por totales y por fecha se corrigen', async () => {
  C.agregarAlCarrito('TOR-002'); C.fijarSimulacion('totales');
  let r = C.cobrar(); await r.listo;
  assert.equal(doc(r.id).estado, 'rechazada'); assert.match(doc(r.id).rechazos[0].motivo, /no cuadran/);
  await C.corregirYReenviar(r.id, { recalcular: true }).listo;
  assert.equal(doc(r.id).estado, 'autorizada');

  C.agregarAlCarrito('TOR-003'); C.fijarSimulacion('fecha');
  r = C.cobrar(); await r.listo;
  assert.equal(doc(r.id).estado, 'rechazada'); assert.match(doc(r.id).rechazos[0].motivo, /fecha/);
  await C.corregirYReenviar(r.id, { fechaHoy: true }).listo;
  assert.equal(doc(r.id).estado, 'autorizada');
});

test('simular RUC inválido con consumidor final explica qué hacer', () => {
  C.agregarAlCarrito('TOR-002'); C.fijarSimulacion('ruc_dv'); C.fijarCliente({ modo: 'consumidor' });
  const r = C.cobrar(); assert.equal(r.ok, false); assert.ok(r.errores.simulacion);
  C.vaciarCarrito();
});

test('nota de crédito parcial, límite de devolución y nota de débito', async () => {
  C.agregarAlCarrito('TOR-004', 3); const r = C.cobrar(); await r.listo;
  const f = doc(r.id);
  const antes = calcMedidor(neg(), todayKey());
  const nc = C.emitirNotaCredito(f.id, [{ codigo: 'TOR-004', cantidad: 2 }], 'Producto con falla'); assert.ok(nc.ok); await nc.listo;
  const nota = doc(nc.id);
  assert.equal(nota.estado, 'autorizada'); assert.equal(nota.documentoReferenciaId, f.id); assert.equal(nota.lineas[0].cantidad, 2);
  const exceso = C.emitirNotaCredito(f.id, [{ codigo: 'TOR-004', cantidad: 2 }], 'Devolución de mercancía');
  assert.equal(exceso.ok, false); assert.match(exceso.error, /quedan 1/);
  const todo = C.emitirNotaCredito(f.id, [{ codigo: 'TOR-004', cantidad: 1 }], 'Devolución de mercancía'); assert.ok(todo.ok); await todo.listo;
  const nd = C.emitirNotaDebito(f.id, { concepto: 'Flete adicional', monto: 5, tasa: 7, motivo: 'Cargo adicional' }); assert.ok(nd.ok); await nd.listo;
  assert.equal(doc(nd.id).total, 5.35);
  assert.equal(C.emitirNotaCredito(nota.id, [{ codigo: 'TOR-004', cantidad: 1 }], 'x').ok, false, 'no se emite nota sobre una nota');
  const despues = calcMedidor(neg(), todayKey());
  assert.equal(despues.docsMes, antes.docsMes + 3);
});

test('pedido de la tienda: se factura solo, con origen "tienda"', async () => {
  const r = C.pedidoDeTienda(); await r.listo;
  const d = doc(r.id);
  assert.equal(d.origen, 'tienda'); assert.equal(d.estado, 'autorizada'); assert.match(d.pedidoTienda, /^T-\d+$/); assert.equal(d.punto, 'WEB');
});

test('sin conexión: las ventas quedan en cola y se envían solas al volver', async () => {
  C.ponerSinConexion(true);
  const ids = [];
  for (const cod of ['TOR-010', 'TOR-011', 'TOR-012']) { C.agregarAlCarrito(cod); const r = C.cobrar(); await r.listo; ids.push(r.id); }
  assert.ok(ids.every((id) => doc(id).estado === 'en_cola')); assert.equal(C.enCola().length, 3);
  assert.ok(doc(ids[0]).numero < doc(ids[2]).numero, 'ya tienen número');
  const pedido = C.pedidoDeTienda(); await pedido.listo; assert.equal(doc(pedido.id).estado, 'en_cola');
  assert.equal(C.enCola().length, 4);
  C.ponerSinConexion(false);
  await C.vaciarCola();
  for (let i = 0; i < 20 && C.enColaTotal() > 0; i++) await new Promise((r) => setTimeout(r, 5));
  assert.equal(C.enColaTotal(), 0);
  assert.ok([...ids, pedido.id].every((id) => doc(id).estado === 'autorizada'));
});

test('medidor en modo prospecto: las cifras escritas quedan fijas aunque se emitan documentos', async () => {
  C.fijarMedidor({ ventasAnio: 35900, docsMes: 99 });
  let m = calcMedidor(neg(), todayKey());
  assert.equal(m.modo, 'prospecto');
  assert.equal(m.ventasAnio, 35900); assert.equal(m.docsMes, 99); assert.equal(m.nivelAnio, 'aviso'); assert.equal(m.nivelDocs, 'aviso');
  C.agregarAlCarrito('TOR-013', 12); const r = C.cobrar(); await r.listo;
  m = calcMedidor(neg(), todayKey());
  assert.equal(m.ventasAnio, 35900, 'una venta nueva no mueve la cifra del prospecto'); assert.equal(m.docsMes, 99); assert.equal(m.nivelAnio, 'aviso');
  C.restaurarMedidor();
  m = calcMedidor(neg(), todayKey());
  assert.equal(m.modo, 'demo'); assert.equal(neg().prospecto, null);
  assert.deepEqual(neg().medidorBase, neg().medidorBaseSemilla, 'volver a los datos de la demo restaura la base');
  assert.ok(m.ventasAnio > 21480, 'en modo demo sí se suman los documentos emitidos');
});

test('medidor: escribir solo una cifra conserva la otra como se veía', () => {
  C.restaurarMedidor();
  const antes = calcMedidor(neg(), todayKey());
  C.fijarMedidor({ ventasAnio: 40000 });
  const m = calcMedidor(neg(), todayKey());
  assert.equal(m.ventasAnio, 40000); assert.equal(m.docsMes, antes.docsMes); assert.equal(m.nivelAnio, 'excedido');
  C.restaurarMedidor();
});

test('numeración por punto y por tipo: cada punto lleva su serie, sin huecos (FAC-RF-13)', async () => {
  const mostrador = neg().puntos.filter((p) => !p.web);
  assert.ok(mostrador.length >= 2);
  const [a, b] = mostrador;
  const sig = (p, tipo) => `${p.codigo}-${String(p.consecutivos[tipo] + 1).padStart(6, '0')}`;
  const esperaA = sig(a, 'factura'); const esperaB = sig(b, 'factura');
  C.fijarPuntoActivo(a.id); C.agregarAlCarrito('TOR-001'); let r = C.cobrar(); await r.listo;
  assert.equal(doc(r.id).numero, esperaA);
  const fa = doc(r.id);
  C.fijarPuntoActivo(b.id); C.agregarAlCarrito('TOR-001'); r = C.cobrar(); await r.listo;
  assert.equal(doc(r.id).numero, esperaB, 'el otro punto sigue su propia serie');
  C.agregarAlCarrito('TOR-001'); r = C.cobrar(); await r.listo;
  assert.equal(doc(r.id).numero, `${b.codigo}-${String(Number(esperaB.slice(-6)) + 1).padStart(6, '0')}`);
  // una nota de crédito tiene su propia serie en el punto donde se emite, no continúa la de facturas
  C.fijarPuntoActivo(a.id);
  const esperaNc = sig(a, 'nota_credito');
  const nc = C.emitirNotaCredito(fa.id, [{ codigo: 'TOR-001', cantidad: 1 }], 'Devolución de mercancía'); assert.ok(nc.ok); await nc.listo;
  assert.equal(doc(nc.id).numero, esperaNc);
  assert.equal(doc(nc.id).documentoReferenciaNumero, fa.numero);
  // todas las series de la demo quedan de 1 a N, sin repetidos
  for (const p of neg().puntos) {
    for (const tipo of ['factura', 'nota_credito', 'nota_debito']) {
      const nums = neg().documentos.filter((d) => d.punto === p.codigo && d.tipo === tipo).map((d) => Number(d.numero.split('-').pop())).sort((x, y) => x - y);
      assert.deepEqual(nums, nums.map((_, i) => i + 1), `${p.codigo} ${tipo}`);
      assert.equal(p.consecutivos[tipo], nums.length);
    }
  }
});

test('el redondeo "base" se aplica a los documentos nuevos y el PAC lo acepta', async () => {
  C.fijarReglaRedondeo('base');
  assert.equal(neg().emisor.reglaRedondeo, 'base');
  C.agregarAlCarrito('TOR-005'); const r = C.cobrar(); await r.listo;
  assert.equal(doc(r.id).reglaRedondeo, 'base'); assert.equal(doc(r.id).estado, 'autorizada');
  C.fijarReglaRedondeo('linea');
  C.agregarAlCarrito('TOR-005'); const s = C.cobrar(); await s.listo;
  assert.equal(doc(s.id).reglaRedondeo, 'linea'); assert.equal(doc(r.id).reglaRedondeo, 'base', 'los documentos viejos conservan su regla');
  C.fijarReglaRedondeo('otra'); assert.equal(neg().emisor.reglaRedondeo, 'linea', 'una regla desconocida se ignora');
});

test('teléfono de WhatsApp: se valida al cobrar y se guarda en el cliente', async () => {
  C.agregarAlCarrito('TOR-002'); C.fijarCliente({ modo: 'ruc', nombre: 'Ana Pérez', ruc: '8-123-4567', dv: '07', telefono: 'abc' });
  let r = C.cobrar(); assert.equal(r.ok, false); assert.ok(r.errores.telefono);
  C.fijarCliente({ telefono: '+507 6123-4567' });
  r = C.cobrar(); assert.ok(r.ok); await r.listo;
  assert.equal(doc(r.id).cliente.telefonoWhatsApp, '+507 6123-4567');
  assert.equal(C.fijarTelefonoDoc(r.id, '12').ok, false);
  assert.equal(C.fijarTelefonoDoc(r.id, '').ok, false, 'al enviar por WhatsApp el número es obligatorio');
  assert.equal(C.fijarTelefonoDoc(r.id, '6999-0000').ok, true); assert.equal(doc(r.id).cliente.telefonoWhatsApp, '6999-0000');
});

test('la corrección de un rechazo deja constancia de qué cambió', async () => {
  C.agregarAlCarrito('TOR-005'); C.elegirClienteGuardado('c1'); C.fijarSimulacion('ruc_dv');
  const r = C.cobrar(); await r.listo;
  const dvMal = doc(r.id).cliente.dv;
  await C.corregirYReenviar(r.id, { ruc: doc(r.id).cliente.ruc, dv: '41' }).listo;
  const h = doc(r.id).historial;
  assert.deepEqual(h.map((x) => x.estado), ['generada', 'enviada', 'rechazada', 'generada', 'enviada', 'autorizada']);
  assert.match(h[2].motivo, /DV/);
  assert.equal(h[3].cambio, `DV ${dvMal} → 41`);
  assert.ok(h.every((x) => x.t.length === 19 || x.t.length === 16));
  assert.equal(doc(r.id).fecha.length, 19, 'la fecha del documento incluye segundos');
});

test('ajustes: emisor válido, puntos y sucursales', () => {
  assert.equal(C.guardarEmisor({ razonSocial: 'X', ruc: 'mal', dv: '1' }).ok, false);
  assert.equal(C.guardarEmisor({ razonSocial: 'El Tornillo, S. A.', ruc: '2345678-1-654321', dv: '18', direccion: '' }).ok, true);
  assert.equal(C.agregarPunto({ codigo: 'pf9', nombre: 'Caja 9', sucursalId: 's1' }).ok, true);
  assert.equal(C.agregarPunto({ codigo: 'PF9', nombre: 'Otra', sucursalId: 's1' }).ok, false);
  assert.equal(C.quitarSucursal('s1').ok, false);
  const id = neg().puntos.find((p) => p.codigo === 'PF9').id;
  C.fijarPuntoActivo(id); assert.equal(neg().puntoActivo, id);
  assert.equal(C.quitarPunto(id).ok, true); assert.notEqual(neg().puntoActivo, id);
  assert.equal(C.quitarPunto(neg().puntos.find((p) => p.web).id).ok, false);
});

test('reiniciar la demo deja exactamente el estado semilla', () => {
  C.reiniciarDemo();
  const n = neg();
  assert.equal(n.documentos.filter((d) => d.estado === 'rechazada').length, 1);
  assert.equal(C.enColaTotal(), 0); assert.equal(getState().offline, false);
  assert.equal(n.documentos.filter((d) => d.fecha.startsWith(todayKey().slice(0, 7)) && d.tipo === 'factura' && d.estado === 'autorizada').length, 60);
});

test('actividad en vivo: apagada por defecto, valida el intervalo y se apaga al reiniciar la demo (FAC-RF-14)', () => {
  assert.equal(estadoVivo().activo, false, 'arranca apagada');
  assert.equal(estadoVivo().intervalo, INTERVALO_VIVO_DEFECTO);
  fijarIntervalo(7); assert.equal(estadoVivo().intervalo, INTERVALO_VIVO_DEFECTO, 'un intervalo fuera de la lista se ignora');
  fijarIntervalo(15); assert.equal(estadoVivo().intervalo, 15);
  fijarVivo(true); assert.equal(estadoVivo().activo, true);
  C.reiniciarDemo();
  assert.equal(estadoVivo().activo, false, 'reiniciar la demo la deja apagada');
  assert.equal(estadoVivo().intervalo, INTERVALO_VIVO_DEFECTO);
  fijarVivo(false); // suelta el temporizador para que el proceso termine
});
