import { Module } from '@nestjs/common';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';
import { RecruitmentApplicationService } from './recruitment-application.service';
import { PrismaService } from '../prisma.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [RecruitmentController],
  providers: [RecruitmentService, RecruitmentApplicationService, PrismaService],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}
