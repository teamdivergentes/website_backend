import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { PrismaService } from '../prisma.service';
import { UploadService } from '../upload/upload.service';

describe('TeamsService', () => {
  let service: TeamsService;

  const mockPrismaService = {
    team: {
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
        TeamsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UploadService, useValue: mockUploadService },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('update', () => {
    it('should delete old image and banner when updating with new ones', async () => {
      const mockTeam = {
        id: 1,
        name: 'Team A',
        slug: 'team-a',
        game: 'lol',
        image: '/uploads/old-image.jpg',
        banner: '/uploads/old-banner.jpg',
        description: 'Description',
        position: 0,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateDto = {
        image: '/uploads/new-image.jpg',
        banner: '/uploads/new-banner.jpg',
      };

      mockPrismaService.team.findUnique.mockResolvedValue(mockTeam);
      mockPrismaService.team.update.mockResolvedValue({
        ...mockTeam,
        ...updateDto,
        members: [],
      });

      await service.update(1, updateDto);

      expect(mockUploadService.deleteImage).toHaveBeenCalledWith('old-image.jpg');
      expect(mockUploadService.deleteImage).toHaveBeenCalledWith('old-banner.jpg');
      expect(mockUploadService.deleteImage).toHaveBeenCalledTimes(2);
    });

    it('should not delete images if they are the same', async () => {
      const mockTeam = {
        id: 1,
        name: 'Team A',
        slug: 'team-a',
        game: 'lol',
        image: '/uploads/image.jpg',
        banner: '/uploads/banner.jpg',
        description: 'Description',
        position: 0,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateDto = {
        image: '/uploads/image.jpg',
        banner: '/uploads/banner.jpg',
      };

      mockPrismaService.team.findUnique.mockResolvedValue(mockTeam);
      mockPrismaService.team.update.mockResolvedValue({
        ...mockTeam,
        members: [],
      });

      await service.update(1, updateDto);

      expect(mockUploadService.deleteImage).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete all associated images when deleting team', async () => {
      const mockTeam = {
        id: 1,
        name: 'Team A',
        slug: 'team-a',
        game: 'lol',
        image: '/uploads/team-image.jpg',
        banner: '/uploads/team-banner.jpg',
        description: 'Description',
        position: 0,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          {
            id: 1,
            name: 'Player 1',
            realName: 'John',
            role: 'Top',
            image: '/uploads/player1.jpg',
            teamId: 1,
            position: 0,
            socials: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 2,
            name: 'Player 2',
            realName: 'Jane',
            role: 'Mid',
            image: '/uploads/player2.jpg',
            teamId: 1,
            position: 1,
            socials: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      mockPrismaService.team.findUnique.mockResolvedValue(mockTeam);
      mockPrismaService.team.delete.mockResolvedValue(mockTeam);

      await service.delete(1);

      expect(mockUploadService.deleteImage).toHaveBeenCalledWith('team-image.jpg');
      expect(mockUploadService.deleteImage).toHaveBeenCalledWith('team-banner.jpg');
      expect(mockUploadService.deleteImage).toHaveBeenCalledWith('player1.jpg');
      expect(mockUploadService.deleteImage).toHaveBeenCalledWith('player2.jpg');
      expect(mockUploadService.deleteImage).toHaveBeenCalledTimes(4);
    });

    it('should throw NotFoundException when team does not exist', async () => {
      mockPrismaService.team.findUnique.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
      expect(mockUploadService.deleteImage).not.toHaveBeenCalled();
    });
  });
});
