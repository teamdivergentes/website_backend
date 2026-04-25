import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateCoachingStaffDto } from './dto/create-coaching-staff.dto';
import { UpdateCoachingStaffDto } from './dto/update-coaching-staff.dto';
import { ReorderCoachingStaffDto } from './dto/reorder-coaching-staff.dto';
import { Prisma } from '../../generated/prisma';

@Injectable()
export class CoachingStaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * Extrait le nom de fichier depuis une URL.
   */
  private extractFilename(url: string | null): string | null {
    if (!url) return null;
    const parts = url.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Supprime une image silencieusement.
   */
  private async deleteImageSilently(url: string | null): Promise<void> {
    const filename = this.extractFilename(url);
    if (!filename) return;
    try {
      await this.uploadService.deleteImage(filename);
    } catch {
      // Silently ignore
    }
  }

  /**
   * Génère un slug URL-friendly depuis un nom.
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * Trouve un slug unique en ajoutant un compteur en cas de collision.
   */
  private async findUniqueSlug(baseSlug: string, excludeId?: number): Promise<string> {
    let slug = baseSlug;
    let counter = 2;

    while (true) {
      const existing = await this.prisma.coachingStaff.findFirst({
        where: {
          slug,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      });

      if (!existing) return slug;

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Liste le coaching staff d'une équipe.
   */
  async findByTeam(teamId: number) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });

    if (!team) {
      throw new NotFoundException(`Équipe #${teamId} non trouvée`);
    }

    return this.prisma.coachingStaff.findMany({
      where: { teamId },
      orderBy: { position: 'asc' },
    });
  }

  /**
   * Retourne un membre du coaching staff par ID.
   */
  async findOne(id: number) {
    const coach = await this.prisma.coachingStaff.findUnique({ where: { id } });

    if (!coach) {
      throw new NotFoundException(`Coach #${id} non trouvé`);
    }

    return coach;
  }

  /**
   * Crée un membre du coaching staff.
   */
  async create(teamId: number, dto: CreateCoachingStaffDto) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });

    if (!team) {
      throw new NotFoundException(`Équipe #${teamId} non trouvée`);
    }

    const maxPosition = await this.prisma.coachingStaff.aggregate({
      where: { teamId },
      _max: { position: true },
    });

    const position = dto.position ?? (maxPosition._max.position ?? -1) + 1;

    // Génère ou valide le slug
    const baseSlug = dto.slug || this.generateSlug(dto.name);
    const slug = await this.findUniqueSlug(baseSlug);

    return this.prisma.coachingStaff.create({
      data: {
        teamId,
        name: dto.name,
        realName: dto.realName,
        role: dto.role,
        image: dto.image,
        biography: dto.biography,
        position,
        socials: dto.socials ?? Prisma.JsonNull,
        slug,
      },
    });
  }

  /**
   * Met à jour un membre du coaching staff.
   */
  async update(id: number, dto: UpdateCoachingStaffDto) {
    const existing = await this.prisma.coachingStaff.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Coach #${id} non trouvé`);
    }

    // Supprime l'ancienne image si une nouvelle est fournie
    if (dto.image !== undefined && existing.image && dto.image !== existing.image) {
      await this.deleteImageSilently(existing.image);
    }

    const updateData: Prisma.CoachingStaffUpdateInput = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
      // Régénère le slug si le nom change et pas de slug explicite
      if (dto.slug === undefined) {
        const baseSlug = this.generateSlug(dto.name);
        updateData.slug = await this.findUniqueSlug(baseSlug, id);
      }
    }
    if (dto.slug !== undefined) {
      // Vérifie que le slug n'est pas pris par un autre coach
      const conflicting = await this.prisma.coachingStaff.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (conflicting) {
        throw new ConflictException(`Le slug "${dto.slug}" est déjà utilisé`);
      }
      updateData.slug = dto.slug;
    }
    if (dto.realName !== undefined) updateData.realName = dto.realName;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.image !== undefined) updateData.image = dto.image;
    if (dto.biography !== undefined) updateData.biography = dto.biography;
    if (dto.position !== undefined) updateData.position = dto.position;
    if (dto.socials !== undefined) updateData.socials = dto.socials;

    try {
      return await this.prisma.coachingStaff.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (
        error !== null &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'P2025'
      ) {
        throw new NotFoundException(`Coach #${id} non trouvé`);
      }
      throw error;
    }
  }

  /**
   * Supprime un membre du coaching staff.
   */
  async delete(id: number): Promise<{ message: string }> {
    const existing = await this.prisma.coachingStaff.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Coach #${id} non trouvé`);
    }

    await this.prisma.coachingStaff.delete({ where: { id } });

    if (existing.image) {
      await this.deleteImageSilently(existing.image);
    }

    return { message: 'Coach supprimé avec succès' };
  }

  /**
   * Réordonne le coaching staff d'une équipe.
   */
  async reorder(teamId: number, dto: ReorderCoachingStaffDto): Promise<{ message: string }> {
    const requestedIds = dto.items.map((i) => i.id);
    const validIds = await this.prisma.coachingStaff.findMany({
      where: { teamId, id: { in: requestedIds } },
      select: { id: true },
    });

    if (validIds.length !== requestedIds.length) {
      throw new BadRequestException(
        "Un ou plusieurs IDs de coaching staff n'appartiennent pas à cette équipe",
      );
    }

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.coachingStaff.update({
          where: { id: item.id },
          data: { position: item.position },
        }),
      ),
    );

    return { message: 'Ordre mis à jour avec succès' };
  }
}
