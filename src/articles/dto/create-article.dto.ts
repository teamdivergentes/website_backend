import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateArticleDto {
  @IsString()
  @IsNotEmpty({ message: 'Le titre est obligatoire' })
  @MaxLength(500)
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Le contenu est obligatoire' })
  @MaxLength(500000)
  content: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  excerpt?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  imageUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  mobileImageUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
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
