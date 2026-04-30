import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { ReorderDto } from './dto/reorder.dto';
import { Prisma } from '../../generated/prisma';
import { generateTeamSlug, extractFilenameFromUrl } from './utils/team-slug.util';

@Injectable()
export class TeamsService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  /**
   * Throw NotFoundException for Prisma P2025 (record not found), re-throw others.
   */
  private handlePrismaError(error: unknown, message: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundException(message);
    }
    throw error;
  }

  /**
   * Delete image file silently (don't fail if deletion fails)
   */
  private async deleteImageSilently(url: string | null): Promise<void> {
    const filename = extractFilenameFromUrl(url);
    if (!filename) return;

    try {
      await this.uploadService.deleteImage(filename);
    } catch {
      // Silently ignore deletion errors
    }
  }

  /**
   * Get all teams ordered by position
   */
  async findAll() {
    const teams = await this.prisma.team.findMany({
      orderBy: { position: 'asc' },
      include: {
        _count: { select: { members: true } },
      },
    });

    return teams.map(({ _count, ...team }) => ({
      ...team,
      membersCount: _count.members,
    }));
  }

  /**
   * Get team by slug with members
   */
  async findBySlug(slug: string) {
    const team = await this.prisma.team.findUnique({
      where: { slug },
      include: {
        members: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!team) {
      throw new NotFoundException(`Équipe avec le slug "${slug}" non trouvée`);
    }

    return {
      ...team,
      membersCount: team.members.length,
    };
  }

  /**
   * Create a new team
   */
  async create(createTeamDto: CreateTeamDto) {
    const slug = generateTeamSlug(createTeamDto.name);

    // Check if slug already exists
    const existing = await this.prisma.team.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new BadRequestException(`Une équipe avec le nom "${createTeamDto.name}" existe déjà`);
    }

    // Get max position
    const maxPosition = await this.prisma.team.aggregate({
      _max: { position: true },
    });

    return this.prisma.team.create({
      data: {
        name: createTeamDto.name,
        slug,
        game: createTeamDto.game,
        image: createTeamDto.image,
        banner: createTeamDto.banner,
        description: createTeamDto.description,
        position: (maxPosition._max.position ?? -1) + 1,
        active: createTeamDto.active ?? true,
        memberFieldsConfig: createTeamDto.memberFieldsConfig || {},
      },
      include: {
        members: true,
      },
    });
  }

  /**
   * Update team
   */
  async update(id: number, updateTeamDto: UpdateTeamDto) {
    try {
      // Fetch existing entity to get old images
      const existing = await this.prisma.team.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(`Équipe #${id} non trouvée`);
      }

      // Delete old image if a new one is provided and different
      if (
        updateTeamDto.image !== undefined &&
        existing.image &&
        updateTeamDto.image !== existing.image
      ) {
        await this.deleteImageSilently(existing.image);
      }

      // Delete old banner if a new one is provided and different
      if (
        updateTeamDto.banner !== undefined &&
        existing.banner &&
        updateTeamDto.banner !== existing.banner
      ) {
        await this.deleteImageSilently(existing.banner);
      }

      const updateData: Prisma.TeamUpdateInput = {};

      if (updateTeamDto.name !== undefined) {
        updateData.name = updateTeamDto.name;
        updateData.slug = generateTeamSlug(updateTeamDto.name);

        // Check if new slug conflicts with existing team
        const slugConflict = await this.prisma.team.findUnique({
          where: { slug: updateData.slug },
        });

        if (slugConflict && slugConflict.id !== id) {
          throw new BadRequestException(
            `Une équipe avec le nom "${updateTeamDto.name}" existe déjà`,
          );
        }
      }

      if (updateTeamDto.game !== undefined) updateData.game = updateTeamDto.game;
      if (updateTeamDto.image !== undefined) updateData.image = updateTeamDto.image;
      if (updateTeamDto.banner !== undefined) updateData.banner = updateTeamDto.banner;
      if (updateTeamDto.description !== undefined)
        updateData.description = updateTeamDto.description;
      if (updateTeamDto.memberFieldsConfig !== undefined)
        updateData.memberFieldsConfig = updateTeamDto.memberFieldsConfig;

      const result = await this.prisma.team.update({
        where: { id },
        data: updateData,
        include: {
          members: {
            orderBy: { position: 'asc' },
          },
        },
      });

      return {
        ...result,
        membersCount: result.members.length,
      };
    } catch (error) {
      this.handlePrismaError(error, `Équipe #${id} non trouvée`);
    }
  }

  /**
   * Delete team (cascade delete members)
   */
  async delete(id: number) {
    try {
      // Fetch entity to get images before deletion
      const existing = await this.prisma.team.findUnique({
        where: { id },
        include: {
          members: true,
        },
      });

      if (!existing) {
        throw new NotFoundException(`Équipe #${id} non trouvée`);
      }

      // Delete from database (cascade deletes members)
      await this.prisma.team.delete({
        where: { id },
      });

      // Delete team images if they exist
      if (existing.image) {
        await this.deleteImageSilently(existing.image);
      }
      if (existing.banner) {
        await this.deleteImageSilently(existing.banner);
      }

      // Delete member images
      for (const member of existing.members) {
        if (member.image) {
          await this.deleteImageSilently(member.image);
        }
      }

      return { message: 'Équipe supprimée avec succès' };
    } catch (error) {
      this.handlePrismaError(error, `Équipe #${id} non trouvée`);
    }
  }

  /**
   * Reorder teams
   */
  async reorder(reorderDto: ReorderDto) {
    await this.prisma.$transaction(
      reorderDto.items.map((item) =>
        this.prisma.team.update({
          where: { id: item.id },
          data: { position: item.position },
        }),
      ),
    );

    return { message: 'Ordre des équipes mis à jour avec succès' };
  }

  /**
   * Toggle team active status
   */
  async toggleActive(id: number) {
    try {
      const team = await this.prisma.team.findUnique({
        where: { id },
      });

      if (!team) {
        throw new NotFoundException(`Équipe #${id} non trouvée`);
      }

      const updated = await this.prisma.team.update({
        where: { id },
        data: { active: !team.active },
        include: {
          members: {
            orderBy: { position: 'asc' },
          },
        },
      });

      return {
        ...updated,
        membersCount: updated.members.length,
      };
    } catch (error) {
      this.handlePrismaError(error, `Équipe #${id} non trouvée`);
    }
  }
}
