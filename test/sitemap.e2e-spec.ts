import request from 'supertest';
import { SitemapModule } from '../src/sitemap/sitemap.module';
import { createTestApp } from './helpers/test-app';
import type { INestApplication } from '@nestjs/common';
import type { PrismaMock } from './helpers/prisma-mock';

/**
 * Tests E2E — SitemapController.
 *
 * Vérifie le Content-Type, le prologue XML et la structure de base
 * sans connexion BDD réelle (PrismaService mocké via createTestApp).
 */
describe('SitemapController (e2e)', () => {
  let app: INestApplication;
  let prismaMock: PrismaMock;

  beforeAll(async () => {
    const result = await createTestApp({
      moduleMetadata: { imports: [SitemapModule] },
    });
    app = result.app;
    prismaMock = result.prismaMock;
  });

  beforeEach(() => {
    // Default mocks : aucune donnée dynamique, page_twitch_visible = true
    prismaMock.team.findMany.mockResolvedValue([]);
    prismaMock.teamMember.findMany.mockResolvedValue([]);
    prismaMock.recruitmentPost.findMany.mockResolvedValue([]);
    prismaMock.article.findMany.mockResolvedValue([]);
    prismaMock.config.findUnique.mockResolvedValue({ value: 'true' });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /sitemap.xml', () => {
    it('devrait retourner HTTP 200', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server).get('/sitemap.xml').expect(200);
    });

    it('devrait retourner Content-Type application/xml avec charset UTF-8', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response = await request(server).get('/sitemap.xml').expect(200);

      const contentType = response.headers['content-type'].toLowerCase();
      expect(contentType).toContain('application/xml');
      expect(contentType).toContain('charset=utf-8');
    });

    it('devrait retourner un prologue XML valide', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response = await request(server).get('/sitemap.xml').expect(200);

      const body = response.text;
      expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(body).toContain('<urlset');
      expect(body).toContain('</urlset>');
    });

    it('devrait inclure le namespace sitemap standard', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response = await request(server).get('/sitemap.xml').expect(200);

      expect(response.text).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    });

    it('devrait inclure le namespace image Google', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response = await request(server).get('/sitemap.xml').expect(200);

      expect(response.text).toContain(
        'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"',
      );
    });

    it('devrait etre accessible sans authentification (route publique)', async () => {
      // Pas de token JWT dans la requete — doit quand meme retourner 200
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server).get('/sitemap.xml').expect(200);
    });

    it('devrait inclure /twitch quand page_twitch_visible est true', async () => {
      prismaMock.config.findUnique.mockResolvedValue({ value: 'true' });

      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response = await request(server).get('/sitemap.xml').expect(200);

      expect(response.text).toContain('/twitch</loc>');
    });

    it('devrait exclure /twitch quand page_twitch_visible est false', async () => {
      prismaMock.config.findUnique.mockResolvedValue({ value: 'false' });

      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response = await request(server).get('/sitemap.xml').expect(200);

      expect(response.text).not.toContain('/twitch</loc>');
    });
  });
});
