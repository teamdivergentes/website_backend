import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SponsorImagesService } from './sponsor-images.service';
import { PrismaService } from '../prisma.service';
import { UploadService } from '../upload/upload.service';

describe('SponsorImagesService', () => {
  let service: SponsorImagesService;

  const mockPrismaService = {
    sponsorImage: {
      findFirst: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockUploadService = {
    deleteImage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SponsorImagesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UploadService, useValue: mockUploadService },
      ],
    }).compile();

    service = module.get<SponsorImagesService>(SponsorImagesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteImageSilently', () => {
    it('should call uploadService.deleteImage with extracted filename', async () => {
      mockUploadService.deleteImage.mockResolvedValue(undefined);

      await service.deleteImageSilently('/uploads/test-image.jpg');

      expect(mockUploadService.deleteImage).toHaveBeenCalledWith('test-image.jpg');
    });

    it('should not call uploadService.deleteImage when url is null', async () => {
      await service.deleteImageSilently(null);

      expect(mockUploadService.deleteImage).not.toHaveBeenCalled();
    });

    it('should not throw when deleteImage fails', async () => {
      mockUploadService.deleteImage.mockRejectedValue(new Error('File not found'));

      await expect(service.deleteImageSilently('/uploads/missing.jpg')).resolves.not.toThrow();
    });
  });

  describe('addImage', () => {
    it('should create image with computed position', async () => {
      const mockImage = {
        id: 1,
        url: '/uploads/test.jpg',
        alt: 'Test',
        isPrimary: false,
        position: 0,
        sponsorId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.sponsorImage.aggregate.mockResolvedValue({ _max: { position: null } });
      mockPrismaService.sponsorImage.create.mockResolvedValue(mockImage);

      const result = await service.addImage(1, {
        url: '/uploads/test.jpg',
        alt: 'Test',
        isPrimary: false,
      });

      expect(mockPrismaService.sponsorImage.create).toHaveBeenCalledWith(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expect.objectContaining({ data: expect.objectContaining({ position: 0, sponsorId: 1 }) }),
      );
      expect(result).toEqual(mockImage);
    });

    it('should unset existing primary images when isPrimary is true', async () => {
      mockPrismaService.sponsorImage.aggregate.mockResolvedValue({ _max: { position: 0 } });
      mockPrismaService.sponsorImage.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.sponsorImage.create.mockResolvedValue({ id: 2, isPrimary: true });

      await service.addImage(1, { url: '/uploads/primary.jpg', alt: 'Primary', isPrimary: true });

      expect(mockPrismaService.sponsorImage.updateMany).toHaveBeenCalledWith({
        where: { sponsorId: 1, isPrimary: true },
        data: { isPrimary: false },
      });
    });

    it('should not unset primary images when isPrimary is false', async () => {
      mockPrismaService.sponsorImage.aggregate.mockResolvedValue({ _max: { position: 0 } });
      mockPrismaService.sponsorImage.create.mockResolvedValue({ id: 2, isPrimary: false });

      await service.addImage(1, { url: '/uploads/test.jpg', alt: 'Test', isPrimary: false });

      expect(mockPrismaService.sponsorImage.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('removeImage', () => {
    it('should delete image and its file', async () => {
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

      mockPrismaService.sponsorImage.findFirst.mockResolvedValue(mockImage);
      mockPrismaService.sponsorImage.delete.mockResolvedValue(mockImage);

      const result = await service.removeImage(1, 1);

      expect(mockUploadService.deleteImage).toHaveBeenCalledWith('sponsor-image.jpg');
      expect(mockPrismaService.sponsorImage.delete).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Image supprimée avec succès' });
    });

    it('should throw NotFoundException when image does not exist', async () => {
      mockPrismaService.sponsorImage.findFirst.mockResolvedValue(null);

      await expect(service.removeImage(1, 999)).rejects.toThrow(NotFoundException);
      expect(mockUploadService.deleteImage).not.toHaveBeenCalled();
    });
  });

  describe('setPrimaryImage', () => {
    it('should set image as primary', async () => {
      const mockImage = {
        id: 1,
        url: '/uploads/test.jpg',
        sponsorId: 1,
        isPrimary: false,
      };

      mockPrismaService.sponsorImage.findFirst.mockResolvedValue(mockImage);
      mockPrismaService.sponsorImage.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.sponsorImage.update.mockResolvedValue({ ...mockImage, isPrimary: true });

      const result = await service.setPrimaryImage(1, 1);

      expect(mockPrismaService.sponsorImage.updateMany).toHaveBeenCalledWith({
        where: { sponsorId: 1, isPrimary: true },
        data: { isPrimary: false },
      });
      expect(mockPrismaService.sponsorImage.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isPrimary: true },
      });
      expect(result).toEqual({ message: 'Image principale définie avec succès' });
    });

    it('should throw NotFoundException when image not found', async () => {
      mockPrismaService.sponsorImage.findFirst.mockResolvedValue(null);

      await expect(service.setPrimaryImage(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorderImages', () => {
    it('should update positions via transaction', async () => {
      mockPrismaService.$transaction.mockResolvedValue(undefined);

      const result = await service.reorderImages(1, [3, 1, 2]);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Ordre des images mis à jour avec succès' });
    });
  });
});
