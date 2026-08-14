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
    config: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prismaService = {
      team: { findMany: jest.fn() },
      teamMember: { findMany: jest.fn() },
      recruitmentPost: { findMany: jest.fn() },
      article: { findMany: jest.fn() },
      config: { findUnique: jest.fn() },
    };

    // Default: all findMany return empty arrays (overridden per test when needed)
    prismaService.team.findMany.mockResolvedValue([]);
    prismaService.teamMember.findMany.mockResolvedValue([]);
    prismaService.recruitmentPost.findMany.mockResolvedValue([]);
    prismaService.article.findMany.mockResolvedValue([]);
    // Default: page_twitch_visible = true, page_palmares_visible = absent (masqué par défaut)
    prismaService.config.findUnique.mockImplementation((args: { where: { key: string } }) => {
      if (args.where.key === 'page_twitch_visible') return Promise.resolve({ value: 'true' });
      return Promise.resolve(null);
    });

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
      expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
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
        '/twitch',
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
        { slug: 'eva-joker', updatedAt: TEAM_DATE },
        { slug: 'eva-mystic', updatedAt: TEAM_DATE },
      ]);

      const xml = await service.generateSitemapXml(BASE_URL);

      expect(xml).toContain(`<loc>${BASE_URL}/structure/equipes/eva-joker</loc>`);
      expect(xml).toContain(`<loc>${BASE_URL}/structure/equipes/eva-mystic</loc>`);
    });

    it('devrait inclure le lastmod correct pour les equipes', async () => {
      prismaService.team.findMany.mockResolvedValue([
        { slug: 'rocket-league', updatedAt: TEAM_DATE },
      ]);

      const xml = await service.generateSitemapXml(BASE_URL);

      expect(xml).toContain('<lastmod>2024-06-15</lastmod>');
    });

    it('devrait inclure les pages des joueurs avec slug', async () => {
      prismaService.teamMember.findMany.mockResolvedValue([
        { slug: 'pseudo-joueur', updatedAt: MEMBER_DATE, team: { slug: 'eva-joker' } },
        { slug: 'autre-joueur', updatedAt: MEMBER_DATE, team: { slug: 'eva-mystic' } },
      ]);

      const xml = await service.generateSitemapXml(BASE_URL);

      expect(xml).toContain(
        `<loc>${BASE_URL}/structure/equipes/eva-joker/joueur/pseudo-joueur</loc>`,
      );
      expect(xml).toContain(
        `<loc>${BASE_URL}/structure/equipes/eva-mystic/joueur/autre-joueur</loc>`,
      );
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
        {
          slug: 'mon-premier-article',
          title: 'Premier Article',
          imageUrl: null,
          updatedAt: ARTICLE_DATE,
        },
        {
          slug: 'victoire-valorant',
          title: 'Victoire Valorant',
          imageUrl: null,
          updatedAt: ARTICLE_DATE,
        },
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

    it('devrait generer un XML contenant 11 pages statiques quand aucune donnee dynamique (twitch visible)', async () => {
      const xml = await service.generateSitemapXml(BASE_URL);

      const urlCount = (xml.match(/<url>/g) ?? []).length;
      expect(urlCount).toBe(11);
    });

    it('devrait generer un XML contenant 10 pages statiques quand twitch est masque', async () => {
      prismaService.config.findUnique.mockImplementation((args: { where: { key: string } }) => {
        if (args.where.key === 'page_twitch_visible') return Promise.resolve({ value: 'false' });
        return Promise.resolve(null);
      });

      const xml = await service.generateSitemapXml(BASE_URL);

      const urlCount = (xml.match(/<url>/g) ?? []).length;
      expect(urlCount).toBe(10);
    });

    it('devrait generer le bon nombre total de URLs avec donnees dynamiques', async () => {
      prismaService.team.findMany.mockResolvedValue([
        { slug: 'eva-joker', updatedAt: TEAM_DATE },
        { slug: 'eva-mystic', updatedAt: TEAM_DATE },
      ]);
      prismaService.teamMember.findMany.mockResolvedValue([
        { slug: 'joueur-a', updatedAt: MEMBER_DATE, team: { slug: 'eva-joker' } },
      ]);
      prismaService.recruitmentPost.findMany.mockResolvedValue([
        { slug: 'coach', updatedAt: RECRUIT_DATE },
      ]);
      prismaService.article.findMany.mockResolvedValue([
        {
          slug: 'article-test',
          title: 'Article Test',
          imageUrl: null,
          updatedAt: ARTICLE_DATE,
        },
      ]);

      const xml = await service.generateSitemapXml(BASE_URL);

      // 11 static (twitch visible) + 2 teams + 1 member + 1 recruitment + 1 article = 16
      const urlCount = (xml.match(/<url>/g) ?? []).length;
      expect(urlCount).toBe(16);
    });

    // --- US: /twitch dans le sitemap ---

    it('devrait inclure /twitch dans le sitemap quand page_twitch_visible est true', async () => {
      prismaService.config.findUnique.mockImplementation((args: { where: { key: string } }) => {
        if (args.where.key === 'page_twitch_visible') return Promise.resolve({ value: 'true' });
        return Promise.resolve(null);
      });

      const xml = await service.generateSitemapXml(BASE_URL);

      expect(xml).toContain(`<loc>${BASE_URL}/twitch</loc>`);
    });

    it('devrait exclure /twitch du sitemap quand page_twitch_visible est false', async () => {
      prismaService.config.findUnique.mockImplementation((args: { where: { key: string } }) => {
        if (args.where.key === 'page_twitch_visible') return Promise.resolve({ value: 'false' });
        return Promise.resolve(null);
      });

      const xml = await service.generateSitemapXml(BASE_URL);

      expect(xml).not.toContain(`<loc>${BASE_URL}/twitch</loc>`);
    });

    it('devrait inclure /twitch avec changefreq daily et priority 0.7', async () => {
      prismaService.config.findUnique.mockImplementation((args: { where: { key: string } }) => {
        if (args.where.key === 'page_twitch_visible') return Promise.resolve({ value: 'true' });
        return Promise.resolve(null);
      });

      const xml = await service.generateSitemapXml(BASE_URL);

      const twitchIndex = xml.indexOf(`<loc>${BASE_URL}/twitch</loc>`);
      expect(twitchIndex).toBeGreaterThan(-1);

      const twitchBlock = xml.substring(twitchIndex - 10, twitchIndex + 300);
      expect(twitchBlock).toContain('<changefreq>daily</changefreq>');
      expect(twitchBlock).toContain('<priority>0.7</priority>');
    });

    it('devrait inclure /twitch par defaut si la config page_twitch_visible est absente', async () => {
      prismaService.config.findUnique.mockResolvedValue(null);

      const xml = await service.generateSitemapXml(BASE_URL);

      expect(xml).toContain(`<loc>${BASE_URL}/twitch</loc>`);
    });

    // --- US: namespace image et balises image:image ---

    it('devrait inclure le namespace image dans urlset', async () => {
      const xml = await service.generateSitemapXml(BASE_URL);

      expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
    });

    it('devrait inclure un bloc image:image pour un article avec imageUrl', async () => {
      prismaService.article.findMany.mockResolvedValue([
        {
          slug: 'article-avec-image',
          title: 'Mon Super Article',
          imageUrl: '/uploads/test-image.jpg',
          updatedAt: ARTICLE_DATE,
        },
      ]);

      const xml = await service.generateSitemapXml(BASE_URL);

      expect(xml).toContain('<image:image>');
      expect(xml).toContain(`<image:loc>${BASE_URL}/uploads/test-image.jpg</image:loc>`);
      expect(xml).toContain('<image:title>Mon Super Article</image:title>');
      expect(xml).toContain('</image:image>');
    });

    it('ne devrait pas inclure de bloc image:image pour un article sans imageUrl', async () => {
      prismaService.article.findMany.mockResolvedValue([
        {
          slug: 'article-sans-image',
          title: 'Article Sans Image',
          imageUrl: null,
          updatedAt: ARTICLE_DATE,
        },
      ]);

      const xml = await service.generateSitemapXml(BASE_URL);

      const articleIndex = xml.indexOf(`<loc>${BASE_URL}/articles/article-sans-image</loc>`);
      expect(articleIndex).toBeGreaterThan(-1);

      // Extraire le bloc <url> de cet article
      const urlStart = xml.lastIndexOf('<url>', articleIndex);
      const urlEnd = xml.indexOf('</url>', articleIndex) + '</url>'.length;
      const urlBlock = xml.substring(urlStart, urlEnd);

      expect(urlBlock).not.toContain('<image:image>');
    });

    it("devrait echapper les caracteres speciaux XML dans le titre de l'image", async () => {
      prismaService.article.findMany.mockResolvedValue([
        {
          slug: 'article-special',
          title: 'Article avec & des <balises> et "guillemets"',
          imageUrl: '/uploads/special.jpg',
          updatedAt: ARTICLE_DATE,
        },
      ]);

      const xml = await service.generateSitemapXml(BASE_URL);

      expect(xml).toContain(
        '<image:title>Article avec &amp; des &lt;balises&gt; et &quot;guillemets&quot;</image:title>',
      );
      expect(xml).not.toContain('<image:title>Article avec & des <balises>');
    });

    it("devrait construire l'URL absolue de l'image en concatenant siteUrl", async () => {
      prismaService.article.findMany.mockResolvedValue([
        {
          slug: 'article-url-test',
          title: 'Test URL',
          imageUrl: '/uploads/mon-image.webp',
          updatedAt: ARTICLE_DATE,
        },
      ]);

      const xml = await service.generateSitemapXml(BASE_URL);

      expect(xml).toContain(
        `<image:loc>https://teamdivergentes.fr/uploads/mon-image.webp</image:loc>`,
      );
    });

    it('devrait inclure les balises image:image pour les articles calls Prisma avec imageUrl dans select', async () => {
      await service.generateSitemapXml(BASE_URL);

      const calls = prismaService.article.findMany.mock.calls as Array<
        [
          {
            where: { published: boolean };
            select: { slug: boolean; title: boolean; imageUrl: boolean; updatedAt: boolean };
          },
        ]
      >;
      expect(calls[0][0].select.imageUrl).toBe(true);
      expect(calls[0][0].select.title).toBe(true);
    });

    // --- US: /structure/palmares dans le sitemap (EPIC-37) ---

    it('devrait inclure /structure/palmares dans le sitemap quand page_palmares_visible est true', async () => {
      prismaService.config.findUnique.mockImplementation((args: { where: { key: string } }) => {
        if (args.where.key === 'page_twitch_visible') return Promise.resolve({ value: 'true' });
        if (args.where.key === 'page_palmares_visible') return Promise.resolve({ value: 'true' });
        return Promise.resolve(null);
      });

      const xml = await service.generateSitemapXml(BASE_URL);

      expect(xml).toContain(`<loc>${BASE_URL}/structure/palmares</loc>`);
    });

    it('devrait exclure /structure/palmares du sitemap quand page_palmares_visible est absent', async () => {
      // Default mock: page_palmares_visible = null (masqué par défaut)
      const xml = await service.generateSitemapXml(BASE_URL);

      expect(xml).not.toContain(`<loc>${BASE_URL}/structure/palmares</loc>`);
    });
  });
});
