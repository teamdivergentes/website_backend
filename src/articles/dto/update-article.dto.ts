import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional, Matches, MaxLength, MinLength } from 'class-validator';
import { CreateArticleDto } from './create-article.dto';

export class UpdateArticleDto extends PartialType(CreateArticleDto) {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(500)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets',
  })
  slug?: string;
}
