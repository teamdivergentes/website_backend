import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';

interface AuthenticatedRequest extends Request {
  user: { id: number; email: string };
}

/** Durée du cookie en secondes = 7 jours */
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 604 800 s

/** Options communes pour le cookie JWT */
const cookieOptions = (
  isProd: boolean,
): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
} => ({
  httpOnly: true,
  secure: isProd,
  // SameSite=Lax : cookie envoyé sur navigation top-level cross-origin
  // Compatible avec le proxy Nginx (même domaine en prod, cross-origin en dev)
  sameSite: 'lax',
  path: '/',
  maxAge: COOKIE_MAX_AGE_SECONDS * 1000, // Express attend des ms
});

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Roles('admin')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * Login — pose un cookie HttpOnly `dvg_auth_token` avec le JWT.
   * Retourne `{ user }` dans le body (sans le token pour éviter le XSS).
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    const { access_token, user } = await this.authService.login(loginDto);

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('dvg_auth_token', access_token, cookieOptions(isProd));

    return res.json({ user });
  }

  /**
   * Logout — efface le cookie `dvg_auth_token`.
   */
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie('dvg_auth_token', { path: '/' });
    return res.json({ message: 'Déconnexion réussie' });
  }

  /**
   * Refresh — émet un nouveau JWT et met à jour le cookie.
   * Retourne 204 No Content (le token est dans le cookie).
   */
  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refresh(@Request() req: AuthenticatedRequest, @Res() res: Response) {
    const { access_token } = await this.authService.refresh(req.user.id);

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('dvg_auth_token', access_token, cookieOptions(isProd));

    return res.status(204).json(null);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.id);
  }
}
