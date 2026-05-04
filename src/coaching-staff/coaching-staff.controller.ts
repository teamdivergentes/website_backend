import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { CoachingStaffService } from './coaching-staff.service';
import { CreateCoachingStaffDto } from './dto/create-coaching-staff.dto';
import { UpdateCoachingStaffDto } from './dto/update-coaching-staff.dto';
import { ReorderCoachingStaffDto } from './dto/reorder-coaching-staff.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller()
export class CoachingStaffController {
  constructor(private readonly coachingStaffService: CoachingStaffService) {}

  // ─── Routes publiques ──────────────────────────────────────────────────────

  @Get('api/teams/:teamId/coaching-staff')
  @Public()
  @SkipThrottle()
  findByTeamPublic(@Param('teamId', ParseIntPipe) teamId: number) {
    return this.coachingStaffService.findByTeam(teamId);
  }

  // ─── Routes admin ──────────────────────────────────────────────────────────

  @Get('api/admin/teams/:teamId/coaching-staff')
  @UseGuards(RolesGuard)
  @Roles('admin', 'gestionnaire')
  findByTeamAdmin(@Param('teamId', ParseIntPipe) teamId: number) {
    return this.coachingStaffService.findByTeam(teamId);
  }

  @Post('api/admin/teams/:teamId/coaching-staff')
  @UseGuards(RolesGuard)
  @Roles('admin', 'gestionnaire')
  create(@Param('teamId', ParseIntPipe) teamId: number, @Body() dto: CreateCoachingStaffDto) {
    return this.coachingStaffService.create(teamId, dto);
  }

  @Patch('api/admin/teams/:teamId/coaching-staff/reorder')
  @UseGuards(RolesGuard)
  @Roles('admin', 'gestionnaire')
  reorder(@Param('teamId', ParseIntPipe) teamId: number, @Body() dto: ReorderCoachingStaffDto) {
    return this.coachingStaffService.reorder(teamId, dto);
  }

  @Patch('api/admin/coaching-staff/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'gestionnaire')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCoachingStaffDto) {
    return this.coachingStaffService.update(id, dto);
  }

  @Delete('api/admin/coaching-staff/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'gestionnaire')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.coachingStaffService.delete(id);
  }
}
