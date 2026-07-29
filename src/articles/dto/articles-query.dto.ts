import { IsOptional, IsBoolean, IsIn, IsInt, IsString, Min, Max, MaxLength } from 'class-validator';
import { Type, Transform } from 'class-transformer';

/** Colonnes autorisees au tri. Toute autre valeur est rejetee par le DTO. */
export const ARTICLE_SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'title'] as const;

export type ArticleSortField = (typeof ARTICLE_SORTABLE_FIELDS)[number];

export class ArticlesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }: { value: string }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @Transform(({ value }: { value: string }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  typeId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  /**
   * Colonne de tri. Liste blanche stricte : la valeur alimente directement le
   * `orderBy` Prisma, une valeur libre permettrait de trier sur n'importe quel
   * champ du modele.
   */
  @IsOptional()
  @IsIn(ARTICLE_SORTABLE_FIELDS)
  sortBy?: ArticleSortField;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
