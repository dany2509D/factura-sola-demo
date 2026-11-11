// Servidor estático mínimo para desarrollo local: sirve la carpeta public/ en http://localhost:5174
// (cambie el puerto con PORT=...). No guarda nada ni abre conexiones hacia afuera.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(new URL('../public/', import.meta.url)));
const PUERTO = Number(process.env.PORT) || 5174;
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

const servidor = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let ruta = normalize(decodeURIComponent(url.pathname));
    if (ruta.endsWith(sep) || ruta === '/') ruta = join(ruta, 'index.html');
    const archivo = resolve(join(RAIZ, ruta));
    if (archivo !== RAIZ && !archivo.startsWith(RAIZ + sep)) { res.writeHead(403); res.end('Prohibido'); return; }
    const info = await stat(archivo).catch(() => null);
    if (!info || !info.isFile()) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('No encontrado'); return; }
    const cuerpo = await readFile(archivo);
    res.writeHead(200, { 'content-type': TIPOS[extname(archivo)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(cuerpo);
  } catch { res.writeHead(500); res.end('Error'); }
});

servidor.listen(PUERTO, '127.0.0.1', () => {
  console.log(`Factura sola (demo) en http://localhost:${PUERTO}  ·  Ctrl+C para detener`);
});
