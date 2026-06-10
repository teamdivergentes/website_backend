import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { Prisma } from '../../generated/prisma';
import { isPrismaForeignKeyError, isPrismaNotFoundError } from '../common/utils/prisma-errors';

export interface MatchPublicDto {
  id: number;
  teamId: number;
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
    article: { select: { id: true; slug: true } };
  };
}>;

const MATCH_INCLUDE = {
  team: { select: { id: true, name: true, slug: true, game: true } },
  article: { select: { id: true, slug: true } },
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

    const take = filters.limit !== undefined ? Math.min(filters.limit, 50) : undefined;

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
    try {
      const match = await this.prisma.match.create({
        data: {
          teamId: dto.teamId,
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
    try {
      const match = await this.prisma.match.update({
        where: { id },
        data: {
          ...(dto.teamId !== undefined && { teamId: dto.teamId }),
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
    scoreDvg: number | undefined,
    scoreOpponent: number | undefined,
  ): void {
    const hasDvg = scoreDvg !== undefined;
    const hasOpp = scoreOpponent !== undefined;
    if (hasDvg !== hasOpp) {
      throw new BadRequestException('Les deux scores doivent être renseignés ensemble');
    }
  }

  private mapToPublicDto(match: MatchWithRelations): MatchPublicDto {
    return {
      id: match.id,
      teamId: match.teamId,
      teamName: match.team?.name ?? null,
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
      articleSlug: match.article?.slug ?? null,
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
