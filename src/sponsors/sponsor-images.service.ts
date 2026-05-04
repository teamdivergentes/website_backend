import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../prisma.service';
import { UploadService } from '../upload/upload.service';
import { AddImageDto } from './dto/add-image.dto';

@Injectable()
export class SponsorImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * Extract filename from URL path
   */
  private extractFilename(url: string | null): string | null {
    if (!url) return null;
    const parts = url.split('/');
    return parts.at(-1) ?? null;
  }

  /**
   * Delete image file silently (don't fail if deletion fails)
   */
  async deleteImageSilently(url: string | null): Promise<void> {
    const filename = this.extractFilename(url);
    if (!filename) return;

    try {
      await this.uploadService.deleteImage(filename);
    } catch {
      // Silently ignore deletion errors
    }
  }

  /**
   * Add image to sponsor
   */
  async addImage(sponsorId: number, addImageDto: AddImageDto) {
    const maxPosition = await this.prisma.sponsorImage.aggregate({
      where: { sponsorId },
      _max: { position: true },
    });

    const position = (maxPosition._max.position ?? -1) + 1;

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
    try {
      const image = await this.prisma.sponsorImage.findFirst({
        where: { id: imageId, sponsorId },
      });

      if (!image) {
        throw new NotFoundException(`Image #${imageId} non trouvée`);
      }

      await this.prisma.sponsorImage.delete({
        where: { id: imageId, sponsorId },
      });

      await this.deleteImageSilently(image.url);

      return { message: 'Image supprimée avec succès' };
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Image #${imageId} non trouvée`);
      }
      throw error;
    }
  }

  /**
   * Set primary image for a sponsor
   */
  async setPrimaryImage(sponsorId: number, imageId: number) {
    const image = await this.prisma.sponsorImage.findFirst({
      where: { id: imageId, sponsorId },
    });

    if (!image) {
      throw new NotFoundException(`Image #${imageId} non trouvée pour ce sponsor`);
    }

    await this.prisma.sponsorImage.updateMany({
      where: { sponsorId, isPrimary: true },
      data: { isPrimary: false },
    });

    await this.prisma.sponsorImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    });

    return { message: 'Image principale définie avec succès' };
  }

  /**
   * Reorder images for a sponsor
   */
  async reorderImages(sponsorId: number, orderedIds: number[]) {
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
}
