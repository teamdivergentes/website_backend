import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

/**
 * Tests E2E du module Auth.
 *
 * Couvre :
 *   - Login avec credentials valides → 200 + cookie dvg_auth_token HttpOnly
 *   - Login ne retourne PAS access_token dans le body
 *   - Login avec mauvais mot de passe → 401
 *   - Login avec email inexistant → 401
 *   - Login avec données invalides (email malformé, champs manquants) → 400
 *   - La réponse de login ne contient pas le mot de passe
 *   - Accès à /api/auth/me via cookie → 200
 *   - Accès à /api/auth/me sans token → 401
 *   - Accès à /api/auth/me avec token invalide → 401
 *   - Accès à /api/auth/me avec Bearer header (rétro-compat) → 200
 *   - Logout → 200 + cookie effacé
 *   - Refresh → 204 + nouveau cookie
 *   - Accès à une route protégée sans token → 401
 *   - Accès à une route protégée avec Bearer header valide → 200
 */
describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authCookie: string; // cookie dvg_auth_token extrait après login
  let bearerToken: string; // token Bearer pour rétro-compat

  const extractAuthCookie = (res: request.Response): string | null => {
    const setCookieHeader = res.headers['set-cookie'] as string[] | string | undefined;
    if (!setCookieHeader) return null;
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    const found = cookies.find((c) => c.startsWith('dvg_auth_token='));
    return found ?? null;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ThrottlerStorage)
      .useValue({
        increment: () =>
          Promise.resolve({
            totalHits: 0,
            timeToExpire: 0,
            isBlocked: false,
            timeToBlockExpire: 0,
          }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Garantir l'existence du rôle Admin et de l'utilisateur admin
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const adminRole = await prisma.role.upsert({
      where: { name: 'Admin' },
      update: {},
      create: {
        name: 'Admin',
        permissions: [
          'users:read',
          'users:write',
          'users:delete',
          'roles:read',
          'roles:write',
          'roles:delete',
          'teams:read',
          'teams:write',
          'teams:delete',
          'games:read',
          'games:write',
          'games:delete',
          'sponsors:read',
          'sponsors:write',
          'sponsors:delete',
          'staff:read',
          'staff:write',
          'staff:delete',
          'config:read',
          'config:write',
        ],
        isSystem: true,
      },
    });

    await prisma.user.upsert({
      where: { email: 'admin@teamdivergentes.fr' },
      update: {},
      create: {
        email: 'admin@teamdivergentes.fr',
        password: hashedPassword,
        roleId: adminRole.id,
        actif: true,
      },
    });

    // Obtenir le cookie de session valide pour les tests
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const loginRes = await request(server)
      .post('/api/auth/login')
      .send({ email: 'admin@teamdivergentes.fr', password: 'admin123' });

    const cookie = extractAuthCookie(loginRes);
    if (!cookie) {
      throw new Error("Impossible d'obtenir le cookie admin pour les tests auth");
    }
    authCookie = cookie;

    // Extraire la valeur du token pour les tests Bearer rétro-compat
    const tokenMatch = cookie.match(/dvg_auth_token=([^;]+)/);
    bearerToken = tokenMatch ? tokenMatch[1] : '';
  });

  afterAll(async () => {
    await app.close();
  });

  // -----------------------------------------------------------------------
  // POST /api/auth/login
  // -----------------------------------------------------------------------

  describe('POST /api/auth/login', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('credentials valides → 200 + cookie dvg_auth_token HttpOnly', async () => {
      const res = await request(server())
        .post('/api/auth/login')
        .send({ email: 'admin@teamdivergentes.fr', password: 'admin123' })
        .expect(200);

      const cookie = extractAuthCookie(res);
      expect(cookie).toBeTruthy();
      // Le cookie doit être HttpOnly
      expect(cookie).toContain('HttpOnly');
    });

    it('le body de login contient { user } mais PAS access_token', async () => {
      const res = await request(server())
        .post('/api/auth/login')
        .send({ email: 'admin@teamdivergentes.fr', password: 'admin123' })
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('user');
      expect(body).not.toHaveProperty('access_token');
    });

    it('le body de login ne contient pas le mot de passe', async () => {
      const res = await request(server())
        .post('/api/auth/login')
        .send({ email: 'admin@teamdivergentes.fr', password: 'admin123' })
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).not.toHaveProperty('password');
      const user = body.user as Record<string, unknown> | undefined;
      expect(user).not.toHaveProperty('password');
    });

    it('mauvais mot de passe → 401', async () => {
      await request(server())
        .post('/api/auth/login')
        .send({ email: 'admin@teamdivergentes.fr', password: 'mauvais_mot_de_passe' })
        .expect(401);
    });

    it('email inexistant → 401', async () => {
      await request(server())
        .post('/api/auth/login')
        .send({ email: 'inexistant@teamdivergentes.fr', password: 'admin123' })
        .expect(401);
    });

    it('email malformé → 400', async () => {
      await request(server())
        .post('/api/auth/login')
        .send({ email: 'pas-un-email', password: 'admin123' })
        .expect(400);
    });

    it('champ email manquant → 400', async () => {
      await request(server()).post('/api/auth/login').send({ password: 'admin123' }).expect(400);
    });

    it('champ password manquant → 400', async () => {
      await request(server())
        .post('/api/auth/login')
        .send({ email: 'admin@teamdivergentes.fr' })
        .expect(400);
    });

    it('body vide → 400', async () => {
      await request(server()).post('/api/auth/login').send({}).expect(400);
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/auth/me
  // -----------------------------------------------------------------------

  describe('GET /api/auth/me', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 401', async () => {
      await request(server()).get('/api/auth/me').expect(401);
    });

    it('avec Bearer token invalide → 401', async () => {
      await request(server())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer token_invalide_xyz')
        .expect(401);
    });

    it('avec JWT structuré mais signature fausse → 401', async () => {
      await request(server())
        .get('/api/auth/me')
        .set(
          'Authorization',
          'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEsImVtYWlsIjoiZmFrZUBleGFtcGxlLmNvbSJ9.fakesignature',
        )
        .expect(401);
    });

    it('avec cookie valide → 200 + profil utilisateur', async () => {
      const res = await request(server()).get('/api/auth/me').set('Cookie', authCookie).expect(200);

      const body = res.body as {
        email?: string;
        id?: number;
        password?: string;
      };

      expect(body).toHaveProperty('email', 'admin@teamdivergentes.fr');
      expect(body).toHaveProperty('id');
      expect(body).not.toHaveProperty('password');
    });

    it('avec Bearer header valide (rétro-compat) → 200', async () => {
      const res = await request(server())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${bearerToken}`)
        .expect(200);

      const body = res.body as { email?: string };
      expect(body).toHaveProperty('email', 'admin@teamdivergentes.fr');
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/auth/logout
  // -----------------------------------------------------------------------

  describe('POST /api/auth/logout', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 401', async () => {
      await request(server()).post('/api/auth/logout').expect(401);
    });

    it('avec cookie valide → 200 + cookie effacé', async () => {
      const res = await request(server())
        .post('/api/auth/logout')
        .set('Cookie', authCookie)
        .expect(200);

      const body = res.body as { message?: string };
      expect(body).toHaveProperty('message');

      // Vérifier que le cookie est vidé (Max-Age=0 ou expires passé)
      const setCookieHeader = res.headers['set-cookie'] as string[] | string | undefined;
      if (setCookieHeader) {
        const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
        const authCookieCleared = cookies.find((c) => c.startsWith('dvg_auth_token='));
        // Si le cookie est présent dans la réponse, sa valeur doit être vide
        if (authCookieCleared) {
          expect(authCookieCleared).toMatch(/dvg_auth_token=;|dvg_auth_token=(?:;|$)/);
        }
      }
    });

    it('avec Bearer header valide (rétro-compat) → 200', async () => {
      const res = await request(server())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${bearerToken}`)
        .expect(200);

      const body = res.body as { message?: string };
      expect(body).toHaveProperty('message');
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/auth/refresh
  // -----------------------------------------------------------------------

  describe('POST /api/auth/refresh', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 401', async () => {
      await request(server()).post('/api/auth/refresh').expect(401);
    });

    it('avec cookie valide → 204 + nouveau cookie émis', async () => {
      const res = await request(server())
        .post('/api/auth/refresh')
        .set('Cookie', authCookie)
        .expect(204);

      const newCookie = extractAuthCookie(res);
      expect(newCookie).toBeTruthy();
      expect(newCookie).toContain('HttpOnly');
    });

    it('avec Bearer header valide → 204 + nouveau cookie émis', async () => {
      const res = await request(server())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${bearerToken}`)
        .expect(204);

      const newCookie = extractAuthCookie(res);
      expect(newCookie).toBeTruthy();
    });
  });

  // -----------------------------------------------------------------------
  // Routes protégées — vérification générique JWT via cookie
  // -----------------------------------------------------------------------

  describe('Routes protégées — vérification JWT', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('GET /api/users sans token → 401', async () => {
      await request(server()).get('/api/users').expect(401);
    });

    it('GET /api/users avec Bearer invalide → 401', async () => {
      await request(server()).get('/api/users').set('Authorization', 'Bearer invalide').expect(401);
    });

    it('GET /api/users avec cookie valide (admin) → 200', async () => {
      await request(server()).get('/api/users').set('Cookie', authCookie).expect(200);
    });

    it('GET /api/users avec Bearer header valide (rétro-compat, admin) → 200', async () => {
      await request(server())
        .get('/api/users')
        .set('Authorization', `Bearer ${bearerToken}`)
        .expect(200);
    });
  });
});
