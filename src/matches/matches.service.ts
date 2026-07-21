import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { Prisma } from '../../generated/prisma';
import { isPrismaForeignKeyError, isPrismaNotFoundError } from '../common/utils/prisma-errors';

export interface MatchPublicDto {
  id: number;
  teamId: number | null;
  teamName: string | null;
  teamSlug: string | null;
  teamGame: string | null;
  opponentName: string;
  opponentLogo: string | null;
  scheduledAt: Date;
  competition: string | null;
  streamUrl: string | null;
  scoreDvg: number | null;
  scoreOpponent: number | null;
  articleId: number | null;
  articleSlug: string | null;
}

export interface MatchAdminDto extends MatchPublicDto {
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchFilters {
  teamId?: number;
  status?: 'upcoming' | 'past';
  limit?: number;
}

type MatchWithRelations = Prisma.MatchGetPayload<{
  include: {
    team: { select: { id: true; name: true; slug: true; game: true } };
    article: { select: { id: true; slug: true; published: true } };
  };
}>;

// article.published est sélectionné pour ne divulguer le slug (SEC-EPIC37-01)
// que si l'article lié est effectivement publié.
const MATCH_INCLUDE = {
  team: { select: { id: true, name: true, slug: true, game: true } },
  article: { select: { id: true, slug: true, published: true } },
} as const;

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  // Statut dérivé — aucun champ statut en base :
  // upcoming = scheduledAt > now (et active)
  // past (public) = scheduledAt <= now ET scoreDvg != null ET scoreOpponent != null
  // date passée sans scores → visible admin seulement
  async findAllPublic(filters: MatchFilters): Promise<MatchPublicDto[]> {
    const now = new Date();
    const where: Prisma.MatchWhereInput = {
      active: true,
      ...(filters.teamId !== undefined && { teamId: filters.teamId }),
    };

    let orderBy: Prisma.MatchOrderByWithRelationInput = { scheduledAt: 'desc' };

    if (filters.status === 'upcoming') {
      where.scheduledAt = { gt: now };
      orderBy = { scheduledAt: 'asc' };
    } else if (filters.status === 'past') {
      where.scheduledAt = { lte: now };
      where.scoreDvg = { not: null };
      where.scoreOpponent = { not: null };
      orderBy = { scheduledAt: 'desc' };
    }

    let take: number | undefined;
    if (filters.limit !== undefined) {
      take = Math.min(filters.limit, 50);
    }

    const matches = await this.prisma.match.findMany({
      where,
      orderBy,
      include: MATCH_INCLUDE,
      ...(take !== undefined && { take }),
    });

    return matches.map((match) => this.mapToPublicDto(match));
  }

  async findAllAdmin(): Promise<MatchAdminDto[]> {
    const matches = await this.prisma.match.findMany({
      orderBy: { scheduledAt: 'desc' },
      include: MATCH_INCLUDE,
    });
    return matches.map((match) => this.mapToAdminDto(match));
  }

  async create(dto: CreateMatchDto): Promise<MatchAdminDto> {
    this.assertScoresPaired(dto.scoreDvg, dto.scoreOpponent);

    // Snapshot du nom de l'équipe pour préserver l'affichage historique si
    // l'équipe est supprimée par la suite (B5). teamId reste obligatoire à la création.
    const team = await this.prisma.team.findUnique({
      where: { id: dto.teamId },
      select: { name: true },
    });
    if (!team) {
      throw new BadRequestException('Équipe ou article introuvable');
    }

    try {
      const match = await this.prisma.match.create({
        data: {
          teamId: dto.teamId,
          teamNameSnapshot: team.name,
          opponentName: dto.opponentName,
          opponentLogo: dto.opponentLogo ?? null,
          scheduledAt: new Date(dto.scheduledAt),
          competition: dto.competition ?? null,
          streamUrl: dto.streamUrl ?? null,
          scoreDvg: dto.scoreDvg ?? null,
          scoreOpponent: dto.scoreOpponent ?? null,
          articleId: dto.articleId ?? null,
          active: dto.active ?? true,
        },
        include: MATCH_INCLUDE,
      });
      return this.mapToAdminDto(match);
    } catch (error) {
      if (isPrismaForeignKeyError(error)) {
        throw new BadRequestException('Équipe ou article introuvable');
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateMatchDto): Promise<MatchAdminDto> {
    this.assertScoresPaired(dto.scoreDvg, dto.scoreOpponent);

    // Si l'équipe change, on rafraîchit le snapshot du nom (B5).
    let teamNameSnapshot: string | undefined;
    if (dto.teamId !== undefined) {
      const team = await this.prisma.team.findUnique({
        where: { id: dto.teamId },
        select: { name: true },
      });
      if (!team) {
        throw new BadRequestException('Équipe ou article introuvable');
      }
      teamNameSnapshot = team.name;
    }

    try {
      const match = await this.prisma.match.update({
        where: { id },
        data: {
          ...(dto.teamId !== undefined && { teamId: dto.teamId }),
          ...(teamNameSnapshot !== undefined && { teamNameSnapshot }),
          ...(dto.opponentName !== undefined && { opponentName: dto.opponentName }),
          ...(dto.opponentLogo !== undefined && { opponentLogo: dto.opponentLogo }),
          ...(dto.scheduledAt !== undefined && { scheduledAt: new Date(dto.scheduledAt) }),
          ...(dto.competition !== undefined && { competition: dto.competition }),
          ...(dto.streamUrl !== undefined && { streamUrl: dto.streamUrl }),
          ...(dto.scoreDvg !== undefined && { scoreDvg: dto.scoreDvg }),
          ...(dto.scoreOpponent !== undefined && { scoreOpponent: dto.scoreOpponent }),
          ...(dto.articleId !== undefined && { articleId: dto.articleId }),
          ...(dto.active !== undefined && { active: dto.active }),
        },
        include: MATCH_INCLUDE,
      });
      return this.mapToAdminDto(match);
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new NotFoundException(`Match ${id} introuvable`);
      }
      if (isPrismaForeignKeyError(error)) {
        throw new BadRequestException('Équipe ou article introuvable');
      }
      throw error;
    }
  }

  // Hard delete assumé : la dépublication réversible passe par active=false
  async delete(id: number): Promise<void> {
    try {
      await this.prisma.match.delete({ where: { id } });
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new NotFoundException(`Match ${id} introuvable`);
      }
      throw error;
    }
  }

  // Règle métier scores appariés : les deux ou aucun.
  // Vit dans le service car @ValidateIf croisé dans le DTO ne couvre pas
  // les 2 sens de façon symétrique (scoreDvg valide scoreOpponent et vice versa).
  // Pour l'update : si exactement un des deux scores est présent dans le payload → 400.
  // La saisie de résultat envoie toujours les deux scores ensemble.
  private assertScoresPaired(
    scoreDvg: number | null | undefined,
    scoreOpponent: number | null | undefined,
  ): void {
    // SEC-EPIC37-02 : un null explicite (PATCH { scoreDvg: null, scoreOpponent: 5 })
    // compte comme « non renseigné » → doit lever une 400 si l'autre score est présent.
    const hasDvg = scoreDvg !== undefined && scoreDvg !== null;
    const hasOpp = scoreOpponent !== undefined && scoreOpponent !== null;
    if (hasDvg !== hasOpp) {
      throw new BadRequestException('Les deux scores doivent être renseignés ensemble');
    }
  }

  private mapToPublicDto(match: MatchWithRelations): MatchPublicDto {
    return {
      id: match.id,
      teamId: match.teamId,
      // Équipe courante si elle existe encore, sinon nom figé au moment du match
      // (B5 : préservation de l'historique après suppression d'équipe).
      teamName: match.team?.name ?? match.teamNameSnapshot ?? null,
      teamSlug: match.team?.slug ?? null,
      teamGame: match.team?.game ?? null,
      opponentName: match.opponentName,
      opponentLogo: match.opponentLogo,
      scheduledAt: match.scheduledAt,
      competition: match.competition,
      streamUrl: match.streamUrl,
      scoreDvg: match.scoreDvg,
      scoreOpponent: match.scoreOpponent,
      articleId: match.articleId,
      // SEC-EPIC37-01 : ne jamais exposer le slug d'un article non publié
      articleSlug: match.article?.published === true ? match.article.slug : null,
    };
  }

  private mapToAdminDto(match: MatchWithRelations): MatchAdminDto {
    return {
      ...this.mapToPublicDto(match),
      active: match.active,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
    };
  }
}
