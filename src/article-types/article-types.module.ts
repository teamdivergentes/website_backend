import { Module } from '@nestjs/common';
import { ArticleTypesController } from './article-types.controller';
import { ArticleTypesService } from './article-types.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ArticleTypesController],
  providers: [ArticleTypesService, PrismaService],
  exports: [ArticleTypesService],
})
export class ArticleTypesModule {}
