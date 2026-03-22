import { PartialType } from '@nestjs/mapped-types';
import { CreateArticleTypeDto } from './create-article-type.dto';

export class UpdateArticleTypeDto extends PartialType(CreateArticleTypeDto) {}
