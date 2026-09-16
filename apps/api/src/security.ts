import { randomBytes, scrypt as rawScrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import jwt from 'jsonwebtoken';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { db, Actor } from './database';
const scrypt = promisify(rawScrypt);
export type AuthRequest = Request & { actor: Actor };
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [salt, value] = hash.split(':');
  if (!salt || !value) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(value, 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
export function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 48 || value.startsWith('replace'))
    throw new Error('Genera JWT_SECRET con npm run setup');
  return value;
}
export function accessToken(user: { id: string; organizationId: string; sessionVersion: number }) {
  return jwt.sign({ org: user.organizationId, version: user.sessionVersion }, secret(), {
    algorithm: 'HS256',
    subject: user.id,
    issuer: 'novabill-demo',
    audience: 'novabill-web',
    expiresIn: '15m',
  });
}
export function setCookies(res: Response, access: string, refresh: string) {
  const options = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'strict' as const,
    path: '/api',
  };
  res.cookie('nb_access', access, { ...options, maxAge: 15 * 60 * 1000 });
  res.cookie('nb_refresh', refresh, { ...options, maxAge: 7 * 86400000 });
}
export function clearCookies(res: Response) {
  res.clearCookie('nb_access', { path: '/api' });
  res.clearCookie('nb_refresh', { path: '/api' });
}
const buckets = new Map<string, { count: number; until: number }>();
export function rateLimit(req: Request, _res: Response, next: NextFunction) {
  const now = Date.now();
  for (const [key, value] of buckets) if (value.until <= now) buckets.delete(key);
  const auth = req.path.startsWith('/api/auth/');
  const key = `${req.ip}:${auth ? 'auth' : 'api'}`;
  const bucket = buckets.get(key) ?? { count: 0, until: now + 60000 };
  bucket.count++;
  buckets.set(key, bucket);
  if (bucket.count > (auth ? 45 : 600))
    return next(new HttpException('Demasiadas solicitudes. Reintenta en un minuto.', 429));
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    (req.headers.origin !== process.env.APP_ORIGIN || req.headers['x-novabill-request'] !== '1')
  )
    return next(new ForbiddenException('Origen de solicitud no autorizado'));
  next();
}
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(req.cookies?.nb_access ?? '', secret(), {
        algorithms: ['HS256'],
        issuer: 'novabill-demo',
        audience: 'novabill-web',
      }) as jwt.JwtPayload;
    } catch {
      throw new UnauthorizedException('Sesión vencida');
    }
    const user = await db.user.findFirst({
      where: { id: payload.sub, organizationId: payload.org, active: true },
    });
    if (!user || user.sessionVersion !== payload.version)
      throw new UnauthorizedException('Sesión no válida');
    req.actor = {
      id: user.id,
      organizationId: user.organizationId,
      role: user.role,
      name: user.name,
      email: user.email,
    };
    return true;
  }
}
export function requireRole(actor: Actor, ...roles: Actor['role'][]) {
  if (!roles.includes(actor.role)) throw new ForbiddenException('Tu rol no permite esta operación');
}
