import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

/**
 * Tests E2E d'autorisation par rôle.
 *
 * Ce fichier vérifie que :
 *   1. Un utilisateur authentifié sans le rôle "admin" se voit refuser l'accès
 *      aux ressources protégées (@Roles('admin')).
 *   2. Un utilisateur authentifié (peu importe le rôle) peut accéder aux endpoints
 *      protégés seulement par JwtAuthGuard (sans restriction de rôle).
 *   3. Les endpoints publics (@Public()) sont toujours accessibles sans token.
 *
 * Stratégie :
 *   - Créer un rôle "Viewer" avec des permissions limitées (games:read uniquement)
 *   - Créer un utilisateur "viewer" avec ce rôle
 *   - Se connecter avec cet utilisateur
 *   - Vérifier les accès autorisés et refusés
 *   - Nettoyer les données créées dans afterAll
 */
describe('Authorization E2E - Role-Based Access Control', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Tokens
  let adminToken: string;
  let viewerToken: string;

  // IDs créés pendant les tests (pour nettoyage)
  let viewerRoleId: number;
  let viewerUserId: number;
  let createdGameId: number | undefined;

  // -----------------------------------------------------------------------
  // Setup
  // -----------------------------------------------------------------------

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

    // --- Garantir l'existence du rôle Admin et de l'utilisateur admin ---
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
      throw new Error("Impossible d'obtenir le token admin pour les tests d'autorisation");
    }
    adminToken = adminBody.access_token;

    // --- Créer un rôle "Viewer" de test avec permissions limitées ---
    // Nettoyer d'abord au cas où un run précédent aurait échoué sans cleanup
    const existingViewer = await prisma.role.findFirst({
      where: { name: 'E2E_Viewer_TestRole' },
    });
    if (existingViewer) {
      // Supprimer les users associés d'abord
      await prisma.user.deleteMany({ where: { roleId: existingViewer.id } });
      await prisma.role.delete({ where: { id: existingViewer.id } });
    }

    const viewerRole = await prisma.role.create({
      data: {
        name: 'E2E_Viewer_TestRole',
        permissions: ['games:read'],
        isSystem: false,
      },
    });
    viewerRoleId = viewerRole.id;

    // --- Créer un utilisateur viewer de test ---
    const hashedViewerPassword = await bcrypt.hash('viewer_password_E2E', 10);

    const viewerUser = await prisma.user.create({
      data: {
        email: 'e2e_viewer_test@teamdivergentes.fr',
        password: hashedViewerPassword,
        roleId: viewerRoleId,
        actif: true,
      },
    });
    viewerUserId = viewerUser.id;

    // Login viewer
    const viewerLogin = await request(server).post('/api/auth/login').send({
      email: 'e2e_viewer_test@teamdivergentes.fr',
      password: 'viewer_password_E2E',
    });

    const viewerBody = viewerLogin.body as { access_token?: string };
    if (!viewerBody.access_token) {
      throw new Error("Impossible d'obtenir le token viewer pour les tests d'autorisation");
    }
    viewerToken = viewerBody.access_token;
  });

  afterAll(async () => {
    // Nettoyage : supprimer les données créées pendant les tests
    if (createdGameId) {
      await prisma.game.delete({ where: { id: createdGameId } }).catch(() => {
        // Ignorer les erreurs si le jeu a déjà été supprimé
      });
    }

    if (viewerUserId) {
      await prisma.user.delete({ where: { id: viewerUserId } }).catch(() => {});
    }

    if (viewerRoleId) {
      await prisma.role.delete({ where: { id: viewerRoleId } }).catch(() => {});
    }

    await app.close();
  });

  // -----------------------------------------------------------------------
  // 1. Endpoints publics — accessibles sans token
  // -----------------------------------------------------------------------

  describe('1. Endpoints publics — accessibles sans token', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('GET /api/games → 200 sans token (endpoint public)', async () => {
      await request(server()).get('/api/games').expect(200);
    });

    it('GET /api/games/active → 200 sans token (endpoint public)', async () => {
      await request(server()).get('/api/games/active').expect(200);
    });

    it('GET /api/teams → 200 sans token (endpoint public)', async () => {
      await request(server()).get('/api/teams').expect(200);
    });

    it('GET /api/staff → 200 sans token (endpoint public)', async () => {
      await request(server()).get('/api/staff').expect(200);
    });

    it('GET /api/sponsors → 200 sans token (endpoint public)', async () => {
      await request(server()).get('/api/sponsors').expect(200);
    });

    it('GET /api/config → 200 sans token (endpoint public)', async () => {
      await request(server()).get('/api/config').expect(200);
    });

    it('GET /api/recruitment → 200 sans token (endpoint public)', async () => {
      await request(server()).get('/api/recruitment').expect(200);
    });

    it('GET /health → 200 sans token (healthcheck public)', async () => {
      await request(server()).get('/health').expect(200);
    });
  });

  // -----------------------------------------------------------------------
  // 2. Utilisateur "Viewer" — accès aux endpoints protégés seulement par JWT
  // -----------------------------------------------------------------------

  describe('2. Utilisateur Viewer — accès aux endpoints JWT (sans restriction de rôle)', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('GET /api/roles → 200 (authentifié, pas de restriction de rôle sur GET)', async () => {
      await request(server())
        .get('/api/roles')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);
    });

    it('GET /api/auth/me → 200 (profil courant, protégé JWT uniquement)', async () => {
      await request(server())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);
    });
  });

  // -----------------------------------------------------------------------
  // 3. Utilisateur "Viewer" — accès refusé aux endpoints @Roles('admin')
  // -----------------------------------------------------------------------

  describe('3. Utilisateur Viewer — accès refusé aux endpoints @Roles("admin")', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it("POST /api/games → 403 (viewer n'a pas le rôle admin)", async () => {
      await request(server())
        .post('/api/games')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ key: 'test_viewer_game', name: 'Jeu Viewer Test' })
        .expect(403);
    });

    it("GET /api/users → 403 (viewer n'a pas le rôle admin)", async () => {
      await request(server())
        .get('/api/users')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it("POST /api/users → 403 (viewer n'a pas le rôle admin)", async () => {
      await request(server())
        .post('/api/users')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          email: 'test_forbidden@example.com',
          password: 'password12345',
          roleId: viewerRoleId,
        })
        .expect(403);
    });

    it("POST /api/roles → 403 (viewer n'a pas le rôle admin)", async () => {
      await request(server())
        .post('/api/roles')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'RoleForbidden', permissions: [] })
        .expect(403);
    });

    it("DELETE /api/games/1 → 403 (viewer n'a pas le rôle admin)", async () => {
      await request(server())
        .delete('/api/games/1')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it("POST /api/config → 403 (viewer n'a pas le rôle admin)", async () => {
      await request(server())
        .post('/api/config')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ key: 'test_key', value: 'test_value' })
        .expect(403);
    });

    it("PUT /api/config/:key → 403 (viewer n'a pas le rôle admin)", async () => {
      await request(server())
        .put('/api/config/some_config_key')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ value: 'new_value' })
        .expect(403);
    });

    it("GET /api/sponsors/admin/all → 403 (viewer n'a pas le rôle admin)", async () => {
      await request(server())
        .get('/api/sponsors/admin/all')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it("POST /api/staff → 403 (viewer n'a pas le rôle admin)", async () => {
      await request(server())
        .post('/api/staff')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          name: 'Test Staff Forbidden',
          category: 'ADMIN',
        })
        .expect(403);
    });

    it("POST /api/upload/image → 403 (viewer n'a pas le rôle admin)", async () => {
      const fakeImage = Buffer.from('fake image content');
      await request(server())
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${viewerToken}`)
        .attach('file', fakeImage, {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(403);
    });

    it("GET /api/recruitment/admin/all → 403 (viewer n'a pas le rôle admin)", async () => {
      await request(server())
        .get('/api/recruitment/admin/all')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it("GET /api/users/:id → 403 (viewer n'a pas le rôle admin)", async () => {
      await request(server())
        .get('/api/users/1')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });
  });

  // -----------------------------------------------------------------------
  // 4. Admin — accès autorisé à tous les endpoints @Roles('admin')
  // -----------------------------------------------------------------------

  describe('4. Admin — accès autorisé aux endpoints @Roles("admin")', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('GET /api/users → 200 (admin)', async () => {
      await request(server())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('GET /api/roles → 200 (admin)', async () => {
      await request(server())
        .get('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('GET /api/sponsors/admin/all → 200 (admin)', async () => {
      await request(server())
        .get('/api/sponsors/admin/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('POST /api/games → 201 (admin peut créer un jeu)', async () => {
      const res = await request(server())
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ key: 'e2e_auth_test_game', name: 'Jeu Test Autorisation E2E' })
        .expect(201);

      const body = res.body as { id?: number };
      if (body.id) {
        createdGameId = body.id;
      }
    });

    it('GET /api/recruitment/admin/all → 200 (admin)', async () => {
      await request(server())
        .get('/api/recruitment/admin/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  // -----------------------------------------------------------------------
  // 5. Escalade de privilèges — tentatives de contournement
  // -----------------------------------------------------------------------

  describe('5. Escalade de privilèges — tentatives de contournement', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('Viewer ne peut pas modifier son propre rôle via PATCH /api/users/:id/role', async () => {
      // Un viewer essaie de s'attribuer le rôle admin — doit être refusé
      const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
      if (!adminRole) {
        return;
      }

      await request(server())
        .patch(`/api/users/${viewerUserId}/role`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ roleId: adminRole.id })
        .expect(403);
    });

    it('Viewer ne peut pas désactiver un autre utilisateur via PATCH /api/users/:id/toggle', async () => {
      await request(server())
        .patch('/api/users/1/toggle')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it('Viewer ne peut pas supprimer un utilisateur via DELETE /api/users/:id', async () => {
      await request(server())
        .delete('/api/users/1')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it('Viewer ne peut pas supprimer un rôle via DELETE /api/roles/:id', async () => {
      await request(server())
        .delete(`/api/roles/${viewerRoleId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it('Admin ne peut pas se supprimer lui-même (self-delete protection)', async () => {
      // Récupérer l'ID de l'admin
      const adminUser = await prisma.user.findUnique({
        where: { email: 'admin@teamdivergentes.fr' },
      });

      if (!adminUser) {
        return;
      }

      await request(server())
        .delete(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('Admin ne peut pas se désactiver lui-même (self-deactivation protection)', async () => {
      const adminUser = await prisma.user.findUnique({
        where: { email: 'admin@teamdivergentes.fr' },
      });

      if (!adminUser) {
        return;
      }

      await request(server())
        .patch(`/api/users/${adminUser.id}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });
});
