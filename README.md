# Factura sola · Demo de Panacea Logic AI

Punto de venta conectado a un PAC **simulado**: cada venta se factura electrónicamente al cobrar, sin digitar dos veces, y el dueño ve al instante si ya pasó el tope del facturador gratuito de la DGI.

- Publicada en https://factura.panacealogic.dev (Vercel; también en https://factura-sola-demo.vercel.app). El DNS está en name.com: CNAME `factura` hacia el valor que da Vercel
- Código: repositorio privado `dany2509D/factura-sola-demo` en GitHub
- Negocios ficticios (con selector): Ferretería El Tornillo (mostrador), Café La Ceiba (restaurante) y Tienda Brisa (tienda en línea)
- Es un sitio estático: HTML, CSS y JavaScript sin build, sin dependencias y sin backend. Todo vive en el navegador (`localStorage`, con respaldo en memoria).

> **Simulación. No se conecta a la DGI ni a ningún PAC. CUFE y protocolos ficticios, sin validez fiscal.**
> Este aviso está visible en todas las pantallas y en cada comprobante. Datos, personas, teléfonos y RUC son ficticios (la demo nunca muestra un número de relleno: el WhatsApp va al que escriba la persona). Pagos y WhatsApp son simulados.

## Cómo correrlo

Requiere Node 20 o superior (solo para el servidor local de desarrollo; no hay que instalar nada).

```bash
npm start            # abre http://localhost:5174  (PORT=5200 npm start para cambiar el puerto)
npm test             # 40 pruebas: cálculos, semilla, numeración, flujo completo, exportación, marca y contraste
```

También sirve cualquier servidor estático apuntando a la carpeta `public/`. Los módulos ES necesitan `http://`: no funcionan abriendo `index.html` con doble clic.

## Cómo desplegarlo

1. Publique la carpeta **`public/`** tal cual en cualquier hosting estático (no hay paso de compilación ni variables de entorno). En Vercel ya está resuelto con `vercel.json` (`outputDirectory: "public"`, sin build): `npx vercel deploy --prod` publica solo `public/`; `docs/`, `tests/` y este README no se sirven.
2. Apunte el subdominio `factura.panacealogic.dev` al hosting y active HTTPS (lo da el hosting). Ya hecho: dominio agregado al proyecto de Vercel y CNAME creado en name.com.
3. Navegación por hash (`#/ruta`): no necesita reglas de reescritura.

Esta demo **no usa IA ni el endpoint `/api/chat`**: no tiene chat. Por eso no hay función serverless ni clave de API.

## Guion de 2 minutos

Atajo: el botón **Presentación** (arriba) recorre estos pasos solo, con una nota por paso; se puede pausar, avanzar, retroceder y salir con Esc. Empieza desde los datos de ejemplo.

0. **Antes de empezar:** la "Actividad en vivo" (controles de la demo) viene **apagada**; el modo Presentación la enciende y la apaga al salir. Si va a hablar sin presentación, déjela apagada para que nada entre ni cambie mientras explica.
1. **Medidor** (portada). Ponga las cifras del prospecto, o use "Cerca del tope" / "Ya pasó el tope": las barras pasan a amarillo (80 %) y a rojo ("Debe emitir mediante un PAC o un sistema certificado").
   Al escribir cifras o elegir un ejemplo, el medidor queda en **modo prospecto**: esas cifras no cambian con las ventas de la demo hasta pulsar "Datos de la demo".
2. **Cobrar.** En *Vender*, agregue tres artículos con distinta tasa (martillo 7 %, fertilizante 0 %, ron 10 %), elija "Cliente con RUC" y cobre. Vea Generada → Enviada → Autorizada, el CUFE, el QR y el comprobante (CAFE). Envíelo por WhatsApp o correo (simulados).
3. **Rechazo.** En "Simular rechazo del PAC" elija *RUC o DV inválido*, cobre, lea el motivo en lenguaje claro y use *Corregir y reenviar*.
4. **Devolución.** Abra la factura en *Documentos* y emita una nota de crédito de un artículo.
5. **Tienda y sin conexión.** En *Tienda en línea*, "Simular pedido de la tienda" (se factura solo). Luego "Simular caída de internet", venda dos veces (quedan *En cola*) y "Volver a conectar".
6. **Contador.** "Entrar como administrador": ventas por día, ITBMS por tasa, rechazos con su motivo y exportación a Excel.
   **Cierre:** "Esto mismo, conectado al PAC que usted elija y a su sistema actual."

## Qué incluye (FAC-RF)

| Req. | Dónde está |
| --- | --- |
| 01 Aviso de simulación | Franja amarilla en todas las rutas y pie de cada CAFE |
| 02 Medidor | Portada y panel; límites B/.36,000 y 100 documentos; campos editables y ejemplos |
| 03 Selector de negocio | Tres negocios con catálogo, emisor y colores propios |
| 04 Punto de venta | Catálogo de 30 productos, ITBMS 0/7/10/15 %, descuento por línea, cliente con RUC y DV, pago simulado |
| 05–06 Emisión y CAFE | Estados animados (menos de 3 s), CUFE y protocolo ficticios, QR ilustrativo, impresión, WhatsApp y correo simulados |
| 07 Rechazos | RUC o DV inválido, totales que no cuadran, fecha fuera de rango; corregir y reenviar |
| 08 Notas | Crédito parcial o total ligado a la factura, y débito |
| 09 Tienda en línea | Tienda simulada + pedidos que se facturan solos con origen "tienda" |
| 10 Sin conexión | Cola con contador de pendientes; se envía sola al volver |
| 11 Panel del contador | `#/admin`: ventas por día (gráfico y tabla), ITBMS por tasa, facturas, notas, rechazos, filtro por mes, exportación CSV y `.xlsx` |
| — Lista de documentos | Filtros, búsqueda y **paginación** (10, 25, 50 o 100 filas por página; el tamaño se recuerda) |
| 12 Ajustes | Emisor (RUC y DV), PAC A / PAC B, sucursales, puntos de facturación, opciones del medidor |
| 13 Numeración | Cada punto de facturación (PF1, PF2, PF3, WEB) lleva su propia serie por factura, nota de crédito y nota de débito, sin saltos; en listas y comprobantes el número va con su tipo (`FAC · PF1-000139`, `NC · PF1-000002`) |
| 14 Actividad en vivo | Interruptor y frecuencia (15 s a 5 min, por defecto 2 min) en los controles de la demo; apagada por defecto, la presentación la enciende y la apaga |
| 15 Teléfono de WhatsApp | Campo opcional en el cliente con RUC; si falta al pulsar "WhatsApp", se pide en ese momento y se guarda en el documento |
| 16 Contacto | La barra superior abre WhatsApp +507 6663-2666 con el mensaje ya escrito; el formulario de panacealogic.dev (`?demo=factura`) queda como alternativa |
| 17 Modo restaurante | **Pendiente a propósito** (mesas, propina y división de cuenta para La Ceiba): se hace cuando haya reunión con un restaurante |

**Datos semilla** (por negocio): 30 productos, 60 ventas autorizadas del mes en curso, 2 rechazos (uno ya corregido y otro abierto), 1 nota de crédito y, para que el filtro por mes tenga qué mostrar, dos meses anteriores más livianos. Cada negocio arranca en un estado distinto del medidor: El Tornillo en verde, La Ceiba en amarillo y Brisa en rojo. Las fechas son relativas a hoy (hora de Panamá). "Reiniciar demo" vuelve exactamente a este estado.

## Validar con la ficha técnica de la DGI

Nada de esto está confirmado como regla fiscal; todo es un supuesto de la demo y queda en `public/app/config.js` (o en **Ajustes**) para cambiarlo sin tocar el resto:

- **Límites del facturador gratuito** (B/.36,000 al año y 100 documentos al mes, Resolución DGI 201-6299 según la especificación) y el **umbral de aviso del 80 %**.
- **Qué cuenta como "ventas del año"**: por defecto, ventas **sin ITBMS**, con las notas de crédito restando (editable en Ajustes). Los documentos del mes cuentan lo emitido o en cola, sin los rechazados.
- **Validación de RUC y DV**: solo el *formato*, con tres patrones configurables en `config.js` (`PATRONES_RUC`: persona natural `8-123-4567`, persona jurídica `1556789-1-2018`, extranjero `E-8-123456`); un RUC como `155-1-2` no pasa. El DV son 2 dígitos. No se calcula ningún dígito verificador.
- **Regla de redondeo del ITBMS**: por línea (por defecto) o sobre la base por tasa; se elige en Ajustes y rige para los documentos nuevos. Con el redondeo por línea, el ITBMS por tasa puede diferir por centavos de base × tasa; el panel lo explica y muestra la diferencia del mes.
- **Numeración por punto y tipo**: serie propia por punto de facturación y tipo de documento, de 1 en adelante. La regla exacta del consecutivo real es de la ficha técnica.
- **Propina** (cuando se haga el modo restaurante): su tratamiento en la factura electrónica queda anotado como "validar con la ficha técnica de la DGI".
- **Rango de fechas** que acepta el PAC simulado (hasta 3 días hacia atrás, ninguno hacia adelante) y el desfase con que se simula "fecha fuera de rango" (45 días).
- **Tasas de ITBMS por producto**: de ejemplo, para mostrar las cuatro tasas; no son una clasificación fiscal.
- **Estructura del documento real, numeración y formato del CAFE**: la numeración (`PF1-000123`) y el aspecto del comprobante son ilustrativos. CUFE (64 caracteres hexadecimales) y protocolo (12 dígitos) son inventados.
- **Forma de contar notas de débito y de crédito** en las ventas y en el ITBMS por tasa del panel.
- El **QR** es ilustrativo: parece un QR pero no codifica nada que se pueda leer.

## Diseño

Base acromática estilo shadcn/ui (referencia aportada por el equipo) con **dos capas de color** encima, según la sección 12 de la especificación:

1. **Marca por negocio.** Cada negocio tiene su color, su logo y su nombre en el botón principal, la navegación activa, el encabezado del punto de venta, la cabecera del comprobante y los gráficos: El Tornillo, amarillo `#F2B33D` con tinta carbón `#1F2328`; La Ceiba, verde `#2F6B4F`; Brisa, azul `#1E4E8C`. Se aplica con variables CSS (`--marca`, `--marca-tinta`, `--marca-suave`, `--marca-fuerte`, `--marca-barra`) que se redefinen en `html[data-negocio="…"]` (`app.css`); los mismos colores están en `MARCAS` (`config.js`) para los logos, y una prueba verifica que coincidan y que pasen contraste AA. El amarillo no sirve como texto ni como barra sobre blanco (1,9:1), así que el acento oscuro sobre blanco es el carbón y las barras del gráfico usan un ámbar más oscuro `#B7791F` (3,6:1).
2. **Estados.** Autorizada en verde, en cola en ámbar, enviada en azul, rechazada en rojo y generada en gris, siempre con ícono y texto, y con el mismo lenguaje en la lista, el comprobante (sello), la línea de tiempo y el medidor.

Lienzo `#f5f5f5`, barra lateral `#fafafa`, tarjetas blancas de 24px con filete de 1px y una sombra mínima; botones, campos y etiquetas de 18px; bloques anidados de 10px. Las etiquetas van en oración normal (sin mayúsculas sostenidas) y los títulos con punto medio pasaron a título y subtítulo. Tipografía Geist y Geist Mono (titulares en 600 con tracking negativo). En escritorio hay una barra lateral con el selector de negocio, las secciones y, en una caja aparte, los **controles de la demo**; en móvil, barra superior con los tres negocios y navegación inferior.

**Tamaño de letra:** texto base de 16 px (la referencia pide 14 px, que resultaba chico en pantallas grandes), con el resto de la escala subida en proporción.

**Aprovechamiento de pantalla:** el contenido es fluido y va pegado a la barra lateral (tope de 1840 px), no centrado en una columna de 1200 px. En pantallas anchas el catálogo del punto de venta pasa a dos columnas, las tarjetas laterales se ensanchan y los pedidos de la tienda, los ajustes y el detalle de un documento se reparten en dos columnas.

Desviaciones deliberadas de la referencia, por accesibilidad: el gris medio de texto pasa de `#737373` a `#666666` (el original queda en 4,4:1 sobre el lienzo `#f5f5f5`) y el foco de teclado es un anillo negro de 2px en lugar del filete gris de 1px, que no se distingue. Las fuentes (licencia SIL OFL 1.1, ver `public/shared/fonts/LICENCIA.txt`) se sirven desde el propio proyecto, así que la demo no depende de internet al presentar.

## Movimiento

La demo no es una maqueta estática: casi todo reacciona. Detalles que conviene mostrar en la reunión:

- **Inicio:** el comprobante sale de la impresora con su sello y su QR cuando se autoriza una venta, y es el único movimiento propio de la portada. La **tira del proceso** (cobra, se arma, el PAC autoriza, llega al cliente) se ilumina paso a paso con la venta en curso. El medidor son dos barras que se llenan y cuentan las cifras. El interruptor **Actividad en vivo** está en los controles de la demo y arranca apagado.
- **Punto de venta:** el artículo vuela al carrito, la línea entra deslizándose y el total cuenta hasta el nuevo valor; al cobrar, el comprobante se imprime. Con un lector de código de barras (o escribiendo el código y pulsando Intro) el artículo se agrega solo.
- **Panel del contador:** las barras crecen y las métricas cuentan.
- **Todas las pantallas** entran de forma escalonada, y cambiar de negocio las vuelve a animar.

Todo respeta "reducir movimiento" del sistema operativo: sin animaciones, sin retrasos y con las cifras en su valor final desde el primer cuadro.

## Estructura

```
docs/                 especificación (00 base común, 02 esta demo) y encargo original
public/               lo que se publica
  index.html
  shared/             piezas reutilizables entre demos (ui, storage, time) y fuentes; copia de la demo 01
  app/
    main.js           arranque, encabezado, rutas por hash
    guion.js          pasos del modo Presentación
    controller.js     acciones: carrito, cobro, PAC, rechazos, notas, tienda, cola, ajustes
    vivo.js           actividad en vivo (interruptor, frecuencia, tope de seguridad)
    tablas.js         las tablas pasan a tarjetas solo cuando no caben (mide la tabla real)
    state.js          almacén con localStorage (try/catch y respaldo en memoria)
    calc.js money.js ruc.js docs.js pac.js meter.js report.js export.js fake.js   (lógica pura, con pruebas)
    data/             catálogos de los tres negocios y datos semilla
    views/            portada, venta, documentos, tienda, admin, ajustes, CAFE, WhatsApp/correo
    app.css vistas.css
scripts/serve.mjs     servidor local de desarrollo
tests/                node --test
```

## Qué se verificó y qué no

Verificado: 40 pruebas automáticas (incluye 500 documentos al azar donde el total siempre cuadra con las líneas, que panel y exportación suman lo mismo al centavo, la numeración por punto y tipo sin saltos, el modo prospecto, que los colores de marca del CSS coincidan con `config.js` y que marca y estados pasen contraste AA); recorrido completo en el navegador Edge (Chromium) sin errores de consola, incluido el modo Presentación de punta a punta; funcionamiento con `localStorage` bloqueado; **sin superposiciones ni recortes** (detector automático de bloques que se pisan, texto cortado y desborde horizontal) en 1366×768, 1440×900, 1920×1080, 768×1024 y 375×812, más 1280×720 y 1024×768, en las pantallas principales y en los estados de venta cobrada, rechazo abierto y cifras que pasan el tope; auditoría automática de etiquetas (nombre accesible de RUC y DV incluido), ids duplicados y contraste AA en los tres negocios y en los estados nuevos (modo prospecto, historial con motivo, "En cola", aviso de teléfono); JavaScript de unos 76 KB comprimido (límite 300 KB).

**No** verificado: Firefox ni Safari (solo Chromium); Lighthouse (se midieron aparte contraste, etiquetas y peso, no el puntaje); el `.xlsx` se validó como ZIP y XML correctos pero **no se abrió en Excel**; la impresión se probó generando el PDF desde el navegador (una página de 80 mm de ancho), no con una impresora térmica; un teléfono real lento; el abrir WhatsApp desde el botón de contacto (se verificó el enlace y el mensaje, no la app).

## Revisión v1.1 (sección 11 de la especificación)

Se atendieron los hallazgos 1 a 10 y 12 a 16; el 11 (modo restaurante) queda pendiente. Lo que cambió, por hallazgo:

| # | Qué se hizo |
| --- | --- |
| 1 | Modo prospecto: las cifras escritas o elegidas quedan fijas; "Datos de la demo" vuelve al modo demo. Una etiqueta sobre el medidor dice en cuál está. |
| 2 | La portada pone el comprobante al lado del medidor solo desde 1440 px; debajo, va abajo. Se corrigió además un desborde de 47 px de la columna a 1440 px. |
| 3 | Consecutivos por punto y por tipo; el número siempre con su tipo (`FAC ·`, `NC ·`, `ND ·`). |
| 4 | Actividad en vivo apagada por defecto, con interruptor y frecuencia; la presentación la enciende y la apaga. No entra nada sin conexión ni con la pestaña oculta. |
| 5 | Campo de WhatsApp del cliente; si falta, se pide al enviar. Se quitó el número de relleno. |
| 6 | La puntuación del mensaje no se duplica ("S. A." ya no termina en "S. A.."). |
| 7 | Tres patrones de RUC configurables; `155-1-2` no pasa. |
| 8 | "Vender" empieza una venta nueva; la anterior se consulta en Documentos. |
| 9 | Regla de redondeo visible en el panel y configurable en Ajustes (por línea o sobre la base por tasa). |
| 10 | El botón de la barra superior abre WhatsApp con el mensaje; el formulario queda como alternativa. |
| 12 | Las listas ordenan por fecha con segundos y, en empate, por número descendente. |
| 13 | En cola, el paso "Enviada" se muestra pendiente ("al volver internet"). |
| 14 | El historial dice el motivo del rechazo y qué se corrigió (por ejemplo, "DV 44 → 07"). |
| 15 | Mientras se presenta, los avisos van arriba a la derecha y no tapan la tarjeta del paso. |
| 16 | RUC y DV se anuncian por su etiqueta: el ejemplo pasó de placeholder a texto de ayuda visible. |

Además, el detector de superposiciones encontró y se corrigieron problemas que ya existían: tablas cortadas a 768 px (ahora pasan a tarjetas solo si no caben), indicadores del panel recortados en móvil, y catálogo del punto de venta y tienda demasiado angostos a 1024 px (el panel lateral pasa al costado desde 1240 px).

## Revisión visual v1.2 (sección 12 de la especificación)

Se atendieron las 12 mejoras. Lo que cambió, por mejora:

| # | Qué se hizo |
| --- | --- |
| 1 | Marca por negocio (color, logo y nombre) en botón principal, navegación activa, encabezado del punto de venta, cabecera del CAFE y gráficos. Ver "Diseño". |
| 2 | Portada con héroe: texto a la izquierda y el comprobante saliendo de la impresora a la derecha, arriba del pliegue a 1366×768. Medidor y tabla pasan a todo lo ancho debajo. En el héroe el comprobante es compacto (lo esencial); el completo está en el detalle del documento. |
| 3 | Medidor en dos barras horizontales con marcas al 80 % y al 100 %, la cifra a la derecha y una frase de estado grande en verde, ámbar o rojo. Pasadas del 100 % la barra se rellena con rayas, para no depender solo del color. Junto a los campos del prospecto cuando hay ancho. |
| 4 | Estados con color, ícono y texto, iguales en la lista, el comprobante, la línea de tiempo y el medidor. |
| 5 | Campo grande "Escanee o escriba el código" (Intro agrega el artículo si el código coincide); filas de 56 px y botón "+" de 40 px; categorías con degradado y flecha cuando no caben; botón "Cobrar B/.xx" de 56 px con el total adentro; desglose de ITBMS plegable bajo el total. |
| 6 | Catálogo de La Ceiba en tarjetas con ícono y precio (solo ese negocio; ver `CATALOGO_EN_TARJETAS`). |
| 7 | CAFE con logo y color del negocio en la cabecera, borde inferior dentado, QR más grande (156 px), sello de tinta con ícono y montos en cifras tabulares. Al imprimir sale en papel de 80 mm, en blanco y negro y en una sola página. |
| 8 | Panel: se quitaron los minigráficos escalonados (no tenían escala ni fechas); barras de ventas en el color del negocio, línea de promedio de los días con ventas, hoy destacado (oscuro y con marca ▲, no solo color) y barra apilada del ITBMS por tasa encima de la tabla. |
| 9 | Lista de documentos con insignia de tipo (FAC, NC, ND), origen con ícono (caja o tienda) y fila rechazada con fondo rojo suave; la columna "Tipo" se fundió con el número. En la portada la tabla va a todo lo ancho. |
| 10 | Tira del proceso viva: refleja el documento más reciente (en cola en ámbar, rechazado en rojo; "Llega al cliente" se cumple cuando se envió por WhatsApp o correo). |
| 11 | Etiquetas en oración normal y títulos con punto medio separados en título y subtítulo, incluidos los de los pasos de la presentación (el número de paso ya lo muestra la tarjeta). |
| 12 | Los avisos van siempre arriba a la derecha. |

**Dos aclaraciones sobre la especificación.** (1) La sección 12 remite al sistema visual común (`00-base-comun.md`, BASE-VIS-01 a 08), pero la copia de `docs/00-base-comun.md` de este proyecto no incluye esas reglas: se aplicó lo que dice `docs/02`. (2) Los colores propuestos se usaron tal cual en botones y encabezados; donde no pasan contraste (amarillo como texto o como barra sobre blanco) se usan variantes más oscuras del mismo tono.
