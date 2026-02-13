import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GamesService } from './games.service';
import { PrismaService } from '../prisma.service';
import { UploadService } from '../upload/upload.service';

describe('GamesService', () => {
  let service: GamesService;

  const mockPrismaService = {
    game: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockUploadService = {
    deleteImage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UploadService, useValue: mockUploadService },
      ],
    }).compile();

    service = module.get<GamesService>(GamesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('update', () => {
    it('should delete old image when updating with a new image', async () => {
      const mockGame = {
        id: 1,
        key: 'lol',
        name: 'League of Legends',
        image: '/uploads/old-game-image.jpg',
        position: 0,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateDto = {
        name: 'League of Legends Updated',
        image: '/uploads/new-game-image.jpg',
      };

      mockPrismaService.game.findUnique.mockResolvedValue(mockGame);
      mockPrismaService.game.update.mockResolvedValue({
        ...mockGame,
        ...updateDto,
      });

      await service.update(1, updateDto);

      expect(mockUploadService.deleteImage).toHaveBeenCalledWith('old-game-image.jpg');
      expect(mockPrismaService.game.update).toHaveBeenCalled();
    });

    it('should not delete image if new image is the same', async () => {
      const mockGame = {
        id: 1,
        key: 'lol',
        name: 'League of Legends',
        image: '/uploads/game-image.jpg',
        position: 0,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateDto = {
        name: 'League of Legends Updated',
        image: '/uploads/game-image.jpg',
      };

      mockPrismaService.game.findUnique.mockResolvedValue(mockGame);
      mockPrismaService.game.update.mockResolvedValue({
        ...mockGame,
        ...updateDto,
      });

      await service.update(1, updateDto);

      expect(mockUploadService.deleteImage).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete image file when deleting game', async () => {
      const mockGame = {
        id: 1,
        key: 'lol',
        name: 'League of Legends',
        image: '/uploads/game-image.jpg',
        position: 0,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.game.findUnique.mockResolvedValue(mockGame);
      mockPrismaService.game.delete.mockResolvedValue(mockGame);

      await service.delete(1);

      expect(mockUploadService.deleteImage).toHaveBeenCalledWith('game-image.jpg');
      expect(mockPrismaService.game.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException when game does not exist', async () => {
      mockPrismaService.game.findUnique.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
      expect(mockUploadService.deleteImage).not.toHaveBeenCalled();
    });
  });
});
