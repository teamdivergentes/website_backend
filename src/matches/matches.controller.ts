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
import { Throttle } from '@nestjs/throttler';
import { MatchesService, MatchFilters } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { Public } from '../auth/decorators/public.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { parseOptionalIntegerQueryParam } from '../common/utils/query-params';

const VALID_STATUSES = ['upcoming', 'past'] as const;
type MatchStatus = (typeof VALID_STATUSES)[number];

@Controller()
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  // ─── Routes publiques ──────────────────────────────────────────────────────

  @Get('api/matches')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  findAllPublic(
    @Query('teamId') teamId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: MatchFilters = {};

    const parsedTeamId = parseOptionalIntegerQueryParam(
      teamId,
      'Le paramètre teamId doit être un entier valide',
    );
    if (parsedTeamId !== undefined) {
      filters.teamId = parsedTeamId;
    }

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status as MatchStatus)) {
        throw new BadRequestException(
          'Le paramètre status est invalide (valeurs acceptées : upcoming, past)',
        );
      }
      filters.status = status as MatchStatus;
    }

    const parsedLimit = parseOptionalIntegerQueryParam(
      limit,
      'Le paramètre limit doit être un entier ≥ 1',
      { min: 1 },
    );
    if (parsedLimit !== undefined) {
      filters.limit = parsedLimit;
    }

    return this.matchesService.findAllPublic(filters);
  }

  // ─── Routes admin ──────────────────────────────────────────────────────────

  @Get('api/admin/matches')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.MATCHES_READ)
  findAllAdmin() {
    return this.matchesService.findAllAdmin();
  }

  @Post('api/admin/matches')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.MATCHES_WRITE)
  create(@Body() dto: CreateMatchDto) {
    return this.matchesService.create(dto);
  }

  @Patch('api/admin/matches/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.MATCHES_WRITE)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMatchDto) {
    return this.matchesService.update(id, dto);
  }

  @Delete('api/admin/matches/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.MATCHES_DELETE)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.matchesService.delete(id);
  }
}
