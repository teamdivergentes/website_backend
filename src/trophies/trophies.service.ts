import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTrophyDto } from './dto/create-trophy.dto';
import { UpdateTrophyDto } from './dto/update-trophy.dto';
import { Prisma } from '../../generated/prisma';
import { isPrismaForeignKeyError, isPrismaNotFoundError } from '../common/utils/prisma-errors';

export interface TrophyPublicDto {
  id: number;
  competition: string;
  placement: number;
  description: string | null;
  date: Date;
  image: string | null;
  featured: boolean;
  teamId: number | null;
  teamName: string | null;
  teamSlug: string | null;
  teamGame: string | null;
}

export interface TrophyAdminDto extends TrophyPublicDto {
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrophyFilters {
  featured?: boolean;
  teamId?: number;
}

type TrophyWithTeam = Prisma.TrophyGetPayload<{
  include: { team: { select: { id: true; name: true; slug: true; game: true } } };
}>;

const TEAM_INCLUDE = {
  team: { select: { id: true, name: true, slug: true, game: true } },
} as const;

@Injectable()
export class TrophiesService {
  constructor(private readonly prisma: PrismaService) {}

  // Pas de pagination ni d'index (active, date) : volume attendu < 200 trophées à vie (décision VQO ALPHA-PERF-001/002, réévaluer si > 500 lignes)
  async findAllPublic(filters: TrophyFilters): Promise<TrophyPublicDto[]> {
    const trophies = await this.prisma.trophy.findMany({
      where: {
        active: true,
        ...(filters.featured !== undefined && { featured: filters.featured }),
        ...(filters.teamId !== undefined && { teamId: filters.teamId }),
      },
      orderBy: [{ date: 'desc' }, { placement: 'asc' }],
      include: TEAM_INCLUDE,
    });
    return trophies.map((trophy) => this.mapToPublicDto(trophy));
  }

  async findAllAdmin(): Promise<TrophyAdminDto[]> {
    const trophies = await this.prisma.trophy.findMany({
      orderBy: [{ date: 'desc' }, { placement: 'asc' }],
      include: TEAM_INCLUDE,
    });
    return trophies.map((trophy) => this.mapToAdminDto(trophy));
  }

  async create(dto: CreateTrophyDto): Promise<TrophyAdminDto> {
    try {
      const trophy = await this.prisma.trophy.create({
        data: {
          competition: dto.competition,
          placement: dto.placement,
          description: dto.description ?? null,
          date: new Date(dto.date),
          image: dto.image ?? null,
          featured: dto.featured ?? false,
          teamId: dto.teamId ?? null,
          teamLabel: dto.teamLabel ?? null,
          active: dto.active ?? true,
        },
        include: TEAM_INCLUDE,
      });
      return this.mapToAdminDto(trophy);
    } catch (error) {
      if (isPrismaForeignKeyError(error)) {
        throw new BadRequestException('Équipe introuvable ou teamId invalide');
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateTrophyDto): Promise<TrophyAdminDto> {
    try {
      const trophy = await this.prisma.trophy.update({
        where: { id },
        data: {
          ...(dto.competition !== undefined && { competition: dto.competition }),
          ...(dto.placement !== undefined && { placement: dto.placement }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.date !== undefined && { date: new Date(dto.date) }),
          ...(dto.image !== undefined && { image: dto.image }),
          ...(dto.featured !== undefined && { featured: dto.featured }),
          ...(dto.teamId !== undefined && { teamId: dto.teamId }),
          ...(dto.teamLabel !== undefined && { teamLabel: dto.teamLabel }),
          ...(dto.active !== undefined && { active: dto.active }),
        },
        include: TEAM_INCLUDE,
      });
      return this.mapToAdminDto(trophy);
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new NotFoundException(`Trophée ${id} introuvable`);
      }
      if (isPrismaForeignKeyError(error)) {
        throw new BadRequestException('Équipe introuvable ou teamId invalide');
      }
      throw error;
    }
  }

  // Hard delete assumé : la dépublication réversible passe par active=false (pattern repo, VQO ALPHA-RES-001)
  async delete(id: number): Promise<void> {
    try {
      await this.prisma.trophy.delete({ where: { id } });
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new NotFoundException(`Trophée ${id} introuvable`);
      }
      throw error;
    }
  }

  private mapToPublicDto(trophy: TrophyWithTeam): TrophyPublicDto {
    return {
      id: trophy.id,
      competition: trophy.competition,
      placement: trophy.placement,
      description: trophy.description,
      date: trophy.date,
      image: trophy.image,
      featured: trophy.featured,
      teamId: trophy.teamId,
      teamName: trophy.team?.name ?? trophy.teamLabel ?? null,
      teamSlug: trophy.team?.slug ?? null,
      teamGame: trophy.team?.game ?? null,
    };
  }

  private mapToAdminDto(trophy: TrophyWithTeam): TrophyAdminDto {
    return {
      ...this.mapToPublicDto(trophy),
      active: trophy.active,
      createdAt: trophy.createdAt,
      updatedAt: trophy.updatedAt,
    };
  }
}
