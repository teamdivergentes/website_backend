import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('RolesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let adminRoleId: number;

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

    // Get admin role
    const adminRole = await prisma.role.findFirst({
      where: { name: 'Admin' },
    });
    adminRoleId = adminRole.id;

    // Login as admin to get token
    const loginResponse = await request(app.getHttpServer()).post('/api/auth/login').send({
      email: 'admin@teamdivergentes.fr',
      password: 'admin123',
    });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/roles/permissions (GET)', () => {
    it('should return all available permissions grouped by module', () => {
      return request(app.getHttpServer())
        .get('/api/roles/permissions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('users');
          expect(res.body).toHaveProperty('roles');
          expect(res.body).toHaveProperty('teams');
          expect(res.body).toHaveProperty('games');
          expect(res.body).toHaveProperty('sponsors');
          expect(res.body).toHaveProperty('staff');
          expect(res.body).toHaveProperty('config');
          expect(res.body).toHaveProperty('annonces');
          expect(res.body).toHaveProperty('articles');

          expect(res.body.users).toEqual(['users:read', 'users:write', 'users:delete']);
          expect(res.body.roles).toEqual(['roles:read', 'roles:write', 'roles:delete']);
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer()).get('/api/roles/permissions').expect(401);
    });
  });

  describe('/api/roles (GET)', () => {
    it('should return all roles with user count', () => {
      return request(app.getHttpServer())
        .get('/api/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(3);

          const adminRole = res.body.find((r) => r.name === 'Admin');
          expect(adminRole).toBeDefined();
          expect(adminRole).toHaveProperty('userCount');
          expect(adminRole).toHaveProperty('isSystem', true);
          expect(adminRole.permissions).toContain('users:read');
        });
    });
  });

  describe('/api/roles/:id (DELETE)', () => {
    it('should prevent deletion of system roles', async () => {
      return request(app.getHttpServer())
        .delete(`/api/roles/${adminRoleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('Impossible de supprimer un rôle système');
        });
    });

    it('should allow deletion of non-system roles with no users', async () => {
      // Create a test role
      const createResponse = await request(app.getHttpServer())
        .post('/api/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'TestRoleToDelete',
          permissions: ['users:read'],
        })
        .expect(201);

      const roleId = createResponse.body.id;

      // Delete it
      await request(app.getHttpServer())
        .delete(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Rôle supprimé avec succès');
        });

      // Verify it's deleted
      await request(app.getHttpServer())
        .get(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should prevent deletion of roles with assigned users', async () => {
      // Admin role has at least one user (the admin user)
      return request(app.getHttpServer())
        .delete(`/api/roles/${adminRoleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Impossible de supprimer un rôle système');
        });
    });
  });
});
