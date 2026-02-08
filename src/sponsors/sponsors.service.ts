import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSponsorDto } from './dto/create-sponsor.dto';
import { UpdateSponsorDto } from './dto/update-sponsor.dto';
import { AddImageDto } from './dto/add-image.dto';
import { AddLinkDto } from './dto/add-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { ReorderSponsorsDto } from './dto/reorder.dto';
import { Prisma } from '../../generated/prisma';

@Injectable()
export class SponsorsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Get all active sponsors (public)
   */
  async findAllActive() {
    return this.prisma.sponsor.findMany({
      where: { active: true },
      include: {
        images: {
          orderBy: { position: 'asc' },
        },
        links: true,
      },
      orderBy: { position: 'asc' },
    });
  }

  /**
   * Get sponsor by slug (public)
   */
  async findBySlug(slug: string) {
    const sponsor = await this.prisma.sponsor.findUnique({
      where: { slug },
      include: {
        images: {
          orderBy: { position: 'asc' },
        },
        links: true,
      },
    });

    if (!sponsor) {
      throw new NotFoundException(`Sponsor avec le slug "${slug}" non trouvé`);
    }

    return sponsor;
  }

  /**
   * Get all sponsors (admin - includes inactive)
   */
  async findAll() {
    return this.prisma.sponsor.findMany({
      include: {
        images: {
          orderBy: { position: 'asc' },
        },
        links: true,
      },
      orderBy: { position: 'asc' },
    });
  }

  /**
   * Get sponsor by id
   */
  async findById(id: number) {
    const sponsor = await this.prisma.sponsor.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { position: 'asc' },
        },
        links: true,
      },
    });

    if (!sponsor) {
      throw new NotFoundException(`Sponsor #${id} non trouvé`);
    }

    return sponsor;
  }

  /**
   * Create a new sponsor
   */
  async create(createSponsorDto: CreateSponsorDto) {
    const slug = this.generateSlug(createSponsorDto.name);

    // Check if slug already exists
    const existing = await this.prisma.sponsor.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new BadRequestException(`Un sponsor avec le slug "${slug}" existe déjà`);
    }

    // Get max position
    const maxPosition = await this.prisma.sponsor.aggregate({
      _max: { position: true },
    });

    const position = (maxPosition._max.position ?? -1) + 1;

    return this.prisma.sponsor.create({
      data: {
        name: createSponsorDto.name,
        slug,
        description: createSponsorDto.description,
        position,
        imageLayout: createSponsorDto.imageLayout,
        startDate: createSponsorDto.startDate ? new Date(createSponsorDto.startDate) : null,
        endDate: createSponsorDto.endDate ? new Date(createSponsorDto.endDate) : null,
      },
      include: {
        images: true,
        links: true,
      },
    });
  }

  /**
   * Update sponsor
   */
  async update(id: number, updateSponsorDto: UpdateSponsorDto) {
    // Check if sponsor exists
    await this.findById(id);

    // If name is being changed, regenerate slug
    let slug: string | undefined;
    if (updateSponsorDto.name) {
      slug = this.generateSlug(updateSponsorDto.name);

      // Check for slug conflicts
      const existing = await this.prisma.sponsor.findUnique({
        where: { slug },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException(`Un sponsor avec le slug "${slug}" existe déjà`);
      }
    }

    try {
      return await this.prisma.sponsor.update({
        where: { id },
        data: {
          name: updateSponsorDto.name,
          slug,
          description: updateSponsorDto.description,
          imageLayout: updateSponsorDto.imageLayout,
          startDate: updateSponsorDto.startDate ? new Date(updateSponsorDto.startDate) : undefined,
          endDate: updateSponsorDto.endDate ? new Date(updateSponsorDto.endDate) : undefined,
        },
        include: {
          images: true,
          links: true,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Sponsor #${id} non trouvé`);
      }
      throw error;
    }
  }

  /**
   * Delete sponsor
   */
  async delete(id: number) {
    try {
      await this.prisma.sponsor.delete({
        where: { id },
      });

      return { message: 'Sponsor supprimé avec succès' };
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Sponsor #${id} non trouvé`);
      }
      throw error;
    }
  }

  /**
   * Toggle sponsor active status
   */
  async toggleActive(id: number) {
    const sponsor = await this.findById(id);

    return this.prisma.sponsor.update({
      where: { id },
      data: { active: !sponsor.active },
      include: {
        images: true,
        links: true,
      },
    });
  }

  /**
   * Reorder sponsors
   */
  async reorder(reorderDto: ReorderSponsorsDto) {
    await this.prisma.$transaction(
      reorderDto.orderedIds.map((id, index) =>
        this.prisma.sponsor.update({
          where: { id },
          data: { position: index },
        }),
      ),
    );

    return { message: 'Ordre des sponsors mis à jour avec succès' };
  }

  /**
   * Add image to sponsor
   */
  async addImage(sponsorId: number, addImageDto: AddImageDto) {
    // Verify sponsor exists
    await this.findById(sponsorId);

    // Get max position
    const maxPosition = await this.prisma.sponsorImage.aggregate({
      where: { sponsorId },
      _max: { position: true },
    });

    const position = (maxPosition._max.position ?? -1) + 1;

    // If isPrimary, unset other primary images
    if (addImageDto.isPrimary) {
      await this.prisma.sponsorImage.updateMany({
        where: { sponsorId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.sponsorImage.create({
      data: {
        url: addImageDto.url,
        alt: addImageDto.alt,
        isPrimary: addImageDto.isPrimary ?? false,
        position,
        sponsorId,
      },
    });
  }

  /**
   * Remove image from sponsor
   */
  async removeImage(sponsorId: number, imageId: number) {
    // Verify sponsor exists
    await this.findById(sponsorId);

    try {
      await this.prisma.sponsorImage.delete({
        where: { id: imageId, sponsorId },
      });

      return { message: 'Image supprimée avec succès' };
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Image #${imageId} non trouvée`);
      }
      throw error;
    }
  }

  /**
   * Set primary image
   */
  async setPrimaryImage(sponsorId: number, imageId: number) {
    // Verify sponsor exists
    await this.findById(sponsorId);

    // Verify image belongs to sponsor
    const image = await this.prisma.sponsorImage.findFirst({
      where: { id: imageId, sponsorId },
    });

    if (!image) {
      throw new NotFoundException(`Image #${imageId} non trouvée pour ce sponsor`);
    }

    // Unset all primary images
    await this.prisma.sponsorImage.updateMany({
      where: { sponsorId, isPrimary: true },
      data: { isPrimary: false },
    });

    // Set new primary
    await this.prisma.sponsorImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    });

    return { message: 'Image principale définie avec succès' };
  }

  /**
   * Reorder images
   */
  async reorderImages(sponsorId: number, orderedIds: number[]) {
    // Verify sponsor exists
    await this.findById(sponsorId);

    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.sponsorImage.update({
          where: { id, sponsorId },
          data: { position: index },
        }),
      ),
    );

    return { message: 'Ordre des images mis à jour avec succès' };
  }

  /**
   * Add link to sponsor
   */
  async addLink(sponsorId: number, addLinkDto: AddLinkDto) {
    // Verify sponsor exists
    await this.findById(sponsorId);

    // If isPrimary, unset other primary links
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
   * Update link
   */
  async updateLink(sponsorId: number, linkId: number, updateLinkDto: UpdateLinkDto) {
    // Verify sponsor exists
    await this.findById(sponsorId);

    // Verify link belongs to sponsor
    const link = await this.prisma.sponsorLink.findFirst({
      where: { id: linkId, sponsorId },
    });

    if (!link) {
      throw new NotFoundException(`Lien #${linkId} non trouvé pour ce sponsor`);
    }

    // If setting as primary, unset others
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
    // Verify sponsor exists
    await this.findById(sponsorId);

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
