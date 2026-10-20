import crypto from 'crypto';

// Formato guardado: "scrypt$<salt hex>$<hash hex>"
const PREFIX = 'scrypt';
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${PREFIX}$${salt}$${hash}`;
}

export function isHashed(stored: string | undefined): boolean {
  return typeof stored === 'string' && stored.startsWith(`${PREFIX}$`);
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!isHashed(stored)) return false;
  const [, salt, hash] = stored.split('$');
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(password, salt, KEY_LENGTH);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// Compatibilidad con registros antiguos guardados en texto plano.
// Se usan solo para migrar: al iniciar sesión, el registro se vuelve a guardar con scrypt.
export function matchesLegacyPassword(password: string, stored: string): boolean {
  if (isHashed(stored)) return false;
  return stored === password || stored === `hash_${password}`;
}
