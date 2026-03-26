import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

/**
 * Tests E2E du module Auth.
 *
 * Couvre :
 *   - Login avec credentials valides → 200 + access_token
 *   - Login avec mauvais mot de passe → 401
 *   - Login avec email inexistant → 401
 *   - Login avec données invalides (email malformé, champs manquants) → 400
 *   - Accès à /api/auth/me sans token → 401
 *   - Accès à /api/auth/me avec token invalide → 401
 *   - Accès à /api/auth/me avec token valide → 200
 *   - Logout → 200
 *   - Accès à une route protégée sans token → 401
 *   - Accès à une route protégée avec token invalide → 401
 *   - Accès à une route protégée avec token valide → 200
 */
describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let validToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ThrottlerStorage)
      .useValue({
        increment: async () => ({
          totalHits: 0,
          timeToExpire: 0,
          isBlocked: false,
          timeToBlockExpire: 0,
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
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

    // Obtenir un token valide pour les tests
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const loginRes = await request(server)
      .post('/api/auth/login')
      .send({ email: 'admin@teamdivergentes.fr', password: 'admin123' });

    const loginBody = loginRes.body as { access_token?: string };
    if (!loginBody.access_token) {
      throw new Error("Impossible d'obtenir le token admin pour les tests auth");
    }
    validToken = loginBody.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  // -----------------------------------------------------------------------
  // POST /api/auth/login
  // -----------------------------------------------------------------------

  describe('POST /api/auth/login', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('credentials valides → 200 + access_token', async () => {
      const res = await request(server())
        .post('/api/auth/login')
        .send({ email: 'admin@teamdivergentes.fr', password: 'admin123' })
        .expect(200);

      const body = res.body as { access_token?: string };
      expect(body).toHaveProperty('access_token');
      expect(typeof body.access_token).toBe('string');
      expect(body.access_token!.length).toBeGreaterThan(0);
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

    it('la réponse ne doit pas contenir le mot de passe', async () => {
      const res = await request(server())
        .post('/api/auth/login')
        .send({ email: 'admin@teamdivergentes.fr', password: 'admin123' })
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).not.toHaveProperty('password');
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

    it('avec token invalide → 401', async () => {
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

    it('avec token valide → 200 + profil utilisateur', async () => {
      const res = await request(server())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      const body = res.body as {
        email?: string;
        id?: number;
        password?: string;
      };

      expect(body).toHaveProperty('email', 'admin@teamdivergentes.fr');
      expect(body).toHaveProperty('id');
      // Le mot de passe ne doit jamais être exposé
      expect(body).not.toHaveProperty('password');
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

    it('avec token valide → 200', async () => {
      const res = await request(server())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      const body = res.body as { message?: string };
      expect(body).toHaveProperty('message');
    });
  });

  // -----------------------------------------------------------------------
  // Routes protégées — vérification générique JWT
  // -----------------------------------------------------------------------

  describe('Routes protégées — vérification JWT', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('GET /api/users sans token → 401', async () => {
      await request(server()).get('/api/users').expect(401);
    });

    it('GET /api/users avec token invalide → 401', async () => {
      await request(server()).get('/api/users').set('Authorization', 'Bearer invalide').expect(401);
    });

    it('GET /api/users avec token valide (admin) → 200', async () => {
      await request(server())
        .get('/api/users')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
    });
  });
});
