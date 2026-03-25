import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadGatewayException } from '@nestjs/common';
import { ArticleTypesService } from './article-types.service';
import { PrismaService } from '../prisma.service';

describe('ArticleTypesService', () => {
  let service: ArticleTypesService;

  const mockPrismaService = {
    articleType: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArticleTypesService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<ArticleTypesService>(ArticleTypesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------
  describe('findAll', () => {
    it('retourne la liste des types ordonnés par nom', async () => {
      const types = [
        { id: 1, name: 'Actualité', createdAt: new Date(), updatedAt: new Date() },
        { id: 2, name: 'Communiqué', createdAt: new Date(), updatedAt: new Date() },
      ];
      mockPrismaService.articleType.findMany.mockResolvedValue(types);

      const result = await service.findAll();

      expect(result).toEqual(types);
      expect(mockPrismaService.articleType.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });

    it("lance BadGatewayException en cas d'erreur Prisma", async () => {
      mockPrismaService.articleType.findMany.mockRejectedValue(new Error('DB error'));

      await expect(service.findAll()).rejects.toThrow(BadGatewayException);
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------
  describe('findById', () => {
    it("retourne le type d'article correspondant à l'id", async () => {
      const type = { id: 1, name: 'Actualité', createdAt: new Date(), updatedAt: new Date() };
      mockPrismaService.articleType.findUnique.mockResolvedValue(type);

      const result = await service.findById(1);

      expect(result).toEqual(type);
      expect(mockPrismaService.articleType.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("lance NotFoundException si le type n'existe pas", async () => {
      mockPrismaService.articleType.findUnique.mockResolvedValue(null);

      await expect(service.findById(99)).rejects.toThrow(NotFoundException);
    });

    it("lance BadGatewayException en cas d'erreur Prisma", async () => {
      mockPrismaService.articleType.findUnique.mockRejectedValue(new Error('DB error'));

      await expect(service.findById(1)).rejects.toThrow(BadGatewayException);
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------
  describe('create', () => {
    it("crée un type d'article si le nom est unique", async () => {
      const dto = { name: 'Nouveau type' };
      const created = { id: 3, name: 'Nouveau type', createdAt: new Date(), updatedAt: new Date() };

      mockPrismaService.articleType.findUnique.mockResolvedValue(null);
      mockPrismaService.articleType.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(result).toEqual(created);
      expect(mockPrismaService.articleType.create).toHaveBeenCalledWith({
        data: { name: dto.name },
      });
    });

    it('lance ConflictException si le nom existe déjà', async () => {
      const dto = { name: 'Actualité' };
      const existing = { id: 1, name: 'Actualité', createdAt: new Date(), updatedAt: new Date() };

      mockPrismaService.articleType.findUnique.mockResolvedValue(existing);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.articleType.create).not.toHaveBeenCalled();
    });

    it("lance BadGatewayException en cas d'erreur Prisma", async () => {
      const dto = { name: 'Nouveau type' };
      mockPrismaService.articleType.findUnique.mockRejectedValue(new Error('DB error'));

      await expect(service.create(dto)).rejects.toThrow(BadGatewayException);
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------
  describe('update', () => {
    it("met à jour le nom d'un type d'article", async () => {
      const existing = { id: 1, name: 'Actualité', createdAt: new Date(), updatedAt: new Date() };
      const dto = { name: 'Nouveau nom' };
      const updated = { ...existing, name: 'Nouveau nom' };

      mockPrismaService.articleType.findUnique
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);
      mockPrismaService.articleType.update.mockResolvedValue(updated);

      const result = await service.update(1, dto);

      expect(result).toEqual(updated);
      expect(mockPrismaService.articleType.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: dto.name },
      });
    });

    it("lance NotFoundException si le type n'existe pas", async () => {
      mockPrismaService.articleType.findUnique.mockResolvedValue(null);

      await expect(service.update(99, { name: 'Nouveau' })).rejects.toThrow(NotFoundException);
    });

    it('lance ConflictException si le nouveau nom est déjà pris', async () => {
      const existing = { id: 1, name: 'Actualité', createdAt: new Date(), updatedAt: new Date() };
      const conflict = { id: 2, name: 'Communiqué', createdAt: new Date(), updatedAt: new Date() };
      const dto = { name: 'Communiqué' };

      mockPrismaService.articleType.findUnique
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(conflict);

      await expect(service.update(1, dto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.articleType.update).not.toHaveBeenCalled();
    });

    it("ne vérifie pas l'unicité si le nom n'a pas changé", async () => {
      const existing = { id: 1, name: 'Actualité', createdAt: new Date(), updatedAt: new Date() };
      const dto = { name: 'Actualité' };
      const updated = { ...existing };

      mockPrismaService.articleType.findUnique.mockResolvedValueOnce(existing);
      mockPrismaService.articleType.update.mockResolvedValue(updated);

      const result = await service.update(1, dto);

      expect(result).toEqual(updated);
      expect(mockPrismaService.articleType.findUnique).toHaveBeenCalledTimes(1);
    });

    it("lance BadGatewayException en cas d'erreur Prisma", async () => {
      mockPrismaService.articleType.findUnique.mockRejectedValue(new Error('DB error'));

      await expect(service.update(1, { name: 'Test' })).rejects.toThrow(BadGatewayException);
    });
  });

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------
  describe('delete', () => {
    it("supprime un type d'article sans articles liés", async () => {
      const existing = {
        id: 1,
        name: 'Actualité',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { articles: 0 },
      };
      mockPrismaService.articleType.findUnique.mockResolvedValue(existing);
      mockPrismaService.articleType.delete.mockResolvedValue(existing);

      const result = await service.delete(1);

      expect(result).toEqual({ message: "Type d'article supprimé avec succès" });
      expect(mockPrismaService.articleType.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("lance NotFoundException si le type n'existe pas", async () => {
      mockPrismaService.articleType.findUnique.mockResolvedValue(null);

      await expect(service.delete(99)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.articleType.delete).not.toHaveBeenCalled();
    });

    it('lance ConflictException si des articles sont liés', async () => {
      const existing = {
        id: 1,
        name: 'Actualité',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { articles: 3 },
      };
      mockPrismaService.articleType.findUnique.mockResolvedValue(existing);

      await expect(service.delete(1)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.articleType.delete).not.toHaveBeenCalled();
    });

    it("lance BadGatewayException en cas d'erreur Prisma", async () => {
      mockPrismaService.articleType.findUnique.mockRejectedValue(new Error('DB error'));

      await expect(service.delete(1)).rejects.toThrow(BadGatewayException);
    });
  });
});
