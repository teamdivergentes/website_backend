import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { TeamMembersService } from './team-members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { ReorderDto } from './dto/reorder.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('api/teams/:teamId/members')
export class TeamMembersController {
  constructor(private readonly teamMembersService: TeamMembersService) {}

  @Get()
  @Public()
  @SkipThrottle()
  findByTeam(@Param('teamId', ParseIntPipe) teamId: number) {
    return this.teamMembersService.findByTeam(teamId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Param('teamId', ParseIntPipe) teamId: number, @Body() createMemberDto: CreateMemberDto) {
    return this.teamMembersService.create(teamId, createMemberDto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMemberDto: UpdateMemberDto,
  ) {
    return this.teamMembersService.update(teamId, id, updateMemberDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  delete(@Param('teamId', ParseIntPipe) teamId: number, @Param('id', ParseIntPipe) id: number) {
    return this.teamMembersService.delete(teamId, id);
  }

  @Patch('reorder')
  @UseGuards(RolesGuard)
  @Roles('admin')
  reorder(@Param('teamId', ParseIntPipe) teamId: number, @Body() reorderDto: ReorderDto) {
    return this.teamMembersService.reorder(teamId, reorderDto);
  }
}
