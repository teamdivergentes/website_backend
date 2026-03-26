import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

/**
 * Tests E2E du module Users.
 *
 * Couvre :
 *   - GET /api/users (admin) → 200 + liste paginée
 *   - GET /api/users (non-admin) → 403
 *   - GET /api/users sans token → 401
 *   - GET /api/users/:id (admin) → 200 + détail user
 *   - GET /api/users/:id inexistant → 404
 *   - POST /api/users (admin) → 201
 *   - POST /api/users avec données invalides → 400
 *   - PUT /api/users/:id (admin) → 200
 *   - PATCH /api/users/:id/toggle (admin) → 200
 *   - PATCH /api/users/:id/role (admin) → 200
 *   - DELETE /api/users/:id (admin) → 200
 *   - DELETE /api/users/self (admin) → 403 (auto-protection)
 */
describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let nonAdminToken: string;
  let nonAdminRoleId: number;
  let nonAdminUserId: number;

  // IDs créés pendant les tests (pour nettoyage)
  const createdUserIds: number[] = [];

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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    // Garantir le rôle Admin et l'utilisateur admin
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);

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
        password: hashedAdminPassword,
        roleId: adminRole.id,
        actif: true,
      },
    });

    // Login admin
    const adminLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: 'admin@teamdivergentes.fr', password: 'admin123' });

    const adminBody = adminLogin.body as { access_token?: string };
    if (!adminBody.access_token) {
      throw new Error("Impossible d'obtenir le token admin");
    }
    adminToken = adminBody.access_token;

    // Créer un rôle non-admin pour les tests d'autorisation
    const existingNonAdmin = await prisma.role.findFirst({
      where: { name: 'E2E_Users_NonAdmin' },
    });
    if (existingNonAdmin) {
      await prisma.user.deleteMany({ where: { roleId: existingNonAdmin.id } });
      await prisma.role.delete({ where: { id: existingNonAdmin.id } });
    }

    const nonAdminRole = await prisma.role.create({
      data: {
        name: 'E2E_Users_NonAdmin',
        permissions: ['games:read'],
        isSystem: false,
      },
    });
    nonAdminRoleId = nonAdminRole.id;

    // Créer un utilisateur non-admin
    const hashedNonAdminPassword = await bcrypt.hash('password_e2e_users', 10);
    const nonAdminUser = await prisma.user.create({
      data: {
        email: 'e2e_users_nonadmin@teamdivergentes.fr',
        password: hashedNonAdminPassword,
        roleId: nonAdminRoleId,
        actif: true,
      },
    });
    nonAdminUserId = nonAdminUser.id;

    // Login non-admin
    const nonAdminLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: 'e2e_users_nonadmin@teamdivergentes.fr', password: 'password_e2e_users' });

    const nonAdminBody = nonAdminLogin.body as { access_token?: string };
    if (!nonAdminBody.access_token) {
      throw new Error("Impossible d'obtenir le token non-admin");
    }
    nonAdminToken = nonAdminBody.access_token;
  });

  afterAll(async () => {
    // Nettoyage des utilisateurs créés pendant les tests
    for (const userId of createdUserIds) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }

    // Nettoyage du user et du rôle non-admin
    if (nonAdminUserId) {
      await prisma.user.delete({ where: { id: nonAdminUserId } }).catch(() => {});
    }
    if (nonAdminRoleId) {
      await prisma.role.delete({ where: { id: nonAdminRoleId } }).catch(() => {});
    }

    await app.close();
  });

  // -----------------------------------------------------------------------
  // GET /api/users
  // -----------------------------------------------------------------------

  describe('GET /api/users', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 401', async () => {
      await request(server()).get('/api/users').expect(401);
    });

    it('non-admin → 403', async () => {
      await request(server())
        .get('/api/users')
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .expect(403);
    });

    it('admin → 200 + liste des utilisateurs', async () => {
      const res = await request(server())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // PaginationDto has default values (page=1, limit=20) applied by class-transformer,
      // so the controller always routes to findAllPaginated returning a paginated response.
      const body = res.body as {
        data?: unknown[];
        meta?: { total: number; page: number; limit: number; totalPages: number };
      };
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('admin avec pagination → 200 + liste paginée avec meta', async () => {
      const res = await request(server())
        .get('/api/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = res.body as {
        data?: unknown[];
        meta?: { total: number; page: number; limit: number; totalPages: number };
      };
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toHaveProperty('total');
      expect(body.meta).toHaveProperty('page');
      expect(body.meta).toHaveProperty('limit');
    });

    it('admin avec recherche → 200', async () => {
      const res = await request(server())
        .get('/api/users?search=admin&page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = res.body as { data?: unknown[] };
      expect(body).toHaveProperty('data');
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/users/:id
  // -----------------------------------------------------------------------

  describe('GET /api/users/:id', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 401', async () => {
      await request(server()).get('/api/users/1').expect(401);
    });

    it('non-admin → 403', async () => {
      await request(server())
        .get('/api/users/1')
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .expect(403);
    });

    it('admin, id inexistant → 404', async () => {
      await request(server())
        .get('/api/users/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('admin, id valide → 200 + détail sans mot de passe', async () => {
      // Récupérer l'ID de l'admin
      const adminUser = await prisma.user.findUnique({
        where: { email: 'admin@teamdivergentes.fr' },
      });
      expect(adminUser).not.toBeNull();

      const res = await request(server())
        .get(`/api/users/${adminUser!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = res.body as {
        id?: number;
        email?: string;
        password?: string;
      };
      expect(body).toHaveProperty('id', adminUser!.id);
      expect(body).toHaveProperty('email', 'admin@teamdivergentes.fr');
      expect(body).not.toHaveProperty('password');
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/users
  // -----------------------------------------------------------------------

  describe('POST /api/users', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 401', async () => {
      await request(server())
        .post('/api/users')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(401);
    });

    it('non-admin → 403', async () => {
      await request(server())
        .post('/api/users')
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .send({ email: 'test_forbidden@example.com', password: 'password12345' })
        .expect(403);
    });

    it('admin, body vide → 400', async () => {
      await request(server())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('admin, email invalide → 400', async () => {
      await request(server())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'pas-un-email', password: 'password123' })
        .expect(400);
    });

    it('admin, mot de passe trop court (<8 chars) → 400', async () => {
      await request(server())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'test_short@example.com', password: 'court' })
        .expect(400);
    });

    it('admin, données valides → 201 + utilisateur créé sans mot de passe', async () => {
      const res = await request(server())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'e2e_created_user@teamdivergentes.fr',
          password: 'password_valide_123',
          roleId: nonAdminRoleId,
          actif: true,
        })
        .expect(201);

      const body = res.body as { id?: number; email?: string; password?: string };
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('email', 'e2e_created_user@teamdivergentes.fr');
      expect(body).not.toHaveProperty('password');

      if (body.id) {
        createdUserIds.push(body.id);
      }
    });

    it('admin, email dupliqué → 409 ou 400', async () => {
      // Tenter de créer un utilisateur avec le même email que l'admin
      const res = await request(server())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'admin@teamdivergentes.fr',
          password: 'password_valide_123',
        });

      expect([400, 409]).toContain(res.status);
    });
  });

  // -----------------------------------------------------------------------
  // PUT /api/users/:id
  // -----------------------------------------------------------------------

  describe('PUT /api/users/:id', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('non-admin → 403', async () => {
      await request(server())
        .put(`/api/users/${nonAdminUserId}`)
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .send({ actif: false })
        .expect(403);
    });

    it('admin, id inexistant → 404', async () => {
      await request(server())
        .put('/api/users/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ actif: false })
        .expect(404);
    });

    it('admin, données valides → 200 + utilisateur mis à jour', async () => {
      const res = await request(server())
        .put(`/api/users/${nonAdminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ actif: false })
        .expect(200);

      const body = res.body as { actif?: boolean };
      expect(body).toHaveProperty('actif', false);

      // Remettre actif à true pour ne pas impacter les autres tests
      await request(server())
        .put(`/api/users/${nonAdminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ actif: true });
    });
  });

  // -----------------------------------------------------------------------
  // PATCH /api/users/:id/toggle
  // -----------------------------------------------------------------------

  describe('PATCH /api/users/:id/toggle', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('non-admin → 403', async () => {
      await request(server())
        .patch(`/api/users/${nonAdminUserId}/toggle`)
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .expect(403);
    });

    it('admin, auto-désactivation → 403', async () => {
      const adminUser = await prisma.user.findUnique({
        where: { email: 'admin@teamdivergentes.fr' },
      });
      expect(adminUser).not.toBeNull();

      await request(server())
        .patch(`/api/users/${adminUser!.id}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('admin, autre utilisateur → 200', async () => {
      const res = await request(server())
        .patch(`/api/users/${nonAdminUserId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = res.body as { actif?: boolean };
      expect(body).toHaveProperty('actif');

      // Remettre actif à true
      await request(server())
        .patch(`/api/users/${nonAdminUserId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`);
    });
  });

  // -----------------------------------------------------------------------
  // PATCH /api/users/:id/role
  // -----------------------------------------------------------------------

  describe('PATCH /api/users/:id/role', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('non-admin → 403', async () => {
      const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
      expect(adminRole).not.toBeNull();

      await request(server())
        .patch(`/api/users/${nonAdminUserId}/role`)
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .send({ roleId: adminRole!.id })
        .expect(403);
    });

    it('admin, roleId invalide (non entier) → 400', async () => {
      await request(server())
        .patch(`/api/users/${nonAdminUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleId: 'pas-un-entier' })
        .expect(400);
    });

    it('admin, roleId valide → 200', async () => {
      const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
      expect(adminRole).not.toBeNull();

      const res = await request(server())
        .patch(`/api/users/${nonAdminUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleId: adminRole!.id })
        .expect(200);

      const body = res.body as { roleId?: number };
      expect(body).toHaveProperty('roleId', adminRole!.id);

      // Remettre le rôle non-admin
      await request(server())
        .patch(`/api/users/${nonAdminUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleId: nonAdminRoleId });
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /api/users/:id
  // -----------------------------------------------------------------------

  describe('DELETE /api/users/:id', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 401', async () => {
      await request(server()).delete('/api/users/99999').expect(401);
    });

    it('non-admin → 403', async () => {
      await request(server())
        .delete('/api/users/99999')
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .expect(403);
    });

    it('admin, auto-suppression → 403', async () => {
      const adminUser = await prisma.user.findUnique({
        where: { email: 'admin@teamdivergentes.fr' },
      });
      expect(adminUser).not.toBeNull();

      await request(server())
        .delete(`/api/users/${adminUser!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('admin, id inexistant → 404', async () => {
      await request(server())
        .delete('/api/users/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('admin, utilisateur valide → 200', async () => {
      // Créer un utilisateur temporaire à supprimer
      const hashedPwd = await bcrypt.hash('temp_password_123', 10);
      const tempUser = await prisma.user.create({
        data: {
          email: 'e2e_to_delete@teamdivergentes.fr',
          password: hashedPwd,
          roleId: nonAdminRoleId,
          actif: true,
        },
      });

      const res = await request(server())
        .delete(`/api/users/${tempUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = res.body as { message?: string };
      expect(body).toHaveProperty('message');

      // Vérifier la suppression
      await request(server())
        .get(`/api/users/${tempUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
