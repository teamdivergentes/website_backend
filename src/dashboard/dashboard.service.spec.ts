import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService, DRAFT_STALE_DAYS } from './dashboard.service';
import { PrismaService } from '../prisma.service';

const ARTICLES_READ = 'articles:read';
const MATCHES_READ = 'matches:read';
const ALL = [ARTICLES_READ, MATCHES_READ];

/** Reference temporelle fixe : les seuils sont testes, pas l'horloge. */
const NOW = new Date('2026-07-31T12:00:00.000Z');

/** Date decalee de `days` jours avant `NOW`. */
function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

/** Ligne d'article telle que la selectionne le service. */
interface ArticleRow {
  id: number;
  title: string;
  slug: string;
  updatedAt: Date;
  userId: number;
}

/** Filtres Prisma que les tests inspectent, types pour rester verifiables. */
interface ArticleWhere {
  published?: boolean;
  userId?: number | { not: number };
  updatedAt?: { gte?: Date; lt?: Date };
  imageUrl?: null;
}

interface MatchWhere {
  active?: boolean;
  scheduledAt?: { lt?: Date; gt?: Date };
  streamUrl?: null;
  OR?: { scoreDvg?: null; scoreOpponent?: null }[];
}

interface FindManyArgs {
  where: ArticleWhere;
  orderBy?: { updatedAt: 'asc' | 'desc' };
  take?: number;
}

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    article: {
      findMany: jest.Mock<Promise<ArticleRow[]>, [FindManyArgs]>;
      count: jest.Mock<Promise<number>, [{ where: ArticleWhere }]>;
    };
    match: { count: jest.Mock<Promise<number>, [{ where: MatchWhere }]> };
  };

  beforeEach(async () => {
    prisma = {
      article: {
        findMany: jest.fn<Promise<ArticleRow[]>, [FindManyArgs]>().mockResolvedValue([]),
        count: jest.fn<Promise<number>, [{ where: ArticleWhere }]>().mockResolvedValue(0),
      },
      match: { count: jest.fn<Promise<number>, [{ where: MatchWhere }]>().mockResolvedValue(0) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  // ─── resume ───────────────────────────────────────────────────────────────

  describe('getResume', () => {
    it('ne retient que les brouillons recents', async () => {
      await service.getResume(1, ALL, NOW);

      const where = prisma.article.findMany.mock.calls[0][0].where;
      expect(where.published).toBe(false);
      expect(where.updatedAt?.gte).toEqual(daysAgo(DRAFT_STALE_DAYS));
    });

    it('trie du plus recemment modifie au plus ancien', async () => {
      await service.getResume(1, ALL, NOW);

      expect(prisma.article.findMany.mock.calls[0][0].orderBy).toEqual({ updatedAt: 'desc' });
    });

    it('place les brouillons de l’utilisateur en premier', async () => {
      prisma.article.findMany
        .mockResolvedValueOnce([
          { id: 1, title: 'Le mien', slug: 'le-mien', updatedAt: daysAgo(5), userId: 7 },
        ])
        .mockResolvedValueOnce([
          { id: 2, title: 'Un autre', slug: 'un-autre', updatedAt: daysAgo(1), userId: 9 },
        ]);

      const { drafts } = await service.getResume(7, ALL, NOW);

      // Le brouillon d'autrui est pourtant plus recent : la propriete prime.
      expect(drafts.map((d) => d.id)).toEqual([1, 2]);
      expect(drafts.map((d) => d.isMine)).toEqual([true, false]);
    });

    it('limite le bloc a cinq brouillons', async () => {
      await service.getResume(1, ALL, NOW);

      expect(prisma.article.findMany.mock.calls[0][0].take).toBe(5);
    });

    it('complete avec les brouillons d’autrui quand les siens ne suffisent pas', async () => {
      prisma.article.findMany.mockResolvedValueOnce([
        { id: 1, title: 'A', slug: 'a', updatedAt: NOW, userId: 7 },
        { id: 2, title: 'B', slug: 'b', updatedAt: NOW, userId: 7 },
      ]);

      await service.getResume(7, ALL, NOW);

      expect(prisma.article.findMany).toHaveBeenCalledTimes(2);
      expect(prisma.article.findMany.mock.calls[1][0].take).toBe(3);
      expect(prisma.article.findMany.mock.calls[1][0].where.userId).toEqual({ not: 7 });
    });

    it('n’interroge pas deux fois quand l’utilisateur remplit deja le bloc', async () => {
      prisma.article.findMany.mockResolvedValueOnce(
        Array.from({ length: 5 }, (_, i) => ({
          id: i,
          title: `T${i}`,
          slug: `t${i}`,
          updatedAt: NOW,
          userId: 7,
        })),
      );

      await service.getResume(7, ALL, NOW);

      expect(prisma.article.findMany).toHaveBeenCalledTimes(1);
    });

    it('retourne une liste vide plutôt qu’une erreur sans articles:read', async () => {
      const { drafts } = await service.getResume(1, [MATCHES_READ], NOW);

      expect(drafts).toEqual([]);
      expect(prisma.article.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── todo ─────────────────────────────────────────────────────────────────

  describe('getTodo', () => {
    it('compte les matchs passés sans score', async () => {
      await service.getTodo(ALL, NOW);

      const where = prisma.match.count.mock.calls[0][0].where;
      expect(where.active).toBe(true);
      expect(where.scheduledAt).toEqual({ lt: NOW });
      expect(where.OR).toEqual([{ scoreDvg: null }, { scoreOpponent: null }]);
    });

    it('compte les matchs à venir sans stream', async () => {
      await service.getTodo(ALL, NOW);

      const where = prisma.match.count.mock.calls[1][0].where;
      expect(where.active).toBe(true);
      expect(where.scheduledAt).toEqual({ gt: NOW });
      expect(where.streamUrl).toBeNull();
    });

    it('compte les articles publiés sans image', async () => {
      await service.getTodo(ALL, NOW);

      expect(prisma.article.count.mock.calls[0][0].where).toEqual({
        published: true,
        imageUrl: null,
      });
    });

    it('compte les brouillons dormants', async () => {
      await service.getTodo(ALL, NOW);

      const where = prisma.article.count.mock.calls[1][0].where;
      expect(where.published).toBe(false);
      expect(where.updatedAt?.lt).toEqual(daysAgo(DRAFT_STALE_DAYS));
    });

    it('remonte les compteurs', async () => {
      prisma.match.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
      prisma.article.count.mockResolvedValueOnce(4).mockResolvedValueOnce(1);

      const counters = await service.getTodo(ALL, NOW);

      expect(counters).toEqual({
        matchesWithoutScore: 3,
        matchesWithoutStream: 2,
        articlesWithoutImage: 4,
        dormantDrafts: 1,
      });
    });

    it('omet les compteurs matchs sans matches:read', async () => {
      const counters = await service.getTodo([ARTICLES_READ], NOW);

      expect(counters.matchesWithoutScore).toBeUndefined();
      expect(counters.matchesWithoutStream).toBeUndefined();
      expect(prisma.match.count).not.toHaveBeenCalled();
      expect(counters.articlesWithoutImage).toBeDefined();
    });

    it('omet les compteurs articles sans articles:read', async () => {
      const counters = await service.getTodo([MATCHES_READ], NOW);

      expect(counters.articlesWithoutImage).toBeUndefined();
      expect(counters.dormantDrafts).toBeUndefined();
      expect(prisma.article.count).not.toHaveBeenCalled();
      expect(counters.matchesWithoutScore).toBeDefined();
    });

    it('retourne un objet vide plutôt qu’une erreur sans aucune permission', async () => {
      expect(await service.getTodo([], NOW)).toEqual({});
    });
  });

  // ─── Seuil partage ────────────────────────────────────────────────────────

  describe('seuil des brouillons', () => {
    it('applique la même coupure aux deux blocs', async () => {
      await service.getResume(1, ALL, NOW);
      await service.getTodo(ALL, NOW);

      const resumeCutoff = prisma.article.findMany.mock.calls[0][0].where.updatedAt?.gte;
      const todoCutoff = prisma.article.count.mock.calls[1][0].where.updatedAt?.lt;

      // Bornes complementaires et strictement exclusives : `resume` prend
      // `>= seuil`, `todo` prend `< seuil`. Un brouillon a exactement 30 jours
      // ne peut donc apparaitre que dans "Reprendre", jamais dans les deux.
      expect(resumeCutoff).toEqual(todoCutoff);
    });
  });
});
