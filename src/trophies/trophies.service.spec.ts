import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TrophiesService } from './trophies.service';
import { PrismaService } from '../prisma.service';
import { CreateTrophyDto } from './dto/create-trophy.dto';

describe('TrophiesService', () => {
  let service: TrophiesService;

  const mockPrisma = {
    trophy: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const sampleTrophy = {
    id: 1,
    competition: 'Coupe de France LoL',
    placement: 1,
    description: 'Victoire en finale',
    date: new Date('2025-06-15'),
    image: '/uploads/abc.webp',
    featured: true,
    teamId: 2,
    teamLabel: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    team: { id: 2, name: 'Équipe LoL', slug: 'equipe-lol' },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrophiesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<TrophiesService>(TrophiesService);
  });

  describe('findAllPublic', () => {
    it('ne retourne que les trophées actifs, triés date desc puis placement asc', async () => {
      mockPrisma.trophy.findMany.mockResolvedValue([sampleTrophy]);
      await service.findAllPublic({});
      expect(mockPrisma.trophy.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: [{ date: 'desc' }, { placement: 'asc' }],
        include: { team: { select: { id: true, name: true, slug: true } } },
      });
    });

    it('filtre par featured=true', async () => {
      mockPrisma.trophy.findMany.mockResolvedValue([]);
      await service.findAllPublic({ featured: true });
      expect(mockPrisma.trophy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { active: true, featured: true } }),
      );
    });

    it('filtre par teamId', async () => {
      mockPrisma.trophy.findMany.mockResolvedValue([]);
      await service.findAllPublic({ teamId: 2 });
      expect(mockPrisma.trophy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { active: true, teamId: 2 } }),
      );
    });

    it('mappe le trophée en DTO avec teamName depuis la relation', async () => {
      mockPrisma.trophy.findMany.mockResolvedValue([sampleTrophy]);
      const result = await service.findAllPublic({});
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 1,
          competition: 'Coupe de France LoL',
          placement: 1,
          teamName: 'Équipe LoL',
          teamSlug: 'equipe-lol',
        }),
      );
    });

    it('utilise teamLabel comme teamName si pas de team liée', async () => {
      mockPrisma.trophy.findMany.mockResolvedValue([
        { ...sampleTrophy, team: null, teamId: null, teamLabel: 'Roster LoL 2024' },
      ]);
      const result = await service.findAllPublic({});
      expect(result[0].teamName).toBe('Roster LoL 2024');
      expect(result[0].teamSlug).toBeNull();
    });
  });

  describe('create', () => {
    it('crée un trophée avec les valeurs du DTO', async () => {
      const dto: CreateTrophyDto = {
        competition: 'Open Valorant',
        placement: 1,
        date: '2024-11-10',
      };
      mockPrisma.trophy.create.mockResolvedValue({
        ...sampleTrophy,
        ...dto,
        date: new Date(dto.date),
      });
      await service.create(dto);
      expect(mockPrisma.trophy.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          competition: 'Open Valorant',
          placement: 1,
          date: new Date('2024-11-10'),
        }),
        include: { team: { select: { id: true, name: true, slug: true } } },
      });
    });

    it('applique les valeurs par défaut (featured false, active true, teamLabel null)', async () => {
      const dto: CreateTrophyDto = { competition: 'LAN DVG', placement: 2, date: '2024-03-01' };
      const created = {
        ...sampleTrophy,
        competition: 'LAN DVG',
        placement: 2,
        featured: false,
        active: true,
        teamId: null,
        teamLabel: null,
        team: null,
      };
      mockPrisma.trophy.create.mockResolvedValue(created);
      const result = await service.create(dto);
      expect(mockPrisma.trophy.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          featured: false,
          active: true,
          teamId: null,
          teamLabel: null,
        }),
        include: { team: { select: { id: true, name: true, slug: true } } },
      });
      expect(result.featured).toBe(false);
      expect(result.active).toBe(true);
      expect(result.teamName).toBeNull();
    });

    it('lève BadRequestException si teamId référence une équipe inexistante (P2003)', async () => {
      mockPrisma.trophy.create.mockRejectedValue({ code: 'P2003', message: 'FK constraint' });
      const dto: CreateTrophyDto = {
        competition: 'Test',
        placement: 1,
        date: '2024-01-01',
        teamId: 999,
      };
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('lève NotFoundException si le trophée est introuvable (P2025)', async () => {
      mockPrisma.trophy.update.mockRejectedValue({ code: 'P2025', message: 'Not found' });
      await expect(service.update(999, { competition: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('lève BadRequestException si teamId référence une équipe inexistante (P2003)', async () => {
      mockPrisma.trophy.update.mockRejectedValue({ code: 'P2003', message: 'FK constraint' });
      await expect(service.update(1, { teamId: 999 })).rejects.toThrow(BadRequestException);
    });

    it('ne transmet à Prisma que les champs fournis (patch partiel)', async () => {
      mockPrisma.trophy.update.mockResolvedValue(sampleTrophy);
      await service.update(1, { placement: 2 });
      expect(mockPrisma.trophy.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { placement: 2 },
        include: { team: { select: { id: true, name: true, slug: true } } },
      });
    });
  });

  describe('delete', () => {
    it('lève NotFoundException si le trophée est introuvable (P2025)', async () => {
      mockPrisma.trophy.delete.mockRejectedValue({ code: 'P2025', message: 'Not found' });
      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });

    it('supprime le trophée sans erreur', async () => {
      mockPrisma.trophy.delete.mockResolvedValue(undefined);
      await expect(service.delete(1)).resolves.toBeUndefined();
      expect(mockPrisma.trophy.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });
});
