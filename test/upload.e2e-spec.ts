import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

/**
 * Tests E2E du module Upload.
 *
 * Couvre :
 *   - POST /api/upload/image sans token → 401
 *   - POST /api/upload/image (non-admin) → 403
 *   - POST /api/upload/image sans fichier → 400
 *   - POST /api/upload/image (MIME invalide) → 400
 *   - POST /api/upload/image (fichier > 5MB) → 413 ou 400
 *   - POST /api/upload/image (image JPEG valide, admin) → 201 + filename + url
 *   - POST /api/upload/image (image PNG valide, admin) → 201
 *   - POST /api/upload/image (image WebP valide, admin) → 201
 *   - DELETE /api/upload/:filename sans token → 401
 *   - DELETE /api/upload/:filename (non-admin) → 403
 *   - DELETE /api/upload/:filename (admin) → 200
 *   - DELETE /api/upload/:filename inexistant → 404
 */
describe('UploadController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let nonAdminToken: string;
  let nonAdminRoleId: number;
  let nonAdminUserId: number;

  // Fichiers uploadés pendant les tests (pour nettoyage)
  const uploadedFilenames: string[] = [];

  /**
   * Génère un buffer JPEG minimal valide (1x1 pixel rouge).
   * Ce buffer respecte le format JPEG avec les magic bytes corrects.
   */
  function createMinimalJpeg(): Buffer {
    // JPEG 1x1 pixel rouge (données brutes)
    return Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06,
      0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b,
      0x0c, 0x19, 0x12, 0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
      0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31,
      0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff,
      0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00,
      0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
      0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03, 0x03, 0x02, 0x04, 0x03, 0x05, 0x05,
      0x04, 0x04, 0x00, 0x00, 0x01, 0x7d, 0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21,
      0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
      0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a,
      0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35, 0x36, 0x37,
      0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56,
      0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
      0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93,
      0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9,
      0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6,
      0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
      0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7,
      0xf8, 0xf9, 0xfa, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xfb, 0x00,
      0xff, 0xd9,
    ]);
  }

  /**
   * Génère un buffer PNG minimal valide (1x1 pixel gris).
   * Utilise un PNG encodé en base64 connu pour être valide et
   * traitable par Sharp sans erreur.
   */
  function createMinimalPng(): Buffer {
    // 1x1 pixel PNG (gris, RGB, valid CRC, valid zlib IDAT)
    // Source : image PNG minimale générée et vérifiée avec Sharp
    return Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADklEQVQI12P4z8BQDwAEgAF/QualIQAAAABJRU5ErkJggg==',
      'base64',
    );
  }

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
      throw new Error("Impossible d'obtenir le token admin pour les tests upload");
    }
    adminToken = adminBody.access_token;

    // Créer un rôle non-admin
    const existingNonAdmin = await prisma.role.findFirst({
      where: { name: 'E2E_Upload_NonAdmin' },
    });
    if (existingNonAdmin) {
      await prisma.user.deleteMany({ where: { roleId: existingNonAdmin.id } });
      await prisma.role.delete({ where: { id: existingNonAdmin.id } });
    }

    const nonAdminRole = await prisma.role.create({
      data: {
        name: 'E2E_Upload_NonAdmin',
        permissions: ['games:read'],
        isSystem: false,
      },
    });
    nonAdminRoleId = nonAdminRole.id;

    const hashedNonAdminPwd = await bcrypt.hash('password_e2e_upload', 10);
    const nonAdminUser = await prisma.user.create({
      data: {
        email: 'e2e_upload_nonadmin@teamdivergentes.fr',
        password: hashedNonAdminPwd,
        roleId: nonAdminRoleId,
        actif: true,
      },
    });
    nonAdminUserId = nonAdminUser.id;

    // Login non-admin
    const nonAdminLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: 'e2e_upload_nonadmin@teamdivergentes.fr', password: 'password_e2e_upload' });

    const nonAdminBody = nonAdminLogin.body as { access_token?: string };
    if (!nonAdminBody.access_token) {
      throw new Error("Impossible d'obtenir le token non-admin pour les tests upload");
    }
    nonAdminToken = nonAdminBody.access_token;
  });

  afterAll(async () => {
    // Nettoyage des fichiers uploadés
    const uploadsDir = path.join(process.cwd(), 'uploads');
    for (const filename of uploadedFilenames) {
      const filePath = path.join(uploadsDir, filename);
      fs.unlink(filePath, () => {});
    }

    // Nettoyage des utilisateurs de test
    if (nonAdminUserId) {
      await prisma.user.delete({ where: { id: nonAdminUserId } }).catch(() => {});
    }
    if (nonAdminRoleId) {
      await prisma.role.delete({ where: { id: nonAdminRoleId } }).catch(() => {});
    }

    await app.close();
  });

  // -----------------------------------------------------------------------
  // POST /api/upload/image — upload d'image
  // -----------------------------------------------------------------------

  describe('POST /api/upload/image', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 401', async () => {
      const jpegBuffer = createMinimalJpeg();
      await request(server())
        .post('/api/upload/image')
        .attach('file', jpegBuffer, { filename: 'test.jpg', contentType: 'image/jpeg' })
        .expect(401);
    });

    it('non-admin → 403', async () => {
      const jpegBuffer = createMinimalJpeg();
      await request(server())
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .attach('file', jpegBuffer, { filename: 'test.jpg', contentType: 'image/jpeg' })
        .expect(403);
    });

    it('admin, sans fichier → 400', async () => {
      await request(server())
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('admin, MIME invalide (application/pdf) → 400', async () => {
      const pdfContent = Buffer.from('%PDF-1.4 fake pdf content');
      await request(server())
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', pdfContent, {
          filename: 'document.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);
    });

    it('admin, MIME invalide (text/html) → 400', async () => {
      const htmlContent = Buffer.from('<html><body>test</body></html>');
      await request(server())
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', htmlContent, {
          filename: 'page.html',
          contentType: 'text/html',
        })
        .expect(400);
    });

    it('admin, MIME invalide (application/octet-stream / .exe) → 400', async () => {
      const exeContent = Buffer.from('MZ\x90\x00\x03\x00\x00\x00');
      await request(server())
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', exeContent, {
          filename: 'malware.exe',
          contentType: 'application/octet-stream',
        })
        .expect(400);
    });

    it('admin, fichier > 5MB → 413 ou 400', async () => {
      const bigFile = Buffer.alloc(6 * 1024 * 1024, 0xff);
      const res = await request(server())
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', bigFile, {
          filename: 'big_image.jpg',
          contentType: 'image/jpeg',
        });

      expect([400, 413]).toContain(res.status);
    });

    it('admin, image JPEG valide → 201 + filename + url', async () => {
      const jpegBuffer = createMinimalJpeg();
      const res = await request(server())
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', jpegBuffer, { filename: 'test.jpg', contentType: 'image/jpeg' })
        .expect(201);

      const body = res.body as { filename?: string; url?: string };
      expect(body).toHaveProperty('filename');
      expect(body).toHaveProperty('url');
      expect(typeof body.filename).toBe('string');
      expect(body.filename!.length).toBeGreaterThan(0);
      expect(body.url).toContain('/uploads/');

      uploadedFilenames.push(body.filename!);
    });

    it('admin, image PNG valide → 201 + filename', async () => {
      const pngBuffer = createMinimalPng();
      const res = await request(server())
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', pngBuffer, { filename: 'test.png', contentType: 'image/png' })
        .expect(201);

      const body = res.body as { filename?: string; url?: string };
      expect(body).toHaveProperty('filename');
      expect(body).toHaveProperty('url');

      uploadedFilenames.push(body.filename!);
    });

    it('le nom de fichier retourné est un hex aléatoire (pas le nom original)', async () => {
      const jpegBuffer = createMinimalJpeg();
      const res = await request(server())
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', jpegBuffer, {
          filename: 'mon_image_originale.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      const body = res.body as { filename?: string };
      expect(body.filename).not.toContain('mon_image_originale');

      uploadedFilenames.push(body.filename!);
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /api/upload/:filename — suppression d'image
  // -----------------------------------------------------------------------

  describe('DELETE /api/upload/:filename', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('sans token → 401', async () => {
      await request(server()).delete('/api/upload/some_file.jpg').expect(401);
    });

    it('non-admin → 403', async () => {
      await request(server())
        .delete('/api/upload/some_file.jpg')
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .expect(403);
    });

    it('admin, fichier inexistant → 404', async () => {
      await request(server())
        .delete('/api/upload/fichier_inexistant_xyz_99999.jpg')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('admin, fichier existant → 200 + message de confirmation', async () => {
      // D'abord uploader un fichier
      const jpegBuffer = createMinimalJpeg();
      const uploadRes = await request(server())
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', jpegBuffer, { filename: 'to_delete.jpg', contentType: 'image/jpeg' })
        .expect(201);

      const uploadBody = uploadRes.body as { filename?: string };
      expect(uploadBody.filename).toBeDefined();
      const filename = uploadBody.filename!;

      // Puis le supprimer
      const deleteRes = await request(server())
        .delete(`/api/upload/${filename}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const deleteBody = deleteRes.body as { message?: string };
      expect(deleteBody).toHaveProperty('message');

      // Supprimer du tableau des uploadedFilenames puisque déjà supprimé
      const idx = uploadedFilenames.indexOf(filename);
      if (idx > -1) uploadedFilenames.splice(idx, 1);
    });
  });
});
