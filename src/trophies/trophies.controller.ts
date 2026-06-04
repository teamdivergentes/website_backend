import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { TrophiesService, TrophyFilters } from './trophies.service';
import { CreateTrophyDto } from './dto/create-trophy.dto';
import { UpdateTrophyDto } from './dto/update-trophy.dto';
import { Public } from '../auth/decorators/public.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';

@Controller()
export class TrophiesController {
  constructor(private readonly trophiesService: TrophiesService) {}

  // ─── Routes publiques ──────────────────────────────────────────────────────

  @Get('api/trophies')
  @Public()
  @SkipThrottle()
  findAllPublic(@Query('featured') featured?: string, @Query('teamId') teamId?: string) {
    const filters: TrophyFilters = {};
    if (featured !== undefined) {
      filters.featured = featured === 'true';
    }
    if (teamId !== undefined) {
      const parsed = Number.parseInt(teamId, 10);
      if (Number.isNaN(parsed)) {
        throw new BadRequestException('Le paramètre teamId doit être un entier valide');
      }
      filters.teamId = parsed;
    }
    return this.trophiesService.findAllPublic(filters);
  }

  // ─── Routes admin ──────────────────────────────────────────────────────────

  @Get('api/admin/trophies')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.TROPHIES_READ)
  findAllAdmin() {
    return this.trophiesService.findAllAdmin();
  }

  @Post('api/admin/trophies')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.TROPHIES_WRITE)
  create(@Body() dto: CreateTrophyDto) {
    return this.trophiesService.create(dto);
  }

  @Patch('api/admin/trophies/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.TROPHIES_WRITE)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTrophyDto) {
    return this.trophiesService.update(id, dto);
  }

  @Delete('api/admin/trophies/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.TROPHIES_DELETE)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.trophiesService.delete(id);
  }
}
