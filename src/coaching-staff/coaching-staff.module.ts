import { Module } from '@nestjs/common';
import { CoachingStaffController } from './coaching-staff.controller';
import { CoachingStaffService } from './coaching-staff.service';
import { PrismaService } from '../prisma.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [CoachingStaffController],
  providers: [CoachingStaffService, PrismaService],
  exports: [CoachingStaffService],
})
export class CoachingStaffModule {}
