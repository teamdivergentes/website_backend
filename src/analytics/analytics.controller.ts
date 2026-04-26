import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto, TopPagesQueryDto } from './dto/analytics-query.dto';

// JwtAuthGuard est global (AppModule), PermissionsGuard est ajouté ici pour
// le contrôle d'accès par permission granulaire.
// Rate limiting spécifique analytics : 20 req/60s pour protéger les quotas GA
@Controller('api/admin/analytics')
@UseGuards(PermissionsGuard)
@RequirePermission(PERMISSIONS.ANALYTICS_READ)
@Throttle({ default: { limit: 20, ttl: 60000 } })
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('status')
  getStatus() {
    return this.analyticsService.getStatus();
  }

  @Get('overview')
  getOverview(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getOverview(query.startDate, query.endDate);
  }

  @Get('visitors')
  getVisitors(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getVisitorsByDay(query.startDate, query.endDate);
  }

  @Get('top-pages')
  getTopPages(@Query() query: TopPagesQueryDto) {
    return this.analyticsService.getTopPages(query.startDate, query.endDate, query.limit);
  }

  @Get('traffic-sources')
  getTrafficSources(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getTrafficSources(query.startDate, query.endDate);
  }

  @Get('geography')
  getGeography(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getGeography(query.startDate, query.endDate);
  }

  @Get('devices')
  getDevices(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getDevices(query.startDate, query.endDate);
  }

  @Get('realtime')
  @Throttle({ default: { limit: 10, ttl: 30000 } })
  getRealtime() {
    return this.analyticsService.getRealtime();
  }
}
