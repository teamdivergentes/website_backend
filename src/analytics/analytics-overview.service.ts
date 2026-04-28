import { Injectable, Logger, BadGatewayException, HttpException } from '@nestjs/common';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import type { OverviewResponse, VisitorsResponse } from './dto/analytics-response.dto';
import {
  GaRow,
  gaParseFloat,
  gaParseInt,
  buildComparison,
  computePreviousPeriod,
} from './analytics.helpers';
import { AnalyticsCacheService } from './analytics-cache.service';

@Injectable()
export class AnalyticsOverviewService {
  private readonly logger = new Logger(AnalyticsOverviewService.name);

  constructor(private readonly cache: AnalyticsCacheService) {}

  async getOverview(
    analyticsClient: BetaAnalyticsDataClient,
    propertyId: string,
    streamFilter: object,
    startDate: string,
    endDate: string,
  ): Promise<OverviewResponse> {
    return this.cache.withCache(`analytics:overview:${startDate}:${endDate}`, 300000, async () => {
      try {
        const { prevStart, prevEnd } = computePreviousPeriod(startDate, endDate);

        const [response] = await this.cache.withTimeout(
          analyticsClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [
              { startDate, endDate },
              { startDate: prevStart, endDate: prevEnd },
            ],
            metrics: [
              { name: 'totalUsers' },
              { name: 'newUsers' },
              { name: 'sessions' },
              { name: 'screenPageViews' },
              { name: 'averageSessionDuration' },
              { name: 'bounceRate' },
            ],
            ...streamFilter,
          }),
        );

        const extractMetrics = (dateRangeIndex: number) => {
          const allRows = response.rows ?? [];
          const rangeRow = allRows[dateRangeIndex] ?? null;
          if (!rangeRow) {
            return {
              totalUsers: 0,
              newUsers: 0,
              sessions: 0,
              pageViews: 0,
              avgSessionDuration: 0,
              bounceRate: 0,
            };
          }
          return {
            totalUsers: gaParseInt(rangeRow.metricValues?.[0]?.value ?? undefined),
            newUsers: gaParseInt(rangeRow.metricValues?.[1]?.value ?? undefined),
            sessions: gaParseInt(rangeRow.metricValues?.[2]?.value ?? undefined),
            pageViews: gaParseInt(rangeRow.metricValues?.[3]?.value ?? undefined),
            avgSessionDuration: gaParseFloat(rangeRow.metricValues?.[4]?.value ?? undefined),
            bounceRate: gaParseFloat(rangeRow.metricValues?.[5]?.value ?? undefined),
          };
        };

        const current = extractMetrics(0);
        const previous = extractMetrics(1);

        return {
          period: { startDate, endDate },
          previousPeriod: { startDate: prevStart, endDate: prevEnd },
          metrics: {
            totalUsers: buildComparison(current.totalUsers, previous.totalUsers),
            newUsers: buildComparison(current.newUsers, previous.newUsers),
            sessions: buildComparison(current.sessions, previous.sessions),
            pageViews: buildComparison(current.pageViews, previous.pageViews),
            avgSessionDuration: buildComparison(
              current.avgSessionDuration,
              previous.avgSessionDuration,
            ),
            bounceRate: buildComparison(current.bounceRate, previous.bounceRate),
          },
        };
      } catch (error) {
        if (error instanceof HttpException) throw error;
        this.logger.error(
          'Erreur API GA [getOverview]',
          error instanceof Error ? error.message : String(error),
        );
        throw new BadGatewayException('Erreur de communication avec Google Analytics');
      }
    });
  }

  async getVisitorsByDay(
    analyticsClient: BetaAnalyticsDataClient,
    propertyId: string,
    streamFilter: object,
    startDate: string,
    endDate: string,
  ): Promise<VisitorsResponse> {
    return this.cache.withCache(`analytics:visitors:${startDate}:${endDate}`, 600000, async () => {
      try {
        const [response] = await this.cache.withTimeout(
          analyticsClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'date' }],
            metrics: [
              { name: 'totalUsers' },
              { name: 'newUsers' },
              { name: 'sessions' },
              { name: 'screenPageViews' },
            ],
            orderBys: [{ dimension: { dimensionName: 'date' } }],
            ...streamFilter,
          }),
        );

        const data = (response.rows ?? []).map((row: GaRow) => ({
          date: row.dimensionValues?.[0]?.value ?? '',
          totalUsers: gaParseInt(row.metricValues?.[0]?.value ?? undefined),
          newUsers: gaParseInt(row.metricValues?.[1]?.value ?? undefined),
          sessions: gaParseInt(row.metricValues?.[2]?.value ?? undefined),
          pageViews: gaParseInt(row.metricValues?.[3]?.value ?? undefined),
        }));

        return { period: { startDate, endDate }, data };
      } catch (error) {
        if (error instanceof HttpException) throw error;
        this.logger.error(
          'Erreur API GA [getVisitorsByDay]',
          error instanceof Error ? error.message : String(error),
        );
        throw new BadGatewayException('Erreur de communication avec Google Analytics');
      }
    });
  }
}
