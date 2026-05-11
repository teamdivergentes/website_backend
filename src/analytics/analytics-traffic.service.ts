import { Injectable, Logger, BadGatewayException, HttpException } from '@nestjs/common';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import type {
  TrafficSourcesResponse,
  GeoResponse,
  DevicesResponse,
} from './dto/analytics-response.dto';
import { GaRow, DeviceRow, BrowserRow, gaParseFloat, gaParseInt } from './analytics.helpers';
import { AnalyticsCacheService } from './analytics-cache.service';

@Injectable()
export class AnalyticsTrafficService {
  private readonly logger = new Logger(AnalyticsTrafficService.name);

  constructor(private readonly cache: AnalyticsCacheService) {}

  async getTrafficSources(
    analyticsClient: BetaAnalyticsDataClient,
    propertyId: string,
    streamFilter: object,
    startDate: string,
    endDate: string,
  ): Promise<TrafficSourcesResponse> {
    return this.cache.withCache(
      `analytics:traffic-sources:${startDate}:${endDate}`,
      600000,
      async () => {
        try {
          const [response] = await this.cache.withTimeout(
            analyticsClient.runReport({
              property: `properties/${propertyId}`,
              dateRanges: [{ startDate, endDate }],
              dimensions: [
                { name: 'sessionSource' },
                { name: 'sessionMedium' },
                { name: 'sessionDefaultChannelGroup' },
              ],
              metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'bounceRate' }],
              orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
              limit: 100,
              ...streamFilter,
            }),
          );

          const data = (response.rows ?? []).map((row: GaRow) => ({
            source: row.dimensionValues?.[0]?.value ?? '',
            medium: row.dimensionValues?.[1]?.value ?? '',
            channel: row.dimensionValues?.[2]?.value ?? '',
            sessions: gaParseInt(row.metricValues?.[0]?.value ?? undefined),
            totalUsers: gaParseInt(row.metricValues?.[1]?.value ?? undefined),
            bounceRate: gaParseFloat(row.metricValues?.[2]?.value ?? undefined),
          }));

          // Aggregate by channel with weighted bounce rate
          const channelMap = new Map<
            string,
            { sessions: number; totalUsers: number; bounceRateWeightedSum: number }
          >();
          for (const row of data) {
            const key = row.channel;
            const existing = channelMap.get(key) ?? {
              sessions: 0,
              totalUsers: 0,
              bounceRateWeightedSum: 0,
            };
            channelMap.set(key, {
              sessions: existing.sessions + row.sessions,
              totalUsers: existing.totalUsers + row.totalUsers,
              bounceRateWeightedSum: existing.bounceRateWeightedSum + row.bounceRate * row.sessions,
            });
          }

          const byChannel = Array.from(channelMap.entries())
            .map(([channel, v]) => ({
              channel,
              sessions: v.sessions,
              totalUsers: v.totalUsers,
              bounceRate:
                v.sessions > 0
                  ? Number.parseFloat((v.bounceRateWeightedSum / v.sessions).toFixed(4))
                  : 0,
            }))
            .sort((a, b) => b.sessions - a.sessions);

          return {
            period: { startDate, endDate },
            data: data.map(
              ({
                channel: _channel,
                ...rest
              }: {
                channel: string;
                source: string;
                medium: string;
                sessions: number;
                totalUsers: number;
                bounceRate: number;
              }) => rest,
            ),
            byChannel,
          };
        } catch (error) {
          if (error instanceof HttpException) throw error;
          this.logger.error(
            'Erreur API GA [getTrafficSources]',
            error instanceof Error ? error.message : String(error),
          );
          throw new BadGatewayException('Erreur de communication avec Google Analytics');
        }
      },
    );
  }

  async getGeography(
    analyticsClient: BetaAnalyticsDataClient,
    propertyId: string,
    streamFilter: object,
    startDate: string,
    endDate: string,
  ): Promise<GeoResponse> {
    return this.cache.withCache(`analytics:geography:${startDate}:${endDate}`, 900000, async () => {
      try {
        const [[countryResponse], [cityResponse]] = await this.cache.withTimeout(
          Promise.all([
            analyticsClient.runReport({
              property: `properties/${propertyId}`,
              dateRanges: [{ startDate, endDate }],
              dimensions: [{ name: 'country' }, { name: 'countryId' }],
              metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
              orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
              limit: 50,
              ...streamFilter,
            }),
            analyticsClient.runReport({
              property: `properties/${propertyId}`,
              dateRanges: [{ startDate, endDate }],
              dimensions: [{ name: 'city' }],
              metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
              orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
              limit: 20,
              ...streamFilter,
            }),
          ]),
        );

        const byCountry = (countryResponse.rows ?? []).map((row: GaRow) => ({
          country: row.dimensionValues?.[0]?.value ?? '',
          countryId: row.dimensionValues?.[1]?.value ?? '',
          totalUsers: gaParseInt(row.metricValues?.[0]?.value ?? undefined),
          sessions: gaParseInt(row.metricValues?.[1]?.value ?? undefined),
        }));

        const byCity = (cityResponse.rows ?? []).map((row: GaRow) => ({
          city: row.dimensionValues?.[0]?.value ?? '',
          totalUsers: gaParseInt(row.metricValues?.[0]?.value ?? undefined),
          sessions: gaParseInt(row.metricValues?.[1]?.value ?? undefined),
        }));

        return { period: { startDate, endDate }, byCountry, byCity };
      } catch (error) {
        if (error instanceof HttpException) throw error;
        this.logger.error(
          'Erreur API GA [getGeography]',
          error instanceof Error ? error.message : String(error),
        );
        throw new BadGatewayException('Erreur de communication avec Google Analytics');
      }
    });
  }

  async getDevices(
    analyticsClient: BetaAnalyticsDataClient,
    propertyId: string,
    streamFilter: object,
    startDate: string,
    endDate: string,
  ): Promise<DevicesResponse> {
    return this.cache.withCache(`analytics:devices:${startDate}:${endDate}`, 900000, async () => {
      try {
        const [[categoryResponse], [browserResponse]] = await this.cache.withTimeout(
          Promise.all([
            analyticsClient.runReport({
              property: `properties/${propertyId}`,
              dateRanges: [{ startDate, endDate }],
              dimensions: [{ name: 'deviceCategory' }],
              metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
              orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
              limit: 10,
              ...streamFilter,
            }),
            analyticsClient.runReport({
              property: `properties/${propertyId}`,
              dateRanges: [{ startDate, endDate }],
              dimensions: [{ name: 'browser' }],
              metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
              orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
              limit: 10,
              ...streamFilter,
            }),
          ]),
        );

        const categoryRows: DeviceRow[] = (categoryResponse.rows ?? []).map((row: GaRow) => ({
          category: row.dimensionValues?.[0]?.value ?? '',
          totalUsers: gaParseInt(row.metricValues?.[0]?.value ?? undefined),
          sessions: gaParseInt(row.metricValues?.[1]?.value ?? undefined),
        }));

        const totalCategoryUsers = categoryRows.reduce(
          (sum: number, r: DeviceRow) => sum + r.totalUsers,
          0,
        );
        const byCategory = categoryRows.map((r: DeviceRow) => ({
          ...r,
          percentage:
            totalCategoryUsers > 0
              ? Number.parseFloat(((r.totalUsers / totalCategoryUsers) * 100).toFixed(2))
              : 0,
        }));

        const browserRows: BrowserRow[] = (browserResponse.rows ?? []).map((row: GaRow) => ({
          browser: row.dimensionValues?.[0]?.value ?? '',
          totalUsers: gaParseInt(row.metricValues?.[0]?.value ?? undefined),
          sessions: gaParseInt(row.metricValues?.[1]?.value ?? undefined),
        }));

        const totalBrowserUsers = browserRows.reduce(
          (sum: number, r: BrowserRow) => sum + r.totalUsers,
          0,
        );
        const byBrowser = browserRows.map((r: BrowserRow) => ({
          ...r,
          percentage:
            totalBrowserUsers > 0
              ? Number.parseFloat(((r.totalUsers / totalBrowserUsers) * 100).toFixed(2))
              : 0,
        }));

        return { period: { startDate, endDate }, byCategory, byBrowser };
      } catch (error) {
        if (error instanceof HttpException) throw error;
        this.logger.error(
          'Erreur API GA [getDevices]',
          error instanceof Error ? error.message : String(error),
        );
        throw new BadGatewayException('Erreur de communication avec Google Analytics');
      }
    });
  }
}
