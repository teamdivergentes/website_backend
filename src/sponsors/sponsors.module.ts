import { Module } from '@nestjs/common';
import { SponsorsController } from './sponsors.controller';
import { SponsorsService } from './sponsors.service';
import { SponsorImagesService } from './sponsor-images.service';
import { SponsorLinksService } from './sponsor-links.service';
import { PrismaService } from '../prisma.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [SponsorsController],
  providers: [SponsorsService, SponsorImagesService, SponsorLinksService, PrismaService],
  exports: [SponsorsService, SponsorImagesService, SponsorLinksService],
})
export class SponsorsModule {}
