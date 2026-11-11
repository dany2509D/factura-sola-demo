// Marca por negocio y colores de estado (sección 12 de la especificación): los valores del CSS y de
// config.js tienen que coincidir, y los pares de color tienen que pasar contraste AA.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MARCAS, ESTADOS, CATALOGO_EN_TARJETAS } from '../public/app/config.js';
import { NEGOCIOS, ORDEN_NEGOCIOS } from '../public/app/data/catalogs.js';

const css = readFileSync(new URL('../public/app/app.css', import.meta.url), 'utf8');

const canal = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminancia = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * canal(n >> 16) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255); };
const contraste = (a, b) => { const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const variable = (bloque, nombre) => bloque.match(new RegExp(`${nombre}:\\s*(#[0-9a-fA-F]{6})`))?.[1].toLowerCase();
const bloqueNegocio = (id) => css.match(new RegExp(`html\\[data-negocio="${id}"\\]\\s*\\{([^}]*)\\}`))?.[1] ?? '';

test('cada negocio tiene su marca, y el CSS usa los mismos colores que config.js', () => {
  for (const id of ORDEN_NEGOCIOS) {
    assert.ok(NEGOCIOS[id], `existe el negocio ${id}`);
    assert.ok(MARCAS[id], `${id} tiene marca`);
    const b = bloqueNegocio(id);
    assert.ok(b, `app.css define --marca para ${id}`);
    assert.equal(variable(b, '--marca'), MARCAS[id].color.toLowerCase(), `${id}: --marca`);
    assert.equal(variable(b, '--marca-tinta'), MARCAS[id].tinta.toLowerCase(), `${id}: --marca-tinta`);
  }
});

test('la marca de cada negocio pasa contraste AA donde se usa', () => {
  for (const id of ORDEN_NEGOCIOS) {
    const b = bloqueNegocio(id);
    const marca = variable(b, '--marca'); const tinta = variable(b, '--marca-tinta');
    const suave = variable(b, '--marca-suave'); const fuerte = variable(b, '--marca-fuerte'); const barra = variable(b, '--marca-barra');
    assert.ok(contraste(tinta, marca) >= 4.5, `${id}: texto sobre el botón principal (${contraste(tinta, marca).toFixed(2)})`);
    assert.ok(contraste(fuerte, '#ffffff') >= 4.5, `${id}: acento sobre blanco (${contraste(fuerte, '#ffffff').toFixed(2)})`);
    assert.ok(contraste(fuerte, suave) >= 4.5, `${id}: acento sobre el fondo suave (${contraste(fuerte, suave).toFixed(2)})`);
    assert.ok(contraste(barra, '#ffffff') >= 3, `${id}: barras de los gráficos sobre blanco (${contraste(barra, '#ffffff').toFixed(2)})`);
  }
});

test('cada estado tiene ícono y tono, y los cinco tonos pasan contraste AA como texto sobre su fondo', () => {
  const tonos = new Set();
  for (const [id, e] of Object.entries(ESTADOS)) {
    assert.ok(e.nombre && e.ico && e.tono, `${id} tiene nombre, ícono y tono`);
    tonos.add(e.tono);
  }
  assert.deepEqual([...tonos].sort(), ['aviso', 'info', 'mal', 'neutro', 'ok']);
  for (const t of tonos) {
    const bg = variable(css, `--st-${t}-bg`); const fg = variable(css, `--st-${t}-fg`); const relleno = variable(css, `--st-${t}-fill`);
    assert.ok(bg && fg && relleno, `app.css define los tokens del tono ${t}`);
    assert.ok(contraste(fg, bg) >= 4.5, `${t}: texto sobre su fondo (${contraste(fg, bg).toFixed(2)})`);
    assert.ok(contraste('#ffffff', relleno) >= 4.5, `${t}: ícono blanco sobre el relleno (${contraste('#ffffff', relleno).toFixed(2)})`);
  }
});

test('el catálogo en tarjetas es solo del café', () => {
  assert.deepEqual(CATALOGO_EN_TARJETAS, ['ceiba']);
  assert.equal(NEGOCIOS.ceiba.tipo, 'Restaurante');
});
