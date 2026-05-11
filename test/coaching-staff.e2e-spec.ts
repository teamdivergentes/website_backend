import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { loginAsAdmin } from './helpers/login';

/**
 * Tests E2E — CoachingStaff CRUD admin + endpoint public.
 */
describe('CoachingStaffController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let testTeamId: number;
  let createdCoachId: number;

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

    // Garantit admin role + user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    // Set complet des permissions Admin attendues par les autres suites e2e
    // (roles.e2e-spec, teams.e2e-spec, etc.) + les permissions specifiques au
    // coaching staff. Sur DB fraiche, Admin est cree avec ce set complet pour
    // ne casser aucune autre suite executee apres celle-ci en --runInBand.
    const adminPerms = [
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
      'annonces:read',
      'annonces:write',
      'annonces:delete',
      'articles:read',
      'articles:write',
      'articles:delete',
      'coaching_staff:read',
      'coaching_staff:write',
      'coaching_staff:delete',
    ];
    const adminRole = await prisma.role.upsert({
      where: { name: 'Admin' },
      update: {},
      create: {
        name: 'Admin',
        permissions: adminPerms,
        isSystem: true,
      },
    });

    // Si Admin existait deja (cree par une autre suite e2e en mode --runInBand),
    // l'upsert ci-dessus n'a pas mis a jour les permissions. On force ici l'ajout
    // des permissions coaching_staff:* manquantes pour eviter les 403.
    const requiredPerms = ['coaching_staff:read', 'coaching_staff:write', 'coaching_staff:delete'];
    const missing = requiredPerms.filter((p) => !adminRole.permissions.includes(p));
    if (missing.length > 0) {
      await prisma.role.update({
        where: { id: adminRole.id },
        data: { permissions: [...adminRole.permissions, ...missing] },
      });
    }

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

    const { token } = await loginAsAdmin(app.getHttpServer() as Parameters<typeof request>[0]);
    adminToken = token;

    // Crée une team de test
    const team = await prisma.team.create({
      data: {
        name: 'E2E_CoachingStaff_Team',
        slug: `e2e-coaching-staff-team-${Date.now()}`,
        game: 'Valorant',
      },
    });
    testTeamId = team.id;

    // Nettoyage résiduel
    await prisma.coachingStaff
      .deleteMany({ where: { name: { startsWith: 'E2E_Coach_' } } })
      .catch(() => {});
  });

  afterAll(async () => {
    if (createdCoachId) {
      await prisma.coachingStaff.delete({ where: { id: createdCoachId } }).catch(() => {});
    }
    await prisma.coachingStaff
      .deleteMany({ where: { name: { startsWith: 'E2E_Coach_' } } })
      .catch(() => {});
    if (testTeamId) {
      await prisma.team.delete({ where: { id: testTeamId } }).catch(() => {});
    }
    await app.close();
  });

  const server = () => app.getHttpServer() as Parameters<typeof request>[0];

  // ─── GET /api/teams/:teamId/coaching-staff (public) ──────────────────────────

  describe('GET /api/teams/:teamId/coaching-staff', () => {
    it('sans token → 200 (endpoint public)', async () => {
      const res = await request(server())
        .get(`/api/teams/${testTeamId}/coaching-staff`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('teamId inexistant → 404', async () => {
      await request(server()).get('/api/teams/999999/coaching-staff').expect(404);
    });
  });

  // ─── POST /api/admin/teams/:teamId/coaching-staff ────────────────────────────

  describe('POST /api/admin/teams/:teamId/coaching-staff', () => {
    it('sans token → 401', async () => {
      await request(server())
        .post(`/api/admin/teams/${testTeamId}/coaching-staff`)
        .send({ name: 'Coach Test', role: 'Head Coach' })
        .expect(401);
    });

    it('body invalide (name manquant) → 400', async () => {
      await request(server())
        .post(`/api/admin/teams/${testTeamId}/coaching-staff`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'Manager' })
        .expect(400);
    });

    it('body invalide (role manquant) → 400', async () => {
      await request(server())
        .post(`/api/admin/teams/${testTeamId}/coaching-staff`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Coach Test' })
        .expect(400);
    });

    it('teamId inexistant → 404', async () => {
      await request(server())
        .post('/api/admin/teams/999999/coaching-staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Coach', role: 'Manager' })
        .expect(404);
    });

    it('données valides → 201 + coach créé avec slug auto', async () => {
      const res = await request(server())
        .post(`/api/admin/teams/${testTeamId}/coaching-staff`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'E2E_Coach_HeadCoach', role: 'Head Coach' })
        .expect(201);

      const body = res.body as { id: number; name: string; slug: string; role: string };
      expect(body.name).toBe('E2E_Coach_HeadCoach');
      expect(body.role).toBe('Head Coach');
      expect(body.slug).toBeTruthy();
      createdCoachId = body.id;
    });
  });

  // ─── GET /api/admin/teams/:teamId/coaching-staff ─────────────────────────────

  describe('GET /api/admin/teams/:teamId/coaching-staff', () => {
    it('sans token → 401', async () => {
      await request(server()).get(`/api/admin/teams/${testTeamId}/coaching-staff`).expect(401);
    });

    it('admin → 200 + liste', async () => {
      const res = await request(server())
        .get(`/api/admin/teams/${testTeamId}/coaching-staff`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ─── PATCH /api/admin/teams/:teamId/coaching-staff/:id ───────────────────────

  describe('PATCH /api/admin/teams/:teamId/coaching-staff/:id', () => {
    it('mise à jour du rôle → 200', async () => {
      if (!createdCoachId) return;
      const res = await request(server())
        .patch(`/api/admin/teams/${testTeamId}/coaching-staff/${createdCoachId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'Manager' })
        .expect(200);

      const body = res.body as { role: string };
      expect(body.role).toBe('Manager');
    });

    it('id inexistant → 404', async () => {
      await request(server())
        .patch(`/api/admin/teams/${testTeamId}/coaching-staff/999999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'Coach' })
        .expect(404);
    });

    it('sans token → 401', async () => {
      await request(server())
        .patch(`/api/admin/teams/${testTeamId}/coaching-staff/1`)
        .send({ role: 'Coach' })
        .expect(401);
    });
  });

  // ─── DELETE /api/admin/teams/:teamId/coaching-staff/:id ──────────────────────

  describe('DELETE /api/admin/teams/:teamId/coaching-staff/:id', () => {
    it('sans token → 401', async () => {
      await request(server()).delete(`/api/admin/teams/${testTeamId}/coaching-staff/1`).expect(401);
    });

    it('id existant → 200 + message de confirmation', async () => {
      if (!createdCoachId) return;
      const res = await request(server())
        .delete(`/api/admin/teams/${testTeamId}/coaching-staff/${createdCoachId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = res.body as { message: string };
      expect(body.message).toContain('supprimé');
      createdCoachId = 0;
    });

    it('id inexistant → 404', async () => {
      await request(server())
        .delete(`/api/admin/teams/${testTeamId}/coaching-staff/999999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ─── PATCH /api/admin/teams/:teamId/coaching-staff/reorder ───────────────────

  describe('PATCH /api/admin/teams/:teamId/coaching-staff/reorder', () => {
    it('sans token → 401', async () => {
      await request(server())
        .patch(`/api/admin/teams/${testTeamId}/coaching-staff/reorder`)
        .send({ items: [{ id: 1, position: 0 }] })
        .expect(401);
    });

    it('body invalide (items vide) → 400', async () => {
      await request(server())
        .patch(`/api/admin/teams/${testTeamId}/coaching-staff/reorder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [] })
        .expect(400);
    });

    it('IDOR cross-team : IDs appartenant à une autre équipe → 400', async () => {
      // Crée team B et un coach appartenant à team B
      const teamB = await prisma.team.create({
        data: {
          name: 'E2E_CoachingStaff_TeamB',
          slug: `e2e-coaching-staff-team-b-${Date.now()}`,
          game: 'Valorant',
        },
      });

      const coachB = await prisma.coachingStaff.create({
        data: {
          teamId: teamB.id,
          name: 'E2E_Coach_TeamB',
          role: 'Drafter',
          position: 0,
          slug: `e2e-coach-team-b-${Date.now()}`,
        },
      });

      const positionBefore = coachB.position;

      try {
        // Tente un reorder sur team A en fournissant l'ID du coach B → doit rejeter
        await request(server())
          .patch(`/api/admin/teams/${testTeamId}/coaching-staff/reorder`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ items: [{ id: coachB.id, position: 5 }] })
          .expect(400);

        // Vérifie que la position du coach B n'a pas changé
        const coachBAfter = await prisma.coachingStaff.findUnique({ where: { id: coachB.id } });
        expect(coachBAfter?.position).toBe(positionBefore);
      } finally {
        await prisma.coachingStaff.delete({ where: { id: coachB.id } }).catch(() => {});
        await prisma.team.delete({ where: { id: teamB.id } }).catch(() => {});
      }
    });
  });
});
