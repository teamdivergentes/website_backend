import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SponsorsService } from './sponsors.service';
import { SponsorImagesService } from './sponsor-images.service';
import { PrismaService } from '../prisma.service';

describe('SponsorsService', () => {
  let service: SponsorsService;

  const mockPrismaService = {
    sponsor: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockSponsorImagesService = {
    deleteImageSilently: jest.fn(),
  };

  const mockSponsor = {
    id: 1,
    name: 'Sponsor A',
    slug: 'sponsor-a',
    description: 'Description',
    position: 0,
    active: true,
    imageLayout: 'LAYOUT_1',
    startDate: null,
    endDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    images: [],
    links: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SponsorsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SponsorImagesService, useValue: mockSponsorImagesService },
      ],
    }).compile();

    service = module.get<SponsorsService>(SponsorsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllActive', () => {
    it('should return active sponsors', async () => {
      mockPrismaService.sponsor.findMany.mockResolvedValue([mockSponsor]);

      const result = await service.findAllActive();

      expect(mockPrismaService.sponsor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { active: true } }),
      );
      expect(result).toEqual([mockSponsor]);
    });
  });

  describe('findAll', () => {
    it('should return all sponsors including inactive', async () => {
      mockPrismaService.sponsor.findMany.mockResolvedValue([mockSponsor]);

      const result = await service.findAll();

      expect(mockPrismaService.sponsor.findMany).toHaveBeenCalledWith(
        expect.not.objectContaining({ where: { active: true } }),
      );
      expect(result).toEqual([mockSponsor]);
    });
  });

  describe('findBySlug', () => {
    it('should return sponsor when found', async () => {
      mockPrismaService.sponsor.findUnique.mockResolvedValue(mockSponsor);

      const result = await service.findBySlug('sponsor-a');

      expect(result).toEqual(mockSponsor);
    });

    it('should throw NotFoundException when slug not found', async () => {
      mockPrismaService.sponsor.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('unknown-slug')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('should return sponsor when found', async () => {
      mockPrismaService.sponsor.findUnique.mockResolvedValue(mockSponsor);

      const result = await service.findById(1);

      expect(result).toEqual(mockSponsor);
    });

    it('should throw NotFoundException when id not found', async () => {
      mockPrismaService.sponsor.findUnique.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create sponsor with generated slug', async () => {
      mockPrismaService.sponsor.findUnique.mockResolvedValue(null);
      mockPrismaService.sponsor.aggregate.mockResolvedValue({ _max: { position: null } });
      mockPrismaService.sponsor.create.mockResolvedValue(mockSponsor);

      const result = await service.create({ name: 'Sponsor A', description: 'Description' });

      expect(mockPrismaService.sponsor.create).toHaveBeenCalledWith(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expect.objectContaining({ data: expect.objectContaining({ slug: 'sponsor-a' }) }),
      );
      expect(result).toEqual(mockSponsor);
    });

    it('should throw BadRequestException when slug already exists', async () => {
      mockPrismaService.sponsor.findUnique.mockResolvedValue(mockSponsor);

      await expect(service.create({ name: 'Sponsor A', description: 'Desc' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should update sponsor', async () => {
      const updatedSponsor = { ...mockSponsor, description: 'Updated desc' };
      mockPrismaService.sponsor.findUnique.mockResolvedValue(mockSponsor);
      mockPrismaService.sponsor.update.mockResolvedValue(updatedSponsor);

      const result = await service.update(1, { description: 'Updated desc' });

      expect(result).toEqual(updatedSponsor);
    });

    it('should throw NotFoundException when sponsor not found', async () => {
      mockPrismaService.sponsor.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { description: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when new slug already taken by another sponsor', async () => {
      const otherSponsor = { ...mockSponsor, id: 2, slug: 'sponsor-b' };
      mockPrismaService.sponsor.findUnique
        .mockResolvedValueOnce(mockSponsor)
        .mockResolvedValueOnce(otherSponsor);

      await expect(service.update(1, { name: 'Sponsor B' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete sponsor and all associated image files', async () => {
      const sponsorWithImages = {
        ...mockSponsor,
        images: [
          { id: 1, url: '/uploads/sponsor-image1.jpg' },
          { id: 2, url: '/uploads/sponsor-image2.jpg' },
        ],
      };

      mockPrismaService.sponsor.findUnique.mockResolvedValue(sponsorWithImages);
      mockPrismaService.sponsor.delete.mockResolvedValue(sponsorWithImages);

      const result = await service.delete(1);

      expect(mockSponsorImagesService.deleteImageSilently).toHaveBeenCalledWith(
        '/uploads/sponsor-image1.jpg',
      );
      expect(mockSponsorImagesService.deleteImageSilently).toHaveBeenCalledWith(
        '/uploads/sponsor-image2.jpg',
      );
      expect(mockSponsorImagesService.deleteImageSilently).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ message: 'Sponsor supprimé avec succès' });
    });

    it('should throw NotFoundException when sponsor does not exist', async () => {
      mockPrismaService.sponsor.findUnique.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
      expect(mockSponsorImagesService.deleteImageSilently).not.toHaveBeenCalled();
    });
  });

  describe('toggleActive', () => {
    it('should toggle sponsor active status', async () => {
      const toggled = { ...mockSponsor, active: false };
      mockPrismaService.sponsor.findUnique.mockResolvedValue(mockSponsor);
      mockPrismaService.sponsor.update.mockResolvedValue(toggled);

      const result = await service.toggleActive(1);

      expect(mockPrismaService.sponsor.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { active: false } }),
      );
      expect(result).toEqual(toggled);
    });
  });

  describe('reorder', () => {
    it('should update positions via transaction', async () => {
      mockPrismaService.$transaction.mockResolvedValue(undefined);

      const result = await service.reorder({ orderedIds: [3, 1, 2] });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Ordre des sponsors mis à jour avec succès' });
    });
  });
});
