import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTrophyDto } from './dto/create-trophy.dto';
import { UpdateTrophyDto } from './dto/update-trophy.dto';
import { Prisma } from '../../generated/prisma';

export interface TrophyDto {
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
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrophyFilters {
  featured?: boolean;
  teamId?: number;
}

type TrophyWithTeam = Prisma.TrophyGetPayload<{
  include: { team: { select: { id: true; name: true; slug: true } } };
}>;

const TEAM_INCLUDE = {
  team: { select: { id: true, name: true, slug: true } },
} as const;

@Injectable()
export class TrophiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPublic(filters: TrophyFilters): Promise<TrophyDto[]> {
    const trophies = await this.prisma.trophy.findMany({
      where: {
        active: true,
        ...(filters.featured !== undefined && { featured: filters.featured }),
        ...(filters.teamId !== undefined && { teamId: filters.teamId }),
      },
      orderBy: [{ date: 'desc' }, { placement: 'asc' }],
      include: TEAM_INCLUDE,
    });
    return trophies.map((trophy) => this.mapToDto(trophy));
  }

  async findAllAdmin(): Promise<TrophyDto[]> {
    const trophies = await this.prisma.trophy.findMany({
      orderBy: [{ date: 'desc' }, { placement: 'asc' }],
      include: TEAM_INCLUDE,
    });
    return trophies.map((trophy) => this.mapToDto(trophy));
  }

  async create(dto: CreateTrophyDto): Promise<TrophyDto> {
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
    return this.mapToDto(trophy);
  }

  async update(id: number, dto: UpdateTrophyDto): Promise<TrophyDto> {
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
      return this.mapToDto(trophy);
    } catch (error) {
      if (this.isPrismaNotFoundError(error)) {
        throw new NotFoundException(`Trophée ${id} introuvable`);
      }
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.trophy.delete({ where: { id } });
    } catch (error) {
      if (this.isPrismaNotFoundError(error)) {
        throw new NotFoundException(`Trophée ${id} introuvable`);
      }
      throw error;
    }
  }

  private mapToDto(trophy: TrophyWithTeam): TrophyDto {
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
      active: trophy.active,
      createdAt: trophy.createdAt,
      updatedAt: trophy.updatedAt,
    };
  }

  private isPrismaNotFoundError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    );
  }
}
