import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto, TopPagesQueryDto } from './dto/analytics-query.dto';

@Controller('api/admin/analytics')
@UseGuards(RolesGuard)
@Roles('admin')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

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
  getRealtime() {
    return this.analyticsService.getRealtime();
  }
}
