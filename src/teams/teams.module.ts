import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller';
import { TeamMembersController } from './team-members.controller';
import { MembersController } from './members.controller';
import { TeamsService } from './teams.service';
import { TeamMembersService } from './team-members.service';
import { PrismaService } from '../prisma.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [TeamsController, TeamMembersController, MembersController],
  providers: [TeamsService, TeamMembersService, PrismaService],
  exports: [TeamsService, TeamMembersService],
})
export class TeamsModule {}
