import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller';
import { TeamMembersController } from './team-members.controller';
import { TeamsService } from './teams.service';
import { TeamMembersService } from './team-members.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [TeamsController, TeamMembersController],
  providers: [TeamsService, TeamMembersService, PrismaService],
  exports: [TeamsService, TeamMembersService],
})
export class TeamsModule {}
