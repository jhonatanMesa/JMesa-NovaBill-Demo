import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { db, audit, userSelect } from '../database';
import { accessToken, digest, hashPassword, verifyPassword } from '../security';
import { LoginDto, RegisterDto } from '../dto';
@Injectable()
export class AuthService {
  async register(input: RegisterDto) {
    const passwordHash = await hashPassword(input.password);
    const user = await db.$transaction(async (tx) => {
      const org = await tx.organization.create({ data: { name: input.organizationName } });
      const user = await tx.user.create({
        data: {
          organizationId: org.id,
          name: input.name,
          email: input.email.toLowerCase(),
          passwordHash,
          role: 'ADMIN',
        },
      });
      await audit(tx, user, 'ORGANIZATION_CREATED', org.id);
      return user;
    });
    return this.session(user);
  }
  async login(input: LoginDto) {
    const user = await db.user.findUnique({ where: { email: input.email.toLowerCase() } });
    // A fixed dummy hash keeps the expensive password check on the unknown-user path.
    const valid = await verifyPassword(
      input.password,
      user?.passwordHash ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`,
    );
    if (!user?.active || !valid) throw new UnauthorizedException('Correo o contraseña incorrectos');
    await audit(db, user, 'LOGIN', user.id);
    return this.session(user);
  }
  private async session(user: { id: string; organizationId: string; sessionVersion: number }) {
    const raw = randomBytes(48).toString('hex');
    await db.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: digest(raw),
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    return {
      access: accessToken(user),
      refresh: raw,
      user: await db.user.findUniqueOrThrow({ where: { id: user.id }, select: userSelect }),
    };
  }
  async refresh(raw?: string) {
    if (!raw || raw.length > 200) throw new UnauthorizedException('Sesión no válida');
    const token = await db.refreshToken.findUnique({
      where: { tokenHash: digest(raw) },
      include: { user: true },
    });
    if (!token || token.revokedAt || token.expiresAt < new Date() || !token.user.active)
      throw new UnauthorizedException('Sesión no válida');
    const next = randomBytes(48).toString('hex');
    await db.$transaction(async (tx) => {
      const changed = await tx.refreshToken.updateMany({
        where: { id: token.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (changed.count !== 1) throw new UnauthorizedException('Token ya utilizado');
      await tx.refreshToken.create({
        data: {
          userId: token.userId,
          tokenHash: digest(next),
          expiresAt: new Date(Date.now() + 7 * 86400000),
        },
      });
    });
    return {
      access: accessToken(token.user),
      refresh: next,
      user: await db.user.findUniqueOrThrow({ where: { id: token.userId }, select: userSelect }),
    };
  }
  async logout(raw?: string) {
    if (raw && raw.length <= 200) {
      const token = await db.refreshToken.findUnique({ where: { tokenHash: digest(raw) } });
      if (token)
        await db.$transaction(async (tx) => {
          await tx.refreshToken.updateMany({
            where: { userId: token.userId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
          await tx.user.update({
            where: { id: token.userId },
            data: { sessionVersion: { increment: 1 } },
          });
        });
    }
    return { message: 'Sesión cerrada' };
  }
  recovery(email: string) {
    if (!email) throw new BadRequestException();
    return {
      message:
        'Simulación completada. No se envían correos ni se cambia la contraseña. Usa las credenciales demo o registra una empresa ficticia.',
    };
  }
}
