import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { MetricsService } from './metrics.service';
import { MetricsAccessGuard } from './metrics-access.guard';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * SEC-009 — @Public() bypasse uniquement le JwtAuthGuard global.
   * MetricsAccessGuard applique une IP allowlist indépendante du JWT.
   * Seuls loopback, la plage Docker et les IP listées dans METRICS_ALLOWED_IPS
   * peuvent accéder à cet endpoint.
   */
  @Public()
  @SkipThrottle()
  @UseGuards(MetricsAccessGuard)
  @Get()
  async getMetrics(@Res() res: Response): Promise<void> {
    const metrics = await this.metricsService.getMetrics();
    res.set('Content-Type', this.metricsService.getContentType());
    res.end(metrics);
  }
}
