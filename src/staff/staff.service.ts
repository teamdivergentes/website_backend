import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ReorderStaffDto } from './dto/reorder-staff.dto';

@Injectable()
export class StaffService {
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
  private async deleteImageSilently(url: string | null): Promise<void> {
    const filename = this.extractFilename(url);
    if (!filename) return;

    try {
      await this.uploadService.deleteImage(filename);
    } catch {
      // Silently ignore deletion errors
    }
  }

  async findAll() {
    return this.prisma.staffMember.findMany({
      orderBy: [{ category: 'asc' }, { position: 'asc' }],
    });
  }

  async findOne(id: number) {
    const staff = await this.prisma.staffMember.findUnique({
      where: { id },
    });

    if (!staff) {
      throw new NotFoundException(`Membre du staff #${id} non trouvé`);
    }

    return staff;
  }

  async create(createStaffDto: CreateStaffDto) {
    // Get max position for the category
    const maxPosition = await this.prisma.staffMember.aggregate({
      where: { category: createStaffDto.category },
      _max: { position: true },
    });

    return this.prisma.staffMember.create({
      data: {
        name: createStaffDto.name,
        role: createStaffDto.role,
        image: createStaffDto.image,
        category: createStaffDto.category,
        position: createStaffDto.position ?? (maxPosition._max?.position ?? -1) + 1,
        socials: createStaffDto.socials || {},
      },
    });
  }

  async update(id: number, updateStaffDto: UpdateStaffDto) {
    try {
      // Fetch existing entity to get old image
      const existing = await this.prisma.staffMember.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(`Membre du staff #${id} non trouvé`);
      }

      // If image is being updated and is different from existing, delete old image
      if (
        updateStaffDto.image !== undefined &&
        existing.image &&
        updateStaffDto.image !== existing.image
      ) {
        await this.deleteImageSilently(existing.image);
      }

      const updateData: any = {};
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (updateStaffDto.name !== undefined) updateData.name = updateStaffDto.name;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (updateStaffDto.role !== undefined) updateData.role = updateStaffDto.role;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (updateStaffDto.image !== undefined) updateData.image = updateStaffDto.image;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (updateStaffDto.category !== undefined) updateData.category = updateStaffDto.category;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (updateStaffDto.position !== undefined) updateData.position = updateStaffDto.position;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (updateStaffDto.socials !== undefined) updateData.socials = updateStaffDto.socials;

      const result = await this.prisma.staffMember.update({
        where: { id },
        data: updateData, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
      });
      return result;
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === 'P2025') {
        throw new NotFoundException(`Membre du staff #${id} non trouvé`);
      }
      throw error;
    }
  }

  async delete(id: number) {
    try {
      // Fetch entity to get image before deletion
      const existing = await this.prisma.staffMember.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(`Membre du staff #${id} non trouvé`);
      }

      // Delete from database
      await this.prisma.staffMember.delete({
        where: { id },
      });

      // Delete image file if exists
      if (existing.image) {
        await this.deleteImageSilently(existing.image);
      }
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === 'P2025') {
        throw new NotFoundException(`Membre du staff #${id} non trouvé`);
      }
      throw error;
    }
  }

  async reorder(reorderDto: ReorderStaffDto) {
    // Update positions in a transaction
    await this.prisma.$transaction(
      reorderDto.items.map((item) =>
        this.prisma.staffMember.update({
          where: { id: item.id },
          data: { position: item.position },
        }),
      ),
    );

    return { message: 'Ordre mis à jour avec succès' };
  }
}
