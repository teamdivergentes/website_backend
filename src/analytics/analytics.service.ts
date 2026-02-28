import {
  Injectable,
  Inject,
  Logger,
  ServiceUnavailableException,
  GatewayTimeoutException,
  BadGatewayException,
  HttpException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
// FIX [BETA-004] Import statique du module GA à la place du require() dynamique
import { BetaAnalyticsDataClient } from '@google-analytics/data';
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

// FIX [ALPHA-007] Timeout en ms pour tous les appels vers l'API Google Analytics
const GA_API_TIMEOUT_MS = 10000;

/** Représente une valeur de dimension GA4 (string ou null selon l'API) */
interface GaDimensionValue {
  value?: string | null;
}

/** Représente une valeur de métrique GA4 */
interface GaMetricValue {
  value?: string | null;
}

/** Représente une ligne de résultat GA4 */
interface GaRow {
  dimensionValues?: GaDimensionValue[];
  metricValues?: GaMetricValue[];
}

/** Représente une ligne de catégorie de device */
interface DeviceRow {
  category: string;
  totalUsers: number;
  sessions: number;
}

/** Représente une ligne de navigateur */
interface BrowserRow {
  browser: string;
  totalUsers: number;
  sessions: number;
}

@Injectable()
export class AnalyticsService {
  private analyticsClient: BetaAnalyticsDataClient;
  private propertyId: string;
  private isConfigured: boolean = false;
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    const propertyId = process.env.GA_PROPERTY_ID;
    const clientEmail = process.env.GA_CLIENT_EMAIL;
    const privateKey = process.env.GA_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (propertyId && clientEmail && privateKey) {
      // FIX [BETA-004] Utilisation de l'import statique BetaAnalyticsDataClient
      // FIX [ALPHA-SEC-002] Try/catch pour gérer les erreurs d'initialisation du client
      try {
        this.analyticsClient = new BetaAnalyticsDataClient({
          credentials: { client_email: clientEmail, private_key: privateKey },
        });
        this.propertyId = propertyId;
        this.isConfigured = true;
        this.logger.log('Google Analytics client configuré');
      } catch {
        this.logger.error("Erreur lors de l'initialisation du client Google Analytics");
        // isConfigured reste false, ensureConfigured() protègera les appels
      }
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

  // FIX [ALPHA-007] Wrapper qui ajoute un timeout sur tout appel à l'API GA
  // FIX [ALPHA-PERF-001/ALPHA-RES-002] Annulation du timer via .finally() pour éviter les fuites
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number = GA_API_TIMEOUT_MS): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new GatewayTimeoutException(
            `L'API Google Analytics n'a pas répondu dans les ${timeoutMs}ms impartis.`,
          ),
        );
      }, timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
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

    try {
      const { prevStart, prevEnd } = this.computePreviousPeriod(startDate, endDate);

      // FIX [ALPHA-007] Ajout du timeout sur l'appel runReport
      const [response] = await this.withTimeout(
        this.analyticsClient.runReport({
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
        }),
      );

      // FIX [ALPHA-001, ALPHA-013] Suppression de la variable mv inutilisée.
      // GA retourne une row par dateRange quand aucune dimension n'est demandée.
      const extractMetrics = (dateRangeIndex: number) => {
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
          avgSessionDuration: this.buildComparison(
            current.avgSessionDuration,
            previous.avgSessionDuration,
          ),
          bounceRate: this.buildComparison(current.bounceRate, previous.bounceRate),
        },
      };

      await this.cacheManager.set(cacheKey, result, 300000);
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Erreur API GA [getOverview]',
        error instanceof Error ? error.message : String(error),
      );
      throw new BadGatewayException('Erreur de communication avec Google Analytics');
    }
  }

  async getVisitorsByDay(startDate: string, endDate: string): Promise<VisitorsResponse> {
    this.ensureConfigured();
    const cacheKey = `analytics:visitors:${startDate}:${endDate}`;
    const cached = await this.cacheManager.get<VisitorsResponse>(cacheKey);
    if (cached) return cached;

    try {
      // FIX [ALPHA-007] Ajout du timeout sur l'appel runReport
      const [response] = await this.withTimeout(
        this.analyticsClient.runReport({
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
        }),
      );

      const data = (response.rows ?? []).map((row: GaRow) => ({
        date: row.dimensionValues?.[0]?.value ?? '',
        totalUsers: this.parseInt(row.metricValues?.[0]?.value ?? undefined),
        newUsers: this.parseInt(row.metricValues?.[1]?.value ?? undefined),
        sessions: this.parseInt(row.metricValues?.[2]?.value ?? undefined),
        pageViews: this.parseInt(row.metricValues?.[3]?.value ?? undefined),
      }));

      const result: VisitorsResponse = { period: { startDate, endDate }, data };
      await this.cacheManager.set(cacheKey, result, 600000);
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Erreur API GA [getVisitorsByDay]',
        error instanceof Error ? error.message : String(error),
      );
      throw new BadGatewayException('Erreur de communication avec Google Analytics');
    }
  }

  async getTopPages(
    startDate: string,
    endDate: string,
    limit: number = 10,
  ): Promise<TopPagesResponse> {
    this.ensureConfigured();
    const cacheKey = `analytics:top-pages:${startDate}:${endDate}:${limit}`;
    const cached = await this.cacheManager.get<TopPagesResponse>(cacheKey);
    if (cached) return cached;

    try {
      // FIX [ALPHA-007] Ajout du timeout sur l'appel runReport
      const [response] = await this.withTimeout(
        this.analyticsClient.runReport({
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
        }),
      );

      const data = (response.rows ?? []).map((row: GaRow) => ({
        path: row.dimensionValues?.[0]?.value ?? '',
        title: row.dimensionValues?.[1]?.value ?? '',
        pageViews: this.parseInt(row.metricValues?.[0]?.value ?? undefined),
        totalUsers: this.parseInt(row.metricValues?.[1]?.value ?? undefined),
        avgSessionDuration: this.parseFloat(row.metricValues?.[2]?.value ?? undefined),
        bounceRate: this.parseFloat(row.metricValues?.[3]?.value ?? undefined),
      }));

      const result: TopPagesResponse = { period: { startDate, endDate }, data };
      await this.cacheManager.set(cacheKey, result, 300000);
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Erreur API GA [getTopPages]',
        error instanceof Error ? error.message : String(error),
      );
      throw new BadGatewayException('Erreur de communication avec Google Analytics');
    }
  }

  async getTrafficSources(startDate: string, endDate: string): Promise<TrafficSourcesResponse> {
    this.ensureConfigured();
    const cacheKey = `analytics:traffic-sources:${startDate}:${endDate}`;
    const cached = await this.cacheManager.get<TrafficSourcesResponse>(cacheKey);
    if (cached) return cached;

    try {
      // FIX [ALPHA-007] Ajout du timeout sur l'appel runReport
      const [response] = await this.withTimeout(
        this.analyticsClient.runReport({
          property: `properties/${this.propertyId}`,
          dateRanges: [{ startDate, endDate }],
          dimensions: [
            { name: 'sessionSource' },
            { name: 'sessionMedium' },
            { name: 'sessionDefaultChannelGroup' },
          ],
          metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'bounceRate' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 100,
        }),
      );

      const data = (response.rows ?? []).map((row: GaRow) => ({
        source: row.dimensionValues?.[0]?.value ?? '',
        medium: row.dimensionValues?.[1]?.value ?? '',
        channel: row.dimensionValues?.[2]?.value ?? '',
        sessions: this.parseInt(row.metricValues?.[0]?.value ?? undefined),
        totalUsers: this.parseInt(row.metricValues?.[1]?.value ?? undefined),
        bounceRate: this.parseFloat(row.metricValues?.[2]?.value ?? undefined),
      }));

      // Aggregate by channel
      const channelMap = new Map<
        string,
        { sessions: number; totalUsers: number; bounceRateSum: number; count: number }
      >();
      for (const row of data) {
        const key = row.channel;
        const existing = channelMap.get(key) ?? {
          sessions: 0,
          totalUsers: 0,
          bounceRateSum: 0,
          count: 0,
        };
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

      await this.cacheManager.set(cacheKey, result, 600000);
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Erreur API GA [getTrafficSources]',
        error instanceof Error ? error.message : String(error),
      );
      throw new BadGatewayException('Erreur de communication avec Google Analytics');
    }
  }

  async getGeography(startDate: string, endDate: string): Promise<GeoResponse> {
    this.ensureConfigured();
    const cacheKey = `analytics:geography:${startDate}:${endDate}`;
    const cached = await this.cacheManager.get<GeoResponse>(cacheKey);
    if (cached) return cached;

    try {
      // FIX [ALPHA-005] Parallélisation des 2 appels runReport (pays + villes)
      // FIX [ALPHA-007] Ajout du timeout sur les 2 appels runReport
      const [[countryResponse], [cityResponse]] = await this.withTimeout(
        Promise.all([
          this.analyticsClient.runReport({
            property: `properties/${this.propertyId}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'country' }, { name: 'countryId' }],
            metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
            orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
            limit: 50,
          }),
          this.analyticsClient.runReport({
            property: `properties/${this.propertyId}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'city' }],
            metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
            orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
            limit: 20,
          }),
        ]),
      );

      const byCountry = (countryResponse.rows ?? []).map((row: GaRow) => ({
        country: row.dimensionValues?.[0]?.value ?? '',
        countryId: row.dimensionValues?.[1]?.value ?? '',
        totalUsers: this.parseInt(row.metricValues?.[0]?.value ?? undefined),
        sessions: this.parseInt(row.metricValues?.[1]?.value ?? undefined),
      }));

      const byCity = (cityResponse.rows ?? []).map((row: GaRow) => ({
        city: row.dimensionValues?.[0]?.value ?? '',
        totalUsers: this.parseInt(row.metricValues?.[0]?.value ?? undefined),
        sessions: this.parseInt(row.metricValues?.[1]?.value ?? undefined),
      }));

      const result: GeoResponse = { period: { startDate, endDate }, byCountry, byCity };
      await this.cacheManager.set(cacheKey, result, 900000);
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Erreur API GA [getGeography]',
        error instanceof Error ? error.message : String(error),
      );
      throw new BadGatewayException('Erreur de communication avec Google Analytics');
    }
  }

  async getDevices(startDate: string, endDate: string): Promise<DevicesResponse> {
    this.ensureConfigured();
    const cacheKey = `analytics:devices:${startDate}:${endDate}`;
    const cached = await this.cacheManager.get<DevicesResponse>(cacheKey);
    if (cached) return cached;

    try {
      // FIX [ALPHA-005 bis] Parallélisation des 2 appels runReport (catégories + navigateurs)
      // FIX [ALPHA-007] Ajout du timeout sur les 2 appels runReport
      const [[categoryResponse], [browserResponse]] = await this.withTimeout(
        Promise.all([
          this.analyticsClient.runReport({
            property: `properties/${this.propertyId}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'deviceCategory' }],
            metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
            orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
          }),
          this.analyticsClient.runReport({
            property: `properties/${this.propertyId}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'browser' }],
            metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
            orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
            limit: 10,
          }),
        ]),
      );

      const categoryRows: DeviceRow[] = (categoryResponse.rows ?? []).map((row: GaRow) => ({
        category: row.dimensionValues?.[0]?.value ?? '',
        totalUsers: this.parseInt(row.metricValues?.[0]?.value ?? undefined),
        sessions: this.parseInt(row.metricValues?.[1]?.value ?? undefined),
      }));

      const totalCategoryUsers = categoryRows.reduce(
        (sum: number, r: DeviceRow) => sum + r.totalUsers,
        0,
      );
      const byCategory = categoryRows.map((r: DeviceRow) => ({
        ...r,
        percentage:
          totalCategoryUsers > 0
            ? parseFloat(((r.totalUsers / totalCategoryUsers) * 100).toFixed(2))
            : 0,
      }));

      const browserRows: BrowserRow[] = (browserResponse.rows ?? []).map((row: GaRow) => ({
        browser: row.dimensionValues?.[0]?.value ?? '',
        totalUsers: this.parseInt(row.metricValues?.[0]?.value ?? undefined),
        sessions: this.parseInt(row.metricValues?.[1]?.value ?? undefined),
      }));

      const totalBrowserUsers = browserRows.reduce(
        (sum: number, r: BrowserRow) => sum + r.totalUsers,
        0,
      );
      const byBrowser = browserRows.map((r: BrowserRow) => ({
        ...r,
        percentage:
          totalBrowserUsers > 0
            ? parseFloat(((r.totalUsers / totalBrowserUsers) * 100).toFixed(2))
            : 0,
      }));

      const result: DevicesResponse = { period: { startDate, endDate }, byCategory, byBrowser };
      await this.cacheManager.set(cacheKey, result, 900000);
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Erreur API GA [getDevices]',
        error instanceof Error ? error.message : String(error),
      );
      throw new BadGatewayException('Erreur de communication avec Google Analytics');
    }
  }

  async getRealtime(): Promise<RealtimeResponse> {
    this.ensureConfigured();
    const cacheKey = `analytics:realtime:${this.propertyId}`;
    const cached = await this.cacheManager.get<RealtimeResponse>(cacheKey);
    if (cached) return cached;

    try {
      // FIX [ALPHA-006] Parallélisation des 3 appels runRealtimeReport
      // FIX [ALPHA-007] Ajout du timeout sur les 3 appels runRealtimeReport
      const [[pageResponse], [countryResponse], [deviceResponse]] = await this.withTimeout(
        Promise.all([
          this.analyticsClient.runRealtimeReport({
            property: `properties/${this.propertyId}`,
            dimensions: [{ name: 'unifiedScreenName' }],
            metrics: [{ name: 'activeUsers' }],
            limit: 20,
          }),
          this.analyticsClient.runRealtimeReport({
            property: `properties/${this.propertyId}`,
            dimensions: [{ name: 'country' }],
            metrics: [{ name: 'activeUsers' }],
            limit: 20,
          }),
          this.analyticsClient.runRealtimeReport({
            property: `properties/${this.propertyId}`,
            dimensions: [{ name: 'deviceCategory' }],
            metrics: [{ name: 'activeUsers' }],
          }),
        ]),
      );

      const byPage = (pageResponse.rows ?? []).map((row: GaRow) => ({
        page: row.dimensionValues?.[0]?.value ?? '',
        activeUsers: this.parseInt(row.metricValues?.[0]?.value ?? undefined),
      }));

      const byCountry = (countryResponse.rows ?? []).map((row: GaRow) => ({
        country: row.dimensionValues?.[0]?.value ?? '',
        activeUsers: this.parseInt(row.metricValues?.[0]?.value ?? undefined),
      }));

      const byDevice = (deviceResponse.rows ?? []).map((row: GaRow) => ({
        device: row.dimensionValues?.[0]?.value ?? '',
        activeUsers: this.parseInt(row.metricValues?.[0]?.value ?? undefined),
      }));

      const activeUsers = byPage.reduce(
        (sum: number, r: { page: string; activeUsers: number }) => sum + r.activeUsers,
        0,
      );

      const result: RealtimeResponse = {
        activeUsers,
        byPage,
        byCountry,
        byDevice,
        updatedAt: new Date().toISOString(),
      };

      await this.cacheManager.set(cacheKey, result, 30000);
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Erreur API GA [getRealtime]',
        error instanceof Error ? error.message : String(error),
      );
      throw new BadGatewayException('Erreur de communication avec Google Analytics');
    }
  }
}
