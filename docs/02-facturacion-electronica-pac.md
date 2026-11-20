# 02 · Facturación electrónica conectada a un PAC (simulada)

Versión 1.2 · 10 de noviembre de 2026 · incluye la revisión de la demo construida (sección 11) y las mejoras visuales (sección 12).

| Campo | Valor |
| --- | --- |
| Subdominio | factura-sola-demo.vercel.app |
| Prefijo | FAC |
| Marcas ficticias | Ferretería El Tornillo (mostrador) · Café La Ceiba (restaurante) · Tienda Brisa (tienda en línea) |
| Producto | Facturación electrónica en Panamá (conexión de punto de venta, ERP o tienda con un PAC) |
| Prospectos | Todos; en especial Casa de Materiales N.G. No. 3, restaurantes, Colegio de Contadores y firmas contables |
| Orden de construcción | 2 |
| Depende de | 00-base-comun.md |
| Estado | Construida (v1). Pendientes de la revisión en la sección 11. |

## 1. Objetivo

Que el dueño vea que cada venta se factura electrónicamente al cobrar, sin digitar dos veces, y que entienda en un minuto si ya pasó el tope del facturador gratuito de la DGI.

**Frase para la reunión:** "Usted cobra; la factura se emite, se autoriza y le llega al cliente sola. Y su contador recibe todo ordenado."

**Contexto normativo usado en la demo:** desde el 1 de enero de 2026 (Resolución DGI 201-6299) el facturador gratuito solo aplica a ingresos brutos de hasta B/.36,000 al año y hasta 100 documentos al mes; quien supere esos límites debe emitir por un PAC o un sistema propio certificado.

## 2. Alcance

**Incluye:** medidor del tope del facturador gratuito, punto de venta, emisión simulada con estados, CUFE y protocolo ficticios, QR y comprobante impreso (CAFE), rechazos con motivo, notas de crédito y débito, pedido de tienda en línea facturado solo, cola sin conexión, panel del contador, ajustes, modo presentación y actividad en vivo controlable.

**No incluye:** conexión real con la DGI ni con ningún PAC, firma electrónica real, validez fiscal, cálculo de impuestos distintos del ITBMS.

## 3. Roles

| Rol | Dónde | Qué hace |
| --- | --- | --- |
| Cajero o vendedor | Punto de venta | Cobra y emite |
| Dueño | Medidor y panel | Ve el tope y las ventas |
| Contador | Panel `#/admin` | Revisa ITBMS, rechazos, notas y exporta |
| Comprador | Comprobante | Recibe el CAFE por WhatsApp o correo |
| Vendedor | Controles de la demo | Presenta, pone las cifras del prospecto y enciende o apaga la actividad en vivo |

## 4. Requerimientos funcionales

| ID | Requerimiento | Prioridad |
| --- | --- | --- |
| FAC-RF-01 | Aviso permanente: "Simulación. No se conecta a la DGI ni a ningún PAC. CUFE y protocolos ficticios, sin validez fiscal." | Must |
| FAC-RF-02 | Medidor en portada: ventas del año contra B/.36,000 y documentos del mes contra 100, con aviso amarillo al 80% y rojo al superar; campos editables para cifras del prospecto. **Cuando el vendedor escribe cifras o elige un ejemplo, el medidor queda en "modo prospecto" y no cambia con las ventas de la demo hasta pulsar "Datos de la demo".** | Must |
| FAC-RF-03 | Selector de negocio (ferretería, café, tienda en línea) con su catálogo. | Should |
| FAC-RF-04 | Punto de venta: catálogo con código, precio y tasa de ITBMS (0%, 7%, 10%, 15%), carrito, descuento por línea, cliente "Consumidor final" o cliente con RUC y DV, método de pago. | Must |
| FAC-RF-05 | Al cobrar, documento "factura de operación interna" enviado al "PAC simulado" con estados animados: Generada → Enviada → Autorizada. | Must |
| FAC-RF-06 | Documento autorizado: CUFE ficticio, número de protocolo de autorización ficticio, fecha y hora, código QR y comprobante impreso (CAFE) para imprimir o enviar por WhatsApp o correo (simulado). | Must |
| FAC-RF-07 | "Simular rechazo": motivo en lenguaje claro (RUC o DV inválido, totales que no cuadran, fecha fuera de rango) y botón para corregir y reenviar. | Must |
| FAC-RF-08 | Nota de crédito ligada a una factura autorizada (devolución parcial o total) y nota de débito. | Should |
| FAC-RF-09 | Pedido de una tienda en línea simulada que se factura solo y aparece en la lista. | Should |
| FAC-RF-10 | "Simular caída de internet": ventas en cola que se envían solas al volver, con contador de pendientes. | Should |
| FAC-RF-11 | Panel del contador: ventas por día, ITBMS por tasa, facturas, notas, rechazos con motivo; filtro por mes; exportación a CSV y Excel. | Must |
| FAC-RF-12 | Ajustes: datos del emisor ficticios (RUC y DV), selector de PAC genérico ("PAC A", "PAC B"), sucursales y puntos de facturación. | Could |
| FAC-RF-13 | Numeración consecutiva propia por punto de facturación y por tipo de documento (factura, nota de crédito, nota de débito). La tienda en línea es su propio punto (WEB). En listas y comprobantes el número siempre va con su tipo, por ejemplo "NC · PF1-000002". Regla exacta de numeración: validar con la ficha técnica de la DGI. | Must |
| FAC-RF-14 | Interruptor "Actividad en vivo" en los controles de la demo: genera ventas de mostrador y pedidos de la tienda a intervalos configurables (por defecto, uno cada 2 minutos). Apagado por defecto fuera del modo presentación. | Must |
| FAC-RF-15 | Teléfono de WhatsApp opcional en el cliente; si falta al pulsar "WhatsApp", se pide en ese momento. Nunca se muestra un número de relleno. | Should |
| FAC-RF-16 | Botón de contacto de la barra superior: abre WhatsApp +507 6663-2666 con el mensaje "Hola, vi la demo Factura sola y quiero un diagnóstico". | Should |
| FAC-RF-17 | Modo restaurante para Café La Ceiba: mesas o cuentas abiertas, propina y división de cuenta. El tratamiento de la propina en la factura electrónica queda configurable y anotado como "validar con la ficha técnica de la DGI". | Should |

## 5. Requerimientos no funcionales específicos

| ID | Requerimiento |
| --- | --- |
| FAC-RNF-01 | Cálculos con redondeo a 2 decimales por línea y por total; la suma de líneas siempre cuadra con el total mostrado. |
| FAC-RNF-02 | Ningún detalle técnico fiscal que no esté en este documento se inventa: lo que falte queda configurable y anotado en el README como "validar con la ficha técnica de la DGI". |
| FAC-RNF-03 | Ningún nombre de PAC real en la interfaz. |
| FAC-RNF-04 | Sin superposiciones ni recortes en 1366 × 768, 1440 × 900, 1920 × 1080, tableta de 768 px y móvil de 375 px. En la portada, por debajo de 1440 px de ancho, el comprobante va debajo del medidor o las barras se achican. |
| FAC-RNF-05 | Regla de redondeo del ITBMS visible y configurable (por línea o sobre la base por tasa). El panel aclara cuál se usa, porque por línea la suma puede diferir por centavos de base × tasa. Validar la regla con la ficha técnica de la DGI. |
| FAC-RNF-06 | Las listas "del más reciente al más antiguo" ordenan por fecha y hora con segundos y, en empate, por número descendente. |

## 6. Modelo de datos

| Entidad | Campos |
| --- | --- |
| emisor | razonSocial, ruc, dv, sucursales[], puntosFacturacion[], pacSeleccionado, reglaRedondeo (linea o base) |
| puntoFacturacion | codigo (PF1, PF2, PF3, WEB), nombre, sucursal, consecutivos {factura, notaCredito, notaDebito} |
| producto | codigo, descripcion, precio, tasaItbms (0, 7, 10, 15), existencias? |
| cliente | tipo (consumidor final o contribuyente), nombre, ruc?, dv?, correo?, telefonoWhatsApp? |
| documento | id, tipo (factura, nota de crédito, nota de débito), puntoFacturacion, numero, fecha (con segundos), clienteId, lineas[], subtotal, itbmsPorTasa{}, total, metodoPago, estado (generada, enviada, autorizada, rechazada, en cola), cufe?, protocolo?, motivoRechazo?, documentoReferenciaId?, origen (POS, tienda o actividad en vivo), historial[] {estado, fecha, motivo?, cambio?} |
| medidor | modo (demo o prospecto), ventasAnio, documentosMes |
| controlesDemo | actividadEnVivo (sí o no), intervaloSegundos |

**Semilla:** 30 productos por negocio, 60 ventas del mes, 2 rechazos y 1 nota de crédito.

## 7. Épicas e historias

### FAC-EP1 Medidor del facturador gratuito

| ID | Historia | Criterios de aceptación | Prior. | Tam. |
| --- | --- | --- | --- | --- |
| FAC-HU1.1 | Como dueño quiero saber si pasé el tope del facturador gratuito, para entender si tengo que migrar. | Dos barras con los límites de B/.36,000 al año y 100 documentos al mes; amarillo desde 80%, rojo al superar con el texto "Debe emitir mediante un PAC o un sistema certificado". | Must | M |
| FAC-HU1.2 | Como vendedor quiero poner las cifras del prospecto, para hacer el ejercicio en la reunión. | Campos editables que actualizan las barras al instante; botón para volver a los datos de la demo. **Las cifras escritas no cambian aunque la demo emita documentos; una etiqueta "Cifras del prospecto" lo indica.** | Must | S |

### FAC-EP2 Venta y emisión

| ID | Historia | Criterios de aceptación | Prior. | Tam. |
| --- | --- | --- | --- | --- |
| FAC-HU2.1 | Como cajero quiero cobrar y que la factura salga sola, para no digitarla dos veces. | Al cobrar se crea el documento y pasa por Generada → Enviada → Autorizada en menos de 3 segundos simulados. Al entrar a "Vender" desde el menú empieza una venta nueva; la anterior se consulta en Documentos. | Must | L |
| FAC-HU2.2 | Como cajero quiero facturar a un cliente con RUC, para que pueda deducir su compra. | Validación de formato de RUC y DV; si falla, no deja enviar y explica por qué. Los patrones de RUC (persona natural, persona jurídica, extranjero) son configurables y muestran un ejemplo; un RUC como "155-1-2" no pasa. | Must | M |
| FAC-HU2.3 | Como comprador quiero recibir mi comprobante por WhatsApp o correo, para no guardar papel. | CAFE con CUFE, QR, totales e ITBMS por tasa; botones de enviar por WhatsApp y correo (simulados). El mensaje va al número del cliente (FAC-RF-15) y no duplica la puntuación cuando el nombre termina en punto ("S. A." no queda "S. A.."). | Must | M |
| FAC-HU2.4 | Como cajero quiero entender por qué una factura fue rechazada, para corregirla. | "Simular rechazo" muestra el motivo en lenguaje claro y un botón que abre el documento para corregir y reenviar. | Must | M |

### FAC-EP3 Notas y casos especiales

| ID | Historia | Criterios de aceptación | Prior. | Tam. |
| --- | --- | --- | --- | --- |
| FAC-HU3.1 | Como cajero quiero emitir una nota de crédito por una devolución, para dejarla ligada a la factura. | Desde una factura autorizada se eligen líneas y cantidades; la nota referencia la factura y resta en el panel. La nota usa su propio consecutivo y se muestra como "NC · PF1-000002". | Should | M |
| FAC-HU3.2 | Como tienda en línea quiero que cada pedido se facture solo, para no hacerlo a mano. | Botón "Simular pedido de la tienda" crea un pedido que aparece facturado con origen "tienda" y numeración del punto WEB. | Should | M |
| FAC-HU3.3 | Como cajero quiero seguir vendiendo sin internet, para no detener la caja. | Con "Simular caída" los documentos quedan "En cola"; al volver se envían solos y el contador baja a cero. Mientras están en cola, el paso "Enviada" no aparece como cumplido. | Should | M |

### FAC-EP4 Panel del contador

| ID | Historia | Criterios de aceptación | Prior. | Tam. |
| --- | --- | --- | --- | --- |
| FAC-HU4.1 | Como contador quiero ver ventas e ITBMS por tasa del mes, para preparar la declaración. | Tabla por día y totales por tasa; filtro por mes; los totales cuadran con la suma de documentos. Una nota explica la regla de redondeo (FAC-RNF-05). | Must | M |
| FAC-HU4.2 | Como contador quiero exportar todo a Excel, para trabajar en mis herramientas. | Exportación CSV y XLSX con una fila por documento y por línea. | Must | S |
| FAC-HU4.3 | Como contador quiero ver rechazos y notas, para revisar casos raros. | Lista de rechazos con motivo y estado de corrección; lista de notas con su factura de referencia. El historial de cada documento muestra el motivo del rechazo y qué se corrigió (por ejemplo, "DV 44 → 07"). | Should | S |

### FAC-EP5 Controles para presentar

| ID | Historia | Criterios de aceptación | Prior. | Tam. |
| --- | --- | --- | --- | --- |
| FAC-HU5.1 | Como vendedor quiero decidir cuándo la demo "se mueve sola", para que no me interrumpa mientras explico. | Interruptor "Actividad en vivo" (FAC-RF-14); con él apagado no aparecen ventas ni avisos que el vendedor no generó. El modo presentación lo enciende y lo apaga al salir. | Must | S |
| FAC-HU5.2 | Como vendedor quiero que los avisos no tapen la tarjeta de la presentación. | Los avisos emergentes se colocan arriba o a un lado mientras la presentación está abierta. | Could | S |
| FAC-HU5.3 | Como prospecto quiero pedir el diagnóstico desde la demo en un toque. | Botón de contacto según FAC-RF-16. | Should | S |

### FAC-EP6 Modo restaurante

| ID | Historia | Criterios de aceptación | Prior. | Tam. |
| --- | --- | --- | --- | --- |
| FAC-HU6.1 | Como mesero quiero llevar la cuenta de una mesa y cobrarla al final, para facturar como trabaja un restaurante. | En La Ceiba, el punto de venta permite abrir cuentas por mesa, agregar platos en varios momentos y cobrar al cerrar. | Should | M |
| FAC-HU6.2 | Como cliente de restaurante quiero dividir la cuenta y dejar propina. | División en partes iguales o por plato, una factura por parte; propina configurable con la nota "validar con la ficha técnica de la DGI". | Should | M |

## 8. Guion de 2 minutos

0. Antes de empezar: "Actividad en vivo" apagada (o usar el modo presentación).
1. Medidor: poner las ventas del prospecto y mostrar si pasa el tope.
2. Punto de venta: vender 3 artículos con distinta tasa de ITBMS a un cliente con RUC; ver la autorización y el CAFE.
3. "Simular rechazo" con un DV equivocado y corregirlo.
4. Panel del contador: ITBMS por tasa y exportación a Excel.
5. Cierre: "Esto mismo, conectado al PAC que usted elija y a su sistema actual".

## 9. Definición de terminado específica

- Los totales del documento, del panel y de la exportación cuadran al centavo.
- El aviso de simulación está visible en el punto de venta, el CAFE y el panel.
- No aparece ningún nombre de PAC real.
- Cada punto de facturación y cada tipo de documento tiene su consecutivo sin saltos.
- Las cifras del prospecto no cambian solas.
- Sin superposiciones en los tamaños de FAC-RNF-04.

## 10. Supuestos y preguntas abiertas

- Estructura de campos del documento real, reglas de validación, numeración y formato del CAFE: validar con la ficha técnica vigente de la DGI y con el PAC que elija cada cliente antes de cualquier implementación real.
- Regla de redondeo del ITBMS (por línea o por total por tasa) y tratamiento de la propina: validar con la ficha técnica.
- ¿Prioridad del modo restaurante? Subirla a Must si las reuniones con Restaurante Ossa, Slabón o Mentiritas Blancas avanzan.

## 11. Revisión de la demo construida (10 de noviembre de 2026)

Se recorrió la versión local (`localhost:5174`) en escritorio de 1366 × 768 y 1920 × 1080, y en móvil de 375 px, con el guion completo y los casos especiales.

**Lo que funciona bien:** los totales cuadran al centavo en la venta, el comprobante y el panel; rechazo, corrección y reenvío; nota de crédito ligada a su factura; cola sin conexión que se envía sola; panel del contador con rechazos, notas, ajustes y exportación; presentación guiada de 15 pasos; aviso de simulación en todas las pantallas; botones del CAFE deshabilitados en documentos rechazados o en cola; navegación inferior en móvil.

| # | Hallazgo | Dónde | Prioridad | Requisito |
| --- | --- | --- | --- | --- |
| 1 | Las cifras del prospecto cambian solas: con "Ya pasó el tope" (41,500 y 118), las ventas automáticas las subieron a 41,552.80 y 119 en un minuto. | Portada, medidor | Alta | FAC-RF-02, FAC-HU1.2 |
| 2 | En 1366 × 768 la tarjeta del medidor se mete unos 64 px debajo de "Último comprobante emitido": la barra de documentos y la nota legal quedan cortadas. En 1920 se ve bien. | Portada | Alta | FAC-RNF-04 |
| 3 | Un solo contador para todos los puntos: PF1-000138, PF1-000139, WEB-000141, PF1-000143. Cada punto debería tener su propia serie. Las notas de crédito sí tienen serie propia, pero "PF1-000002" se confunde con una factura. | Documentos | Alta | FAC-RF-13 |
| 4 | La demo genera ventas y pedidos sola (seis en un minuto) con avisos emergentes, aunque no esté en presentación. Distrae y cambia los números. | Toda la demo | Alta | FAC-RF-14, FAC-HU5.1 |
| 5 | El WhatsApp simulado va a "+507 6000-0000" porque el cliente no tiene campo de teléfono. | Venta, envío | Media | FAC-RF-15 |
| 6 | Mensaje de WhatsApp con doble punto: "Hola, Ferretería Prueba, S. A..". | Envío por WhatsApp | Media | FAC-HU2.3 |
| 7 | La validación acepta el RUC "155-1-2"; el DV sí se valida (2 dígitos). | Venta, cliente con RUC | Media | FAC-HU2.2 |
| 8 | Al volver a "Vender" aparece la factura anterior en vez de una venta nueva. | Punto de venta | Media | FAC-HU2.1 |
| 9 | ITBMS por tasa: 7% sobre B/.1,970.85 muestra B/.137.99 (base × tasa da B/.137.96) y 15% sobre B/.63.75 muestra B/.9.57 (da B/.9.56), por el redondeo por línea. Un contador lo va a preguntar. | Panel del contador | Media | FAC-RNF-05 |
| 10 | El botón "Agende un diagnóstico gratis de 30 minutos" lleva a un formulario sin agenda ni WhatsApp. | Barra superior | Media | FAC-RF-16 |
| 11 | La Ceiba usa el mismo punto de venta que la ferretería: sin mesas, propina ni división de cuenta. | Negocio La Ceiba | Media | FAC-RF-17, FAC-EP6 |
| 12 | En la lista "del más reciente", dentro del mismo minuto sale primero el número menor (PF1-000139 antes de PF1-000140). | Documentos | Baja | FAC-RNF-06 |
| 13 | En cola, el paso "Enviada" aparece como cumplido aunque no se envió. | Venta sin conexión | Baja | FAC-HU3.3 |
| 14 | El historial del documento no dice el motivo del rechazo ni qué se corrigió (eso solo está en la página de Rechazos). | Detalle del documento | Baja | FAC-HU4.3 |
| 15 | El aviso "Modo Presentación: empieza desde los datos de ejemplo" tapa el texto de la tarjeta del paso 1. | Presentación | Baja | FAC-HU5.2 |

**Orden sugerido para la v1.1:** 1, 2, 3 y 4 antes de mostrarla a prospectos; luego 5 a 10; el modo restaurante (11) cuando haya reunión con un restaurante.

## 12. Mejoras visuales

**Dirección:** el comprobante es el protagonista y cada negocio se reconoce por su marca. Hoy la demo es casi toda negra y gris, idéntica para El Tornillo, La Ceiba y Brisa (los tres usan `#0a0a0a` en botones, navegación y estados), y la portada deja el comprobante en una columna lateral que aprieta al medidor y a la tabla. Aplica además el sistema visual común (`00-base-comun.md`, BASE-VIS-01 a 08).

**Portada propuesta (1366 × 768):**

```
┌───────────────────────────────────────────────────────────────────┐
│ Banner de demo (capa de demo)                                     │
├──────────────┬────────────────────────────────────────────────────┤
│ Menú lateral │ [logo] Ferretería El Tornillo                      │
│              │                                                    │
│              │ Usted cobra.                   ┌────────────────┐  │
│              │ La factura sale sola.          │ CAFE térmico   │  │
│              │                                │ saliendo de la │  │
│              │ [Cobrar una venta]             │ impresora,     │  │
│              │ Generada › Enviada › Autorizada│ QR y sello     │  │
│              │                                └────────────────┘  │
│              ├────────────────────────────────────────────────────┤
│              │ ¿Ya pasó el tope del facturador gratuito?          │
│              │ Ventas del año   ███████████████░░░░|░░  B/.21,588 │
│              │ Documentos/mes   ████████████████░░░|░░  71 de 100 │
│              │ [cifras del prospecto]        Dentro del límite    │
│              ├────────────────────────────────────────────────────┤
│              │ Lo último que se emitió (tabla a todo lo ancho)    │
└──────────────┴────────────────────────────────────────────────────┘
```

| # | Mejora | Dónde | Prioridad | Referencia |
| --- | --- | --- | --- | --- |
| 1 | **Marca por negocio.** Cada negocio con su color, logo y nombre en el botón principal, la navegación activa, el encabezado del punto de venta y la cabecera del CAFE. Propuesta (ajustar a contraste AA): El Tornillo, amarillo señal `#F2B33D` con carbón `#1F2328`; La Ceiba, verde `#2F6B4F`; Brisa, azul `#1E4E8C`. | Toda la demo | Alta | BASE-VIS-01; la demo de citas ya lo hace por giro |
| 2 | **El comprobante en el héroe.** Texto a la izquierda y el CAFE a la derecha, arriba del pliegue. Cuando se autoriza una venta, el papel sale de la impresora y aparece el sello "Autorizada": es el único movimiento de la portada. Medidor y tabla pasan a todo lo ancho debajo, lo que además resuelve el choque de 1366 × 768 (hallazgo 2). | Portada | Alta | Stripe Invoicing: vista previa de la factura junto al texto |
| 3 | **Medidor en barras horizontales.** Los dos velocímetros (unos 300 px de alto) pasan a dos barras con marcas al 80% y al 100%, la cifra a la derecha y una frase de estado grande, en verde, ámbar o rojo. Caben junto a los campos del prospecto y se leen mejor en móvil. | Portada y panel | Alta | — |
| 4 | **Estados con color.** "Autorizada" hoy es una píldora negra que parece un botón. Usar la paleta común (verde, ámbar, azul, rojo, gris) con ícono y texto, igual en la lista, el comprobante, la línea de tiempo y el medidor. | Toda la demo | Alta | BASE-VIS-03 |
| 5 | **Punto de venta para el cajero.** Campo grande "Escanee o escriba el código" arriba del catálogo; filas de 48 px y botón "+" de 40 px (hoy unos 24 px); categorías con flecha o degradado al final (hoy "Plome…" queda cortado); botón "Cobrar B/.38.49" con el total adentro, de 56 px de alto, en el color del negocio; desglose de ITBMS plegable bajo el total. | Vender | Media | — |
| 6 | **Catálogo del café en tarjetas.** En La Ceiba, cuadrícula de productos con ícono o ilustración y precio, en vez de la tabla de ferretería. | Vender, La Ceiba | Media | Sweetgreen (tarjeta de plato), ver referencias |
| 7 | **CAFE más real.** Logo del negocio en la cabecera, borde inferior dentado, vista de impresión de 80 mm, QR más grande, sello "Autorizada" como sello de tinta y montos con cifras tabulares. | Comprobante | Media | — |
| 8 | **Panel del contador.** Quitar o rotular los mini gráficos escalonados de las tarjetas (hoy no tienen escala ni fechas); barras de ventas por día en el color del negocio, con línea de promedio y el día de hoy destacado; barra apilada de ITBMS por tasa encima de la tabla; montos alineados a la derecha con cifras tabulares. | Panel `#/admin` | Media | Holded (widgets de ingresos), Xero (pagadas contra pendientes) |
| 9 | **Lista de documentos.** Insignia de tipo con color propio (Factura, NC, ND), origen con ícono (caja o tienda), fila rechazada con fondo rojo suave. En la portada a 1366 px la columna "Documento" ocupa 4 líneas y "Estado" queda cortada: la tabla va a todo lo ancho. | Documentos, portada | Baja | — |
| 10 | **Tira del proceso viva.** "Usted cobra → Se arma la factura → El PAC la autoriza → Llega al cliente" se ilumina paso a paso con la venta en curso, en vez de ser decorativa. | Portada | Baja | — |
| 11 | **Menos adorno de plantilla.** Etiquetas en mayúsculas ("VENTAS DEL AÑO", "NÚMERO", "FORMA DE PAGO") en oración normal; títulos con punto medio pasan a título y subtítulo. | Toda la demo | Baja | BASE-VIS-05 |
| 12 | **Avisos en su lugar.** Los avisos emergentes van arriba a la derecha y nunca encima de la tarjeta de la presentación (hallazgo 15). | Toda la demo | Baja | BASE-VIS-08 |
