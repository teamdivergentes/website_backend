import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * Age a partir duquel un brouillon cesse d'etre "en cours" pour devenir dormant.
 *
 * Seuil unique aux deux endpoints : `resume` prend les brouillons plus recents,
 * `todo` compte les plus anciens. Un brouillon ne peut donc jamais apparaitre
 * dans les deux blocs, quel que soit son age.
 */
export const DRAFT_STALE_DAYS = 30;

/** Nombre de brouillons remontes par le bloc "Reprendre". */
const RESUME_LIMIT = 5;

/**
 * Permissions de lecture. `articles:read` n'a pas de constante dans
 * `common/constants/permissions.ts` alors qu'elle est bien semee et servie par
 * `roles.service` — incoherence existante, non corrigee ici pour ne pas modifier
 * `ALL_PERMISSIONS`, qui pilote l'attribution des roles.
 */
const ARTICLES_READ = 'articles:read';
const MATCHES_READ = 'matches:read';

/** Brouillon tel qu'affiche par le bloc "Reprendre". */
export interface DraftSummary {
  id: number;
  title: string;
  slug: string;
  updatedAt: Date;
  /** Vrai si le brouillon appartient a l'utilisateur qui consulte. */
  isMine: boolean;
}

/**
 * Compteurs du bloc "A faire".
 *
 * Chaque champ est **optionnel** : il est omis quand la permission de lecture
 * correspondante manque. Une alerte que l'utilisateur ne peut pas traiter n'a
 * pas a lui etre remontee, et un 403 priverait le reste du bloc.
 */
export interface TodoCounters {
  matchesWithoutScore?: number;
  articlesWithoutImage?: number;
  matchesWithoutStream?: number;
  dormantDrafts?: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Date en deca de laquelle un brouillon est considere dormant. */
  private staleCutoff(now: Date): Date {
    return new Date(now.getTime() - DRAFT_STALE_DAYS * 24 * 60 * 60 * 1000);
  }

  /**
   * Brouillons recents, ceux de l'utilisateur d'abord.
   *
   * Retourne une liste vide plutot qu'un 403 sans `articles:read` : le bloc
   * disparait simplement du dashboard.
   */
  async getResume(
    userId: number,
    permissions: string[],
    now: Date = new Date(),
  ): Promise<{ drafts: DraftSummary[] }> {
    if (!permissions.includes(ARTICLES_READ)) {
      return { drafts: [] };
    }

    const recent = { published: false, updatedAt: { gte: this.staleCutoff(now) } };
    const select = { id: true, title: true, slug: true, updatedAt: true, userId: true };

    const mine = await this.prisma.article.findMany({
      where: { ...recent, userId },
      orderBy: { updatedAt: 'desc' },
      take: RESUME_LIMIT,
      select,
    });

    // Deuxieme requete evitee quand l'utilisateur a deja de quoi remplir le bloc.
    const others =
      mine.length >= RESUME_LIMIT
        ? []
        : await this.prisma.article.findMany({
            where: { ...recent, userId: { not: userId } },
            orderBy: { updatedAt: 'desc' },
            take: RESUME_LIMIT - mine.length,
            select,
          });

    return {
      drafts: [...mine, ...others].map((article) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        updatedAt: article.updatedAt,
        isMine: article.userId === userId,
      })),
    };
  }

  /** Compteurs d'anomalies traitables, filtres par permission. */
  async getTodo(permissions: string[], now: Date = new Date()): Promise<TodoCounters> {
    const canReadArticles = permissions.includes(ARTICLES_READ);
    const canReadMatches = permissions.includes(MATCHES_READ);

    const counters: TodoCounters = {};

    if (canReadMatches) {
      const [withoutScore, withoutStream] = await Promise.all([
        this.prisma.match.count({
          where: {
            active: true,
            scheduledAt: { lt: now },
            OR: [{ scoreDvg: null }, { scoreOpponent: null }],
          },
        }),
        this.prisma.match.count({
          where: { active: true, scheduledAt: { gt: now }, streamUrl: null },
        }),
      ]);

      counters.matchesWithoutScore = withoutScore;
      counters.matchesWithoutStream = withoutStream;
    }

    if (canReadArticles) {
      const [withoutImage, dormant] = await Promise.all([
        this.prisma.article.count({ where: { published: true, imageUrl: null } }),
        this.prisma.article.count({
          where: { published: false, updatedAt: { lt: this.staleCutoff(now) } },
        }),
      ]);

      counters.articlesWithoutImage = withoutImage;
      counters.dormantDrafts = dormant;
    }

    return counters;
  }
}
