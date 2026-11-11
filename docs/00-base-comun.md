# 00 · Base común de las demos — Panacea Logic AI

Versión 1.0 · 10 de noviembre de 2026 · Aplica a las demos 01 a 10.

Las demos son herramientas de venta para reuniones con MiPyMEs panameñas, no productos terminados: muestran un flujo de punta a punta con datos ficticios. Todo lo de este archivo se cumple en cada demo y no se repite en los archivos individuales.

## Convenciones

- **IDs:** `<PREFIJO>-RF-nn` (requerimiento funcional), `<PREFIJO>-RNF-nn` (no funcional), `<PREFIJO>-EPn` (épica), `<PREFIJO>-HUn.m` (historia de usuario).
- **Prioridad (MoSCoW):** Must = sin esto no hay demo · Should = la hace más convincente · Could = si sobra tiempo.
- **Tamaño de historia (orientativo, un desarrollador):** S ≤ medio día · M = 1 a 2 días · L = 3 a 5 días.
- **Criterios de aceptación:** formato Dado / Cuando / Entonces, o lista verificable.

## Requerimientos no funcionales comunes

| ID | Requerimiento | Cómo se verifica |
| --- | --- | --- |
| BASE-RNF-01 | Sitio estático de una sola página (HTML, CSS y JavaScript; Vite sin framework si hacen falta módulos), navegación por hash (`#/ruta`), sin backend obligatorio. | El build se sirve desde cualquier hosting estático. |
| BASE-RNF-02 | Persistencia en `localStorage`; cada lectura y escritura dentro de `try/catch`, con respaldo en memoria. | Con `localStorage` bloqueado, el flujo principal se completa. |
| BASE-RNF-03 | Datos semilla realistas cargados la primera vez y botón visible "Reiniciar demo". | Reiniciar deja exactamente el estado semilla. |
| BASE-RNF-04 | Banner fijo: "Demo de Panacea Logic AI · Datos ficticios · No ingrese información real", con enlaces a panacealogic.dev y a panacealogic.dev/cuentanos-tu-proyecto. | Visible en todas las rutas, también en `#/admin`. |
| BASE-RNF-05 | Marca inventada (nombre, logo SVG, paleta). Personas, teléfonos (+507 6000-0000) y cédulas ficticios. Ningún nombre, logo ni dato de empresa real. | Revisión de textos antes de publicar. |
| BASE-RNF-06 | Español de Panamá, trato de "usted". Una sola notación de moneda (US$ o B/.) en toda la demo. ITBMS 7% donde aplique. | Revisión de textos. |
| BASE-RNF-07 | Pagos solo simulados (Yappy, tarjeta, ACH, efectivo). | No hay llamadas a pasarelas reales. |
| BASE-RNF-08 | Responsive de 360 px a 1440 px, pensado primero para móvil. | Prueba en 360, 768 y 1440 px. |
| BASE-RNF-09 | Accesibilidad: contraste AA, etiquetas en formularios, uso completo con teclado, foco visible. | Lighthouse Accesibilidad ≥ 90. |
| BASE-RNF-10 | Rendimiento: carga inicial rápida en 4G, JavaScript ≤ 300 KB comprimido sin contar imágenes. | Lighthouse Rendimiento ≥ 85 en móvil. |
| BASE-RNF-11 | WhatsApp siempre simulado dentro de la página; nunca se conecta WhatsApp real. | Sin dependencias de WhatsApp en el código. |
| BASE-RNF-12 | IA en modo guion por defecto. Modo "IA real" opcional vía `/api/chat` (función serverless con la API de Claude y la clave en variable de entorno). Si falla o no existe, vuelve al modo guion. | Con `/api/chat` caído, el chat sigue respondiendo. |
| BASE-RNF-13 | Humano en el ciclo: texto "Una persona del equipo revisa los casos importantes" y botón "Pasar a una persona" en todo chat. | La conversación aparece marcada en el panel. |
| BASE-RNF-14 | Privacidad: ningún formulario pide datos sensibles reales; aviso de datos ficticios en cada formulario. | Revisión de formularios. |
| BASE-RNF-15 | Navegadores: Chrome, Edge, Firefox y Safari iOS en sus dos últimas versiones. | Prueba manual del flujo principal. |
| BASE-RNF-16 | Despliegue en su subdominio `*.panacealogic.dev` con HTTPS. | URL pública funcionando. |
| BASE-RNF-17 | Zona horaria `America/Panama` en todas las fechas y horas. | Las horas del panel coinciden con la hora local. |

## Arquitectura sugerida

Conviene construir una sola vez lo que se repite en siete demos y reutilizarlo:

```
/shared
  whatsapp-sim/   marco de teléfono, burbujas, hora, doble check, "escribiendo…", adjuntos, botones rápidos
  chat-engine/    intenciones por palabras clave y sinónimos, captura de datos (slots), adaptador a /api/chat
  storage/        envoltorio de localStorage con respaldo en memoria, semillas y reinicio
  ui/             banner de demo, acceso al panel, modo Presentación, componentes base
/apps
  01-citas/ 02-factura/ … 10-dluxe-mayorista/
/api
  chat.js         función serverless opcional (modo IA real)
```

## Contrato del endpoint `/api/chat` (modo IA real)

```json
// Petición
{
  "demo": "citas",
  "sessionId": "abc123",
  "messages": [{ "role": "user", "content": "Quiero una cita mañana" }],
  "context": { "giro": "fisioterapia", "horariosLibres": ["2026-11-11T10:00", "2026-11-11T11:00"] },
  "attachments": [{ "type": "image", "dataUrl": "data:image/jpeg;base64,…" }]
}
// Respuesta
{
  "reply": "Con gusto. Tengo mañana a las 10:00 o a las 11:00 a. m. ¿Cuál prefiere?",
  "actions": [{ "type": "proponer_horarios", "payload": { "horarios": ["…"] } }],
  "handoff": false
}
```

- La IA nunca escribe directo en los datos: propone `actions` y el navegador solo aplica las que estén en la lista permitida de esa demo, validando cada `payload`.
- Las instrucciones del modelo incluyen el mismo flujo del modo guion y los datos de configuración de la demo (precios, horarios, catálogo); la IA no inventa precios, horarios ni datos fuera de ese contexto.
- La clave de API vive solo en la variable de entorno del servidor.

## Épica común: BASE-EP1 Esqueleto de demo

| ID | Historia | Criterios de aceptación | Prioridad | Tamaño |
| --- | --- | --- | --- | --- |
| BASE-HU1.1 | Como vendedor de Panacea quiero un banner de demo con enlaces a la web y al diagnóstico gratis, para convertir la reunión en una cita. | Banner visible en todas las rutas; enlaces abren en pestaña nueva; no tapa contenido en 360 px. | Must | S |
| BASE-HU1.2 | Como vendedor quiero datos semilla y un botón "Reiniciar demo", para empezar cada reunión desde cero. | Primera carga siembra datos; reiniciar borra y vuelve a sembrar; confirmación antes de borrar. | Must | S |
| BASE-HU1.3 | Como vendedor quiero entrar al panel con un botón, sin contraseña, para cambiar de vista rápido. | Botón "Entrar como administrador" lleva a `#/admin`; botón para volver a la vista de cliente. | Must | S |
| BASE-HU1.4 | Como prospecto quiero ver un WhatsApp que parezca real, para imaginarlo con mis clientes. | Burbujas, hora, doble check, indicador "escribiendo…", envío de imagen/PDF, botones rápidos; al lado, panel "En vivo" con los cambios que provoca cada mensaje. | Must | L |
| BASE-HU1.5 | Como desarrollador quiero un motor de conversación reutilizable, para no rehacer el bot en cada demo. | Intenciones con sinónimos y tolerancia a tildes y mayúsculas; captura de datos paso a paso; adaptador a `/api/chat` con respaldo al guion. | Must | L |
| BASE-HU1.6 | Como vendedor quiero un modo Presentación, para mostrar el flujo sin improvisar. | Botón que recorre el flujo principal paso a paso con una nota por paso; se puede pausar, avanzar y salir. | Should | M |
| BASE-HU1.7 | Como equipo quiero un README con instalación, despliegue y guion de 2 minutos, para que cualquiera de los cuatro socios pueda presentar. | README en español con esas tres secciones. | Must | S |
| BASE-HU1.8 | Como equipo quiero la demo publicada en su subdominio, para enviarla por enlace después de la reunión. | URL HTTPS funcionando y enlazada desde panacealogic.dev/productos si se decide mostrarla. | Must | S |

## Definición de terminado (común)

- El flujo principal funciona en móvil y escritorio sin errores en consola.
- El modo Presentación recorre el flujo completo.
- "Reiniciar demo" deja el estado semilla.
- Funciona con `localStorage` bloqueado.
- Lighthouse: Accesibilidad ≥ 90 y Rendimiento ≥ 85 en móvil.
- Ningún nombre, logo ni dato real; avisos de simulación donde corresponda.
- README actualizado y demo publicada en su subdominio.
