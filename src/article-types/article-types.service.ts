import {
  Injectable,
  NotFoundException,
  ConflictException,
  HttpException,
  BadGatewayException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateArticleTypeDto } from './dto/create-article-type.dto';
import { UpdateArticleTypeDto } from './dto/update-article-type.dto';

@Injectable()
export class ArticleTypesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lister tous les types d'articles ordonnés par nom
   */
  async findAll() {
    try {
      return await this.prisma.articleType.findMany({
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadGatewayException("Erreur lors de la récupération des types d'articles");
    }
  }

  /**
   * Récupérer un type d'article par son id
   */
  async findById(id: number) {
    try {
      const articleType = await this.prisma.articleType.findUnique({
        where: { id },
      });

      if (!articleType) {
        throw new NotFoundException(`Type d'article #${id} non trouvé`);
      }

      return articleType;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadGatewayException("Erreur lors de la récupération du type d'article");
    }
  }

  /**
   * Créer un type d'article (name unique)
   */
  async create(createArticleTypeDto: CreateArticleTypeDto) {
    try {
      const existing = await this.prisma.articleType.findUnique({
        where: { name: createArticleTypeDto.name },
      });

      if (existing) {
        throw new ConflictException(
          `Un type d'article avec le nom "${createArticleTypeDto.name}" existe déjà`,
        );
      }

      return await this.prisma.articleType.create({
        data: { name: createArticleTypeDto.name },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadGatewayException("Erreur lors de la création du type d'article");
    }
  }

  /**
   * Modifier un type d'article (vérification unicité du name)
   */
  async update(id: number, updateArticleTypeDto: UpdateArticleTypeDto) {
    try {
      const existing = await this.prisma.articleType.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(`Type d'article #${id} non trouvé`);
      }

      if (updateArticleTypeDto.name && updateArticleTypeDto.name !== existing.name) {
        const nameConflict = await this.prisma.articleType.findUnique({
          where: { name: updateArticleTypeDto.name },
        });

        if (nameConflict) {
          throw new ConflictException(
            `Un type d'article avec le nom "${updateArticleTypeDto.name}" existe déjà`,
          );
        }
      }

      return await this.prisma.articleType.update({
        where: { id },
        data: { name: updateArticleTypeDto.name },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadGatewayException("Erreur lors de la modification du type d'article");
    }
  }

  /**
   * Supprimer un type d'article — empêché si des articles sont liés
   */
  async delete(id: number) {
    try {
      const existing = await this.prisma.articleType.findUnique({
        where: { id },
        include: { _count: { select: { articles: true } } },
      });

      if (!existing) {
        throw new NotFoundException(`Type d'article #${id} non trouvé`);
      }

      if (existing._count.articles > 0) {
        throw new ConflictException(
          `Impossible de supprimer ce type d'article : ${existing._count.articles} article(s) y sont associés`,
        );
      }

      await this.prisma.articleType.delete({
        where: { id },
      });

      return { message: "Type d'article supprimé avec succès" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadGatewayException("Erreur lors de la suppression du type d'article");
    }
  }
}
