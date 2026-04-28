import { Prisma } from '../../../generated/prisma';
import { ArticlesQueryDto } from '../dto/articles-query.dto';

/**
 * Construit la clause WHERE Prisma pour la liste d'articles.
 * Fonction pure : pas de DI, pas d'effets de bord.
 */
export function buildArticleWhere(query: ArticlesQueryDto): Prisma.ArticleWhereInput {
  const { published, featured, typeId, search } = query;
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

  return where;
}
