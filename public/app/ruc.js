// Validación de FORMATO de RUC, DV y teléfono (no se calcula ningún dígito verificador: eso no está
// en la especificación; validar con la ficha técnica de la DGI). Los patrones viven en config.js.
import { PATRONES_RUC, DV_REGEX } from './config.js';

export const normalizaRuc = (s) => String(s ?? '').trim().toUpperCase().replace(/\s+/g, '');
export const normalizaDv = (s) => String(s ?? '').trim();

export const rucValido = (ruc) => PATRONES_RUC.some((p) => p.regex.test(normalizaRuc(ruc)));
export const ejemplosRuc = () => PATRONES_RUC.map((p) => `${p.ejemplo} (${p.nombre.toLowerCase()})`).join(', ');

/** Devuelve { ok, errores: { nombre?, ruc?, dv? } } con mensajes que explican qué falta. */
export function validarContribuyente({ nombre, ruc, dv }) {
  const errores = {};
  if (!String(nombre ?? '').trim()) errores.nombre = 'Escriba el nombre o la razón social del cliente.';
  const r = normalizaRuc(ruc);
  if (!r) errores.ruc = 'Escriba el RUC del cliente.';
  else if (!rucValido(r)) errores.ruc = `El RUC no tiene un formato válido. Ejemplos: ${ejemplosRuc()}.`;
  const d = normalizaDv(dv);
  if (!d) errores.dv = 'Escriba el DV (2 dígitos).';
  else if (!DV_REGEX.test(d)) errores.dv = 'El DV debe tener exactamente 2 dígitos, por ejemplo 07.';
  return { ok: Object.keys(errores).length === 0, errores };
}

/** Teléfono de WhatsApp opcional: vacío es válido; si se escribe, debe tener entre 7 y 15 dígitos. */
export function validarTelefono(s) {
  const t = String(s ?? '').trim();
  if (!t) return { ok: true, valor: '' };
  const digitos = t.replace(/\D/g, '');
  if (!/^\+?[\d\s().-]+$/.test(t) || digitos.length < 7 || digitos.length > 15) return { ok: false, error: 'Escriba un teléfono válido, por ejemplo +507 6123-4567.' };
  return { ok: true, valor: t };
}
