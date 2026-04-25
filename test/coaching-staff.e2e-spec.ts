import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

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
    const adminRole = await prisma.role.upsert({
      where: { name: 'Admin' },
      update: {},
      create: {
        name: 'Admin',
        permissions: ['coaching_staff:read', 'coaching_staff:write', 'coaching_staff:delete'],
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

    const loginRes = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/auth/login')
      .send({ email: 'admin@teamdivergentes.fr', password: 'admin123' });

    const loginBody = loginRes.body as { access_token?: string };
    if (!loginBody.access_token) {
      throw new Error("Impossible d'obtenir le token admin pour les tests coaching-staff");
    }
    adminToken = loginBody.access_token;

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

  // ─── PATCH /api/admin/coaching-staff/:id ─────────────────────────────────────

  describe('PATCH /api/admin/coaching-staff/:id', () => {
    it('mise à jour du rôle → 200', async () => {
      if (!createdCoachId) return;
      const res = await request(server())
        .patch(`/api/admin/coaching-staff/${createdCoachId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'Manager' })
        .expect(200);

      const body = res.body as { role: string };
      expect(body.role).toBe('Manager');
    });

    it('id inexistant → 404', async () => {
      await request(server())
        .patch('/api/admin/coaching-staff/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'Coach' })
        .expect(404);
    });

    it('sans token → 401', async () => {
      await request(server())
        .patch(`/api/admin/coaching-staff/1`)
        .send({ role: 'Coach' })
        .expect(401);
    });
  });

  // ─── DELETE /api/admin/coaching-staff/:id ────────────────────────────────────

  describe('DELETE /api/admin/coaching-staff/:id', () => {
    it('sans token → 401', async () => {
      await request(server()).delete('/api/admin/coaching-staff/1').expect(401);
    });

    it('id existant → 200 + message de confirmation', async () => {
      if (!createdCoachId) return;
      const res = await request(server())
        .delete(`/api/admin/coaching-staff/${createdCoachId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = res.body as { message: string };
      expect(body.message).toContain('supprimé');
      createdCoachId = 0;
    });

    it('id inexistant → 404', async () => {
      await request(server())
        .delete('/api/admin/coaching-staff/999999')
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
  });
});
