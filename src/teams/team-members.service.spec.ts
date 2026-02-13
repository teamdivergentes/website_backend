import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TeamMembersService } from './team-members.service';
import { PrismaService } from '../prisma.service';
import { UploadService } from '../upload/upload.service';

describe('TeamMembersService', () => {
  let service: TeamMembersService;

  const mockPrismaService = {
    team: {
      findUnique: jest.fn(),
    },
    teamMember: {
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
        TeamMembersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UploadService, useValue: mockUploadService },
      ],
    }).compile();

    service = module.get<TeamMembersService>(TeamMembersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('update', () => {
    it('should delete old image when updating with a new image', async () => {
      const mockMember = {
        id: 1,
        name: 'Player 1',
        realName: 'John Doe',
        role: 'Top',
        image: '/uploads/old-player-image.jpg',
        teamId: 1,
        position: 0,
        socials: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateDto = {
        name: 'Player 1 Updated',
        image: '/uploads/new-player-image.jpg',
      };

      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.teamMember.update.mockResolvedValue({
        ...mockMember,
        ...updateDto,
      });

      await service.update(1, 1, updateDto);

      expect(mockUploadService.deleteImage).toHaveBeenCalledWith('old-player-image.jpg');
      expect(mockPrismaService.teamMember.update).toHaveBeenCalled();
    });

    it('should not delete image if new image is the same', async () => {
      const mockMember = {
        id: 1,
        name: 'Player 1',
        realName: 'John Doe',
        role: 'Top',
        image: '/uploads/player-image.jpg',
        teamId: 1,
        position: 0,
        socials: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateDto = {
        name: 'Player 1 Updated',
        image: '/uploads/player-image.jpg',
      };

      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.teamMember.update.mockResolvedValue({
        ...mockMember,
        ...updateDto,
      });

      await service.update(1, 1, updateDto);

      expect(mockUploadService.deleteImage).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete image file when deleting team member', async () => {
      const mockMember = {
        id: 1,
        name: 'Player 1',
        realName: 'John Doe',
        role: 'Top',
        image: '/uploads/player-image.jpg',
        teamId: 1,
        position: 0,
        socials: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.teamMember.delete.mockResolvedValue(mockMember);

      await service.delete(1, 1);

      expect(mockUploadService.deleteImage).toHaveBeenCalledWith('player-image.jpg');
      expect(mockPrismaService.teamMember.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException when team member does not exist', async () => {
      mockPrismaService.teamMember.findUnique.mockResolvedValue(null);

      await expect(service.delete(1, 999)).rejects.toThrow(NotFoundException);
      expect(mockUploadService.deleteImage).not.toHaveBeenCalled();
    });
  });
});
