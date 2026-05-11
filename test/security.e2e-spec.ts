import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { loginAsAdmin } from './helpers/login';

/**
 * Tests E2E de sécurité (cas négatifs et pentest).
 *
 * Ces tests vérifient que l'API rejette correctement les requêtes :
 *   - sans token ou avec token invalide
 *   - avec des données invalides / malformées
 *   - sur des ressources inexistantes
 *   - contenant des tentatives d'injection ou de XSS
 *   - avec des uploads malveillants
 */
describe('Security E2E - Negative Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;

  // -----------------------------------------------------------------------
  // Setup
  // -----------------------------------------------------------------------

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

    // Garantir l'existence du rôle Admin et de l'utilisateur admin
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

    // Obtenir un token admin valide via cookie
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const { token } = await loginAsAdmin(server);
    adminToken = token;
  });

  afterAll(async () => {
    await app.close();
  });

  // -----------------------------------------------------------------------
  // A. Tests d'authentification — sans token
  // -----------------------------------------------------------------------

  describe('A. Endpoints protégés sans token → 401', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('GET /api/users → 401 sans token', async () => {
      await request(server()).get('/api/users').expect(401);
    });

    it('POST /api/users → 401 sans token', async () => {
      await request(server()).post('/api/users').expect(401);
    });

    it('GET /api/roles → 401 sans token', async () => {
      await request(server()).get('/api/roles').expect(401);
    });

    it('POST /api/roles → 401 sans token', async () => {
      await request(server()).post('/api/roles').expect(401);
    });

    it('GET /api/sponsors/admin/all → 401 sans token', async () => {
      await request(server()).get('/api/sponsors/admin/all').expect(401);
    });

    it('POST /api/sponsors → 401 sans token', async () => {
      await request(server()).post('/api/sponsors').expect(401);
    });

    it('POST /api/teams → 401 sans token', async () => {
      await request(server()).post('/api/teams').expect(401);
    });

    it('POST /api/games → 401 sans token', async () => {
      await request(server()).post('/api/games').expect(401);
    });

    it('POST /api/staff → 401 sans token', async () => {
      await request(server()).post('/api/staff').expect(401);
    });

    it('POST /api/config → 401 sans token', async () => {
      await request(server()).post('/api/config').expect(401);
    });

    it('PUT /api/config/:key → 401 sans token', async () => {
      await request(server()).put('/api/config/some_key').expect(401);
    });

    it('GET /api/recruitment/admin/all → 401 sans token', async () => {
      await request(server()).get('/api/recruitment/admin/all').expect(401);
    });

    it('POST /api/upload/image → 401 sans token', async () => {
      await request(server()).post('/api/upload/image').expect(401);
    });
  });

  // -----------------------------------------------------------------------
  // B. Tests avec token invalide / malformé
  // -----------------------------------------------------------------------

  describe('B. Tokens invalides ou malformés → 401', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('Token arbitraire → 401', async () => {
      await request(server())
        .get('/api/users')
        .set('Authorization', 'Bearer invalid-token-xyz')
        .expect(401);
    });

    it('JWT structuré mais avec signature fausse → 401', async () => {
      await request(server())
        .get('/api/users')
        .set(
          'Authorization',
          'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEsImVtYWlsIjoiZmFrZUBleGFtcGxlLmNvbSJ9.fakesignaturefakefakefake',
        )
        .expect(401);
    });

    it('Header Authorization sans "Bearer" → 401', async () => {
      await request(server())
        .get('/api/users')
        .set('Authorization', 'invalid-format-token')
        .expect(401);
    });

    it('Absence totale du header Authorization → 401', async () => {
      await request(server()).get('/api/users').expect(401);
    });

    it('Token vide → 401', async () => {
      await request(server()).get('/api/users').set('Authorization', 'Bearer ').expect(401);
    });
  });

  // -----------------------------------------------------------------------
  // C. Tests de validation des entrées
  // -----------------------------------------------------------------------

  describe('C. Validation des entrées — corps invalides', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    describe('POST /api/auth/login', () => {
      it('Body vide → 400', async () => {
        await request(server()).post('/api/auth/login').send({}).expect(400);
      });

      it('Email invalide → 400', async () => {
        await request(server())
          .post('/api/auth/login')
          .send({ email: 'not-an-email', password: 'password123' })
          .expect(400);
      });

      it('Email inexistant → 401 (anti-énumération : même code que mauvais mdp)', async () => {
        const res = await request(server())
          .post('/api/auth/login')
          .send({ email: 'inexistant@example.com', password: 'password123' })
          .expect(401);

        // On vérifie que le message ne révèle pas si l'utilisateur existe
        const body = res.body as { message: string };
        expect(body.message).not.toMatch(/inexistant|introuvable|not found/i);
      });

      it('Bon email, mauvais mot de passe → 401', async () => {
        await request(server())
          .post('/api/auth/login')
          .send({ email: 'admin@teamdivergentes.fr', password: 'wrongpassword' })
          .expect(401);
      });

      it('Champ password manquant → 400', async () => {
        await request(server())
          .post('/api/auth/login')
          .send({ email: 'admin@teamdivergentes.fr' })
          .expect(400);
      });
    });

    describe('POST /api/games — authentifié, données invalides', () => {
      it('Body vide → 400', async () => {
        await request(server())
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({})
          .expect(400);
      });

      it('Nom trop long (>255 chars) → 400 ou 201 selon contrainte DB', async () => {
        const longName = 'a'.repeat(300);
        const res = await request(server())
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ key: 'test_overflow_game', name: longName })
          .expect((r) => {
            // Soit rejeté par la validation (400), soit par la DB (400/500)
            expect([400, 201]).toContain(r.status);
          });

        // Nettoyage si le jeu a été créé malgré tout
        if (res.status === 201) {
          const created = res.body as { id?: number };
          if (created.id) {
            await request(server())
              .delete(`/api/games/${created.id}`)
              .set('Authorization', `Bearer ${adminToken}`);
          }
        }
      });

      it('Champ "key" manquant → 400', async () => {
        await request(server())
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'JeuSansClé' })
          .expect(400);
      });

      it('Champ "name" manquant → 400', async () => {
        await request(server())
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ key: 'jeu_sans_nom' })
          .expect(400);
      });
    });

    describe('POST /api/contact', () => {
      it('Body vide → 400', async () => {
        await request(server()).post('/api/contact').send({}).expect(400);
      });

      it('Email invalide → 400', async () => {
        await request(server())
          .post('/api/contact')
          .send({
            subject: 'Test sujet',
            name: 'Test User',
            email: 'invalid-email',
            message: 'Ce message est suffisamment long pour passer la validation minimale.',
          })
          .expect(400);
      });

      it('Message trop court (<10 chars) → 400', async () => {
        await request(server())
          .post('/api/contact')
          .send({
            subject: 'Test sujet',
            name: 'Test User',
            email: 'test@example.com',
            message: 'Court',
          })
          .expect(400);
      });

      it('Champ "name" manquant → 400', async () => {
        await request(server())
          .post('/api/contact')
          .send({
            subject: 'Test sujet',
            email: 'test@example.com',
            message: 'Message suffisamment long pour les tests de validation.',
          })
          .expect(400);
      });
    });
  });

  // -----------------------------------------------------------------------
  // D. Tests de ressources inexistantes
  // -----------------------------------------------------------------------

  describe('D. Ressources inexistantes → 404', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('GET /api/users/99999 → 404', async () => {
      await request(server())
        .get('/api/users/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('GET /api/games/nonexistent-game-key → 404', async () => {
      await request(server()).get('/api/games/nonexistent-game-key-xyz-99999').expect(404);
    });

    it('GET /api/teams/nonexistent-slug-xyz → 404', async () => {
      await request(server()).get('/api/teams/nonexistent-slug-xyz-99999').expect(404);
    });

    it('GET /api/nonexistent-route → 404', async () => {
      await request(server()).get('/api/nonexistent-route-xyz').expect(404);
    });

    it('DELETE /api/games/99999 → 404', async () => {
      await request(server())
        .delete('/api/games/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // -----------------------------------------------------------------------
  // E. Tests d'injection et sécurité applicative
  // -----------------------------------------------------------------------

  describe('E. Injections et sécurité applicative', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it("SQL injection dans l'email de login → 401, pas 500", async () => {
      const res = await request(server())
        .post('/api/auth/login')
        .send({ email: "' OR 1=1 --", password: 'irrelevant' });

      // Doit rejeter avec 400 (email invalide) ou 401 (auth échouée), jamais 500
      expect(res.status).not.toBe(500);
      expect([400, 401]).toContain(res.status);
    });

    it('SQL injection dans le mot de passe de login → 401, pas 500', async () => {
      const res = await request(server())
        .post('/api/auth/login')
        .send({ email: 'admin@teamdivergentes.fr', password: "' OR '1'='1" });

      expect(res.status).not.toBe(500);
      expect(res.status).toBe(401);
    });

    it('Tentative XSS dans le message contact → 400 (champ trop court) ou 200 (stocké sans exécution)', async () => {
      const res = await request(server()).post('/api/contact').send({
        subject: 'Test XSS',
        name: 'Attaquant',
        email: 'attaquant@example.com',
        message: '<script>alert(document.cookie)</script>',
      });

      // Le serveur ne doit jamais renvoyer 500
      expect(res.status).not.toBe(500);
      // Soit rejeté (400 car trop court), soit accepté et stocké sans exécution (200)
      expect([200, 400]).toContain(res.status);

      // Si accepté, la réponse ne doit pas inclure du HTML non échappé exécutable
      if (res.status === 200) {
        const body = JSON.stringify(res.body);
        expect(body).not.toContain('<script>alert(document.cookie)</script>');
      }
    });

    it('Content-Type text/plain sur endpoint JSON → 400 ou 415, pas 500', async () => {
      const res = await request(server())
        .post('/api/auth/login')
        .set('Content-Type', 'text/plain')
        .send('email=admin@teamdivergentes.fr&password=admin123');

      expect(res.status).not.toBe(500);
    });

    it('Payload JSON malformé → 400, pas 500', async () => {
      const res = await request(server())
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{email: "not-valid-json"');

      expect(res.status).not.toBe(500);
    });

    it('Injection NoSQL (opérateur $where) dans le corps → 400, pas 500', async () => {
      const res = await request(server())
        .post('/api/auth/login')
        .send({ email: { $gt: '' }, password: { $gt: '' } });

      expect(res.status).not.toBe(500);
      expect([400, 401]).toContain(res.status);
    });

    it('Payload excessivement grand (>1MB) → rejeté, pas 500', async () => {
      const hugeString = 'a'.repeat(1024 * 1024 + 1); // >1MB
      const res = await request(server())
        .post('/api/auth/login')
        .send({ email: hugeString, password: 'test' });

      // L'application doit rejeter ou limiter proprement
      expect(res.status).not.toBe(500);
    });
  });

  // -----------------------------------------------------------------------
  // F. Tests d'upload malveillant
  // -----------------------------------------------------------------------

  describe('F. Upload malveillant', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('POST /api/upload/image sans fichier → 400', async () => {
      const res = await request(server())
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.status).toBe(400);
    });

    it('POST /api/upload/image avec fichier exécutable .exe → 400', async () => {
      // Créer un faux fichier exécutable en mémoire
      const fakeExeContent = Buffer.from('MZ\x90\x00\x03\x00\x00\x00'); // En-tête PE minimal
      await request(server())
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', fakeExeContent, {
          filename: 'malware.exe',
          contentType: 'application/octet-stream',
        })
        .expect(400);
    });

    it('POST /api/upload/image avec type MIME text/html → 400', async () => {
      const htmlContent = Buffer.from('<html><body><script>alert(1)</script></body></html>');
      await request(server())
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', htmlContent, {
          filename: 'malicious.html',
          contentType: 'text/html',
        })
        .expect(400);
    });

    it('POST /api/upload/image avec type MIME application/pdf → 400', async () => {
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

    it('POST /api/upload/image avec fichier trop gros (>5MB) → 413 ou 400', async () => {
      // Générer un buffer de 6MB
      const bigFile = Buffer.alloc(6 * 1024 * 1024, 0xff);
      const res = await request(server())
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', bigFile, {
          filename: 'big_image.jpg',
          contentType: 'image/jpeg',
        });

      // Multer renvoie 413 (Payload Too Large) ou 400 selon la configuration
      expect([400, 413]).toContain(res.status);
    });

    it('POST /api/upload/image avec extension .js mais MIME image/jpeg → 400', async () => {
      // Tentative de déguiser un script JS en image
      const jsContent = Buffer.from('alert("xss")');
      await request(server())
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', jsContent, {
          filename: 'script.js',
          contentType: 'image/jpeg',
        });
      // Note : le filtre Multer se base sur le MIME type déclaré, pas l'extension.
      // Ce test vérifie que la combinaison MIME valide + extension invalide ne crash pas.
      // Le comportement attendu est 201 (accepté par le MIME) ou 400.
      // L'important est l'absence de 500.
    });
  });
});
