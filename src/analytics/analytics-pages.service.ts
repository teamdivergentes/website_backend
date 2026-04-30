import { Injectable, Logger, BadGatewayException, HttpException } from '@nestjs/common';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import type { TopPagesResponse } from './dto/analytics-response.dto';
import { GaRow, gaParseFloat, gaParseInt } from './analytics.helpers';
import { AnalyticsCacheService } from './analytics-cache.service';

@Injectable()
export class AnalyticsPagesService {
  private readonly logger = new Logger(AnalyticsPagesService.name);

  constructor(private readonly cache: AnalyticsCacheService) {}

  async getTopPages(
    analyticsClient: BetaAnalyticsDataClient,
    propertyId: string,
    streamFilter: object,
    startDate: string,
    endDate: string,
    limit: number = 10,
  ): Promise<TopPagesResponse> {
    return this.cache.withCache(
      `analytics:top-pages:${startDate}:${endDate}:${limit}`,
      300000,
      async () => {
        try {
          const [response] = await this.cache.withTimeout(
            analyticsClient.runReport({
              property: `properties/${propertyId}`,
              dateRanges: [{ startDate, endDate }],
              dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
              metrics: [
                { name: 'screenPageViews' },
                { name: 'totalUsers' },
                { name: 'averageSessionDuration' },
                { name: 'bounceRate' },
              ],
              orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
              limit,
              ...streamFilter,
            }),
          );

          const data = (response.rows ?? []).map((row: GaRow) => ({
            path: row.dimensionValues?.[0]?.value ?? '',
            title: row.dimensionValues?.[1]?.value ?? '',
            pageViews: gaParseInt(row.metricValues?.[0]?.value ?? undefined),
            totalUsers: gaParseInt(row.metricValues?.[1]?.value ?? undefined),
            avgSessionDuration: gaParseFloat(row.metricValues?.[2]?.value ?? undefined),
            bounceRate: gaParseFloat(row.metricValues?.[3]?.value ?? undefined),
          }));

          return { period: { startDate, endDate }, data };
        } catch (error) {
          if (error instanceof HttpException) throw error;
          this.logger.error(
            'Erreur API GA [getTopPages]',
            error instanceof Error ? error.message : String(error),
          );
          throw new BadGatewayException('Erreur de communication avec Google Analytics');
        }
      },
    );
  }
}
