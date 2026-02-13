import { Module } from '@nestjs/common';
import { SponsorsController } from './sponsors.controller';
import { SponsorsService } from './sponsors.service';
import { PrismaService } from '../prisma.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [SponsorsController],
  providers: [SponsorsService, PrismaService],
  exports: [SponsorsService],
})
export class SponsorsModule {}
