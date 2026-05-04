import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import {
  TwitchChannelsService,
  TwitchChannelLiveDto,
  TwitchChannelDto,
} from './twitch-channels.service';
import { PrismaService } from '../prisma.service';
import { TwitchHelixService } from '../twitch-helix/twitch-helix.service';
import { CreateTwitchChannelDto } from './dto/create-twitch-channel.dto';
import { UpdateTwitchChannelDto } from './dto/update-twitch-channel.dto';
import { ReorderTwitchChannelsDto } from './dto/reorder-twitch-channels.dto';

describe('TwitchChannelsService', () => {
  let service: TwitchChannelsService;

  const mockPrisma = {
    twitchChannel: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockHelixService = {
    getLiveStreams: jest.fn(),
  };

  const sampleChannel = {
    id: 1,
    username: 'pendulelapin7',
    displayName: 'Pendulelapin7',
    gameLabel: 'Valorant',
    description: 'Joueur pro DVG',
    active: true,
    position: 0,
    teamMemberId: null,
    teamMember: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwitchChannelsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TwitchHelixService, useValue: mockHelixService },
      ],
    }).compile();

    service = module.get<TwitchChannelsService>(TwitchChannelsService);
  });

  // ─── findAll (admin) ────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all channels enriched with live status', async () => {
      mockPrisma.twitchChannel.findMany.mockResolvedValue([sampleChannel]);
      mockHelixService.getLiveStreams.mockResolvedValue([
        {
          username: 'pendulelapin7',
          displayName: 'Pendulelapin7',
          gameId: '516575',
          gameLabel: 'Valorant',
          viewerCount: 1200,
          thumbnailUrl: 'https://thumb.url',
          startedAt: '2024-01-01T12:00:00Z',
          title: 'Ranked!',
        },
      ]);

      const result: TwitchChannelLiveDto[] = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        twitchUsername: 'pendulelapin7',
        isLive: true,
        viewerCount: 1200,
        streamTitle: 'Ranked!',
      });
    });

    it('should mark channels as offline when Helix returns no live streams', async () => {
      mockPrisma.twitchChannel.findMany.mockResolvedValue([sampleChannel]);
      mockHelixService.getLiveStreams.mockResolvedValue([]);

      const result: TwitchChannelLiveDto[] = await service.findAll();

      expect(result[0]).toMatchObject({
        twitchUsername: 'pendulelapin7',
        isLive: false,
      });
    });
  });

  // ─── findLive (public) ──────────────────────────────────────────────────────

  describe('findLive', () => {
    it('should return only active channels enriched with live status', async () => {
      const activeChannel = { ...sampleChannel, active: true };
      const inactiveChannel = { ...sampleChannel, id: 2, username: 'other', active: false };

      mockPrisma.twitchChannel.findMany.mockResolvedValue([activeChannel]);
      mockHelixService.getLiveStreams.mockResolvedValue([]);

      const result: TwitchChannelLiveDto[] = await service.findLive();

      expect(result).toHaveLength(1);
      expect(mockPrisma.twitchChannel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { active: true },
        }),
      );
      void inactiveChannel;
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a channel by id mapped to DTO', async () => {
      mockPrisma.twitchChannel.findUnique.mockResolvedValue(sampleChannel);
      const result: TwitchChannelDto = await service.findOne(1);
      expect(result).toMatchObject({
        twitchUsername: 'pendulelapin7',
        isActive: true,
        id: 1,
      });
    });

    it('should throw NotFoundException when channel not found', async () => {
      mockPrisma.twitchChannel.findUnique.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a twitch channel', async () => {
      const dto: CreateTwitchChannelDto = {
        twitchUsername: 'newstreamer',
        displayName: 'New Streamer',
        isActive: true,
      };

      // Le mock Prisma retourne une entité avec les noms Prisma (username/active)
      mockPrisma.twitchChannel.aggregate.mockResolvedValue({ _max: { position: 2 } });
      mockPrisma.twitchChannel.create.mockResolvedValue({
        ...sampleChannel,
        username: 'newstreamer',
        active: true,
        id: 5,
      });

      const result: Awaited<ReturnType<typeof service.create>> = await service.create(dto);
      expect(result).toBeDefined();
      // Le service passe `username` (nom Prisma) à la BDD
      const createCall1 = mockPrisma.twitchChannel.create.mock.calls[0] as [
        { data: { username: string } },
      ];
      expect(createCall1[0].data.username).toBe('newstreamer');
      // Le résultat est mappé vers twitchUsername/isActive
      expect(result).toMatchObject({ twitchUsername: 'newstreamer', isActive: true });
    });

    it('should handle position auto-assignment when no channels exist', async () => {
      const dto: CreateTwitchChannelDto = { twitchUsername: 'first' };
      mockPrisma.twitchChannel.aggregate.mockResolvedValue({ _max: { position: null } });
      mockPrisma.twitchChannel.create.mockResolvedValue({ ...sampleChannel, username: 'first' });

      await service.create(dto);
      const createCall2 = mockPrisma.twitchChannel.create.mock.calls[0] as [
        { data: { position: number } },
      ];
      expect(createCall2[0].data.position).toBe(0);
    });

    it('should throw ConflictException when username already exists', async () => {
      const dto: CreateTwitchChannelDto = { twitchUsername: 'pendulelapin7' };
      mockPrisma.twitchChannel.aggregate.mockResolvedValue({ _max: { position: 0 } });
      // Utilise un plain object (pas une Error) pour éviter le crash Node v24 sur les Error avec .code
      mockPrisma.twitchChannel.create.mockRejectedValue({
        code: 'P2002',
        message: 'Unique constraint',
      });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should re-throw non-P2002 errors from create', async () => {
      const dto: CreateTwitchChannelDto = { twitchUsername: 'valid1' };
      mockPrisma.twitchChannel.aggregate.mockResolvedValue({ _max: { position: 0 } });
      const dbError = new Error('Connection lost');
      mockPrisma.twitchChannel.create.mockRejectedValue(dbError);

      await expect(service.create(dto)).rejects.toThrow('Connection lost');
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update a twitch channel', async () => {
      const dto: UpdateTwitchChannelDto = { displayName: 'Updated Name' };
      mockPrisma.twitchChannel.findUnique.mockResolvedValue(sampleChannel);
      mockPrisma.twitchChannel.update.mockResolvedValue({ ...sampleChannel, ...dto });

      const result: Awaited<ReturnType<typeof service.update>> = await service.update(1, dto);
      expect(result.displayName).toBe('Updated Name');
    });

    it('should throw NotFoundException when channel not found', async () => {
      mockPrisma.twitchChannel.findUnique.mockResolvedValue(null);
      await expect(service.update(999, {})).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on duplicate username update', async () => {
      mockPrisma.twitchChannel.findUnique.mockResolvedValue(sampleChannel);
      mockPrisma.twitchChannel.update.mockRejectedValue({
        code: 'P2002',
        message: 'Unique constraint',
      });

      await expect(service.update(1, { twitchUsername: 'existing' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException on P2025 in update catch', async () => {
      mockPrisma.twitchChannel.findUnique.mockResolvedValue(sampleChannel);
      mockPrisma.twitchChannel.update.mockRejectedValue({ code: 'P2025', message: 'Not found' });

      await expect(service.update(1, { displayName: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('should re-throw non-Prisma errors from update', async () => {
      mockPrisma.twitchChannel.findUnique.mockResolvedValue(sampleChannel);
      mockPrisma.twitchChannel.update.mockRejectedValue(new Error('DB timeout'));

      await expect(service.update(1, { displayName: 'X' })).rejects.toThrow('DB timeout');
    });

    it('should connect teamMember when teamMemberId is provided', async () => {
      const dto: UpdateTwitchChannelDto = { teamMemberId: 5 };
      mockPrisma.twitchChannel.findUnique.mockResolvedValue(sampleChannel);
      mockPrisma.twitchChannel.update.mockResolvedValue({
        ...sampleChannel,
        teamMemberId: 5,
        teamMember: { id: 5, name: 'Player' },
      });

      await service.update(1, dto);

      const updateCall = mockPrisma.twitchChannel.update.mock.calls[0] as [
        { data: { teamMember: { connect?: { id: number }; disconnect?: boolean } } },
      ];
      expect(updateCall[0].data.teamMember).toEqual({ connect: { id: 5 } });
    });

    it('should disconnect teamMember when teamMemberId is 0', async () => {
      const dto: UpdateTwitchChannelDto = { teamMemberId: 0 };
      mockPrisma.twitchChannel.findUnique.mockResolvedValue({
        ...sampleChannel,
        teamMemberId: 5,
      });
      mockPrisma.twitchChannel.update.mockResolvedValue({
        ...sampleChannel,
        teamMemberId: null,
        teamMember: null,
      });

      await service.update(1, dto);

      const updateCall = mockPrisma.twitchChannel.update.mock.calls[0] as [
        { data: { teamMember: { disconnect?: boolean } } },
      ];
      expect(updateCall[0].data.teamMember).toEqual({ disconnect: true });
    });
  });

  // ─── delete ──────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('should delete a twitch channel', async () => {
      mockPrisma.twitchChannel.findUnique.mockResolvedValue(sampleChannel);
      mockPrisma.twitchChannel.delete.mockResolvedValue(sampleChannel);

      const result = await service.delete(1);
      expect(result).toEqual({ message: 'Chaîne Twitch supprimée avec succès' });
    });

    it('should throw NotFoundException when channel not found', async () => {
      mockPrisma.twitchChannel.findUnique.mockResolvedValue(null);
      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── reorder ─────────────────────────────────────────────────────────────────

  describe('reorder', () => {
    it('should update positions via transaction', async () => {
      const dto: ReorderTwitchChannelsDto = {
        items: [
          { id: 1, position: 2 },
          { id: 2, position: 0 },
        ],
      };

      mockPrisma.$transaction.mockResolvedValue([]);

      const result = await service.reorder(dto);
      expect(result).toEqual({ message: 'Ordre mis à jour avec succès' });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
