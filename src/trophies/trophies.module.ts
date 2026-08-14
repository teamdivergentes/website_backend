import { Module } from '@nestjs/common';
import { TrophiesController } from './trophies.controller';
import { TrophiesService } from './trophies.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [TrophiesController],
  providers: [TrophiesService, PrismaService],
  exports: [TrophiesService],
})
export class TrophiesModule {}
