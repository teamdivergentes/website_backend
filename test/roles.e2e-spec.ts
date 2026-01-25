import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
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

    // Ensure Admin role exists (create if missing)
    const adminPermissions = [
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
    ];

    const adminRole = await prisma.role.upsert({
      where: { name: 'Admin' },
      update: {},
      create: {
        name: 'Admin',
        permissions: adminPermissions,
        isSystem: true,
      },
    });

    adminRoleId = adminRole.id;

    // Ensure admin user exists
    const hashedPassword = await bcrypt.hash('admin123', 10);

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

    // Login as admin to get token
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const loginResponse = await request(server).post('/api/auth/login').send({
      email: 'admin@teamdivergentes.fr',
      password: 'admin123',
    });

    if (!loginResponse.body || typeof loginResponse.body !== 'object') {
      throw new Error('Invalid login response');
    }

    const body = loginResponse.body as { access_token?: string };
    if (!body.access_token) {
      throw new Error('No access token in login response');
    }

    authToken = body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/roles/permissions (GET)', () => {
    it('should return all available permissions grouped by module', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response = await request(server)
        .get('/api/roles/permissions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const body = response.body as Record<string, string[]>;

      expect(body).toHaveProperty('users');
      expect(body).toHaveProperty('roles');
      expect(body).toHaveProperty('teams');
      expect(body).toHaveProperty('games');
      expect(body).toHaveProperty('sponsors');
      expect(body).toHaveProperty('staff');
      expect(body).toHaveProperty('config');
      expect(body).toHaveProperty('annonces');
      expect(body).toHaveProperty('articles');

      expect(body.users).toEqual(['users:read', 'users:write', 'users:delete']);
      expect(body.roles).toEqual(['roles:read', 'roles:write', 'roles:delete']);
    });

    it('should require authentication', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server).get('/api/roles/permissions').expect(401);
    });
  });

  describe('/api/roles (GET)', () => {
    it('should return all roles with user count', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response = await request(server)
        .get('/api/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const roles = response.body as Array<{
        name: string;
        userCount: number;
        isSystem: boolean;
        permissions: string[];
      }>;

      expect(Array.isArray(roles)).toBe(true);
      expect(roles.length).toBeGreaterThanOrEqual(3);

      const adminRole = roles.find((r) => r.name === 'Admin');
      expect(adminRole).toBeDefined();
      expect(adminRole).toHaveProperty('userCount');
      expect(adminRole).toHaveProperty('isSystem', true);
      expect(adminRole?.permissions).toContain('users:read');
    });
  });

  describe('/api/roles/:id (DELETE)', () => {
    it('should prevent deletion of system roles', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response = await request(server)
        .delete(`/api/roles/${adminRoleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      const body = response.body as { message: string };
      expect(body.message).toBe('Impossible de supprimer un rôle système');
    });

    it('should allow deletion of non-system roles with no users', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];

      // Create a test role
      const createResponse = await request(server)
        .post('/api/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'TestRoleToDelete',
          permissions: ['users:read'],
        })
        .expect(201);

      const createBody = createResponse.body as { id: number };
      const roleId = createBody.id;

      // Delete it
      const deleteResponse = await request(server)
        .delete(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const deleteBody = deleteResponse.body as { message: string };
      expect(deleteBody.message).toBe('Rôle supprimé avec succès');

      // Verify it's deleted
      await request(server)
        .get(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should prevent deletion of roles with assigned users', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];

      // Admin role has at least one user (the admin user)
      const response = await request(server)
        .delete(`/api/roles/${adminRoleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      const body = response.body as { message: string };
      expect(body.message).toContain('Impossible de supprimer un rôle système');
    });
  });
});
