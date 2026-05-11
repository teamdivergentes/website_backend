import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../prisma.service';
import { AddLinkDto } from './dto/add-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';

@Injectable()
export class SponsorLinksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Add link to sponsor
   */
  async addLink(sponsorId: number, addLinkDto: AddLinkDto) {
    if (addLinkDto.isPrimary) {
      await this.prisma.sponsorLink.updateMany({
        where: { sponsorId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.sponsorLink.create({
      data: {
        url: addLinkDto.url,
        label: addLinkDto.label,
        type: addLinkDto.type,
        isPrimary: addLinkDto.isPrimary ?? false,
        sponsorId,
      },
    });
  }

  /**
   * Update link for a sponsor
   */
  async updateLink(sponsorId: number, linkId: number, updateLinkDto: UpdateLinkDto) {
    const link = await this.prisma.sponsorLink.findFirst({
      where: { id: linkId, sponsorId },
    });

    if (!link) {
      throw new NotFoundException(`Lien #${linkId} non trouvé pour ce sponsor`);
    }

    if (updateLinkDto.isPrimary) {
      await this.prisma.sponsorLink.updateMany({
        where: { sponsorId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    try {
      return await this.prisma.sponsorLink.update({
        where: { id: linkId },
        data: {
          url: updateLinkDto.url,
          label: updateLinkDto.label,
          type: updateLinkDto.type,
          isPrimary: updateLinkDto.isPrimary,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Lien #${linkId} non trouvé`);
      }
      throw error;
    }
  }

  /**
   * Remove link from sponsor
   */
  async removeLink(sponsorId: number, linkId: number) {
    try {
      await this.prisma.sponsorLink.delete({
        where: { id: linkId, sponsorId },
      });

      return { message: 'Lien supprimé avec succès' };
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Lien #${linkId} non trouvé`);
      }
      throw error;
    }
  }
}
