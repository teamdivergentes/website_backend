import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { TwitchHelixService } from '../src/twitch-helix/twitch-helix.service';

/**
 * Tests E2E — TwitchChannels CRUD admin + endpoint public.
 *
 * Le TwitchHelixService est mocké pour éviter tout appel réseau réel.
 */
describe('TwitchChannelsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let createdChannelId: number;

  const mockHelixService = {
    getLiveStreams: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TwitchHelixService)
      .useValue(mockHelixService)
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

    // Garantit admin role + user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminRole = await prisma.role.upsert({
      where: { name: 'Admin' },
      update: {},
      create: {
        name: 'Admin',
        permissions: ['twitch_channels:read', 'twitch_channels:write', 'twitch_channels:delete'],
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
      throw new Error("Impossible d'obtenir le token admin pour les tests twitch");
    }
    adminToken = loginBody.access_token;

    // Nettoyage résiduel
    await prisma.twitchChannel
      .deleteMany({ where: { username: { startsWith: 'e2e_test_' } } })
      .catch(() => {});
  });

  afterAll(async () => {
    if (createdChannelId) {
      await prisma.twitchChannel.delete({ where: { id: createdChannelId } }).catch(() => {});
    }
    await prisma.twitchChannel
      .deleteMany({ where: { username: { startsWith: 'e2e_test_' } } })
      .catch(() => {});
    await app.close();
  });

  const server = () => app.getHttpServer() as Parameters<typeof request>[0];

  // ─── GET /api/twitch-channels/live (public) ─────────────────────────────────

  describe('GET /api/twitch-channels/live', () => {
    it('sans token → 200 (endpoint public)', async () => {
      const res = await request(server()).get('/api/twitch-channels/live').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('retourne les chaînes enrichies avec isLive', async () => {
      mockHelixService.getLiveStreams.mockResolvedValueOnce([]);

      const res = await request(server()).get('/api/twitch-channels/live').expect(200);

      const channels = res.body as Array<Record<string, unknown>>;
      channels.forEach((ch) => {
        expect(ch).toHaveProperty('isLive');
      });
    });
  });

  // ─── POST /api/admin/twitch-channels ─────────────────────────────────────────

  describe('POST /api/admin/twitch-channels', () => {
    it('sans token → 401', async () => {
      await request(server())
        .post('/api/admin/twitch-channels')
        .send({ username: 'teststreamer' })
        .expect(401);
    });

    it('username invalide (moins de 4 caractères) → 400', async () => {
      await request(server())
        .post('/api/admin/twitch-channels')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'ab' })
        .expect(400);
    });

    it('username invalide (caractères spéciaux) → 400', async () => {
      await request(server())
        .post('/api/admin/twitch-channels')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'test user!' })
        .expect(400);
    });

    it('body vide → 400', async () => {
      await request(server())
        .post('/api/admin/twitch-channels')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('données valides → 201 + chaîne créée', async () => {
      const res = await request(server())
        .post('/api/admin/twitch-channels')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'e2e_test_dvg', displayName: 'DVG Streamer', active: true })
        .expect(201);

      const body = res.body as { id: number; username: string };
      expect(body.username).toBe('e2e_test_dvg');
      createdChannelId = body.id;
    });

    it('username déjà existant → 409', async () => {
      await request(server())
        .post('/api/admin/twitch-channels')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'e2e_test_dvg' })
        .expect(409);
    });
  });

  // ─── GET /api/admin/twitch-channels ──────────────────────────────────────────

  describe('GET /api/admin/twitch-channels', () => {
    it('sans token → 401', async () => {
      await request(server()).get('/api/admin/twitch-channels').expect(401);
    });

    it('admin → 200 + liste avec isLive', async () => {
      mockHelixService.getLiveStreams.mockResolvedValueOnce([]);
      const res = await request(server())
        .get('/api/admin/twitch-channels')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const channels = res.body as Array<Record<string, unknown>>;
      expect(Array.isArray(channels)).toBe(true);
      if (channels.length > 0) {
        expect(channels[0]).toHaveProperty('isLive');
      }
    });
  });

  // ─── GET /api/admin/twitch-channels/:id ──────────────────────────────────────

  describe('GET /api/admin/twitch-channels/:id', () => {
    it('id existant → 200', async () => {
      if (!createdChannelId) return;
      await request(server())
        .get(`/api/admin/twitch-channels/${createdChannelId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('id inexistant → 404', async () => {
      await request(server())
        .get('/api/admin/twitch-channels/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ─── PATCH /api/admin/twitch-channels/:id ────────────────────────────────────

  describe('PATCH /api/admin/twitch-channels/:id', () => {
    it('mise à jour displayName → 200', async () => {
      if (!createdChannelId) return;
      const res = await request(server())
        .patch(`/api/admin/twitch-channels/${createdChannelId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ displayName: 'DVG Updated' })
        .expect(200);

      const body = res.body as { displayName: string };
      expect(body.displayName).toBe('DVG Updated');
    });

    it('id inexistant → 404', async () => {
      await request(server())
        .patch('/api/admin/twitch-channels/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ displayName: 'Test' })
        .expect(404);
    });
  });

  // ─── DELETE /api/admin/twitch-channels/:id ───────────────────────────────────

  describe('DELETE /api/admin/twitch-channels/:id', () => {
    it('sans token → 401', async () => {
      await request(server()).delete('/api/admin/twitch-channels/1').expect(401);
    });

    it('id existant → 200 + message de confirmation', async () => {
      if (!createdChannelId) return;
      const res = await request(server())
        .delete(`/api/admin/twitch-channels/${createdChannelId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = res.body as { message: string };
      expect(body.message).toContain('supprimée');
      createdChannelId = 0;
    });

    it('id inexistant → 404', async () => {
      await request(server())
        .delete('/api/admin/twitch-channels/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ─── PATCH /api/admin/twitch-channels/reorder ────────────────────────────────

  describe('PATCH /api/admin/twitch-channels/reorder', () => {
    it('sans token → 401', async () => {
      await request(server())
        .patch('/api/admin/twitch-channels/reorder')
        .send({ items: [{ id: 1, position: 0 }] })
        .expect(401);
    });

    it('body invalide → 400', async () => {
      await request(server())
        .patch('/api/admin/twitch-channels/reorder')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [] })
        .expect(400);
    });
  });
});
