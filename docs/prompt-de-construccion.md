# Prompt de construcción · Demo "Factura sola"

Este es el encargo original para construir la demo. Va junto a la base común (`00-base-comun.md`) y la especificación (`02-facturacion-electronica-pac.md`). Si algo difiere, mandan la base común y la especificación; este archivo es el punto de partida.

## Parte 1 · Reglas para toda la demo

Eres un desarrollador front-end senior. Vas a construir una DEMO comercial de una empresa panameña de software, para mostrar en reuniones de venta con micro, pequeñas y medianas empresas. Reglas para toda la demo:

1. Stack: sitio estático de una sola página (HTML, CSS y JavaScript; Vite con JavaScript sin framework si necesitas módulos), navegación por hash (#/ruta), sin backend obligatorio. Debe poder desplegarse tal cual en un subdominio propio.
2. Datos: todo en localStorage, con datos semilla realistas que se cargan la primera vez. Botón visible "Reiniciar demo" que borra y vuelve a sembrar. Envuelve cada lectura y escritura de localStorage en try/catch y, si falla, sigue funcionando en memoria.
3. Banner fijo arriba: "Demo · Datos ficticios · No ingrese información real", con enlace a "Agende un diagnóstico gratis de 30 minutos".
4. Marca inventada para el negocio de la demo: nombre, logo SVG sencillo y paleta propia. Nunca uses nombres, logos ni datos de empresas reales. Personas, teléfonos (+507 6000-0000) y cédulas también ficticios.
5. Español de Panamá, trato de "usted". Moneda en dólares (US$ o B/., uno solo en toda la demo), ITBMS de 7% donde aplique. Pagos simulados: Yappy, tarjeta, ACH y efectivo; nunca proceses pagos reales.
6. Dos vistas siempre: la del cliente final (pensada primero para móvil) y un panel administrativo en #/admin, con un botón "Entrar como administrador" en vez de contraseña.
7. Si hay WhatsApp, simúlalo dentro de la página: un marco de teléfono con interfaz de chat (burbujas, hora, doble check). No conectes WhatsApp real. Al lado del teléfono, muestra en vivo lo que cambia en el panel (cita creada, pedido registrado) para que se vea la automatización de punta a punta.
8. IA: por defecto, modo guion (reglas y respuestas predefinidas que entienden variaciones simples del texto). Deja listo un modo "IA real" opcional que llame a /api/chat, una función serverless que use la API de Claude con la clave en una variable de entorno; nunca pongas claves en el navegador. Si /api/chat no existe o falla, vuelve al modo guion sin romper nada.
9. En todo flujo con IA, muestra "Una persona del equipo revisa los casos importantes" y un botón "Pasar a una persona" que deja la conversación marcada en el panel.
10. Calidad: responsive de 360 px a escritorio, accesible (contraste AA, etiquetas en formularios, uso con teclado), rápida y sin dependencias pesadas. Diseño limpio y profesional, con identidad propia, no una plantilla genérica.
11. Modo "Presentación": un botón que recorre el flujo principal paso a paso, con una nota corta de qué se está demostrando en cada paso, para usar en reuniones.
12. Entrega: código ordenado y un README en español con cómo correrlo, cómo desplegarlo y un guion de 2 minutos para presentar la demo.

## Parte 2 · Encargo de esta demo

DEMO: "Factura sola" – punto de venta conectado a un PAC (simulado). Subdominio: factura-sola-demo.vercel.app.

Objetivo de venta: que el dueño vea que cada venta se factura electrónicamente al cobrar, sin digitar dos veces, y que entienda si ya pasó el tope del facturador gratuito.

Aviso visible en toda la demo: "Simulación. No se conecta a la DGI ni a ningún PAC. CUFE y protocolos ficticios, sin validez fiscal."

Negocio inventado con selector: "Ferretería El Tornillo" (venta en mostrador), "Café La Ceiba" (restaurante) y "Tienda Brisa" (tienda en línea).

1. Medidor del facturador gratuito (portada): desde el 1 de enero de 2026 el facturador gratuito de la DGI solo aplica a ingresos brutos de hasta B/.36,000 al año y hasta 100 documentos al mes. Dos barras con las ventas del año y los documentos del mes contra esos límites, con aviso amarillo al 80% y rojo al pasarlos: "Debe emitir mediante un PAC o un sistema certificado". Campos editables para que el dueño ponga sus cifras en la reunión.
2. Punto de venta: catálogo con código, precio y tasa de ITBMS (0%, 7%, 10% y 15%), carrito, cliente "Consumidor final" o cliente con RUC y DV (validación de formato), método de pago. Al cobrar:
   - Se arma el documento (factura de operación interna) y se envía al "PAC simulado" con estados animados: Generada → Enviada → Autorizada.
   - Autorizada: muestra CUFE ficticio, número de protocolo de autorización ficticio, fecha y hora, código QR y el comprobante impreso (CAFE) listo para imprimir o mandar por WhatsApp o correo.
   - Rechazada (botón "Simular rechazo"): motivo en lenguaje claro (RUC o DV inválido, totales que no cuadran, fecha fuera de rango) y botón para corregir y reenviar.
3. Notas de crédito y débito: desde una factura autorizada, devolver uno o varios artículos y emitir la nota de crédito ligada a ella.
4. Tienda en línea: un pedido que entra desde una tienda simulada (estilo Shopify) se factura solo y aparece en la lista sin que nadie lo toque.
5. Sin conexión: botón "Simular caída de internet"; las ventas quedan en cola y se envían solas al volver, con aviso de cuántas faltan.
6. Panel del contador (#/admin): ventas por día, ITBMS por tasa, facturas, notas, rechazos con su motivo y exportación a CSV y Excel. Filtro por mes.
7. Ajustes: datos del emisor (RUC y DV ficticios), selector de PAC con nombres genéricos ("PAC A", "PAC B"), sucursales y puntos de facturación.

Datos semilla: 30 productos, 60 ventas del mes, 2 rechazos y 1 nota de crédito.
No inventes reglas fiscales que no estén en este prompt: donde haga falta un detalle técnico, déjalo configurable y anótalo en el README como "validar con la ficha técnica de la DGI".
