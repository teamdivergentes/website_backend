import { Injectable, Inject, Logger, ServiceUnavailableException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type {
  OverviewResponse,
  VisitorsResponse,
  TopPagesResponse,
  TrafficSourcesResponse,
  GeoResponse,
  DevicesResponse,
  RealtimeResponse,
  MetricWithComparison,
} from './dto/analytics-response.dto';

@Injectable()
export class AnalyticsService {
  private analyticsClient: any;
  private propertyId: string;
  private isConfigured: boolean = false;
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    const propertyId = process.env.GA_PROPERTY_ID;
    const clientEmail = process.env.GA_CLIENT_EMAIL;
    const privateKey = process.env.GA_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (propertyId && clientEmail && privateKey) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { BetaAnalyticsDataClient } = require('@google-analytics/data');
      this.analyticsClient = new BetaAnalyticsDataClient({
        credentials: { client_email: clientEmail, private_key: privateKey },
      });
      this.propertyId = propertyId;
      this.isConfigured = true;
      this.logger.log('Google Analytics client configuré');
    } else {
      this.logger.warn(
        'Google Analytics non configuré - variables GA_PROPERTY_ID, GA_CLIENT_EMAIL, GA_PRIVATE_KEY manquantes',
      );
    }
  }

  private ensureConfigured(): void {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        'Google Analytics non configuré. Veuillez définir les variables GA_PROPERTY_ID, GA_CLIENT_EMAIL et GA_PRIVATE_KEY.',
      );
    }
  }

  private parseFloat(value: string | undefined): number {
    return parseFloat(value ?? '0') || 0;
  }

  private parseInt(value: string | undefined): number {
    return parseInt(value ?? '0', 10) || 0;
  }

  private calcChangePercent(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return parseFloat((((current - previous) / previous) * 100).toFixed(2));
  }

  private buildComparison(current: number, previous: number): MetricWithComparison {
    return {
      value: current,
      previous,
      changePercent: this.calcChangePercent(current, previous),
    };
  }

  private computePreviousPeriod(
    startDate: string,
    endDate: string,
  ): { prevStart: string; prevEnd: string } {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 86400000); // day before start
    const prevStart = new Date(prevEnd.getTime() - durationMs);

    const fmt = (d: Date) => d.toISOString().split('T')[0];
    return { prevStart: fmt(prevStart), prevEnd: fmt(prevEnd) };
  }

  async getOverview(startDate: string, endDate: string): Promise<OverviewResponse> {
    this.ensureConfigured();
    const cacheKey = `analytics:overview:${startDate}:${endDate}`;
    const cached = await this.cacheManager.get<OverviewResponse>(cacheKey);
    if (cached) return cached;

    const { prevStart, prevEnd } = this.computePreviousPeriod(startDate, endDate);

    const [response] = await this.analyticsClient.runReport({
      property: `properties/${this.propertyId}`,
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
    });

    const extractMetrics = (dateRangeIndex: number) => {
      const row = response.rows?.find(
        (r: any) => r.dimensionValues?.[0]?.value === `date_range_${dateRangeIndex}`,
      );
      const mv = (i: number) =>
        this.parseFloat(row?.metricValues?.[i]?.value ?? response.rows?.[0]?.metricValues?.[i]?.value);

      // When no dimensions, GA returns one row per date range
      const allRows = response.rows ?? [];
      const rangeRow = allRows[dateRangeIndex] ?? allRows[0];
      return {
        totalUsers: this.parseInt(rangeRow?.metricValues?.[0]?.value),
        newUsers: this.parseInt(rangeRow?.metricValues?.[1]?.value),
        sessions: this.parseInt(rangeRow?.metricValues?.[2]?.value),
        pageViews: this.parseInt(rangeRow?.metricValues?.[3]?.value),
        avgSessionDuration: this.parseFloat(rangeRow?.metricValues?.[4]?.value),
        bounceRate: this.parseFloat(rangeRow?.metricValues?.[5]?.value),
      };
    };

    const current = extractMetrics(0);
    const previous = extractMetrics(1);

    const result: OverviewResponse = {
      period: { startDate, endDate },
      previousPeriod: { startDate: prevStart, endDate: prevEnd },
      metrics: {
        totalUsers: this.buildComparison(current.totalUsers, previous.totalUsers),
        newUsers: this.buildComparison(current.newUsers, previous.newUsers),
        sessions: this.buildComparison(current.sessions, previous.sessions),
        pageViews: this.buildComparison(current.pageViews, previous.pageViews),
        avgSessionDuration: this.buildComparison(current.avgSessionDuration, previous.avgSessionDuration),
        bounceRate: this.buildComparison(current.bounceRate, previous.bounceRate),
      },
    };

    await this.cacheManager.set(cacheKey, result, 300000);
    return result;
  }

  async getVisitorsByDay(startDate: string, endDate: string): Promise<VisitorsResponse> {
    this.ensureConfigured();
    const cacheKey = `analytics:visitors:${startDate}:${endDate}`;
    const cached = await this.cacheManager.get<VisitorsResponse>(cacheKey);
    if (cached) return cached;

    const [response] = await this.analyticsClient.runReport({
      property: `properties/${this.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });

    const data = (response.rows ?? []).map((row: any) => ({
      date: row.dimensionValues[0].value as string,
      totalUsers: this.parseInt(row.metricValues[0]?.value),
      newUsers: this.parseInt(row.metricValues[1]?.value),
      sessions: this.parseInt(row.metricValues[2]?.value),
      pageViews: this.parseInt(row.metricValues[3]?.value),
    }));

    const result: VisitorsResponse = { period: { startDate, endDate }, data };
    await this.cacheManager.set(cacheKey, result, 600000);
    return result;
  }

  async getTopPages(startDate: string, endDate: string, limit: number = 10): Promise<TopPagesResponse> {
    this.ensureConfigured();
    const cacheKey = `analytics:top-pages:${startDate}:${endDate}:${limit}`;
    const cached = await this.cacheManager.get<TopPagesResponse>(cacheKey);
    if (cached) return cached;

    const [response] = await this.analyticsClient.runReport({
      property: `properties/${this.propertyId}`,
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
    });

    const data = (response.rows ?? []).map((row: any) => ({
      path: row.dimensionValues[0].value as string,
      title: row.dimensionValues[1].value as string,
      pageViews: this.parseInt(row.metricValues[0]?.value),
      totalUsers: this.parseInt(row.metricValues[1]?.value),
      avgSessionDuration: this.parseFloat(row.metricValues[2]?.value),
      bounceRate: this.parseFloat(row.metricValues[3]?.value),
    }));

    const result: TopPagesResponse = { period: { startDate, endDate }, data };
    await this.cacheManager.set(cacheKey, result, 300000);
    return result;
  }

  async getTrafficSources(startDate: string, endDate: string): Promise<TrafficSourcesResponse> {
    this.ensureConfigured();
    const cacheKey = `analytics:traffic-sources:${startDate}:${endDate}`;
    const cached = await this.cacheManager.get<TrafficSourcesResponse>(cacheKey);
    if (cached) return cached;

    const [response] = await this.analyticsClient.runReport({
      property: `properties/${this.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'sessionSource' },
        { name: 'sessionMedium' },
        { name: 'sessionDefaultChannelGroup' },
      ],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'bounceRate' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    });

    const data = (response.rows ?? []).map((row: any) => ({
      source: row.dimensionValues[0].value as string,
      medium: row.dimensionValues[1].value as string,
      channel: row.dimensionValues[2].value as string,
      sessions: this.parseInt(row.metricValues[0]?.value),
      totalUsers: this.parseInt(row.metricValues[1]?.value),
      bounceRate: this.parseFloat(row.metricValues[2]?.value),
    }));

    // Aggregate by channel
    const channelMap = new Map<string, { sessions: number; totalUsers: number; bounceRateSum: number; count: number }>();
    for (const row of data) {
      const key = row.channel;
      const existing = channelMap.get(key) ?? { sessions: 0, totalUsers: 0, bounceRateSum: 0, count: 0 };
      channelMap.set(key, {
        sessions: existing.sessions + row.sessions,
        totalUsers: existing.totalUsers + row.totalUsers,
        bounceRateSum: existing.bounceRateSum + row.bounceRate,
        count: existing.count + 1,
      });
    }

    const byChannel = Array.from(channelMap.entries())
      .map(([channel, v]) => ({
        channel,
        sessions: v.sessions,
        totalUsers: v.totalUsers,
        bounceRate: v.count > 0 ? parseFloat((v.bounceRateSum / v.count).toFixed(4)) : 0,
      }))
      .sort((a, b) => b.sessions - a.sessions);

    const result: TrafficSourcesResponse = {
      period: { startDate, endDate },
      data: data.map(({ channel: _channel, ...rest }: { channel: string; source: string; medium: string; sessions: number; totalUsers: number; bounceRate: number }) => rest),
      byChannel,
    };

    await this.cacheManager.set(cacheKey, result, 600000);
    return result;
  }

  async getGeography(startDate: string, endDate: string): Promise<GeoResponse> {
    this.ensureConfigured();
    const cacheKey = `analytics:geography:${startDate}:${endDate}`;
    const cached = await this.cacheManager.get<GeoResponse>(cacheKey);
    if (cached) return cached;

    const [countryResponse] = await this.analyticsClient.runReport({
      property: `properties/${this.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'country' }, { name: 'countryId' }],
      metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
      limit: 50,
    });

    const [cityResponse] = await this.analyticsClient.runReport({
      property: `properties/${this.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'city' }],
      metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
      limit: 20,
    });

    const byCountry = (countryResponse.rows ?? []).map((row: any) => ({
      country: row.dimensionValues[0].value as string,
      countryId: row.dimensionValues[1].value as string,
      totalUsers: this.parseInt(row.metricValues[0]?.value),
      sessions: this.parseInt(row.metricValues[1]?.value),
    }));

    const byCity = (cityResponse.rows ?? []).map((row: any) => ({
      city: row.dimensionValues[0].value as string,
      totalUsers: this.parseInt(row.metricValues[0]?.value),
      sessions: this.parseInt(row.metricValues[1]?.value),
    }));

    const result: GeoResponse = { period: { startDate, endDate }, byCountry, byCity };
    await this.cacheManager.set(cacheKey, result, 900000);
    return result;
  }

  async getDevices(startDate: string, endDate: string): Promise<DevicesResponse> {
    this.ensureConfigured();
    const cacheKey = `analytics:devices:${startDate}:${endDate}`;
    const cached = await this.cacheManager.get<DevicesResponse>(cacheKey);
    if (cached) return cached;

    const [categoryResponse] = await this.analyticsClient.runReport({
      property: `properties/${this.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
    });

    const [browserResponse] = await this.analyticsClient.runReport({
      property: `properties/${this.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'browser' }],
      metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
      limit: 10,
    });

    const categoryRows = (categoryResponse.rows ?? []).map((row: any) => ({
      category: row.dimensionValues[0].value as string,
      totalUsers: this.parseInt(row.metricValues[0]?.value),
      sessions: this.parseInt(row.metricValues[1]?.value),
    }));

    const totalCategoryUsers = categoryRows.reduce((sum: number, r: any) => sum + r.totalUsers, 0);
    const byCategory = categoryRows.map((r: any) => ({
      ...r,
      percentage: totalCategoryUsers > 0 ? parseFloat(((r.totalUsers / totalCategoryUsers) * 100).toFixed(2)) : 0,
    }));

    const browserRows = (browserResponse.rows ?? []).map((row: any) => ({
      browser: row.dimensionValues[0].value as string,
      totalUsers: this.parseInt(row.metricValues[0]?.value),
      sessions: this.parseInt(row.metricValues[1]?.value),
    }));

    const totalBrowserUsers = browserRows.reduce((sum: number, r: any) => sum + r.totalUsers, 0);
    const byBrowser = browserRows.map((r: any) => ({
      ...r,
      percentage: totalBrowserUsers > 0 ? parseFloat(((r.totalUsers / totalBrowserUsers) * 100).toFixed(2)) : 0,
    }));

    const result: DevicesResponse = { period: { startDate, endDate }, byCategory, byBrowser };
    await this.cacheManager.set(cacheKey, result, 900000);
    return result;
  }

  async getRealtime(): Promise<RealtimeResponse> {
    this.ensureConfigured();
    const cacheKey = `analytics:realtime`;
    const cached = await this.cacheManager.get<RealtimeResponse>(cacheKey);
    if (cached) return cached;

    const [pageResponse] = await this.analyticsClient.runRealtimeReport({
      property: `properties/${this.propertyId}`,
      dimensions: [{ name: 'unifiedScreenName' }],
      metrics: [{ name: 'activeUsers' }],
    });

    const [countryResponse] = await this.analyticsClient.runRealtimeReport({
      property: `properties/${this.propertyId}`,
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'activeUsers' }],
    });

    const [deviceResponse] = await this.analyticsClient.runRealtimeReport({
      property: `properties/${this.propertyId}`,
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'activeUsers' }],
    });

    const byPage = (pageResponse.rows ?? []).map((row: any) => ({
      page: row.dimensionValues[0].value as string,
      activeUsers: this.parseInt(row.metricValues[0]?.value),
    }));

    const byCountry = (countryResponse.rows ?? []).map((row: any) => ({
      country: row.dimensionValues[0].value as string,
      activeUsers: this.parseInt(row.metricValues[0]?.value),
    }));

    const byDevice = (deviceResponse.rows ?? []).map((row: any) => ({
      device: row.dimensionValues[0].value as string,
      activeUsers: this.parseInt(row.metricValues[0]?.value),
    }));

    const activeUsers = byPage.reduce((sum: number, r: any) => sum + r.activeUsers, 0);

    const result: RealtimeResponse = {
      activeUsers,
      byPage,
      byCountry,
      byDevice,
      updatedAt: new Date().toISOString(),
    };

    await this.cacheManager.set(cacheKey, result, 30000);
    return result;
  }
}
