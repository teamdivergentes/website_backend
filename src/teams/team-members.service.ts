import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { ReorderDto } from './dto/reorder.dto';
import { Prisma } from '../../generated/prisma';

@Injectable()
export class TeamMembersService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  /**
   * Extract filename from URL path
   */
  private extractFilename(url: string | null): string | null {
    if (!url) return null;
    const parts = url.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Delete image file silently (don't fail if deletion fails)
   */
  private async deleteImageSilently(url: string | null): Promise<void> {
    const filename = this.extractFilename(url);
    if (!filename) return;

    try {
      await this.uploadService.deleteImage(filename);
    } catch {
      // Silently ignore deletion errors
    }
  }

  /**
   * Get all members of a team
   */
  async findByTeam(teamId: number) {
    // Check if team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException(`Équipe #${teamId} non trouvée`);
    }

    return this.prisma.teamMember.findMany({
      where: { teamId },
      orderBy: { position: 'asc' },
    });
  }

  /**
   * Create a new team member
   */
  async create(teamId: number, createMemberDto: CreateMemberDto) {
    // Check if team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException(`Équipe #${teamId} non trouvée`);
    }

    // Get max position for this team
    const maxPosition = await this.prisma.teamMember.aggregate({
      where: { teamId },
      _max: { position: true },
    });

    return this.prisma.teamMember.create({
      data: {
        name: createMemberDto.name,
        realName: createMemberDto.realName,
        role: createMemberDto.role,
        image: createMemberDto.image,
        teamId,
        position: (maxPosition._max.position ?? -1) + 1,
        socials: createMemberDto.socials || {},
      },
    });
  }

  /**
   * Update team member
   */
  async update(teamId: number, id: number, updateMemberDto: UpdateMemberDto) {
    try {
      // Check if member belongs to this team
      const member = await this.prisma.teamMember.findUnique({
        where: { id },
      });

      if (!member) {
        throw new NotFoundException(`Membre #${id} non trouvé`);
      }

      if (member.teamId !== teamId) {
        throw new NotFoundException(`Membre #${id} n'appartient pas à l'équipe #${teamId}`);
      }

      // Delete old image if a new one is provided and different
      if (
        updateMemberDto.image !== undefined &&
        member.image &&
        updateMemberDto.image !== member.image
      ) {
        await this.deleteImageSilently(member.image);
      }

      const updateData: Prisma.TeamMemberUpdateInput = {};

      if (updateMemberDto.name !== undefined) updateData.name = updateMemberDto.name;
      if (updateMemberDto.realName !== undefined) updateData.realName = updateMemberDto.realName;
      if (updateMemberDto.role !== undefined) updateData.role = updateMemberDto.role;
      if (updateMemberDto.image !== undefined) updateData.image = updateMemberDto.image;
      if (updateMemberDto.socials !== undefined) updateData.socials = updateMemberDto.socials;

      return this.prisma.teamMember.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'P2025'
      ) {
        throw new NotFoundException(`Membre #${id} non trouvé`);
      }
      throw error;
    }
  }

  /**
   * Delete team member
   */
  async delete(teamId: number, id: number) {
    try {
      // Check if member belongs to this team
      const member = await this.prisma.teamMember.findUnique({
        where: { id },
      });

      if (!member) {
        throw new NotFoundException(`Membre #${id} non trouvé`);
      }

      if (member.teamId !== teamId) {
        throw new NotFoundException(`Membre #${id} n'appartient pas à l'équipe #${teamId}`);
      }

      // Delete from database
      await this.prisma.teamMember.delete({
        where: { id },
      });

      // Delete image file if exists
      if (member.image) {
        await this.deleteImageSilently(member.image);
      }

      return { message: 'Membre supprimé avec succès' };
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'P2025'
      ) {
        throw new NotFoundException(`Membre #${id} non trouvé`);
      }
      throw error;
    }
  }

  /**
   * Reorder team members
   */
  async reorder(teamId: number, reorderDto: ReorderDto) {
    // Verify all members belong to this team
    const memberIds = reorderDto.items.map((item) => item.id);
    const members = await this.prisma.teamMember.findMany({
      where: {
        id: { in: memberIds },
        teamId,
      },
    });

    if (members.length !== memberIds.length) {
      throw new NotFoundException("Certains membres n'appartiennent pas à cette équipe");
    }

    await this.prisma.$transaction(
      reorderDto.items.map((item) =>
        this.prisma.teamMember.update({
          where: { id: item.id },
          data: { position: item.position },
        }),
      ),
    );

    return { message: 'Ordre des membres mis à jour avec succès' };
  }
}
