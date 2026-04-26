import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    // FIX [ALPHA-012] Le ttl global est supprimé car chaque cacheManager.set() dans le service
    // définit explicitement son propre TTL (30s realtime, 5min overview/top-pages, 10min visitors/traffic, 15min geo/devices).
    // max: 100 est conservé pour limiter la mémoire consommée par le cache en RAM.
    CacheModule.register({
      max: 100,
    }),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
