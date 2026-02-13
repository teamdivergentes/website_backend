import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SponsorsService } from './sponsors.service';
import { PrismaService } from '../prisma.service';
import { UploadService } from '../upload/upload.service';

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
    sponsorImage: {
      findFirst: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    sponsorLink: {
      findFirst: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockUploadService = {
    deleteImage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SponsorsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UploadService, useValue: mockUploadService },
      ],
    }).compile();

    service = module.get<SponsorsService>(SponsorsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('removeImage', () => {
    it('should delete image file from filesystem when removing image', async () => {
      const mockSponsor = {
        id: 1,
        name: 'Sponsor A',
        slug: 'sponsor-a',
        description: 'Description',
        position: 0,
        active: true,
        imageLayout: 'grid',
        startDate: null,
        endDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [],
        links: [],
      };

      const mockImage = {
        id: 1,
        url: '/uploads/sponsor-image.jpg',
        alt: 'Sponsor Image',
        isPrimary: false,
        position: 0,
        sponsorId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.sponsor.findUnique.mockResolvedValue(mockSponsor);
      mockPrismaService.sponsorImage.findFirst.mockResolvedValue(mockImage);
      mockPrismaService.sponsorImage.delete.mockResolvedValue(mockImage);

      await service.removeImage(1, 1);

      expect(mockUploadService.deleteImage).toHaveBeenCalledWith('sponsor-image.jpg');
      expect(mockPrismaService.sponsorImage.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when image does not exist', async () => {
      const mockSponsor = {
        id: 1,
        name: 'Sponsor A',
        slug: 'sponsor-a',
        description: 'Description',
        position: 0,
        active: true,
        imageLayout: 'grid',
        startDate: null,
        endDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [],
        links: [],
      };

      mockPrismaService.sponsor.findUnique.mockResolvedValue(mockSponsor);
      mockPrismaService.sponsorImage.findFirst.mockResolvedValue(null);

      await expect(service.removeImage(1, 999)).rejects.toThrow(NotFoundException);
      expect(mockUploadService.deleteImage).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete all sponsor images when deleting sponsor', async () => {
      const mockSponsor = {
        id: 1,
        name: 'Sponsor A',
        slug: 'sponsor-a',
        description: 'Description',
        position: 0,
        active: true,
        imageLayout: 'grid',
        startDate: null,
        endDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [
          {
            id: 1,
            url: '/uploads/sponsor-image1.jpg',
            alt: 'Image 1',
            isPrimary: true,
            position: 0,
            sponsorId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 2,
            url: '/uploads/sponsor-image2.jpg',
            alt: 'Image 2',
            isPrimary: false,
            position: 1,
            sponsorId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        links: [],
      };

      mockPrismaService.sponsor.findUnique.mockResolvedValue(mockSponsor);
      mockPrismaService.sponsor.delete.mockResolvedValue(mockSponsor);

      await service.delete(1);

      expect(mockUploadService.deleteImage).toHaveBeenCalledWith('sponsor-image1.jpg');
      expect(mockUploadService.deleteImage).toHaveBeenCalledWith('sponsor-image2.jpg');
      expect(mockUploadService.deleteImage).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException when sponsor does not exist', async () => {
      mockPrismaService.sponsor.findUnique.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
      expect(mockUploadService.deleteImage).not.toHaveBeenCalled();
    });
  });
});
