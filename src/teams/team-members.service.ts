import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { ReorderDto } from './dto/reorder.dto';
import { Prisma } from '../../generated/prisma';
import { generateMemberSlug, extractFilenameFromUrl } from './utils/team-slug.util';

@Injectable()
export class TeamMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

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

    // Generate slug if not provided
    const slug = createMemberDto.slug || generateMemberSlug(createMemberDto.name);

    return this.prisma.teamMember.create({
      data: {
        name: createMemberDto.name,
        realName: createMemberDto.realName,
        role: createMemberDto.role,
        image: createMemberDto.image,
        teamId,
        position: (maxPosition._max.position ?? -1) + 1,
        socials: createMemberDto.socials || {},
        nationality: createMemberDto.nationality,
        birthDate: createMemberDto.birthDate ? new Date(createMemberDto.birthDate) : undefined,
        biography: createMemberDto.biography,
        customFields: createMemberDto.customFields || {},
        slug,
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

      return this.prisma.teamMember.update({
        where: { id },
        data: buildMemberUpdateData(updateMemberDto),
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

  /**
   * Find member by slug with team information
   */
  async findBySlug(slug: string) {
    const member = await this.prisma.teamMember.findUnique({
      where: { slug },
      include: {
        team: true,
      },
    });

    if (!member) {
      throw new NotFoundException(`Membre avec le slug "${slug}" non trouvé`);
    }

    return member;
  }

  /**
   * Find single member by ID
   */
  async findOne(teamId: number, id: number) {
    const member = await this.prisma.teamMember.findUnique({
      where: { id },
      include: {
        team: true,
      },
    });

    if (!member) {
      throw new NotFoundException(`Membre #${id} non trouvé`);
    }

    if (member.teamId !== teamId) {
      throw new NotFoundException(`Membre #${id} n'appartient pas à l'équipe #${teamId}`);
    }

    return member;
  }
}

/**
 * Traduit le DTO de modification en patch Prisma.
 *
 * Chaque champ suit la meme regle : `undefined` signifie « non transmis, ne
 * pas toucher », toute autre valeur — `null` compris — signifie « ecrire
 * ceci ». C'est ce qui interdit d'utiliser un simple etalement du DTO, qui
 * effacerait en base tout champ absent de la requete.
 *
 * Extraite de `update` pour la meme raison : la methode enchainait les
 * verifications d'appartenance, cette dizaine de gardes et sa traduction
 * d'erreur Prisma, ce qui rendait illisible le peu qu'elle fait vraiment.
 */
export function buildMemberUpdateData(dto: UpdateMemberDto): Prisma.TeamMemberUpdateInput {
  const data: Prisma.TeamMemberUpdateInput = {};

  if (dto.name !== undefined) {
    data.name = dto.name;
    // Le slug suit le nom, sauf si l'appelant en impose un explicitement.
    if (dto.slug === undefined) {
      data.slug = generateMemberSlug(dto.name);
    }
  }
  if (dto.realName !== undefined) data.realName = dto.realName;
  if (dto.role !== undefined) data.role = dto.role;
  if (dto.image !== undefined) data.image = dto.image;
  if (dto.socials !== undefined) data.socials = dto.socials;
  if (dto.nationality !== undefined) data.nationality = dto.nationality;
  if (dto.birthDate !== undefined) {
    data.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
  }
  if (dto.biography !== undefined) data.biography = dto.biography;
  if (dto.customFields !== undefined) data.customFields = dto.customFields;
  if (dto.slug !== undefined) data.slug = dto.slug;

  return data;
}
