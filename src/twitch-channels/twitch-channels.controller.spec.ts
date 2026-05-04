import { Test, TestingModule } from '@nestjs/testing';
import { TwitchChannelsController } from './twitch-channels.controller';
import { TwitchChannelsService } from './twitch-channels.service';
import { CreateTwitchChannelDto } from './dto/create-twitch-channel.dto';
import { UpdateTwitchChannelDto } from './dto/update-twitch-channel.dto';
import { ReorderTwitchChannelsDto } from './dto/reorder-twitch-channels.dto';

describe('TwitchChannelsController', () => {
  let controller: TwitchChannelsController;

  const mockTwitchChannelsService = {
    findLive: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    reorder: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwitchChannelsController],
      providers: [
        {
          provide: TwitchChannelsService,
          useValue: mockTwitchChannelsService,
        },
      ],
    }).compile();

    controller = module.get<TwitchChannelsController>(TwitchChannelsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(controller).toBeDefined();
  });

  // ─── findLive ────────────────────────────────────────────────────────────────

  describe('findLive', () => {
    it('devrait appeler twitchChannelsService.findLive et retourner le résultat', async () => {
      const liveChannels = [{ id: 1, username: 'pendulelapin7', displayName: 'Pendulelapin7', isLive: true }];
      mockTwitchChannelsService.findLive.mockResolvedValue(liveChannels);

      const result = await controller.findLive();

      expect(mockTwitchChannelsService.findLive).toHaveBeenCalledTimes(1);
      expect(result).toEqual(liveChannels);
    });
  });

  // ─── findAll (admin) ─────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('devrait appeler twitchChannelsService.findAll et retourner la liste', async () => {
      const channels = [
        { id: 1, username: 'pendulelapin7', displayName: 'Pendulelapin7', active: true, position: 0 },
        {
          id: 2,
          username: 'teamdivergentes',
          displayName: 'Team Divergentes',
          active: true,
          position: 1,
        },
      ];
      mockTwitchChannelsService.findAll.mockResolvedValue(channels);

      const result = await controller.findAll();

      expect(mockTwitchChannelsService.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(channels);
    });
  });

  // ─── findOne (admin) ─────────────────────────────────────────────────────────

  describe('findOne', () => {
    it("devrait appeler twitchChannelsService.findOne avec l'id et retourner le channel", async () => {
      const channel = { id: 1, username: 'pendulelapin7', displayName: 'Pendulelapin7' };
      mockTwitchChannelsService.findOne.mockResolvedValue(channel);

      const result = await controller.findOne(1);

      expect(mockTwitchChannelsService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(channel);
    });
  });

  // ─── create (admin) ──────────────────────────────────────────────────────────

  describe('create', () => {
    it('devrait appeler twitchChannelsService.create avec le DTO et retourner le channel créé', async () => {
      const dto: CreateTwitchChannelDto = {
        username: 'newstreamer',
        displayName: 'New Streamer',
      };
      const created = { id: 3, ...dto, active: true, position: 2 };
      mockTwitchChannelsService.create.mockResolvedValue(created);

      const result = await controller.create(dto);

      expect(mockTwitchChannelsService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });
  });

  // ─── update (admin) ──────────────────────────────────────────────────────────

  describe('update', () => {
    it("devrait appeler twitchChannelsService.update avec l'id et le DTO", async () => {
      const dto: UpdateTwitchChannelDto = { displayName: 'Updated Name' };
      const updated = { id: 1, username: 'pendulelapin7', displayName: 'Updated Name' };
      mockTwitchChannelsService.update.mockResolvedValue(updated);

      const result = await controller.update(1, dto);

      expect(mockTwitchChannelsService.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updated);
    });
  });

  // ─── reorder (admin) ─────────────────────────────────────────────────────────

  describe('reorder', () => {
    it('devrait appeler twitchChannelsService.reorder avec le DTO', async () => {
      const dto: ReorderTwitchChannelsDto = { ids: [2, 1] };
      const reordered = [
        { id: 2, position: 0 },
        { id: 1, position: 1 },
      ];
      mockTwitchChannelsService.reorder.mockResolvedValue(reordered);

      const result = await controller.reorder(dto);

      expect(mockTwitchChannelsService.reorder).toHaveBeenCalledWith(dto);
      expect(result).toEqual(reordered);
    });
  });

  // ─── delete (admin) ──────────────────────────────────────────────────────────

  describe('delete', () => {
    it("devrait appeler twitchChannelsService.delete avec l'id", async () => {
      mockTwitchChannelsService.delete.mockResolvedValue({ id: 1 });

      const result = await controller.delete(1);

      expect(mockTwitchChannelsService.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1 });
    });
  });
});
