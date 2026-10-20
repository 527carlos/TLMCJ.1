import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from '../storage/dataStore.ts';
import { Usuario } from '../domain/types.ts';

const COOKIE_NAME = 'tlm_session';
const TTL_MS = 12 * 60 * 60 * 1000; // 12 horas
const isProd = process.env.NODE_ENV === 'production';

const secret = process.env.SESSION_SECRET || (isProd ? '' : crypto.randomBytes(32).toString('hex'));
if (!secret) {
  throw new Error('Falta SESSION_SECRET en el entorno de producción. Define una cadena larga y aleatoria en .env o en el panel de tu hosting.');
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie || '';
  const found = header.split(';').map(c => c.trim()).find(c => c.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

// Crea una sesión firmada (HMAC) y la guarda en una cookie httpOnly.
export function startSession(res: Response, usuario: Usuario) {
  const expires = Date.now() + TTL_MS;
  const payload = `${usuario.id_usuario}.${expires}`;
  res.cookie(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: TTL_MS,
    path: '/'
  });
}

export function endSession(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

// Devuelve el usuario de la sesión actual, o null si no hay sesión válida.
export function getSessionUser(req: Request): Usuario | null {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [id, expires, signature] = parts;
  const payload = `${id}.${expires}`;

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;
  if (Date.now() > Number(expires)) return null;

  const user = db.usuarios.find(u => u.id_usuario === Number(id));
  return user && user.activo ? user : null;
}

export function isAdminUser(user: Usuario | null | undefined): boolean {
  return !!user && (user.rol === 'Administrador' || user.permisos?.gestion_usuarios === true);
}

export function requireSession(req: Request, res: Response, next: NextFunction) {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ detail: "Debes iniciar sesión para continuar." });
  }
  (req as any).usuario = user;
  next();
}
