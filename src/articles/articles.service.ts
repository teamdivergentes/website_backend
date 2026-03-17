import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticlesQueryDto } from './dto/articles-query.dto';
import slugify from 'slugify';

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

  private async generateUniqueSlug(title: string, excludeId?: number): Promise<string> {
    const baseSlug = slugify(title, { lower: true, strict: true, locale: 'fr' });
    let slug = baseSlug;
    let counter = 2;

    while (true) {
      const existing = await this.prisma.article.findUnique({ where: { slug } });
      if (!existing || (excludeId !== undefined && existing.id === excludeId)) {
        return slug;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  async findAll(query: ArticlesQueryDto): Promise<PaginatedResponse<unknown>> {
    const { page = 1, limit = 20, published, featured, typeId, search } = query;

    const where: Prisma.ArticleWhereInput = {};

    if (published !== undefined) {
      where.published = published;
    }
    if (featured !== undefined) {
      where.featured = featured;
    }
    if (typeId !== undefined) {
      where.typeId = typeId;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        include: {
          type: true,
          user: { select: { id: true, email: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data: articles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findHomepage(): Promise<unknown[]> {
    const featured = await this.prisma.article.findMany({
      where: { published: true, featured: true },
      include: {
        type: true,
        user: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (featured.length >= 3) {
      return featured.slice(0, 3);
    }

    const remaining = 3 - featured.length;
    const featuredIds = featured.map((a) => a.id);

    const recent = await this.prisma.article.findMany({
      where: {
        published: true,
        featured: false,
        id: { notIn: featuredIds.length > 0 ? featuredIds : undefined },
      },
      include: {
        type: true,
        user: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: remaining,
    });

    return [...featured, ...recent];
  }

  async findBySlug(slug: string): Promise<unknown> {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        type: true,
        user: { select: { id: true, email: true } },
      },
    });

    if (!article) {
      throw new NotFoundException(`Article '${slug}' non trouvé`);
    }

    return article;
  }

  async findOne(id: number): Promise<unknown> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        type: true,
        user: { select: { id: true, email: true } },
      },
    });

    if (!article) {
      throw new NotFoundException(`Article #${id} non trouvé`);
    }

    return article;
  }

  async create(dto: CreateArticleDto, userId: number): Promise<unknown> {
    const slug = await this.generateUniqueSlug(dto.title);

    try {
      return await this.prisma.article.create({
        data: {
          title: dto.title,
          slug,
          content: dto.content,
          excerpt: dto.excerpt,
          imageUrl: dto.imageUrl,
          mobileImageUrl: dto.mobileImageUrl,
          tabletImageUrl: dto.tabletImageUrl,
          published: dto.published ?? false,
          featured: dto.featured ?? false,
          typeId: dto.typeId,
          userId,
        },
        include: {
          type: true,
          user: { select: { id: true, email: true } },
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new NotFoundException('Type d\'article non trouvé');
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateArticleDto): Promise<unknown> {
    const existing = await this.prisma.article.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Article #${id} non trouvé`);
    }

    let slug = dto.slug;
    if (dto.title && !dto.slug) {
      slug = await this.generateUniqueSlug(dto.title, id);
    }

    try {
      return await this.prisma.article.update({
        where: { id },
        data: {
          title: dto.title,
          slug,
          content: dto.content,
          excerpt: dto.excerpt,
          imageUrl: dto.imageUrl,
          mobileImageUrl: dto.mobileImageUrl,
          tabletImageUrl: dto.tabletImageUrl,
          published: dto.published,
          featured: dto.featured,
          typeId: dto.typeId,
        },
        include: {
          type: true,
          user: { select: { id: true, email: true } },
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Article #${id} non trouvé`);
        }
        if (error.code === 'P2003') {
          throw new NotFoundException('Type d\'article non trouvé');
        }
      }
      throw error;
    }
  }

  async delete(id: number): Promise<{ message: string }> {
    try {
      await this.prisma.article.delete({ where: { id } });
      return { message: 'Article supprimé avec succès' };
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Article #${id} non trouvé`);
      }
      throw error;
    }
  }

  async togglePublished(id: number): Promise<unknown> {
    const article = await this.prisma.article.findUnique({ where: { id } });

    if (!article) {
      throw new NotFoundException(`Article #${id} non trouvé`);
    }

    return this.prisma.article.update({
      where: { id },
      data: { published: !article.published },
      include: {
        type: true,
        user: { select: { id: true, email: true } },
      },
    });
  }

  async toggleFeatured(id: number): Promise<unknown> {
    const article = await this.prisma.article.findUnique({ where: { id } });

    if (!article) {
      throw new NotFoundException(`Article #${id} non trouvé`);
    }

    return this.prisma.article.update({
      where: { id },
      data: { featured: !article.featured },
      include: {
        type: true,
        user: { select: { id: true, email: true } },
      },
    });
  }
}
