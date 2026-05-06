import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { loginAsAdmin } from './helpers/login';

/**
 * Tests E2E du module Recruitment (offres de recrutement).
 *
 * Couvre :
 *   - GET /api/recruitment (public) → 200 + liste des offres actives
 *   - GET /api/recruitment/:id (public) → 200 + détail
 *   - GET /api/recruitment/:id inexistant → 404
 *   - GET /api/recruitment/admin/all (admin) → 200 + toutes les offres
 *   - GET /api/recruitment/admin/all sans auth → 401
 *   - POST /api/recruitment (admin) → 201
 *   - POST /api/recruitment sans auth → 401
 *   - POST /api/recruitment avec données invalides → 400
 *   - PUT /api/recruitment/:id (admin) → 200
 *   - PATCH /api/recruitment/:id/toggle (admin) → 200
 *   - DELETE /api/recruitment/:id (admin) → 200
 *   - DELETE /api/recruitment/:id sans auth → 401
 */
describe('RecruitmentController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;

  // Données créées pendant les tests (pour nettoyage)
  const createdPostIds: number[] = [];

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

    // Garantir le rôle Admin et l'utilisateur admin
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

    // Login admin via cookie
    const { token } = await loginAsAdmin(server);
    adminToken = token;

    // Nettoyer les posts E2E résiduels
    await prisma.recruitmentPost
      .deleteMany({ where: { title: { startsWith: 'E2E_Post_' } } })
      .catch(() => {});
  });

  afterAll(async () => {
    // Nettoyage des posts créés
    for (const postId of createdPostIds) {
      await prisma.recruitmentPost.delete({ where: { id: postId } }).catch(() => {});
    }
    await prisma.recruitmentPost
      .deleteMany({ where: { title: { startsWith: 'E2E_Post_' } } })
      .catch(() => {});

    await app.close();
  });

  // -----------------------------------------------------------------------
  // GET /api/recruitment — endpoint public
  // -----------------------------------------------------------------------

  describe('GET /api/recruitment', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 200 (endpoint public)', async () => {
      const res = await request(server()).get('/api/recruitment').expect(200);

      const body = res.body as unknown;
      expect(Array.isArray(body)).toBe(true);
    });

    it('ne retourne que les offres actives', async () => {
      const res = await request(server()).get('/api/recruitment').expect(200);

      const posts = res.body as Array<{ active?: boolean }>;
      // Toutes les offres retournées doivent être actives
      posts.forEach((post) => {
        expect(post.active).toBe(true);
      });
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/recruitment/admin/all — liste complète (admin)
  // -----------------------------------------------------------------------

  describe('GET /api/recruitment/admin/all', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 401', async () => {
      await request(server()).get('/api/recruitment/admin/all').expect(401);
    });

    it('admin → 200 + toutes les offres (actives et inactives)', async () => {
      const res = await request(server())
        .get('/api/recruitment/admin/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = res.body as unknown;
      expect(Array.isArray(body)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/recruitment — création
  // -----------------------------------------------------------------------

  describe('POST /api/recruitment', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 401', async () => {
      await request(server())
        .post('/api/recruitment')
        .send({
          title: 'Test Post',
          type: 'Bénévole',
          description: 'Description de test',
        })
        .expect(401);
    });

    it('admin, body vide → 400', async () => {
      await request(server())
        .post('/api/recruitment')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('admin, title manquant → 400', async () => {
      await request(server())
        .post('/api/recruitment')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'Bénévole',
          description: 'Description de test',
        })
        .expect(400);
    });

    it('admin, type manquant → 400', async () => {
      await request(server())
        .post('/api/recruitment')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Post sans type',
          description: 'Description de test',
        })
        .expect(400);
    });

    it('admin, description manquante → 400', async () => {
      await request(server())
        .post('/api/recruitment')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Post sans description',
          type: 'Bénévole',
        })
        .expect(400);
    });

    it('admin, données valides → 201 + offre créée', async () => {
      const res = await request(server())
        .post('/api/recruitment')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'E2E_Post_Developpeur',
          type: 'Bénévole',
          description: 'Poste de développeur pour les tests E2E.',
          location: 'Télétravail',
          duration: 'Long terme',
          active: true,
        })
        .expect(201);

      const body = res.body as {
        id?: number;
        title?: string;
        type?: string;
        description?: string;
        slug?: string;
      };

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('title', 'E2E_Post_Developpeur');
      expect(body).toHaveProperty('type', 'Bénévole');
      expect(body).toHaveProperty('description');

      createdPostIds.push(body.id!);
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/recruitment/:id — détail offre (public)
  // -----------------------------------------------------------------------

  describe('GET /api/recruitment/:id', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('id inexistant → 404', async () => {
      await request(server()).get('/api/recruitment/99999').expect(404);
    });

    it("id valide → 200 + détail de l'offre", async () => {
      expect(createdPostIds.length).toBeGreaterThan(0);
      const postId = createdPostIds[0];

      const res = await request(server()).get(`/api/recruitment/${postId}`).expect(200);

      const body = res.body as {
        id?: number;
        title?: string;
        type?: string;
      };

      expect(body).toHaveProperty('id', postId);
      expect(body).toHaveProperty('title', 'E2E_Post_Developpeur');
      expect(body).toHaveProperty('type', 'Bénévole');
    });
  });

  // -----------------------------------------------------------------------
  // PUT /api/recruitment/:id — mise à jour
  // -----------------------------------------------------------------------

  describe('PUT /api/recruitment/:id', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 401', async () => {
      expect(createdPostIds.length).toBeGreaterThan(0);

      await request(server())
        .put(`/api/recruitment/${createdPostIds[0]}`)
        .send({ title: 'Titre mis à jour', type: 'Stage', description: 'Desc mise à jour' })
        .expect(401);
    });

    it('admin, id inexistant → 404', async () => {
      await request(server())
        .put('/api/recruitment/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Post inexistant',
          type: 'Bénévole',
          description: 'Description inexistante',
        })
        .expect(404);
    });

    it('admin, données valides → 200 + offre mise à jour', async () => {
      expect(createdPostIds.length).toBeGreaterThan(0);
      const postId = createdPostIds[0];

      const res = await request(server())
        .put(`/api/recruitment/${postId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'E2E_Post_Developpeur_Updated',
          type: 'Stage',
          description: 'Description mise à jour par le test E2E.',
          location: 'Paris',
        })
        .expect(200);

      const body = res.body as {
        id?: number;
        title?: string;
        type?: string;
        location?: string;
      };

      expect(body).toHaveProperty('id', postId);
      expect(body).toHaveProperty('title', 'E2E_Post_Developpeur_Updated');
      expect(body).toHaveProperty('type', 'Stage');
      expect(body).toHaveProperty('location', 'Paris');
    });
  });

  // -----------------------------------------------------------------------
  // PATCH /api/recruitment/:id/toggle — toggle activation
  // -----------------------------------------------------------------------

  describe('PATCH /api/recruitment/:id/toggle', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 401', async () => {
      expect(createdPostIds.length).toBeGreaterThan(0);

      await request(server()).patch(`/api/recruitment/${createdPostIds[0]}/toggle`).expect(401);
    });

    it('admin, toggle → 200 + statut inversé', async () => {
      expect(createdPostIds.length).toBeGreaterThan(0);
      const postId = createdPostIds[0];

      // Vérifier l'état initial
      const before = await prisma.recruitmentPost.findUnique({ where: { id: postId } });
      expect(before).not.toBeNull();
      const initialActive = before!.active;

      const res = await request(server())
        .patch(`/api/recruitment/${postId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = res.body as { active?: boolean };
      expect(body).toHaveProperty('active', !initialActive);

      // Remettre l'état initial
      await request(server())
        .patch(`/api/recruitment/${postId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`);
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /api/recruitment/:id — suppression
  // -----------------------------------------------------------------------

  describe('DELETE /api/recruitment/:id', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 401', async () => {
      await request(server()).delete('/api/recruitment/99999').expect(401);
    });

    it('admin, id inexistant → 404', async () => {
      await request(server())
        .delete('/api/recruitment/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('admin, offre existante → 200 + message de confirmation', async () => {
      // Créer une offre temporaire à supprimer
      const createRes = await request(server())
        .post('/api/recruitment')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'E2E_Post_ToDelete',
          type: 'Bénévole',
          description: 'Offre créée pour être supprimée dans les tests E2E.',
        })
        .expect(201);

      const createBody = createRes.body as { id?: number };
      expect(createBody.id).toBeDefined();
      const postId = createBody.id!;

      const deleteRes = await request(server())
        .delete(`/api/recruitment/${postId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const deleteBody = deleteRes.body as { message?: string };
      expect(deleteBody).toHaveProperty('message');

      // Vérifier que l'offre n'est plus accessible
      await request(server()).get(`/api/recruitment/${postId}`).expect(404);
    });

    it('admin, supprimer les posts créés pendant les tests', async () => {
      for (const postId of createdPostIds) {
        await request(server())
          .delete(`/api/recruitment/${postId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect((res) => {
            // 200 si supprimé, 404 s'il était déjà supprimé
            expect([200, 404]).toContain(res.status);
          });
      }
      // Vider le tableau pour éviter le double nettoyage dans afterAll
      createdPostIds.length = 0;
    });
  });
});
