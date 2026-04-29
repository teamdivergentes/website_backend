import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GamesService } from './games.service';
import { PrismaService } from '../prisma.service';
import { UploadService } from '../upload/upload.service';
import { createPrismaMock, PrismaMock } from '../../test/helpers/prisma-mock';
import { createGameRecord, resetGameIdCounter } from '../../test/helpers/factories/game.factory';

describe('GamesService', () => {
  let service: GamesService;
  let prismaMock: PrismaMock;

  const mockUploadService = {
    deleteImage: jest.fn(),
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    resetGameIdCounter();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
        { provide: PrismaService, useValue: prismaMock },
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
      const mockGame = createGameRecord({
        key: 'lol',
        name: 'League of Legends',
        image: '/uploads/old-game-image.jpg',
      });

      const updateDto = {
        name: 'League of Legends Updated',
        image: '/uploads/new-game-image.jpg',
      };

      prismaMock.game.findUnique.mockResolvedValue(mockGame);
      prismaMock.game.update.mockResolvedValue({ ...mockGame, ...updateDto });

      await service.update(1, updateDto);

      expect(mockUploadService.deleteImage).toHaveBeenCalledWith('old-game-image.jpg');
      expect(prismaMock.game.update).toHaveBeenCalled();
    });

    it('should not delete image if new image is the same', async () => {
      const mockGame = createGameRecord({
        key: 'lol',
        name: 'League of Legends',
        image: '/uploads/game-image.jpg',
      });

      const updateDto = {
        name: 'League of Legends Updated',
        image: '/uploads/game-image.jpg',
      };

      prismaMock.game.findUnique.mockResolvedValue(mockGame);
      prismaMock.game.update.mockResolvedValue({ ...mockGame, ...updateDto });

      await service.update(1, updateDto);

      expect(mockUploadService.deleteImage).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete image file when deleting game', async () => {
      const mockGame = createGameRecord({
        key: 'lol',
        name: 'League of Legends',
        image: '/uploads/game-image.jpg',
      });

      prismaMock.game.findUnique.mockResolvedValue(mockGame);
      prismaMock.game.delete.mockResolvedValue(mockGame);

      await service.delete(1);

      expect(mockUploadService.deleteImage).toHaveBeenCalledWith('game-image.jpg');
      expect(prismaMock.game.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException when game does not exist', async () => {
      prismaMock.game.findUnique.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
      expect(mockUploadService.deleteImage).not.toHaveBeenCalled();
    });
  });
});
