import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateArticleDto {
  @IsString()
  @IsNotEmpty({ message: 'Le titre est obligatoire' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Le contenu est obligatoire' })
  content: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  mobileImageUrl?: string;

  @IsString()
  @IsOptional()
  tabletImageUrl?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  published?: boolean;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  featured?: boolean;

  @IsInt({ message: 'Le type est obligatoire' })
  @Min(1)
  @Type(() => Number)
  typeId: number;
}
