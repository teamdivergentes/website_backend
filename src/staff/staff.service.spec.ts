import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StaffService } from './staff.service';
import { PrismaService } from '../prisma.service';
import { UploadService } from '../upload/upload.service';

describe('StaffService', () => {
  let service: StaffService;

  const mockPrismaService = {
    staffMember: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
        StaffService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UploadService, useValue: mockUploadService },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('update', () => {
    it('should delete old image when updating with a new image', async () => {
      const mockStaff = {
        id: 1,
        name: 'John Doe',
        role: 'Developer',
        image: '/uploads/old-image.jpg',
        category: 'ADMIN',
        position: 0,
        socials: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateDto = {
        name: 'John Doe Updated',
        image: '/uploads/new-image.jpg',
      };

      mockPrismaService.staffMember.findUnique.mockResolvedValue(mockStaff);
      mockPrismaService.staffMember.update.mockResolvedValue({
        ...mockStaff,
        ...updateDto,
      });

      await service.update(1, updateDto);

      expect(mockUploadService.deleteImage).toHaveBeenCalledWith('old-image.jpg');
      expect(mockPrismaService.staffMember.update).toHaveBeenCalled();
    });

    it('should not delete image if new image is the same', async () => {
      const mockStaff = {
        id: 1,
        name: 'John Doe',
        role: 'Developer',
        image: '/uploads/same-image.jpg',
        category: 'ADMIN',
        position: 0,
        socials: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateDto = {
        name: 'John Doe Updated',
        image: '/uploads/same-image.jpg',
      };

      mockPrismaService.staffMember.findUnique.mockResolvedValue(mockStaff);
      mockPrismaService.staffMember.update.mockResolvedValue({
        ...mockStaff,
        ...updateDto,
      });

      await service.update(1, updateDto);

      expect(mockUploadService.deleteImage).not.toHaveBeenCalled();
      expect(mockPrismaService.staffMember.update).toHaveBeenCalled();
    });

    it('should handle deletion errors silently', async () => {
      const mockStaff = {
        id: 1,
        name: 'John Doe',
        role: 'Developer',
        image: '/uploads/old-image.jpg',
        category: 'ADMIN',
        position: 0,
        socials: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateDto = {
        image: '/uploads/new-image.jpg',
      };

      mockPrismaService.staffMember.findUnique.mockResolvedValue(mockStaff);
      mockPrismaService.staffMember.update.mockResolvedValue({
        ...mockStaff,
        ...updateDto,
      });
      mockUploadService.deleteImage.mockRejectedValue(new Error('File not found'));

      await expect(service.update(1, updateDto)).resolves.toBeDefined();
      expect(mockUploadService.deleteImage).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete image file when deleting staff member', async () => {
      const mockStaff = {
        id: 1,
        name: 'John Doe',
        role: 'Developer',
        image: '/uploads/image.jpg',
        category: 'ADMIN',
        position: 0,
        socials: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.staffMember.findUnique.mockResolvedValue(mockStaff);
      mockPrismaService.staffMember.delete.mockResolvedValue(mockStaff);

      await service.delete(1);

      expect(mockUploadService.deleteImage).toHaveBeenCalledWith('image.jpg');
      expect(mockPrismaService.staffMember.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException when staff member does not exist', async () => {
      mockPrismaService.staffMember.findUnique.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
      expect(mockUploadService.deleteImage).not.toHaveBeenCalled();
    });
  });
});
