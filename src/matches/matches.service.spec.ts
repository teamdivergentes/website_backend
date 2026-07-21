import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MatchesService, MatchAdminDto } from './matches.service';
import { PrismaService } from '../prisma.service';
import { CreateMatchDto } from './dto/create-match.dto';

describe('MatchesService', () => {
  let service: MatchesService;

  const mockPrisma = {
    match: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    team: {
      findUnique: jest.fn(),
    },
  };

  const now = new Date();
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7j
  const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // -7j

  const sampleMatch = {
    id: 1,
    teamId: 2,
    teamNameSnapshot: 'DVG LoL',
    opponentName: 'Team Alpha',
    opponentLogo: '/uploads/alpha.webp',
    scheduledAt: futureDate,
    competition: 'LFL 2025',
    streamUrl: 'https://twitch.tv/dvg',
    scoreDvg: null,
    scoreOpponent: null,
    articleId: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    team: { id: 2, name: 'DVG LoL', slug: 'dvg-lol', game: 'lol' },
    article: null,
  };

  const pastMatchWithScores = {
    ...sampleMatch,
    id: 2,
    scheduledAt: pastDate,
    scoreDvg: 2,
    scoreOpponent: 1,
    articleId: 5,
    article: { id: 5, slug: 'recap-match-alpha', published: true },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [MatchesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<MatchesService>(MatchesService);
  });

  // ─── findAllPublic ───────────────────────────────────────────────────────────

  describe('findAllPublic', () => {
    it('filtre status=upcoming → scheduledAt gt now, orderBy scheduledAt asc', async () => {
      mockPrisma.match.findMany.mockResolvedValue([sampleMatch]);
      await service.findAllPublic({ status: 'upcoming' });
      expect(mockPrisma.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            active: true,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            scheduledAt: expect.objectContaining({ gt: expect.any(Date) }),
          }),
          orderBy: { scheduledAt: 'asc' },
        }),
      );
    });

    it('filtre status=past → scheduledAt lte now + scores non null + orderBy desc', async () => {
      mockPrisma.match.findMany.mockResolvedValue([pastMatchWithScores]);
      await service.findAllPublic({ status: 'past' });
      expect(mockPrisma.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            active: true,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            scheduledAt: expect.objectContaining({ lte: expect.any(Date) }),
            scoreDvg: { not: null },
            scoreOpponent: { not: null },
          }),
          orderBy: { scheduledAt: 'desc' },
        }),
      );
    });

    it('sans status → orderBy scheduledAt desc', async () => {
      mockPrisma.match.findMany.mockResolvedValue([sampleMatch]);
      await service.findAllPublic({});
      expect(mockPrisma.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { active: true },
          orderBy: { scheduledAt: 'desc' },
        }),
      );
    });

    it('teamId → ajouté au where', async () => {
      mockPrisma.match.findMany.mockResolvedValue([]);
      await service.findAllPublic({ teamId: 3 });
      expect(mockPrisma.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({ active: true, teamId: 3 }),
        }),
      );
    });

    it('limit cappé à 50 même si > 50 demandé', async () => {
      mockPrisma.match.findMany.mockResolvedValue([]);
      await service.findAllPublic({ limit: 200 });
      expect(mockPrisma.match.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 50 }));
    });

    it('limit 10 → take: 10', async () => {
      mockPrisma.match.findMany.mockResolvedValue([]);
      await service.findAllPublic({ limit: 10 });
      expect(mockPrisma.match.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
    });

    it('le DTO public ne contient pas active, createdAt, updatedAt', async () => {
      mockPrisma.match.findMany.mockResolvedValue([sampleMatch]);
      const result = await service.findAllPublic({});
      expect(result[0]).not.toHaveProperty('active');
      expect(result[0]).not.toHaveProperty('createdAt');
      expect(result[0]).not.toHaveProperty('updatedAt');
    });

    it('mappe articleSlug depuis la relation article', async () => {
      mockPrisma.match.findMany.mockResolvedValue([pastMatchWithScores]);
      const result = await service.findAllPublic({});
      expect(result[0].articleSlug).toBe('recap-match-alpha');
      expect(result[0].articleId).toBe(5);
    });

    it("articleSlug null si pas d'article lié", async () => {
      mockPrisma.match.findMany.mockResolvedValue([sampleMatch]);
      const result = await service.findAllPublic({});
      expect(result[0].articleSlug).toBeNull();
    });

    it('articleSlug null si article lié NON publié (SEC-EPIC37-01)', async () => {
      const matchUnpublishedArticle = {
        ...pastMatchWithScores,
        article: { id: 5, slug: 'recap-brouillon', published: false },
      };
      mockPrisma.match.findMany.mockResolvedValue([matchUnpublishedArticle]);
      const result = await service.findAllPublic({});
      expect(result[0].articleSlug).toBeNull();
      // articleId reste exposé (métier), seul le slug est masqué
      expect(result[0].articleId).toBe(5);
    });

    it('teamName retombe sur teamNameSnapshot si équipe supprimée (B5)', async () => {
      const matchWithoutTeam = { ...sampleMatch, teamId: null, team: null };
      mockPrisma.match.findMany.mockResolvedValue([matchWithoutTeam]);
      const result = await service.findAllPublic({});
      expect(result[0].teamName).toBe('DVG LoL');
      expect(result[0].teamId).toBeNull();
      expect(result[0].teamSlug).toBeNull();
    });

    it('filtre past exclut un match passé sans scores (where scoreDvg/scoreOpponent not null)', async () => {
      // On vérifie que le where force scoreDvg et scoreOpponent non-null → exclut logiquement
      // les matchs passés sans résultats saisis
      mockPrisma.match.findMany.mockResolvedValue([]);
      await service.findAllPublic({ status: 'past' });
      expect(mockPrisma.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            scoreDvg: { not: null },
            scoreOpponent: { not: null },
          }),
        }),
      );
    });
  });

  // ─── findAllAdmin ────────────────────────────────────────────────────────────

  describe('findAllAdmin', () => {
    it('retourne tous les matchs y compris inactifs, orderBy scheduledAt desc', async () => {
      const inactiveMatch = { ...sampleMatch, active: false };
      mockPrisma.match.findMany.mockResolvedValue([sampleMatch, inactiveMatch]);
      const result = await service.findAllAdmin();
      expect(result).toHaveLength(2);
      expect(mockPrisma.match.findMany).toHaveBeenCalledWith(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expect.not.objectContaining({ where: expect.objectContaining({ active: true }) }),
      );
    });

    it('le DTO admin contient active, createdAt, updatedAt', async () => {
      mockPrisma.match.findMany.mockResolvedValue([sampleMatch]);
      const result = await service.findAllAdmin();
      expect(result[0]).toHaveProperty('active');
      expect(result[0]).toHaveProperty('createdAt');
      expect(result[0]).toHaveProperty('updatedAt');
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    beforeEach(() => {
      // Par défaut l'équipe existe → snapshot renseigné (B5)
      mockPrisma.team.findUnique.mockResolvedValue({ name: 'DVG LoL' });
    });

    it("renseigne teamNameSnapshot depuis l'équipe (B5)", async () => {
      const dto: CreateMatchDto = {
        teamId: 2,
        opponentName: 'Team Alpha',
        scheduledAt: '2025-09-15T15:00:00.000Z',
      };
      mockPrisma.match.create.mockResolvedValue({ ...sampleMatch });
      await service.create(dto);
      expect(mockPrisma.match.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({ teamNameSnapshot: 'DVG LoL' }),
        }),
      );
    });

    it("lève BadRequestException si l'équipe n'existe pas (snapshot impossible)", async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);
      const dto: CreateMatchDto = {
        teamId: 999,
        opponentName: 'X',
        scheduledAt: '2025-09-15T15:00:00.000Z',
      };
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.match.create).not.toHaveBeenCalled();
    });

    it('crée un match avec les valeurs du DTO', async () => {
      const dto: CreateMatchDto = {
        teamId: 2,
        opponentName: 'Team Alpha',
        scheduledAt: '2025-09-15T15:00:00.000Z',
      };
      mockPrisma.match.create.mockResolvedValue({ ...sampleMatch });
      await service.create(dto);
      expect(mockPrisma.match.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            teamId: 2,
            opponentName: 'Team Alpha',
            scheduledAt: new Date('2025-09-15T15:00:00.000Z'),
          }),
        }),
      );
    });

    it('retourne un MatchAdminDto avec active, createdAt, updatedAt', async () => {
      const dto: CreateMatchDto = {
        teamId: 2,
        opponentName: 'X',
        scheduledAt: '2025-09-15T15:00:00.000Z',
      };
      mockPrisma.match.create.mockResolvedValue(sampleMatch);
      const result: MatchAdminDto = await service.create(dto);
      expect(result).toHaveProperty('active');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('lève BadRequestException si équipe ou article introuvable (P2003)', async () => {
      mockPrisma.match.create.mockRejectedValue({ code: 'P2003', message: 'FK constraint' });
      const dto: CreateMatchDto = {
        teamId: 999,
        opponentName: 'X',
        scheduledAt: '2025-09-15T15:00:00.000Z',
      };
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('lève BadRequestException si un seul score est fourni (scoreDvg sans scoreOpponent)', async () => {
      const dto: CreateMatchDto = {
        teamId: 2,
        opponentName: 'X',
        scheduledAt: '2025-09-15T15:00:00.000Z',
        scoreDvg: 2,
      };
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.match.create).not.toHaveBeenCalled();
    });

    it('lève BadRequestException si un seul score est fourni (scoreOpponent sans scoreDvg)', async () => {
      const dto: CreateMatchDto = {
        teamId: 2,
        opponentName: 'X',
        scheduledAt: '2025-09-15T15:00:00.000Z',
        scoreOpponent: 1,
      };
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.match.create).not.toHaveBeenCalled();
    });

    it('accepte les deux scores simultanément', async () => {
      const dto: CreateMatchDto = {
        teamId: 2,
        opponentName: 'X',
        scheduledAt: '2025-09-15T15:00:00.000Z',
        scoreDvg: 2,
        scoreOpponent: 1,
      };
      mockPrisma.match.create.mockResolvedValue({ ...sampleMatch, scoreDvg: 2, scoreOpponent: 1 });
      await expect(service.create(dto)).resolves.toBeDefined();
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    beforeEach(() => {
      // Par défaut, si un teamId est fourni, l'équipe existe (B5 : refresh snapshot)
      mockPrisma.team.findUnique.mockResolvedValue({ name: 'DVG LoL' });
    });

    it('lève NotFoundException si le match est introuvable (P2025)', async () => {
      mockPrisma.match.update.mockRejectedValue({ code: 'P2025', message: 'Not found' });
      await expect(service.update(999, { opponentName: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('lève BadRequestException si article introuvable (P2003)', async () => {
      mockPrisma.match.update.mockRejectedValue({ code: 'P2003', message: 'FK constraint' });
      await expect(service.update(1, { articleId: 999 })).rejects.toThrow(BadRequestException);
    });

    it("lève BadRequestException si la nouvelle équipe n'existe pas", async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);
      await expect(service.update(1, { teamId: 999 })).rejects.toThrow(BadRequestException);
      expect(mockPrisma.match.update).not.toHaveBeenCalled();
    });

    it('rafraîchit teamNameSnapshot quand teamId change (B5)', async () => {
      mockPrisma.team.findUnique.mockResolvedValue({ name: 'DVG Valo' });
      mockPrisma.match.update.mockResolvedValue(sampleMatch);
      await service.update(1, { teamId: 3 });
      expect(mockPrisma.match.update).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({ teamId: 3, teamNameSnapshot: 'DVG Valo' }),
        }),
      );
    });

    it('lève BadRequestException si un seul score dans le payload update', async () => {
      await expect(service.update(1, { scoreDvg: 2 })).rejects.toThrow(BadRequestException);
      expect(mockPrisma.match.update).not.toHaveBeenCalled();
    });

    it('lève BadRequestException si scoreDvg:null explicite mais scoreOpponent renseigné (SEC-EPIC37-02)', async () => {
      await expect(
        service.update(1, { scoreDvg: null as unknown as number, scoreOpponent: 5 }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.match.update).not.toHaveBeenCalled();
    });

    it('ne transmet que les champs fournis (patch partiel)', async () => {
      mockPrisma.match.update.mockResolvedValue(sampleMatch);
      await service.update(1, { opponentName: 'New Team' });
      expect(mockPrisma.match.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { opponentName: 'New Team' },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        include: expect.any(Object),
      });
    });
  });

  // ─── delete ──────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('lève NotFoundException si le match est introuvable (P2025)', async () => {
      mockPrisma.match.delete.mockRejectedValue({ code: 'P2025', message: 'Not found' });
      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });

    it('supprime le match sans erreur', async () => {
      mockPrisma.match.delete.mockResolvedValue(undefined);
      await expect(service.delete(1)).resolves.toBeUndefined();
      expect(mockPrisma.match.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });
});
