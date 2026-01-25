import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { ReorderDto } from './dto/reorder.dto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate a URL-friendly slug from team name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/-+/g, '-'); // Remove duplicate -
  }

  /**
   * Get all teams ordered by position
   */
  async findAll() {
    const teams = await this.prisma.team.findMany({
      orderBy: { position: 'asc' },
      include: {
        members: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return teams.map((team) => ({
      ...team,
      membersCount: team.members.length,
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
    const slug = this.generateSlug(createTeamDto.name);

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
      const updateData: any = {};

      if (updateTeamDto.name !== undefined) {
        updateData.name = updateTeamDto.name;
        updateData.slug = this.generateSlug(updateTeamDto.name);

        // Check if new slug conflicts with existing team
        const existing = await this.prisma.team.findUnique({
          where: { slug: updateData.slug },
        });

        if (existing && existing.id !== id) {
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
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Équipe #${id} non trouvée`);
      }
      throw error;
    }
  }

  /**
   * Delete team (cascade delete members)
   */
  async delete(id: number) {
    try {
      await this.prisma.team.delete({
        where: { id },
      });

      return { message: 'Équipe supprimée avec succès' };
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Équipe #${id} non trouvée`);
      }
      throw error;
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
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Équipe #${id} non trouvée`);
      }
      throw error;
    }
  }
}
