import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TwitchHelixService, TwitchLiveStream } from '../twitch-helix/twitch-helix.service';
import { CreateTwitchChannelDto } from './dto/create-twitch-channel.dto';
import { UpdateTwitchChannelDto } from './dto/update-twitch-channel.dto';
import { ReorderTwitchChannelsDto } from './dto/reorder-twitch-channels.dto';
import { Prisma } from '../../generated/prisma';

type TwitchChannelWithMember = Prisma.TwitchChannelGetPayload<{
  include: { teamMember: true };
}>;

/**
 * Représentation publique d'une chaîne Twitch avec nommage aligné sur le frontend.
 * Mappe `username` -> `twitchUsername` et `active` -> `isActive`.
 */
export interface TwitchChannelDto {
  id: number;
  twitchUsername: string;
  displayName: string | null;
  gameLabel: string | null;
  description: string | null;
  isActive: boolean;
  position: number;
  teamMemberId: number | null;
  teamMember: TwitchChannelWithMember['teamMember'];
  createdAt: Date;
  updatedAt: Date;
}

export interface TwitchChannelLiveDto extends TwitchChannelDto {
  isLive: boolean;
  viewerCount?: number;
  streamTitle?: string;
  streamThumbnailUrl?: string;
  streamGameLabel?: string;
  streamStartedAt?: string;
}

@Injectable()
export class TwitchChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helixService: TwitchHelixService,
  ) {}

  /**
   * Mappe une entité Prisma vers le DTO public (nommage frontend).
   */
  private mapToDto(channel: TwitchChannelWithMember): TwitchChannelDto {
    return {
      id: channel.id,
      twitchUsername: channel.username,
      displayName: channel.displayName,
      gameLabel: channel.gameLabel,
      description: channel.description,
      isActive: channel.active,
      position: channel.position,
      teamMemberId: channel.teamMemberId,
      teamMember: channel.teamMember,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
    };
  }

  /**
   * Vérifie si une erreur est une contrainte unique Prisma (P2002).
   * Compatible avec les vraies instances Prisma et les mocks de tests.
   */
  private isPrismaUniqueError(error: unknown): boolean {
    return (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    );
  }

  /**
   * Vérifie si une erreur est un "record not found" Prisma (P2025).
   */
  private isPrismaNotFoundError(error: unknown): boolean {
    return (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    );
  }

  /**
   * Enrichit une liste de chaînes (déjà mappées) avec le statut live Twitch Helix.
   */
  private enrichWithLiveStatus(
    channels: TwitchChannelDto[],
    liveStreams: TwitchLiveStream[],
  ): TwitchChannelLiveDto[] {
    const liveMap = new Map<string, TwitchLiveStream>(
      liveStreams.map((s) => [s.username.toLowerCase(), s]),
    );

    return channels.map((channel) => {
      const stream = liveMap.get(channel.twitchUsername.toLowerCase());
      if (stream) {
        return {
          ...channel,
          isLive: true,
          viewerCount: stream.viewerCount,
          streamTitle: stream.title,
          streamThumbnailUrl: stream.thumbnailUrl,
          streamGameLabel: stream.gameLabel,
          streamStartedAt: stream.startedAt,
        };
      }
      return { ...channel, isLive: false };
    });
  }

  /**
   * Liste toutes les chaînes (admin) enrichies du statut live.
   */
  async findAll(): Promise<TwitchChannelLiveDto[]> {
    const channels = await this.prisma.twitchChannel.findMany({
      orderBy: { position: 'asc' },
      include: { teamMember: true },
    });

    if (channels.length === 0) return [];

    const mapped = channels.map((c) => this.mapToDto(c));
    const usernames = channels.map((c) => c.username);
    const liveStreams = await this.helixService.getLiveStreams(usernames);

    return this.enrichWithLiveStatus(mapped, liveStreams);
  }

  /**
   * Liste les chaînes actives (public) enrichies du statut live.
   */
  async findLive(): Promise<TwitchChannelLiveDto[]> {
    const channels = await this.prisma.twitchChannel.findMany({
      where: { active: true },
      orderBy: { position: 'asc' },
      include: { teamMember: true },
    });

    if (channels.length === 0) return [];

    const mapped = channels.map((c) => this.mapToDto(c));
    const usernames = channels.map((c) => c.username);
    const liveStreams = await this.helixService.getLiveStreams(usernames);

    return this.enrichWithLiveStatus(mapped, liveStreams);
  }

  /**
   * Retourne une chaîne par ID.
   */
  async findOne(id: number): Promise<TwitchChannelDto> {
    const channel = await this.prisma.twitchChannel.findUnique({
      where: { id },
      include: { teamMember: true },
    });

    if (!channel) {
      throw new NotFoundException(`Chaîne Twitch #${id} non trouvée`);
    }

    return this.mapToDto(channel);
  }

  /**
   * Crée une nouvelle chaîne Twitch.
   */
  async create(dto: CreateTwitchChannelDto): Promise<TwitchChannelDto> {
    const maxPosition = await this.prisma.twitchChannel.aggregate({
      _max: { position: true },
    });

    const position = dto.position ?? (maxPosition._max.position ?? -1) + 1;

    try {
      const channel = await this.prisma.twitchChannel.create({
        data: {
          username: dto.twitchUsername,
          displayName: dto.displayName,
          gameLabel: dto.gameLabel,
          description: dto.description,
          active: dto.isActive ?? true,
          position,
          teamMemberId: dto.teamMemberId ?? null,
        },
        include: { teamMember: true },
      });
      return this.mapToDto(channel);
    } catch (error) {
      if (this.isPrismaUniqueError(error)) {
        throw new ConflictException(
          `La chaîne Twitch avec le pseudo "${dto.twitchUsername}" existe déjà`,
        );
      }
      throw error;
    }
  }

  /**
   * Met à jour une chaîne Twitch.
   */
  async update(id: number, dto: UpdateTwitchChannelDto): Promise<TwitchChannelDto> {
    const existing = await this.prisma.twitchChannel.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Chaîne Twitch #${id} non trouvée`);
    }

    try {
      const updateData: Prisma.TwitchChannelUpdateInput = {};

      if (dto.twitchUsername !== undefined) updateData.username = dto.twitchUsername;
      if (dto.displayName !== undefined) updateData.displayName = dto.displayName;
      if (dto.gameLabel !== undefined) updateData.gameLabel = dto.gameLabel;
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.isActive !== undefined) updateData.active = dto.isActive;
      if (dto.position !== undefined) updateData.position = dto.position;
      if (dto.teamMemberId !== undefined) {
        updateData.teamMember = dto.teamMemberId
          ? { connect: { id: dto.teamMemberId } }
          : { disconnect: true };
      }

      const channel = await this.prisma.twitchChannel.update({
        where: { id },
        data: updateData,
        include: { teamMember: true },
      });
      return this.mapToDto(channel);
    } catch (error) {
      if (this.isPrismaUniqueError(error)) {
        throw new ConflictException(`La chaîne Twitch avec ce pseudo existe déjà`);
      }
      if (this.isPrismaNotFoundError(error)) {
        throw new NotFoundException(`Chaîne Twitch #${id} non trouvée`);
      }
      throw error;
    }
  }

  /**
   * Supprime une chaîne Twitch.
   */
  async delete(id: number): Promise<{ message: string }> {
    const existing = await this.prisma.twitchChannel.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Chaîne Twitch #${id} non trouvée`);
    }

    await this.prisma.twitchChannel.delete({ where: { id } });

    return { message: 'Chaîne Twitch supprimée avec succès' };
  }

  /**
   * Réordonne les chaînes Twitch.
   */
  async reorder(dto: ReorderTwitchChannelsDto): Promise<{ message: string }> {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.twitchChannel.update({
          where: { id: item.id },
          data: { position: item.position },
        }),
      ),
    );

    return { message: 'Ordre mis à jour avec succès' };
  }
}
