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
    it("retourne une liste paginée d'articles", async () => {
      const articles = [mockArticle];
      mockPrismaService.article.findMany.mockResolvedValue(articles);
      mockPrismaService.article.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toEqual(articles);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(1);
    });

    // ─── Tri serveur (EPIC-41) ─────────────────────────────────────────────

    it('trie par createdAt desc par defaut', async () => {
      mockPrismaService.article.findMany.mockResolvedValue([]);
      mockPrismaService.article.count.mockResolvedValue(0);

      await service.findAll({});

      expect(mockPrismaService.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('applique sortBy et sortOrder', async () => {
      mockPrismaService.article.findMany.mockResolvedValue([]);
      mockPrismaService.article.count.mockResolvedValue(0);

      await service.findAll({ sortBy: 'title', sortOrder: 'asc' });

      expect(mockPrismaService.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { title: 'asc' } }),
      );
    });

    it('accepte updatedAt comme critere de tri', async () => {
      mockPrismaService.article.findMany.mockResolvedValue([]);
      mockPrismaService.article.count.mockResolvedValue(0);

      await service.findAll({ sortBy: 'updatedAt', sortOrder: 'desc' });

      expect(mockPrismaService.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { updatedAt: 'desc' } }),
      );
    });

    it('retombe sur desc quand sortOrder est absent', async () => {
      mockPrismaService.article.findMany.mockResolvedValue([]);
      mockPrismaService.article.count.mockResolvedValue(0);

      await service.findAll({ sortBy: 'title' });

      expect(mockPrismaService.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { title: 'desc' } }),
      );
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
    it("retourne l'article correspondant au slug", async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);

      const result = await service.findBySlug('mon-article');

      expect(result).toEqual(mockArticle);
      expect(mockPrismaService.article.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'mon-article' } }),
      );
    });

    it("lance NotFoundException si l'article n'existe pas", async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('inexistant')).rejects.toThrow(NotFoundException);
    });

    it("lance BadGatewayException en cas d'erreur Prisma", async () => {
      mockPrismaService.article.findUnique.mockRejectedValue(new Error('DB error'));

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
});
