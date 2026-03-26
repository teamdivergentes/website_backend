import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Tests E2E du module Contact.
 *
 * Le endpoint POST /api/contact est public (@Public) et peut envoyer
 * un email + un webhook Discord. En environnement de test, les services
 * externes (SMTP, Discord) sont optionnels — le backend retourne 200 ou
 * une erreur gérée (502) selon la configuration.
 *
 * Couvre :
 *   - POST /api/contact (données valides) → 200 ou 502 (pas de config SMTP en test)
 *   - POST /api/contact (body vide) → 400
 *   - POST /api/contact (email invalide) → 400
 *   - POST /api/contact (subject manquant) → 400
 *   - POST /api/contact (name manquant) → 400
 *   - POST /api/contact (message manquant) → 400
 *   - POST /api/contact (message trop court, <10 chars) → 400
 *   - POST /api/contact (message trop long, >5000 chars) → 400
 *   - POST /api/contact (name trop court, <2 chars) → 400
 *   - POST /api/contact (subject trop long, >200 chars) → 400
 *   - POST /api/contact est accessible sans token (public)
 */
describe('ContactController (e2e)', () => {
  let app: INestApplication;

  const validContactPayload = {
    subject: 'Test de contact E2E',
    name: 'Jean Testeur',
    email: 'jean.testeur@example.com',
    message: 'Ceci est un message de test E2E suffisamment long pour passer la validation.',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
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
  });

  afterAll(async () => {
    await app.close();
  });

  // -----------------------------------------------------------------------
  // POST /api/contact
  // -----------------------------------------------------------------------

  describe('POST /api/contact', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('accessible sans token (endpoint public)', async () => {
      // En test, SMTP peut ne pas être configuré → 200 ou 502
      // L'important est que 401 ne soit pas retourné
      const res = await request(server()).post('/api/contact').send(validContactPayload);

      expect(res.status).not.toBe(401);
      expect([200, 502, 503]).toContain(res.status);
    });

    it('données valides → 200 (ou 502 si SMTP non configuré en test)', async () => {
      const res = await request(server()).post('/api/contact').send(validContactPayload);

      // En environnement de test sans SMTP configuré, 502 est attendu
      // En environnement complet avec SMTP, 200 est attendu
      expect([200, 502, 503]).toContain(res.status);

      // La réponse ne doit jamais être 500 brut (erreur interne non gérée)
      expect(res.status).not.toBe(500);
    });

    it('body vide → 400', async () => {
      await request(server()).post('/api/contact').send({}).expect(400);
    });

    it('email invalide → 400', async () => {
      await request(server())
        .post('/api/contact')
        .send({
          ...validContactPayload,
          email: 'pas-un-email',
        })
        .expect(400);
    });

    it('email manquant → 400', async () => {
      const { email: _email, ...withoutEmail } = validContactPayload;
      await request(server()).post('/api/contact').send(withoutEmail).expect(400);
    });

    it('subject manquant → 400', async () => {
      const { subject: _subject, ...withoutSubject } = validContactPayload;
      await request(server()).post('/api/contact').send(withoutSubject).expect(400);
    });

    it('subject vide → 400', async () => {
      await request(server())
        .post('/api/contact')
        .send({
          ...validContactPayload,
          subject: '',
        })
        .expect(400);
    });

    it('subject trop long (>200 chars) → 400', async () => {
      await request(server())
        .post('/api/contact')
        .send({
          ...validContactPayload,
          subject: 'a'.repeat(201),
        })
        .expect(400);
    });

    it('name manquant → 400', async () => {
      const { name: _name, ...withoutName } = validContactPayload;
      await request(server()).post('/api/contact').send(withoutName).expect(400);
    });

    it('name trop court (<2 chars) → 400', async () => {
      await request(server())
        .post('/api/contact')
        .send({
          ...validContactPayload,
          name: 'X',
        })
        .expect(400);
    });

    it('name trop long (>100 chars) → 400', async () => {
      await request(server())
        .post('/api/contact')
        .send({
          ...validContactPayload,
          name: 'a'.repeat(101),
        })
        .expect(400);
    });

    it('message manquant → 400', async () => {
      const { message: _message, ...withoutMessage } = validContactPayload;
      await request(server()).post('/api/contact').send(withoutMessage).expect(400);
    });

    it('message trop court (<10 chars) → 400', async () => {
      await request(server())
        .post('/api/contact')
        .send({
          ...validContactPayload,
          message: 'Court',
        })
        .expect(400);
    });

    it('message trop long (>5000 chars) → 400', async () => {
      await request(server())
        .post('/api/contact')
        .send({
          ...validContactPayload,
          message: 'a'.repeat(5001),
        })
        .expect(400);
    });

    it('champ inconnu (forbidNonWhitelisted) → 400', async () => {
      await request(server())
        .post('/api/contact')
        .send({
          ...validContactPayload,
          champInconnu: 'valeur_inconnue',
        })
        .expect(400);
    });

    it('ne retourne jamais 500 (erreurs internes gérées)', async () => {
      const res = await request(server()).post('/api/contact').send(validContactPayload);

      expect(res.status).not.toBe(500);
    });
  });
});
