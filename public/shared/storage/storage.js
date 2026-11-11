// Envoltorio de localStorage: toda lectura y escritura va dentro de try/catch y, si el
// almacenamiento no está disponible (modo privado, bloqueado, lleno), la demo sigue
// funcionando en memoria.

const defaultBackend = () => globalThis.localStorage;

// Las claves que empiezan con "_" son temporales (por ejemplo, el texto original de un
// mensaje con posible dato de salud) y nunca se guardan.
const skipTransient = (key, value) => (key.startsWith('_') ? undefined : value);

export function createStorage(key, getBackend = defaultBackend) {
  let memory = null;
  let persistent = true;
  const backend = () => { try { return getBackend() || null; } catch { return null; } };

  return {
    load() {
      try {
        const b = backend();
        if (!b) persistent = false;
        else {
          const raw = b.getItem(key);
          if (raw != null) { memory = raw; return JSON.parse(raw); }
        }
      } catch { persistent = false; }
      if (memory != null) { try { return JSON.parse(memory); } catch { /* datos dañados */ } }
      return null;
    },
    save(data) {
      let raw;
      try { raw = JSON.stringify(data, skipTransient); } catch { return false; }
      memory = raw;
      try {
        const b = backend();
        if (!b) { persistent = false; return false; }
        b.setItem(key, raw);
        persistent = true;
        return true;
      } catch { persistent = false; return false; }
    },
    clear() {
      memory = null;
      try { backend()?.removeItem(key); } catch { /* sigue en memoria */ }
    },
    get persistent() { return persistent; },
  };
}
