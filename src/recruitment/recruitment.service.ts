import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateRecruitmentDto } from './dto/create-recruitment.dto';
import { UpdateRecruitmentDto } from './dto/update-recruitment.dto';
import { ReorderDto } from './dto/reorder.dto';
import { Prisma } from '../../generated/prisma';

@Injectable()
export class RecruitmentService {
  constructor(private prisma: PrismaService) {}

  private slugify(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip accents
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')     // non-alphanumeric → dash
      .replace(/^-+|-+$/g, '');        // trim leading/trailing dashes
  }

  private async generateUniqueSlug(title: string, excludeId?: number): Promise<string> {
    const baseSlug = this.slugify(title);
    let slug = baseSlug;
    let counter = 2;

    while (true) {
      const existing = await this.prisma.recruitmentPost.findUnique({
        where: { slug },
      });
      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  async findAllActive() {
    return this.prisma.recruitmentPost.findMany({
      where: { active: true },
      orderBy: { position: 'asc' },
    });
  }

  async findAll() {
    return this.prisma.recruitmentPost.findMany({
      orderBy: { position: 'asc' },
    });
  }

  async findOne(id: number) {
    const post = await this.prisma.recruitmentPost.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException(`Poste de recrutement #${id} non trouvé`);
    }

    return post;
  }

  async findBySlug(slug: string) {
    const post = await this.prisma.recruitmentPost.findUnique({
      where: { slug },
    });

    if (!post) {
      throw new NotFoundException(`Poste de recrutement '${slug}' non trouvé`);
    }

    return post;
  }

  async create(dto: CreateRecruitmentDto) {
    const maxPosition = await this.prisma.recruitmentPost.aggregate({
      _max: { position: true },
    });

    const position = (maxPosition._max.position ?? -1) + 1;
    const slug = dto.slug || await this.generateUniqueSlug(dto.title);

    return this.prisma.recruitmentPost.create({
      data: {
        title: dto.title,
        type: dto.type,
        description: dto.description,
        image: dto.image,
        active: dto.active ?? true,
        position,
        slug,
        location: dto.location,
        duration: dto.duration,
        missions: dto.missions,
        skills: dto.skills,
        requirements: dto.requirements,
        benefits: dto.benefits,
      },
    });
  }

  async update(id: number, dto: UpdateRecruitmentDto) {
    await this.findOne(id);

    // If title changed and no explicit slug, regenerate slug
    let slug = dto.slug;
    if (dto.title && !dto.slug) {
      slug = await this.generateUniqueSlug(dto.title, id);
    }

    try {
      return await this.prisma.recruitmentPost.update({
        where: { id },
        data: {
          title: dto.title,
          type: dto.type,
          description: dto.description,
          image: dto.image,
          active: dto.active,
          slug,
          location: dto.location,
          duration: dto.duration,
          missions: dto.missions,
          skills: dto.skills,
          requirements: dto.requirements,
          benefits: dto.benefits,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Poste de recrutement #${id} non trouvé`);
      }
      throw error;
    }
  }

  async delete(id: number) {
    try {
      await this.prisma.recruitmentPost.delete({
        where: { id },
      });

      return { message: 'Poste de recrutement supprimé avec succès' };
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Poste de recrutement #${id} non trouvé`);
      }
      throw error;
    }
  }

  async toggleActive(id: number) {
    const post = await this.findOne(id);

    return this.prisma.recruitmentPost.update({
      where: { id },
      data: { active: !post.active },
    });
  }

  async reorder(dto: ReorderDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.recruitmentPost.update({
          where: { id: item.id },
          data: { position: item.position },
        }),
      ),
    );

    return { message: 'Ordre des postes mis à jour avec succès' };
  }
}
