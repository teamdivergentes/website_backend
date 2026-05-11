import { Injectable, Logger, BadGatewayException, HttpException } from '@nestjs/common';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import type { RealtimeResponse } from './dto/analytics-response.dto';
import { GaRow, gaParseInt } from './analytics.helpers';
import { AnalyticsCacheService } from './analytics-cache.service';

@Injectable()
export class AnalyticsRealtimeService {
  private readonly logger = new Logger(AnalyticsRealtimeService.name);

  constructor(private readonly cache: AnalyticsCacheService) {}

  async getRealtime(
    analyticsClient: BetaAnalyticsDataClient,
    propertyId: string,
    streamId: string | null,
    streamFilter: object,
  ): Promise<RealtimeResponse> {
    const streamSuffix = streamId ? `:${streamId}` : '';
    return this.cache.withCache(
      `analytics:realtime:${propertyId}${streamSuffix}`,
      30000,
      async () => {
        try {
          const [[pageResponse], [countryResponse], [deviceResponse]] =
            await this.cache.withTimeout(
              Promise.all([
                analyticsClient.runRealtimeReport({
                  property: `properties/${propertyId}`,
                  dimensions: [{ name: 'unifiedScreenName' }],
                  metrics: [{ name: 'activeUsers' }],
                  limit: 20,
                  ...streamFilter,
                }),
                analyticsClient.runRealtimeReport({
                  property: `properties/${propertyId}`,
                  dimensions: [{ name: 'country' }],
                  metrics: [{ name: 'activeUsers' }],
                  limit: 20,
                  ...streamFilter,
                }),
                analyticsClient.runRealtimeReport({
                  property: `properties/${propertyId}`,
                  dimensions: [{ name: 'deviceCategory' }],
                  metrics: [{ name: 'activeUsers' }],
                  ...streamFilter,
                }),
              ]),
            );

          const byPage = (pageResponse.rows ?? []).map((row: GaRow) => ({
            page: row.dimensionValues?.[0]?.value ?? '',
            activeUsers: gaParseInt(row.metricValues?.[0]?.value ?? undefined),
          }));

          const byCountry = (countryResponse.rows ?? []).map((row: GaRow) => ({
            country: row.dimensionValues?.[0]?.value ?? '',
            activeUsers: gaParseInt(row.metricValues?.[0]?.value ?? undefined),
          }));

          const byDevice = (deviceResponse.rows ?? []).map((row: GaRow) => ({
            device: row.dimensionValues?.[0]?.value ?? '',
            activeUsers: gaParseInt(row.metricValues?.[0]?.value ?? undefined),
          }));

          const activeUsers = byPage.reduce(
            (sum: number, r: { page: string; activeUsers: number }) => sum + r.activeUsers,
            0,
          );

          return {
            activeUsers,
            byPage,
            byCountry,
            byDevice,
            updatedAt: new Date().toISOString(),
          };
        } catch (error) {
          if (error instanceof HttpException) throw error;
          this.logger.error(
            'Erreur API GA [getRealtime]',
            error instanceof Error ? error.message : String(error),
          );
          throw new BadGatewayException('Erreur de communication avec Google Analytics');
        }
      },
    );
  }
}
