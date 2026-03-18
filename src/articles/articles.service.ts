import {
  Injectable,
  NotFoundException,
  ConflictException,
  HttpException,
  BadGatewayException,
} from '@nestjs/common';
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
    const maxIterations = 100;

    while (counter <= maxIterations + 1) {
      const existing = await this.prisma.article.findUnique({ where: { slug } });
      if (!existing || (excludeId !== undefined && existing.id === excludeId)) {
        return slug;
      }
      if (counter > maxIterations) {
        throw new ConflictException('Impossible de générer un slug unique pour ce titre');
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    throw new ConflictException('Impossible de générer un slug unique pour ce titre');
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

    try {
      const [articles, total] = await Promise.all([
        this.prisma.article.findMany({
          where,
          include: {
            type: true,
            user: { select: { id: true } },
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
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadGatewayException('Erreur lors de la récupération des articles');
    }
  }

  async findHomepage(): Promise<unknown[]> {
    try {
      const featured = await this.prisma.article.findMany({
        where: { published: true, featured: true },
        include: {
          type: true,
          user: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });

      if (featured.length >= 3) {
        return featured;
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
          user: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: remaining,
      });

      return [...featured, ...recent];
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadGatewayException('Erreur lors de la récupération des articles homepage');
    }
  }

  async findBySlug(slug: string): Promise<unknown> {
    try {
      const article = await this.prisma.article.findUnique({
        where: { slug },
        include: {
          type: true,
          user: { select: { id: true } },
        },
      });

      if (!article) {
        throw new NotFoundException('Article non trouvé');
      }

      return article;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadGatewayException("Erreur lors de la récupération de l'article");
    }
  }

  async findOne(id: number): Promise<unknown> {
    try {
      const article = await this.prisma.article.findUnique({
        where: { id },
        include: {
          type: true,
          user: { select: { id: true, email: true } },
        },
      });

      if (!article) {
        throw new NotFoundException('Article non trouvé');
      }

      return article;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadGatewayException("Erreur lors de la récupération de l'article");
    }
  }

  async create(dto: CreateArticleDto, userId: number): Promise<unknown> {
    try {
      const slug = await this.generateUniqueSlug(dto.title);

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
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new NotFoundException("Type d'article non trouvé");
      }
      throw new BadGatewayException("Erreur lors de la création de l'article");
    }
  }

  async update(id: number, dto: UpdateArticleDto): Promise<unknown> {
    try {
      const existing = await this.prisma.article.findUnique({ where: { id } });

      if (!existing) {
        throw new NotFoundException('Article non trouvé');
      }

      let slug = dto.slug || undefined;
      if (dto.title && !dto.slug) {
        slug = await this.generateUniqueSlug(dto.title, id);
      }

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
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Article non trouvé');
        }
        if (error.code === 'P2003') {
          throw new NotFoundException("Type d'article non trouvé");
        }
      }
      throw new BadGatewayException("Erreur lors de la mise à jour de l'article");
    }
  }

  async delete(id: number): Promise<{ message: string }> {
    try {
      await this.prisma.article.delete({ where: { id } });
      return { message: 'Article supprimé avec succès' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Article non trouvé');
      }
      throw new BadGatewayException("Erreur lors de la suppression de l'article");
    }
  }

  async togglePublished(id: number): Promise<unknown> {
    try {
      const article = await this.prisma.article.findUnique({ where: { id } });

      if (!article) {
        throw new NotFoundException('Article non trouvé');
      }

      return await this.prisma.article.update({
        where: { id },
        data: { published: !article.published },
        include: {
          type: true,
          user: { select: { id: true, email: true } },
        },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadGatewayException('Erreur lors du changement de statut de publication');
    }
  }

  async toggleFeatured(id: number): Promise<unknown> {
    try {
      const article = await this.prisma.article.findUnique({ where: { id } });

      if (!article) {
        throw new NotFoundException('Article non trouvé');
      }

      return await this.prisma.article.update({
        where: { id },
        data: { featured: !article.featured },
        include: {
          type: true,
          user: { select: { id: true, email: true } },
        },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadGatewayException('Erreur lors du changement de statut featured');
    }
  }
}
