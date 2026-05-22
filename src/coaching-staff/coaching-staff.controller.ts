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
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { Public } from '../auth/decorators/public.decorator';

@Controller()
export class CoachingStaffController {
  constructor(private readonly coachingStaffService: CoachingStaffService) {}

  // ─── Routes publiques ──────────────────────────────────────────────────────

  @Get('api/coaching-staff/by-slug/:slug')
  @Public()
  @SkipThrottle()
  findBySlug(@Param('slug') slug: string) {
    return this.coachingStaffService.findBySlug(slug);
  }

  @Get('api/teams/:teamId/coaching-staff')
  @Public()
  @SkipThrottle()
  findByTeamPublic(@Param('teamId', ParseIntPipe) teamId: number) {
    return this.coachingStaffService.findByTeam(teamId);
  }

  // ─── Routes admin ──────────────────────────────────────────────────────────

  @Get('api/admin/teams/:teamId/coaching-staff')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.COACHING_STAFF_READ)
  findByTeamAdmin(@Param('teamId', ParseIntPipe) teamId: number) {
    return this.coachingStaffService.findByTeam(teamId);
  }

  @Post('api/admin/teams/:teamId/coaching-staff')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.COACHING_STAFF_WRITE)
  create(@Param('teamId', ParseIntPipe) teamId: number, @Body() dto: CreateCoachingStaffDto) {
    return this.coachingStaffService.create(teamId, dto);
  }

  @Patch('api/admin/teams/:teamId/coaching-staff/reorder')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.COACHING_STAFF_WRITE)
  reorder(@Param('teamId', ParseIntPipe) teamId: number, @Body() dto: ReorderCoachingStaffDto) {
    return this.coachingStaffService.reorder(teamId, dto);
  }

  @Patch('api/admin/teams/:teamId/coaching-staff/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.COACHING_STAFF_WRITE)
  update(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCoachingStaffDto,
  ) {
    return this.coachingStaffService.update(teamId, id, dto);
  }

  @Delete('api/admin/teams/:teamId/coaching-staff/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.COACHING_STAFF_DELETE)
  delete(@Param('teamId', ParseIntPipe) teamId: number, @Param('id', ParseIntPipe) id: number) {
    return this.coachingStaffService.delete(teamId, id);
  }
}
