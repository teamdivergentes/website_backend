import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException } from '@nestjs/common';
import { SitemapService } from './sitemap.service';
import { PrismaService } from '../prisma.service';

const BASE_URL = 'https://teamdivergentes.fr';

const TEAM_DATE = new Date('2024-06-15T10:00:00Z');
const MEMBER_DATE = new Date('2024-07-01T12:00:00Z');
const RECRUIT_DATE = new Date('2024-07-10T08:00:00Z');
const ARTICLE_DATE = new Date('2024-08-01T14:00:00Z');

describe('SitemapService', () => {
  let service: SitemapService;
  let prismaService: {
    team: { findMany: jest.Mock };
    teamMember: { findMany: jest.Mock };
    recruitmentPost: { findMany: jest.Mock };
    article: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prismaService = {
      team: { findMany: jest.fn() },
      teamMember: { findMany: jest.fn() },
      recruitmentPost: { findMany: jest.fn() },
      article: { findMany: jest.fn() },
    };

    // Default: all findMany return empty arrays (overridden per test when needed)
    prismaService.team.findMany.mockResolvedValue([]);
    prismaService.teamMember.findMany.mockResolvedValue([]);
    prismaService.recruitmentPost.findMany.mockResolvedValue([]);
    prismaService.article.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SitemapService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<SitemapService>(SitemapService);
  });

  describe('generateSitemapXml', () => {
    it('devrait retourner un XML valide avec le prologue et la balise urlset', async () => {
      const xml = await service.generateSitemapXml(BASE_URL);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).toContain('</urlset>');
    });

    it('devrait inclure toutes les pages statiques', async () => {
      const xml = await service.generateSitemapXml(BASE_URL);

      const staticPages = [
        '/',
        '/contact',
        '/boutique',
        '/structure',
        '/structure/equipes',
        '/structure/sponsors',
        '/structure/recrutement',
        '/articles',
        '/mentions-legales',
        '/politique-de-confidentialite',
      ];

      for (const page of staticPages) {
        expect(xml).toContain(`<loc>${BASE_URL}${page}</loc>`);
      }
    });

    it('devrait inclure la page accueil avec priority 1.0, changefreq weekly, sans lastmod', async () => {
      const xml = await service.generateSitemapXml(BASE_URL);

      const homepageIndex = xml.indexOf(`<loc>${BASE_URL}/</loc>`);
      expect(homepageIndex).toBeGreaterThan(-1);

      const urlBlock = xml.substring(homepageIndex - 10, homepageIndex + 300);
      expect(urlBlock).toContain('<priority>1.0</priority>');
      expect(urlBlock).toContain('<changefreq>weekly</changefreq>');
      expect(urlBlock).not.toContain('<lastmod>');
    });

    it('devrait inclure les pages dynamiques des equipes actives', async () => {
      prismaService.team.findMany.mockResolvedValue([
        { id: 1, updatedAt: TEAM_DATE },
        { id: 2, updatedAt: TEAM_DATE },
      ]);

      const xml = await service.generateSitemapXml(BASE_URL);

      expect(xml).toContain(`<loc>${BASE_URL}/structure/equipes/1</loc>`);
      expect(xml).toContain(`<loc>${BASE_URL}/structure/equipes/2</loc>`);
    });

    it('devrait inclure le lastmod correct pour les equipes', async () => {
      prismaService.team.findMany.mockResolvedValue([{ id: 42, updatedAt: TEAM_DATE }]);

      const xml = await service.generateSitemapXml(BASE_URL);

      expect(xml).toContain('<lastmod>2024-06-15</lastmod>');
    });

    it('devrait inclure les pages des joueurs avec slug', async () => {
      prismaService.teamMember.findMany.mockResolvedValue([
        { teamId: 1, slug: 'pseudo-joueur', updatedAt: MEMBER_DATE },
        { teamId: 2, slug: 'autre-joueur', updatedAt: MEMBER_DATE },
      ]);

      const xml = await service.generateSitemapXml(BASE_URL);

      expect(xml).toContain(`<loc>${BASE_URL}/structure/equipes/1/joueur/pseudo-joueur</loc>`);
      expect(xml).toContain(`<loc>${BASE_URL}/structure/equipes/2/joueur/autre-joueur</loc>`);
    });

    it('devrait inclure les pages des offres de recrutement avec slug', async () => {
      prismaService.recruitmentPost.findMany.mockResolvedValue([
        { slug: 'coach-lol', updatedAt: RECRUIT_DATE },
        { slug: 'manager-esport', updatedAt: RECRUIT_DATE },
      ]);

      const xml = await service.generateSitemapXml(BASE_URL);

      expect(xml).toContain(`<loc>${BASE_URL}/structure/recrutement/coach-lol</loc>`);
      expect(xml).toContain(`<loc>${BASE_URL}/structure/recrutement/manager-esport</loc>`);
    });

    it('devrait inclure les articles publies dans le sitemap', async () => {
      prismaService.article.findMany.mockResolvedValue([
        { slug: 'mon-premier-article', updatedAt: ARTICLE_DATE },
        { slug: 'victoire-valorant', updatedAt: ARTICLE_DATE },
      ]);

      const xml = await service.generateSitemapXml(BASE_URL);

      expect(xml).toContain(`<loc>${BASE_URL}/articles/mon-premier-article</loc>`);
      expect(xml).toContain(`<loc>${BASE_URL}/articles/victoire-valorant</loc>`);
      expect(xml).toContain('<lastmod>2024-08-01</lastmod>');
    });

    it('devrait formater le lastmod en YYYY-MM-DD', async () => {
      prismaService.recruitmentPost.findMany.mockResolvedValue([
        { slug: 'test-post', updatedAt: RECRUIT_DATE },
      ]);

      const xml = await service.generateSitemapXml(BASE_URL);

      expect(xml).toContain('<lastmod>2024-07-10</lastmod>');
    });

    it('devrait supprimer le slash final du baseUrl si present', async () => {
      const xml = await service.generateSitemapXml('https://teamdivergentes.fr/');

      expect(xml).toContain(`<loc>https://teamdivergentes.fr/</loc>`);
      expect(xml).toContain(`<loc>https://teamdivergentes.fr/contact</loc>`);
      expect(xml).not.toContain('https://teamdivergentes.fr//contact');
    });

    it('devrait echapper les caracteres speciaux XML dans les URLs', async () => {
      prismaService.recruitmentPost.findMany.mockResolvedValue([
        { slug: 'poste-test', updatedAt: RECRUIT_DATE },
      ]);

      const xml = await service.generateSitemapXml('https://example.com');

      const withoutDecl = xml.replace(/&amp;|&lt;|&gt;|&quot;|&apos;/g, '');
      expect(withoutDecl).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/);
    });

    it('devrait appeler prisma avec les bons filtres pour les equipes', async () => {
      await service.generateSitemapXml(BASE_URL);

      expect(prismaService.team.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { active: true },
        }),
      );
    });

    it('devrait appeler prisma avec les bons filtres pour les membres', async () => {
      await service.generateSitemapXml(BASE_URL);

      const calls = prismaService.teamMember.findMany.mock.calls as Array<
        [{ where: { slug: { not: null }; team: { active: boolean } } }]
      >;
      expect(calls[0][0].where.slug).toEqual({ not: null });
      expect(calls[0][0].where.team).toEqual({ active: true });
    });

    it('devrait appeler prisma avec les bons filtres pour le recrutement', async () => {
      await service.generateSitemapXml(BASE_URL);

      expect(prismaService.recruitmentPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            active: true,
            slug: { not: null },
          },
        }),
      );
    });

    it('devrait appeler prisma avec les bons filtres pour les articles', async () => {
      await service.generateSitemapXml(BASE_URL);

      expect(prismaService.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { published: true },
        }),
      );
    });

    it('devrait lancer BadGatewayException si Prisma echoue', async () => {
      prismaService.team.findMany.mockRejectedValue(new Error('Connexion BDD perdue'));

      await expect(service.generateSitemapXml(BASE_URL)).rejects.toThrow(BadGatewayException);
    });

    it('devrait ne pas exposer le message d erreur interne dans BadGatewayException', async () => {
      prismaService.team.findMany.mockRejectedValue(
        new Error('FATAL: password authentication failed'),
      );

      await expect(service.generateSitemapXml(BASE_URL)).rejects.toThrow(
        'Erreur lors de la génération du sitemap',
      );
      await expect(service.generateSitemapXml(BASE_URL)).rejects.not.toThrow(
        'password authentication',
      );
    });

    it('devrait lancer BadGatewayException pour une erreur non-Error', async () => {
      prismaService.team.findMany.mockRejectedValue('erreur string');

      await expect(service.generateSitemapXml(BASE_URL)).rejects.toThrow(BadGatewayException);
    });

    it('devrait inclure les priorites et changefreq corrects pour les pages statiques cles', async () => {
      const xml = await service.generateSitemapXml(BASE_URL);

      const mentionsIndex = xml.indexOf('<loc>https://teamdivergentes.fr/mentions-legales</loc>');
      const mentionsBlock = xml.substring(mentionsIndex, mentionsIndex + 200);
      expect(mentionsBlock).toContain('<priority>0.3</priority>');
      expect(mentionsBlock).toContain('<changefreq>yearly</changefreq>');
    });

    it('devrait generer un XML contenant 10 pages statiques quand aucune donnee dynamique', async () => {
      const xml = await service.generateSitemapXml(BASE_URL);

      const urlCount = (xml.match(/<url>/g) ?? []).length;
      expect(urlCount).toBe(10);
    });

    it('devrait generer le bon nombre total de URLs avec donnees dynamiques', async () => {
      prismaService.team.findMany.mockResolvedValue([
        { id: 1, updatedAt: TEAM_DATE },
        { id: 2, updatedAt: TEAM_DATE },
      ]);
      prismaService.teamMember.findMany.mockResolvedValue([
        { teamId: 1, slug: 'joueur-a', updatedAt: MEMBER_DATE },
      ]);
      prismaService.recruitmentPost.findMany.mockResolvedValue([
        { slug: 'coach', updatedAt: RECRUIT_DATE },
      ]);
      prismaService.article.findMany.mockResolvedValue([
        { slug: 'article-test', updatedAt: ARTICLE_DATE },
      ]);

      const xml = await service.generateSitemapXml(BASE_URL);

      // 10 static + 2 teams + 1 member + 1 recruitment + 1 article = 15
      const urlCount = (xml.match(/<url>/g) ?? []).length;
      expect(urlCount).toBe(15);
    });
  });
});
