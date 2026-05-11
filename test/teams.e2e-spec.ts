import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { loginAsAdmin } from './helpers/login';

/**
 * Tests E2E du module Teams (équipes + membres).
 *
 * Couvre :
 *   - GET /api/teams (public) → 200 + liste
 *   - GET /api/teams/:slug (public) → 200 + détail avec membres
 *   - GET /api/teams/:slug inexistant → 404
 *   - POST /api/teams (admin) → 201
 *   - POST /api/teams sans auth → 401
 *   - PUT /api/teams/:id (admin) → 200
 *   - DELETE /api/teams/:id (admin) → 200 + cascade delete membres
 *   - POST /api/teams/:teamId/members (admin) → 201
 *   - GET /api/teams/:teamId/members (public) → 200
 *   - DELETE /api/teams/:teamId/members/:id (admin) → 200
 */
describe('TeamsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;

  // Données créées pendant les tests
  let createdTeamId: number;
  let createdTeamSlug: string;
  let createdMemberId: number;

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

    // Nettoyer les éventuelles équipes de test résiduelles
    await prisma.team.deleteMany({ where: { name: { startsWith: 'E2E_Team_' } } }).catch(() => {});
  });

  afterAll(async () => {
    // Nettoyage des données créées
    if (createdTeamId) {
      await prisma.team.delete({ where: { id: createdTeamId } }).catch(() => {});
    }
    await prisma.team.deleteMany({ where: { name: { startsWith: 'E2E_Team_' } } }).catch(() => {});

    await app.close();
  });

  // -----------------------------------------------------------------------
  // GET /api/teams — endpoint public
  // -----------------------------------------------------------------------

  describe('GET /api/teams', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 200 (endpoint public)', async () => {
      const res = await request(server()).get('/api/teams').expect(200);

      const body = res.body as unknown;
      expect(Array.isArray(body)).toBe(true);
    });

    it('retourne les équipes avec membersCount', async () => {
      const res = await request(server()).get('/api/teams').expect(200);

      const teams = res.body as Array<Record<string, unknown>>;
      // Si des équipes existent, elles doivent avoir membersCount
      if (teams.length > 0) {
        expect(teams[0]).toHaveProperty('membersCount');
      }
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/teams — création
  // -----------------------------------------------------------------------

  describe('POST /api/teams', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 401', async () => {
      await request(server())
        .post('/api/teams')
        .send({ name: 'Equipe Test', game: 'lol' })
        .expect(401);
    });

    it('body invalide (champ name manquant) → 400', async () => {
      await request(server())
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ game: 'valorant' })
        .expect(400);
    });

    it('body invalide (champ game manquant) → 400', async () => {
      await request(server())
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Equipe sans jeu' })
        .expect(400);
    });

    it('admin, données valides → 201 + équipe créée', async () => {
      const res = await request(server())
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E_Team_Valorant',
          game: 'valorant',
          description: 'Équipe de test E2E',
          active: true,
        })
        .expect(201);

      const body = res.body as {
        id?: number;
        name?: string;
        slug?: string;
        game?: string;
        members?: unknown[];
      };

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('name', 'E2E_Team_Valorant');
      expect(body).toHaveProperty('game', 'valorant');
      expect(body).toHaveProperty('slug');
      expect(body).toHaveProperty('members');

      createdTeamId = body.id!;
      createdTeamSlug = body.slug!;
    });

    it('admin, nom dupliqué → 400', async () => {
      await request(server())
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'E2E_Team_Valorant', game: 'valorant' })
        .expect(400);
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/teams/:slug — endpoint public
  // -----------------------------------------------------------------------

  describe('GET /api/teams/:slug', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('slug inexistant → 404', async () => {
      await request(server()).get('/api/teams/slug-inexistant-xyz-99999').expect(404);
    });

    it('slug valide → 200 + détail avec membres', async () => {
      // Nécessite que createdTeamSlug soit défini (dépend du test POST)
      expect(createdTeamSlug).toBeDefined();

      const res = await request(server()).get(`/api/teams/${createdTeamSlug}`).expect(200);

      const body = res.body as {
        id?: number;
        name?: string;
        slug?: string;
        members?: unknown[];
        membersCount?: number;
      };

      expect(body).toHaveProperty('id', createdTeamId);
      expect(body).toHaveProperty('name', 'E2E_Team_Valorant');
      expect(body).toHaveProperty('members');
      expect(body).toHaveProperty('membersCount');
      expect(Array.isArray(body.members)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/teams/:teamId/members — création membre
  // -----------------------------------------------------------------------

  describe('POST /api/teams/:teamId/members', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 401', async () => {
      expect(createdTeamId).toBeDefined();

      await request(server())
        .post(`/api/teams/${createdTeamId}/members`)
        .send({ name: 'Joueur Test', role: 'Capitaine' })
        .expect(401);
    });

    it('body invalide (champ name manquant) → 400', async () => {
      expect(createdTeamId).toBeDefined();

      await request(server())
        .post(`/api/teams/${createdTeamId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'Top' })
        .expect(400);
    });

    it('body invalide (champ role manquant) → 400', async () => {
      expect(createdTeamId).toBeDefined();

      await request(server())
        .post(`/api/teams/${createdTeamId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Joueur sans rôle' })
        .expect(400);
    });

    it('admin, données valides → 201 + membre créé', async () => {
      expect(createdTeamId).toBeDefined();

      const res = await request(server())
        .post(`/api/teams/${createdTeamId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'ProPlayer123',
          role: 'Carry',
          realName: 'Jean Dupont',
          nationality: 'FR',
        })
        .expect(201);

      const body = res.body as {
        id?: number;
        name?: string;
        role?: string;
        teamId?: number;
      };

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('name', 'ProPlayer123');
      expect(body).toHaveProperty('role', 'Carry');
      expect(body).toHaveProperty('teamId', createdTeamId);

      createdMemberId = body.id!;
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/teams/:teamId/members — endpoint public
  // -----------------------------------------------------------------------

  describe('GET /api/teams/:teamId/members', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 200 (endpoint public)', async () => {
      expect(createdTeamId).toBeDefined();

      const res = await request(server()).get(`/api/teams/${createdTeamId}/members`).expect(200);

      const body = res.body as unknown;
      expect(Array.isArray(body)).toBe(true);
    });

    it('retourne le membre créé', async () => {
      expect(createdTeamId).toBeDefined();
      expect(createdMemberId).toBeDefined();

      const res = await request(server()).get(`/api/teams/${createdTeamId}/members`).expect(200);

      const members = res.body as Array<{ id?: number; name?: string }>;
      const found = members.find((m) => m.id === createdMemberId);
      expect(found).toBeDefined();
      expect(found?.name).toBe('ProPlayer123');
    });
  });

  // -----------------------------------------------------------------------
  // PUT /api/teams/:teamId/members/:id — mise à jour membre
  // -----------------------------------------------------------------------

  describe('PUT /api/teams/:teamId/members/:id', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 401', async () => {
      expect(createdTeamId).toBeDefined();
      expect(createdMemberId).toBeDefined();

      await request(server())
        .put(`/api/teams/${createdTeamId}/members/${createdMemberId}`)
        .send({ name: 'Nouveau Nom', role: 'Support' })
        .expect(401);
    });

    it('admin, données valides → 200 + membre mis à jour', async () => {
      expect(createdTeamId).toBeDefined();
      expect(createdMemberId).toBeDefined();

      const res = await request(server())
        .put(`/api/teams/${createdTeamId}/members/${createdMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'ProPlayer123_Updated', role: 'Support' })
        .expect(200);

      const body = res.body as { name?: string; role?: string };
      expect(body).toHaveProperty('name', 'ProPlayer123_Updated');
      expect(body).toHaveProperty('role', 'Support');
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /api/teams/:teamId/members/:id — suppression membre
  // -----------------------------------------------------------------------

  describe('DELETE /api/teams/:teamId/members/:id', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 401', async () => {
      expect(createdTeamId).toBeDefined();
      expect(createdMemberId).toBeDefined();

      await request(server())
        .delete(`/api/teams/${createdTeamId}/members/${createdMemberId}`)
        .expect(401);
    });

    it('admin, membre valide → 200', async () => {
      expect(createdTeamId).toBeDefined();
      expect(createdMemberId).toBeDefined();

      const res = await request(server())
        .delete(`/api/teams/${createdTeamId}/members/${createdMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = res.body as { message?: string };
      expect(body).toHaveProperty('message');
    });

    it('membre inexistant → 404', async () => {
      expect(createdTeamId).toBeDefined();

      await request(server())
        .delete(`/api/teams/${createdTeamId}/members/99999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // -----------------------------------------------------------------------
  // PUT /api/teams/:id — mise à jour équipe
  // -----------------------------------------------------------------------

  describe('PUT /api/teams/:id', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 401', async () => {
      expect(createdTeamId).toBeDefined();

      await request(server())
        .put(`/api/teams/${createdTeamId}`)
        .send({ name: 'E2E_Team_Updated', game: 'cs' })
        .expect(401);
    });

    it('admin, id inexistant → 404', async () => {
      await request(server())
        .put('/api/teams/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ game: 'cs' })
        .expect(404);
    });

    it('admin, données valides → 200 + équipe mise à jour', async () => {
      expect(createdTeamId).toBeDefined();

      const res = await request(server())
        .put(`/api/teams/${createdTeamId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ game: 'cs', description: 'Description mise à jour' })
        .expect(200);

      const body = res.body as { game?: string; description?: string };
      expect(body).toHaveProperty('game', 'cs');
      expect(body).toHaveProperty('description', 'Description mise à jour');
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /api/teams/:id — suppression avec cascade
  // -----------------------------------------------------------------------

  describe('DELETE /api/teams/:id', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 401', async () => {
      await request(server()).delete('/api/teams/99999').expect(401);
    });

    it('admin, id inexistant → 404', async () => {
      await request(server())
        .delete('/api/teams/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('admin, équipe valide avec membres → 200 + cascade delete membres', async () => {
      // Créer une équipe avec un membre pour tester la cascade
      const createTeamRes = await request(server())
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'E2E_Team_ToDelete', game: 'lol' })
        .expect(201);

      const teamBody = createTeamRes.body as { id?: number };
      expect(teamBody.id).toBeDefined();
      const teamId = teamBody.id!;

      // Ajouter un membre
      const createMemberRes = await request(server())
        .post(`/api/teams/${teamId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Membre Cascade', role: 'Jungler' })
        .expect(201);

      const memberBody = createMemberRes.body as { id?: number };
      expect(memberBody.id).toBeDefined();
      const memberId = memberBody.id!;

      // Supprimer l'équipe (cascade sur les membres)
      const deleteRes = await request(server())
        .delete(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const deleteBody = deleteRes.body as { message?: string };
      expect(deleteBody).toHaveProperty('message');

      // Vérifier que le membre a bien été supprimé en cascade
      const memberInDb = await prisma.teamMember.findUnique({
        where: { id: memberId },
      });
      expect(memberInDb).toBeNull();
    });

    it('admin, suppression de la créatedTeam initiale → 200', async () => {
      if (!createdTeamId) return;

      await request(server())
        .delete(`/api/teams/${createdTeamId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Marquer comme supprimé pour éviter le double nettoyage dans afterAll
      createdTeamId = 0;
    });
  });
});
