import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticlesQueryDto } from './dto/articles-query.dto';
import { Public } from '../auth/decorators/public.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface RequestWithUser extends Request {
  user: { id: number; email: string };
}

@Controller('api/articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Public()
  @Get()
  findAll(@Query() query: ArticlesQueryDto) {
    return this.articlesService.findAll(query);
  }

  @Public()
  @Get('homepage')
  findHomepage() {
    return this.articlesService.findHomepage();
  }

  @Get('by-id/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'cm')
  findOneById(@Param('id', ParseIntPipe) id: number) {
    return this.articlesService.findOne(id);
  }

  @Public()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.articlesService.findBySlug(slug);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'cm')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  create(@Body() dto: CreateArticleDto, @Request() req: RequestWithUser) {
    return this.articlesService.create(dto, req.user.id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'cm')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateArticleDto) {
    return this.articlesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.articlesService.delete(id);
  }

  @Patch(':id/toggle')
  @UseGuards(RolesGuard)
  @Roles('admin', 'cm')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  togglePublished(@Param('id', ParseIntPipe) id: number) {
    return this.articlesService.togglePublished(id);
  }

  @Patch(':id/featured')
  @UseGuards(RolesGuard)
  @Roles('admin', 'cm')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  toggleFeatured(@Param('id', ParseIntPipe) id: number) {
    return this.articlesService.toggleFeatured(id);
  }
}
