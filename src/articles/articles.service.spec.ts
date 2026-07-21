import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadGatewayException } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { PrismaService } from '../prisma.service';

jest.mock('slugify', () => ({
  __esModule: true,
  default: jest.fn((text: string) =>
    text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, ''),
  ),
}));

describe('ArticlesService', () => {
  let service: ArticlesService;

  const mockPrismaService = {
    article: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockArticle = {
    id: 1,
    title: 'Mon article',
    slug: 'mon-article',
    content: "Contenu de l'article",
    excerpt: 'Extrait',
    imageUrl: null,
    mobileImageUrl: null,
    tabletImageUrl: null,
    published: false,
    featured: false,
    typeId: 1,
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    type: { id: 1, name: 'Actualité', createdAt: new Date(), updatedAt: new Date() },
    user: { id: 1 },
  };

  /** Article simulant une réponse Prisma avec les données complètes */
  const mockArticleWithFullUser = {
    ...mockArticle,
    user: { id: 1, email: 'auteur@test.fr' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArticlesService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------
  describe('findAll', () => {
    it("retourne une liste paginée d'articles sans userId ni user (SEC-006)", async () => {
      const articles = [mockArticle];
      mockPrismaService.article.findMany.mockResolvedValue(articles);
      mockPrismaService.article.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      // La réponse ne doit pas contenir userId ni user (SEC-006)

      const { userId: _u, user: _usr, ...expectedArticle } = mockArticle;
      expect(result.data).toEqual([expectedArticle]);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(1);
    });

    it('applique le filtre published', async () => {
      mockPrismaService.article.findMany.mockResolvedValue([]);
      mockPrismaService.article.count.mockResolvedValue(0);

      await service.findAll({ published: true });

      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(mockPrismaService.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ published: true }),
        }),
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    });

    it('applique le filtre search sur title et excerpt', async () => {
      mockPrismaService.article.findMany.mockResolvedValue([]);
      mockPrismaService.article.count.mockResolvedValue(0);

      await service.findAll({ search: 'test' });

      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(mockPrismaService.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: expect.any(Object) }),
              expect.objectContaining({ excerpt: expect.any(Object) }),
            ]),
          }),
        }),
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    });

    it("lance BadGatewayException en cas d'erreur Prisma", async () => {
      mockPrismaService.article.findMany.mockRejectedValue(new Error('DB error'));

      await expect(service.findAll({})).rejects.toThrow(BadGatewayException);
    });
  });

  // -------------------------------------------------------------------------
  // findHomepage
  // -------------------------------------------------------------------------
  describe('findHomepage', () => {
    it("retourne 3 articles mis en avant s'il y en a suffisamment", async () => {
      const featured = [mockArticle, mockArticle, mockArticle];
      mockPrismaService.article.findMany.mockResolvedValue(featured);

      const result = await service.findHomepage();

      expect(result).toHaveLength(3);
      expect(mockPrismaService.article.findMany).toHaveBeenCalledTimes(1);
    });

    it('complète avec des articles récents si moins de 3 mis en avant', async () => {
      const featured = [mockArticle];
      const recent = [
        { ...mockArticle, id: 2 },
        { ...mockArticle, id: 3 },
      ];

      mockPrismaService.article.findMany
        .mockResolvedValueOnce(featured)
        .mockResolvedValueOnce(recent);

      const result = await service.findHomepage();

      expect(result).toHaveLength(3);
      expect(mockPrismaService.article.findMany).toHaveBeenCalledTimes(2);
    });

    it("lance BadGatewayException en cas d'erreur Prisma", async () => {
      mockPrismaService.article.findMany.mockRejectedValue(new Error('DB error'));

      await expect(service.findHomepage()).rejects.toThrow(BadGatewayException);
    });
  });

  // -------------------------------------------------------------------------
  // findBySlug
  // -------------------------------------------------------------------------
  describe('findBySlug', () => {
    const mockPublishedArticle = { ...mockArticle, published: true };

    it("retourne l'article publié correspondant au slug sans userId ni user (SEC-006)", async () => {
      mockPrismaService.article.findFirst.mockResolvedValue(mockPublishedArticle);

      const result = await service.findBySlug('mon-article');

      // La réponse ne doit pas contenir userId ni user (SEC-006)

      const { userId: _u, user: _usr, ...expectedArticle } = mockPublishedArticle;
      expect(result).toEqual(expectedArticle);
    });

    it('filtre uniquement les articles publiés (SEC-EPIC37-01)', async () => {
      mockPrismaService.article.findFirst.mockResolvedValue(mockPublishedArticle);

      await service.findBySlug('mon-article');

      expect(mockPrismaService.article.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'mon-article', published: true } }),
      );
    });

    it("lance NotFoundException si l'article n'existe pas", async () => {
      mockPrismaService.article.findFirst.mockResolvedValue(null);

      await expect(service.findBySlug('inexistant')).rejects.toThrow(NotFoundException);
    });

    it('lance NotFoundException pour un slug existant mais non publié (SEC-EPIC37-01)', async () => {
      // Le filtre where { published: true } exclut l'article non publié → findFirst renvoie null
      mockPrismaService.article.findFirst.mockResolvedValue(null);

      await expect(service.findBySlug('brouillon-secret')).rejects.toThrow(NotFoundException);
    });

    it("lance BadGatewayException en cas d'erreur Prisma", async () => {
      mockPrismaService.article.findFirst.mockRejectedValue(new Error('DB error'));

      await expect(service.findBySlug('mon-article')).rejects.toThrow(BadGatewayException);
    });
  });

  // -------------------------------------------------------------------------
  // findOne
  // -------------------------------------------------------------------------
  describe('findOne', () => {
    it("retourne l'article par id", async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);

      const result = await service.findOne(1);

      expect(result).toEqual(mockArticle);
    });

    it("lance NotFoundException si l'article n'existe pas", async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });

    it("lance BadGatewayException en cas d'erreur Prisma", async () => {
      mockPrismaService.article.findUnique.mockRejectedValue(new Error('DB error'));

      await expect(service.findOne(1)).rejects.toThrow(BadGatewayException);
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------
  describe('create', () => {
    const createDto = {
      title: 'Mon article',
      content: 'Contenu',
      typeId: 1,
    };

    it('crée un article avec un slug généré depuis le titre', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(null);
      mockPrismaService.article.create.mockResolvedValue(mockArticle);

      const result = await service.create(createDto, 1);

      expect(result).toEqual(mockArticle);
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(mockPrismaService.article.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: createDto.title,
            typeId: createDto.typeId,
            userId: 1,
          }),
        }),
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    });

    it('génère un slug unique avec suffixe numérique si slug déjà pris', async () => {
      mockPrismaService.article.findUnique
        .mockResolvedValueOnce({ id: 99 })
        .mockResolvedValueOnce(null);
      mockPrismaService.article.create.mockResolvedValue({ ...mockArticle, slug: 'mon-article-2' });

      const result = await service.create(createDto, 1);

      expect(result).toBeDefined();
      expect(mockPrismaService.article.create).toHaveBeenCalled();
    });

    it("lance BadGatewayException en cas d'erreur Prisma", async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(null);
      mockPrismaService.article.create.mockRejectedValue(new Error('DB error'));

      await expect(service.create(createDto, 1)).rejects.toThrow(BadGatewayException);
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------
  describe('update', () => {
    it('met à jour un article existant', async () => {
      const dto = { title: 'Titre modifié' };
      const updated = { ...mockArticle, title: 'Titre modifié' };

      mockPrismaService.article.findUnique
        .mockResolvedValueOnce(mockArticle)
        .mockResolvedValueOnce(null);
      mockPrismaService.article.update.mockResolvedValue(updated);

      const result = await service.update(1, dto);

      expect(result).toEqual(updated);
    });

    it("lance NotFoundException si l'article n'existe pas", async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(null);

      await expect(service.update(99, { title: 'Test' })).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.article.update).not.toHaveBeenCalled();
    });

    it("lance BadGatewayException en cas d'erreur Prisma", async () => {
      mockPrismaService.article.findUnique.mockRejectedValue(new Error('DB error'));

      await expect(service.update(1, {})).rejects.toThrow(BadGatewayException);
    });
  });

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------
  describe('delete', () => {
    it('supprime un article et retourne un message de confirmation', async () => {
      mockPrismaService.article.delete.mockResolvedValue(mockArticle);

      const result = await service.delete(1);

      expect(result).toEqual({ message: 'Article supprimé avec succès' });
      expect(mockPrismaService.article.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("lance BadGatewayException en cas d'erreur Prisma non gérée", async () => {
      mockPrismaService.article.delete.mockRejectedValue(new Error('DB error'));

      await expect(service.delete(1)).rejects.toThrow(BadGatewayException);
    });
  });

  // -------------------------------------------------------------------------
  // togglePublished
  // -------------------------------------------------------------------------
  describe('togglePublished', () => {
    it("bascule le statut published d'un article", async () => {
      const unpublished = { ...mockArticle, published: false };
      const published = { ...mockArticle, published: true };

      mockPrismaService.article.findUnique.mockResolvedValue(unpublished);
      mockPrismaService.article.update.mockResolvedValue(published);

      const result = await service.togglePublished(1);

      expect(result).toEqual(published);
      expect(mockPrismaService.article.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { published: true },
        }),
      );
    });

    it("lance NotFoundException si l'article n'existe pas", async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(null);

      await expect(service.togglePublished(99)).rejects.toThrow(NotFoundException);
    });

    it("lance BadGatewayException en cas d'erreur Prisma", async () => {
      mockPrismaService.article.findUnique.mockRejectedValue(new Error('DB error'));

      await expect(service.togglePublished(1)).rejects.toThrow(BadGatewayException);
    });
  });

  // -------------------------------------------------------------------------
  // toggleFeatured
  // -------------------------------------------------------------------------
  describe('toggleFeatured', () => {
    it("bascule le statut featured d'un article", async () => {
      const notFeatured = { ...mockArticle, featured: false };
      const featured = { ...mockArticle, featured: true };

      mockPrismaService.article.findUnique.mockResolvedValue(notFeatured);
      mockPrismaService.article.update.mockResolvedValue(featured);

      const result = await service.toggleFeatured(1);

      expect(result).toEqual(featured);
      expect(mockPrismaService.article.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { featured: true },
        }),
      );
    });

    it("lance NotFoundException si l'article n'existe pas", async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(null);

      await expect(service.toggleFeatured(99)).rejects.toThrow(NotFoundException);
    });

    it("lance BadGatewayException en cas d'erreur Prisma", async () => {
      mockPrismaService.article.findUnique.mockRejectedValue(new Error('DB error'));

      await expect(service.toggleFeatured(1)).rejects.toThrow(BadGatewayException);
    });
  });

  // -------------------------------------------------------------------------
  // SEC-006 — les endpoints publics ne doivent PAS exposer userId / user
  // -------------------------------------------------------------------------
  describe('SEC-006 — fuite identité auteur (endpoints publics)', () => {
    describe('findAll — réponse publique sans userId ni user', () => {
      it('ne contient pas de champ userId dans les articles retournés', async () => {
        const articleAvecUserId = { ...mockArticle };
        mockPrismaService.article.findMany.mockResolvedValue([articleAvecUserId]);
        mockPrismaService.article.count.mockResolvedValue(1);

        const result = await service.findAll({});

        result.data.forEach((article) => {
          expect(article).not.toHaveProperty('userId');
        });
      });

      it('ne contient pas de relation user dans les articles retournés', async () => {
        mockPrismaService.article.findMany.mockResolvedValue([mockArticle]);
        mockPrismaService.article.count.mockResolvedValue(1);

        const result = await service.findAll({});

        result.data.forEach((article) => {
          expect(article).not.toHaveProperty('user');
        });
      });
    });

    describe('findHomepage — réponse publique sans userId ni user', () => {
      it('ne contient pas de champ userId dans les articles homepage', async () => {
        mockPrismaService.article.findMany.mockResolvedValue([
          mockArticle,
          mockArticle,
          mockArticle,
        ]);

        const result = await service.findHomepage();

        result.forEach((article) => {
          expect(article).not.toHaveProperty('userId');
          expect(article).not.toHaveProperty('user');
        });
      });
    });

    describe('findBySlug — réponse publique sans userId ni user', () => {
      it('ne contient pas de champ userId ni user dans la réponse', async () => {
        mockPrismaService.article.findFirst.mockResolvedValue({ ...mockArticle, published: true });

        const result = await service.findBySlug('mon-article');

        expect(result).not.toHaveProperty('userId');
        expect(result).not.toHaveProperty('user');
      });
    });

    describe('findOne (admin) — préserve user.id et user.email', () => {
      it('retourne user.id et user.email pour la vue admin', async () => {
        mockPrismaService.article.findUnique.mockResolvedValue(mockArticleWithFullUser);

        const result = await service.findOne(1);

        expect(result.user).toBeDefined();
        expect(result.user).toHaveProperty('id');
        expect(result.user).toHaveProperty('email');
      });
    });
  });
});
