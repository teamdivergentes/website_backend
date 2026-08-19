import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../prisma.service';
import { SponsorImagesService } from './sponsor-images.service';
import { CreateSponsorDto } from './dto/create-sponsor.dto';
import { UpdateSponsorDto } from './dto/update-sponsor.dto';
import { ReorderSponsorsDto } from './dto/reorder.dto';
import { trimChar } from '../common/utils/trim-char.util';

@Injectable()
export class SponsorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sponsorImagesService: SponsorImagesService,
  ) {}

  /**
   * Generate slug from name
   */
  private generateSlug(name: string): string {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replaceAll(/[̀-ͯ]/g, '')
      .replaceAll(/[^a-z0-9]+/g, '-');
    return trimChar(slug, '-');
  }

  /**
   * Get all active sponsors (public)
   */
  async findAllActive() {
    return this.prisma.sponsor.findMany({
      where: { active: true },
      include: {
        images: { orderBy: { position: 'asc' } },
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
        images: { orderBy: { position: 'asc' } },
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
        images: { orderBy: { position: 'asc' } },
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
        images: { orderBy: { position: 'asc' } },
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

    const existing = await this.prisma.sponsor.findUnique({ where: { slug } });

    if (existing) {
      throw new BadRequestException(`Un sponsor avec le slug "${slug}" existe déjà`);
    }

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
      include: { images: true, links: true },
    });
  }

  /**
   * Update sponsor
   */
  async update(id: number, updateSponsorDto: UpdateSponsorDto) {
    await this.findById(id);

    let slug: string | undefined;
    if (updateSponsorDto.name) {
      slug = this.generateSlug(updateSponsorDto.name);

      const existing = await this.prisma.sponsor.findUnique({ where: { slug } });

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
        include: { images: true, links: true },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Sponsor #${id} non trouvé`);
      }
      throw error;
    }
  }

  /**
   * Delete sponsor (cascade deletes images and links via Prisma)
   */
  async delete(id: number) {
    try {
      const sponsor = await this.prisma.sponsor.findUnique({
        where: { id },
        include: { images: true },
      });

      if (!sponsor) {
        throw new NotFoundException(`Sponsor #${id} non trouvé`);
      }

      await this.prisma.sponsor.delete({ where: { id } });

      for (const image of sponsor.images) {
        await this.sponsorImagesService.deleteImageSilently(image.url);
      }

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
      include: { images: true, links: true },
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
}
