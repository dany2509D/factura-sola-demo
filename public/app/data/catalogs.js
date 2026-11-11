// Los tres negocios ficticios de la demo y sus catálogos (30 productos cada uno).
// Las tasas de ITBMS por producto son DE EJEMPLO para mostrar las cuatro tasas; no son una
// clasificación fiscal. Validar con la ficha técnica de la DGI antes de usarlas en serio.

/** [código, descripción, categoría, precio, tasa ITBMS] */
const TORNILLO = [
  ['TOR-001', 'Martillo de uña 16 oz', 'Herramientas', 8.95, 7],
  ['TOR-002', 'Destornillador plano 6"', 'Herramientas', 3.5, 7],
  ['TOR-003', 'Destornillador Phillips 6"', 'Herramientas', 3.5, 7],
  ['TOR-004', 'Alicate universal 8"', 'Herramientas', 7.25, 7],
  ['TOR-005', 'Llave ajustable 10"', 'Herramientas', 9.8, 7],
  ['TOR-006', 'Cinta métrica 5 m', 'Herramientas', 4.75, 7],
  ['TOR-007', 'Nivel de burbuja 24"', 'Herramientas', 8.4, 7],
  ['TOR-008', 'Serrucho 20"', 'Herramientas', 9.95, 7],
  ['TOR-009', 'Tornillos para madera 1½" (caja de 100)', 'Fijación', 4.2, 7],
  ['TOR-010', 'Clavos de 2½" (libra)', 'Fijación', 1.25, 7],
  ['TOR-011', 'Pernos galvanizados ½" (unidad)', 'Fijación', 0.65, 7],
  ['TOR-012', 'Tacos plásticos (bolsa de 50)', 'Fijación', 2.3, 7],
  ['TOR-013', 'Cemento gris 94 lb', 'Construcción', 9.6, 7],
  ['TOR-014', 'Block de 4" (unidad)', 'Construcción', 0.95, 7],
  ['TOR-015', 'Varilla corrugada ½" (barra)', 'Construcción', 6.8, 7],
  ['TOR-016', 'Arena lavada (saco)', 'Construcción', 2.5, 7],
  ['TOR-017', 'Pintura látex blanco (galón)', 'Construcción', 21.9, 7],
  ['TOR-018', 'Brocha de 3"', 'Construcción', 3.1, 7],
  ['TOR-019', 'Rodillo de 9" con bandeja', 'Construcción', 5.75, 7],
  ['TOR-020', 'Cable THHN #12 (metro)', 'Eléctrico', 0.85, 7],
  ['TOR-021', 'Tomacorriente doble', 'Eléctrico', 2.4, 7],
  ['TOR-022', 'Interruptor sencillo', 'Eléctrico', 1.9, 7],
  ['TOR-023', 'Bombillo LED 9 W', 'Eléctrico', 2.25, 7],
  ['TOR-024', 'Tubo PVC ½" (6 m)', 'Plomería', 4.9, 7],
  ['TOR-025', 'Llave de lavamanos', 'Plomería', 6.3, 7],
  ['TOR-026', 'Fertilizante 15-15-15 (saco de 50 lb)', 'Jardín', 24, 0],
  ['TOR-027', 'Semilla de maíz (libra)', 'Jardín', 1.8, 0],
  ['TOR-028', 'Ron nacional 750 ml', 'Kiosco', 11.5, 10],
  ['TOR-029', 'Cerveza nacional (lata)', 'Kiosco', 1.1, 10],
  ['TOR-030', 'Cigarrillos (cajetilla)', 'Kiosco', 4.25, 15],
];

const CEIBA = [
  ['CAF-001', 'Espresso', 'Cafés', 1.75, 7],
  ['CAF-002', 'Americano', 'Cafés', 2, 7],
  ['CAF-003', 'Capuchino', 'Cafés', 3.25, 7],
  ['CAF-004', 'Latte', 'Cafés', 3.5, 7],
  ['CAF-005', 'Café de la casa (taza)', 'Cafés', 1.5, 7],
  ['CAF-006', 'Frappé de café', 'Cafés', 4.25, 7],
  ['CAF-007', 'Té chai', 'Bebidas', 3, 7],
  ['CAF-008', 'Chocolate caliente', 'Bebidas', 3.25, 7],
  ['CAF-009', 'Jugo natural de naranja', 'Bebidas', 3.5, 7],
  ['CAF-010', 'Limonada', 'Bebidas', 2.75, 7],
  ['CAF-011', 'Agua embotellada', 'Bebidas', 1.25, 7],
  ['CAF-012', 'Desayuno típico', 'Desayunos', 6.5, 7],
  ['CAF-013', 'Sándwich de pollo', 'Desayunos', 5.95, 7],
  ['CAF-014', 'Tostada con aguacate', 'Desayunos', 5.25, 7],
  ['CAF-015', 'Hojaldre de queso', 'Desayunos', 1.4, 7],
  ['CAF-016', 'Empanada de carne', 'Desayunos', 1.75, 7],
  ['CAF-017', 'Arroz con pollo', 'Almuerzos', 7.5, 7],
  ['CAF-018', 'Sancocho de gallina', 'Almuerzos', 8.25, 7],
  ['CAF-019', 'Ensalada de la casa', 'Almuerzos', 6.25, 7],
  ['CAF-020', 'Hamburguesa Ceiba', 'Almuerzos', 8.95, 7],
  ['CAF-021', 'Tres leches (porción)', 'Postres', 3.95, 7],
  ['CAF-022', 'Brownie', 'Postres', 2.95, 7],
  ['CAF-023', 'Flan de coco', 'Postres', 3.25, 7],
  ['CAF-024', 'Pan francés (bolsa de 6)', 'Despensa', 1.5, 0],
  ['CAF-025', 'Leche fresca 1 L', 'Despensa', 1.95, 0],
  ['CAF-026', 'Huevos (docena)', 'Despensa', 3.4, 0],
  ['CAF-027', 'Café en grano 12 oz (bolsa)', 'Despensa', 9.5, 7],
  ['CAF-028', 'Cerveza nacional', 'Licores', 2.5, 10],
  ['CAF-029', 'Copa de vino', 'Licores', 5.5, 10],
  ['CAF-030', 'Cigarro artesanal', 'Licores', 6, 15],
];

const BRISA = [
  ['BRI-001', 'Café de altura 12 oz', 'Café y dulces', 11.9, 7],
  ['BRI-002', 'Café de especialidad 8 oz', 'Café y dulces', 24, 7],
  ['BRI-003', 'Chocolate artesanal 70 %', 'Café y dulces', 4.5, 7],
  ['BRI-004', 'Miel de abeja 8 oz', 'Café y dulces', 6.75, 0],
  ['BRI-005', 'Panela (unidad)', 'Café y dulces', 1.25, 0],
  ['BRI-006', 'Dulce de leche casero', 'Café y dulces', 3.95, 7],
  ['BRI-007', 'Mola pequeña bordada', 'Artesanías', 18, 7],
  ['BRI-008', 'Mola decorativa grande', 'Artesanías', 45, 7],
  ['BRI-009', 'Sombrero pintado (réplica)', 'Artesanías', 38, 7],
  ['BRI-010', 'Bolso de fibra natural', 'Artesanías', 22, 7],
  ['BRI-011', 'Pulsera de semillas', 'Artesanías', 4.5, 7],
  ['BRI-012', 'Imán de recuerdo', 'Artesanías', 2.25, 7],
  ['BRI-013', 'Taza de cerámica', 'Hogar', 8.9, 7],
  ['BRI-014', 'Hamaca artesanal', 'Hogar', 29, 7],
  ['BRI-015', 'Vela aromática de coco', 'Hogar', 9.5, 7],
  ['BRI-016', 'Jabón de coco artesanal', 'Hogar', 3.75, 7],
  ['BRI-017', 'Difusor de bambú', 'Hogar', 12, 7],
  ['BRI-018', 'Mantel bordado', 'Hogar', 19.5, 7],
  ['BRI-019', 'Cojín tejido', 'Hogar', 14, 7],
  ['BRI-020', 'Sombrero de paja', 'Playa', 12.5, 7],
  ['BRI-021', 'Toalla de playa', 'Playa', 11, 7],
  ['BRI-022', 'Protector solar SPF 50', 'Playa', 14.25, 7],
  ['BRI-023', 'Botella térmica', 'Playa', 16, 7],
  ['BRI-024', 'Libro de cuentos panameños', 'Libros', 12, 0],
  ['BRI-025', 'Postales (set de 10)', 'Libros', 5, 7],
  ['BRI-026', 'Ron añejo 8 años 750 ml', 'Licores y tabaco', 28, 10],
  ['BRI-027', 'Ron de caña 375 ml', 'Licores y tabaco', 9.5, 10],
  ['BRI-028', 'Licor de café 500 ml', 'Licores y tabaco', 18, 10],
  ['BRI-029', 'Caja de puros (5 unidades)', 'Licores y tabaco', 32, 15],
  ['BRI-030', 'Canasta de regalo', 'Hogar', 35, 7],
];

const aProductos = (filas) => filas.map(([codigo, descripcion, categoria, precio, tasa]) => ({ codigo, descripcion, categoria, precio, tasa }));

/** Clientes ficticios guardados (contribuyentes). Teléfonos y correos de ejemplo. */
export const CLIENTES_SEMILLA = [
  { id: 'c1', tipo: 'contribuyente', nombre: 'Constructora Los Cedros, S. A.', ruc: '1556789-1-2018', dv: '41', correo: 'compras@loscedros.ejemplo.pa', telefonoWhatsApp: '+507 6000-0001' },
  { id: 'c2', tipo: 'contribuyente', nombre: 'Inversiones Alba, S. A.', ruc: '1698432-1-2020', dv: '09', correo: 'admin@alba.ejemplo.pa', telefonoWhatsApp: '+507 6000-0002' },
  { id: 'c3', tipo: 'contribuyente', nombre: 'Julio Mena (persona natural)', ruc: '8-765-4321', dv: '07', correo: 'julio.mena@ejemplo.pa', telefonoWhatsApp: '+507 6000-0003' },
  { id: 'c4', tipo: 'contribuyente', nombre: 'Taller Mecánico Rivas', ruc: '4-212-3398', dv: '52', correo: 'taller.rivas@ejemplo.pa', telefonoWhatsApp: '+507 6000-0004' },
  { id: 'c5', tipo: 'contribuyente', nombre: 'Restaurante Doña Marta', ruc: '2-518-1145', dv: '16', correo: 'pedidos@donamarta.ejemplo.pa', telefonoWhatsApp: '+507 6000-0005' },
  { id: 'c6', tipo: 'contribuyente', nombre: 'Clínica Veterinaria Pelusa, S. A.', ruc: '1822211-1-2021', dv: '63', correo: 'contabilidad@pelusa.ejemplo.pa', telefonoWhatsApp: '+507 6000-0006' },
];

export const COMPRADORES_TIENDA = [
  ['Camila Ríos', 'camila.rios@ejemplo.com'], ['Andrés Pérez', 'andres.perez@ejemplo.com'], ['Lucía Moreno', 'lucia.moreno@ejemplo.com'],
  ['Mateo Castillo', 'mateo.castillo@ejemplo.com'], ['Valeria Núñez', 'valeria.nunez@ejemplo.com'], ['Diego Samaniego', 'diego.samaniego@ejemplo.com'],
  ['Paula Herrera', 'paula.herrera@ejemplo.com'], ['Sofía Barría', 'sofia.barria@ejemplo.com'],
];

export const NEGOCIOS = {
  tornillo: {
    id: 'tornillo', nombre: 'Ferretería El Tornillo', corto: 'El Tornillo', tipo: 'Venta en mostrador',
    descripcion: 'Materiales de construcción, herramientas y artículos del hogar. Dos cajas en el mostrador.',
    emisor: { razonSocial: 'El Tornillo, S. A.', ruc: '2345678-1-654321', dv: '18', direccion: 'Calle 5.ª Norte, local 12, Ciudad de Panamá' },
    sucursales: [{ id: 's1', nombre: 'Sucursal Central' }, { id: 's2', nombre: 'Sucursal Vía Interamericana' }],
    puntos: [
      { id: 'p1', codigo: 'PF1', nombre: 'Caja 1', sucursalId: 's1' },
      { id: 'p2', codigo: 'PF2', nombre: 'Caja 2', sucursalId: 's1' },
      { id: 'p3', codigo: 'PF3', nombre: 'Caja 1', sucursalId: 's2' },
      { id: 'pw', codigo: 'WEB', nombre: 'Pedidos en línea', sucursalId: 's1', web: true },
    ],
    productos: aProductos(TORNILLO),
    ventasAnioObjetivo: 21480, pctTienda: 0.08, ticket: { min: 1, max: 4, qtyMax: 4 },
  },
  ceiba: {
    id: 'ceiba', nombre: 'Café La Ceiba', corto: 'La Ceiba', tipo: 'Restaurante',
    descripcion: 'Cafetería y almuerzos típicos. Cobro en barra y en el salón, con pedidos para llevar.',
    emisor: { razonSocial: 'Café La Ceiba, S. A.', ruc: '3456789-1-765432', dv: '27', direccion: 'Avenida Central, local 3, Ciudad de Panamá' },
    sucursales: [{ id: 's1', nombre: 'Salón principal' }, { id: 's2', nombre: 'Terraza' }],
    puntos: [
      { id: 'p1', codigo: 'PF1', nombre: 'Caja del salón', sucursalId: 's1' },
      { id: 'p2', codigo: 'PF2', nombre: 'Barra', sucursalId: 's1' },
      { id: 'p3', codigo: 'PF3', nombre: 'Terraza', sucursalId: 's2' },
      { id: 'pw', codigo: 'WEB', nombre: 'Pedidos en línea', sucursalId: 's1', web: true },
    ],
    productos: aProductos(CEIBA),
    ventasAnioObjetivo: 30900, pctTienda: 0.05, ticket: { min: 1, max: 5, qtyMax: 3 },
  },
  brisa: {
    id: 'brisa', nombre: 'Tienda Brisa', corto: 'Brisa', tipo: 'Tienda en línea',
    descripcion: 'Café, artesanías y regalos de Panamá. Casi todo se vende por la tienda en línea.',
    emisor: { razonSocial: 'Brisa Artesanías, S. A.', ruc: '4567890-1-876543', dv: '35', direccion: 'Bodega 7, Zona Libre de ejemplo, Panamá' },
    sucursales: [{ id: 's1', nombre: 'Bodega y envíos' }, { id: 's2', nombre: 'Sucursal showroom' }],
    puntos: [
      { id: 'pw', codigo: 'WEB', nombre: 'Tienda en línea', sucursalId: 's1', web: true },
      { id: 'p1', codigo: 'PF1', nombre: 'Caja del showroom', sucursalId: 's2' },
    ],
    productos: aProductos(BRISA),
    ventasAnioObjetivo: 38750, pctTienda: 0.75, ticket: { min: 1, max: 3, qtyMax: 2 },
  },
};

export const ORDEN_NEGOCIOS = ['tornillo', 'ceiba', 'brisa'];
