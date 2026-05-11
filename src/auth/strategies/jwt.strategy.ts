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

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
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
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
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

    if (!user || !user.actif) {
      throw new UnauthorizedException('Utilisateur non autorisé');
    }

    // Retourner l'utilisateur sans le mot de passe
    const { password: _password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
