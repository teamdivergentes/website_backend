import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma.service';

export interface JwtPayload {
  sub: number;
  email: string;
}

interface RequestWithCookies {
  cookies?: Record<string, string>;
  headers?: Record<string, string | undefined>;
}

/**
 * Lit JWT_SECRET depuis l'environnement avec fail-fast.
 * Lève une erreur explicite au démarrage si la variable est absente ou vide
 * (SEC-002 — interdit le fallback en clair qui permettrait de forger des tokens).
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET est requis. Définissez cette variable d'environnement avant de démarrer l'application.",
    );
  }
  return secret;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Priorité 1 : cookie HttpOnly (sécurité maximale)
        (req: RequestWithCookies) => {
          if (req?.cookies?.dvg_auth_token) {
            return req.cookies.dvg_auth_token;
          }
          return null;
        },
        // Priorité 2 : Authorization: Bearer <token> (rétro-compat API / mobile)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
      passReqToCallback: false,
    });
  }

  /**
   * Méthode publique d'extraction exposée pour les tests unitaires.
   * Reproduit la logique des extracteurs dans le même ordre.
   */
  extractJwt(req: RequestWithCookies): string | null {
    // Priorité 1 : cookie
    if (req?.cookies?.dvg_auth_token) {
      return req.cookies.dvg_auth_token;
    }
    // Priorité 2 : Authorization Bearer
    const authHeader = req?.headers?.['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return null;
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user?.actif) {
      throw new UnauthorizedException('Utilisateur non autorisé');
    }

    // Retourner l'utilisateur sans le mot de passe
    const { password: _password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
