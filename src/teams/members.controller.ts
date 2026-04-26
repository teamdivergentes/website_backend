import { Controller, Get, Param } from '@nestjs/common';
import { TeamMembersService } from './team-members.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('api/members')
export class MembersController {
  constructor(private readonly teamMembersService: TeamMembersService) {}

  @Get('by-slug/:slug')
  @Public()
  findBySlug(@Param('slug') slug: string) {
    return this.teamMembersService.findBySlug(slug);
  }
}
