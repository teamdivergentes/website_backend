import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
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
} from './dto/analytics-response.dto';
import { AnalyticsOverviewService } from './analytics-overview.service';
import { AnalyticsPagesService } from './analytics-pages.service';
import { AnalyticsTrafficService } from './analytics-traffic.service';
import { AnalyticsRealtimeService } from './analytics-realtime.service';

@Injectable()
export class AnalyticsService {
  private readonly analyticsClient!: BetaAnalyticsDataClient;
  private readonly propertyId!: string;
  private readonly streamId: string | null = null;
  private readonly isConfigured: boolean = false;
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly overviewService: AnalyticsOverviewService,
    private readonly pagesService: AnalyticsPagesService,
    private readonly trafficService: AnalyticsTrafficService,
    private readonly realtimeService: AnalyticsRealtimeService,
  ) {
    const propertyId = process.env.GA_PROPERTY_ID;
    const streamId = process.env.GA_STREAM_ID;
    const clientEmail = process.env.GA_CLIENT_EMAIL;
    const privateKey = process.env.GA_PRIVATE_KEY?.replaceAll(String.raw`\n`, '\n');

    if (propertyId && clientEmail && privateKey) {
      if (!/^\d+$/.test(propertyId)) {
        this.logger.error('GA_PROPERTY_ID invalide : doit être un entier numérique');
        return;
      }

      if (streamId) {
        if (!/^\d+$/.test(streamId)) {
          this.logger.error('GA_STREAM_ID invalide : doit être un entier numérique');
          return;
        }
        this.streamId = streamId;
      } else {
        this.streamId = null;
      }

      try {
        this.analyticsClient = new BetaAnalyticsDataClient({
          credentials: { client_email: clientEmail, private_key: privateKey },
        });
        this.propertyId = propertyId;
        this.isConfigured = true;
        const streamSuffix = this.streamId
          ? ` (stream: ${this.streamId})`
          : ' (pas de filtre stream)';
        this.logger.log(`Google Analytics client configuré${streamSuffix}`);
      } catch {
        this.logger.error(
          "Erreur lors de l'initialisation du client Google Analytics. Vérifiez GA_PROPERTY_ID, GA_CLIENT_EMAIL et GA_PRIVATE_KEY.",
        );
      }
    } else {
      this.logger.warn(
        'Google Analytics non configuré - variables GA_PROPERTY_ID, GA_CLIENT_EMAIL, GA_PRIVATE_KEY manquantes',
      );
    }
  }

  getStatus(): { configured: boolean } {
    return { configured: this.isConfigured };
  }

  private ensureConfigured(): void {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        'Google Analytics non configuré. Veuillez définir les variables GA_PROPERTY_ID, GA_CLIENT_EMAIL et GA_PRIVATE_KEY.',
      );
    }
  }

  /** Retourne un dimensionFilter sur streamId si GA_STREAM_ID est configuré */
  private getStreamFilter(): object {
    if (!this.streamId) return {};
    return {
      dimensionFilter: {
        filter: {
          fieldName: 'streamId',
          stringFilter: { value: this.streamId },
        },
      },
    };
  }

  async getOverview(startDate: string, endDate: string): Promise<OverviewResponse> {
    this.ensureConfigured();
    return this.overviewService.getOverview(
      this.analyticsClient,
      this.propertyId,
      this.getStreamFilter(),
      startDate,
      endDate,
    );
  }

  async getVisitorsByDay(startDate: string, endDate: string): Promise<VisitorsResponse> {
    this.ensureConfigured();
    return this.overviewService.getVisitorsByDay(
      this.analyticsClient,
      this.propertyId,
      this.getStreamFilter(),
      startDate,
      endDate,
    );
  }

  async getTopPages(
    startDate: string,
    endDate: string,
    limit: number = 10,
  ): Promise<TopPagesResponse> {
    this.ensureConfigured();
    return this.pagesService.getTopPages(
      this.analyticsClient,
      this.propertyId,
      this.getStreamFilter(),
      startDate,
      endDate,
      limit,
    );
  }

  async getTrafficSources(startDate: string, endDate: string): Promise<TrafficSourcesResponse> {
    this.ensureConfigured();
    return this.trafficService.getTrafficSources(
      this.analyticsClient,
      this.propertyId,
      this.getStreamFilter(),
      startDate,
      endDate,
    );
  }

  async getGeography(startDate: string, endDate: string): Promise<GeoResponse> {
    this.ensureConfigured();
    return this.trafficService.getGeography(
      this.analyticsClient,
      this.propertyId,
      this.getStreamFilter(),
      startDate,
      endDate,
    );
  }

  async getDevices(startDate: string, endDate: string): Promise<DevicesResponse> {
    this.ensureConfigured();
    return this.trafficService.getDevices(
      this.analyticsClient,
      this.propertyId,
      this.getStreamFilter(),
      startDate,
      endDate,
    );
  }

  async getRealtime(): Promise<RealtimeResponse> {
    this.ensureConfigured();
    return this.realtimeService.getRealtime(
      this.analyticsClient,
      this.propertyId,
      this.streamId,
      this.getStreamFilter(),
    );
  }
}
