import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ArticleTypesService } from './article-types.service';
import { CreateArticleTypeDto } from './dto/create-article-type.dto';
import { UpdateArticleTypeDto } from './dto/update-article-type.dto';
import { Public } from '../auth/decorators/public.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/article-types')
export class ArticleTypesController {
  constructor(private readonly articleTypesService: ArticleTypesService) {}

  /**
   * GET /api/article-types - Liste tous les types d'articles (public)
   */
  @Public()
  @SkipThrottle()
  @Get()
  findAll() {
    return this.articleTypesService.findAll();
  }

  /**
   * POST /api/article-types - Crée un type d'article (admin)
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() createArticleTypeDto: CreateArticleTypeDto) {
    return this.articleTypesService.create(createArticleTypeDto);
  }

  /**
   * PATCH /api/article-types/:id - Modifie un type d'article (admin)
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateArticleTypeDto: UpdateArticleTypeDto,
  ) {
    return this.articleTypesService.update(id, updateArticleTypeDto);
  }

  /**
   * DELETE /api/article-types/:id - Supprime un type d'article (admin)
   * Retourne 409 Conflict si des articles sont liés
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.articleTypesService.delete(id);
  }
}
