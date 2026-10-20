// Límite de intentos en memoria: bloquea una clave (cuenta, IP, correo) tras varios fallos.
// Con varias instancias del servidor cada una lleva su propio conteo.

type Entry = { fails: number; windowStart: number; lockedUntil: number };

const entries = new Map<string, Entry>();

function entryFor(key: string): Entry {
  let entry = entries.get(key);
  if (!entry) {
    entry = { fails: 0, windowStart: Date.now(), lockedUntil: 0 };
    entries.set(key, entry);
  }
  return entry;
}

// Segundos que faltan para desbloquear la clave (0 si no está bloqueada)
export function secondsLocked(key: string): number {
  const entry = entries.get(key);
  if (!entry) return 0;
  const remaining = entry.lockedUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

// Registra un fallo. Al llegar a `max` fallos dentro de `windowMs`, bloquea la clave por `lockMs`.
export function recordFailure(key: string, max: number, windowMs: number, lockMs: number) {
  const now = Date.now();
  const entry = entryFor(key);
  if (now - entry.windowStart > windowMs) {
    entry.fails = 0;
    entry.windowStart = now;
  }
  entry.fails += 1;
  if (entry.fails >= max) {
    entry.lockedUntil = now + lockMs;
    entry.fails = 0;
    entry.windowStart = now;
  }
}

// Bloquea la clave durante `ms` (por ejemplo, para espaciar envíos de códigos)
export function lockFor(key: string, ms: number) {
  entryFor(key).lockedUntil = Date.now() + ms;
}

export function clearAttempts(key: string) {
  entries.delete(key);
}

// Evita que el mapa crezca sin límite: elimina entradas sin bloqueo y con ventana vencida
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of entries) {
    if (entry.lockedUntil < now && now - entry.windowStart > 60 * 60 * 1000) {
      entries.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();
