export interface MetricWithComparison {
  value: number;
  previous: number;
  changePercent: number;
}

export interface OverviewResponse {
  period: { startDate: string; endDate: string };
  previousPeriod: { startDate: string; endDate: string };
  metrics: {
    totalUsers: MetricWithComparison;
    newUsers: MetricWithComparison;
    sessions: MetricWithComparison;
    pageViews: MetricWithComparison;
    avgSessionDuration: MetricWithComparison;
    bounceRate: MetricWithComparison;
  };
}

export interface DailyVisitor {
  date: string;
  totalUsers: number;
  newUsers: number;
  sessions: number;
  pageViews: number;
}

export interface VisitorsResponse {
  period: { startDate: string; endDate: string };
  data: DailyVisitor[];
}

export interface TopPage {
  path: string;
  title: string;
  pageViews: number;
  totalUsers: number;
  avgSessionDuration: number;
  bounceRate: number;
}

export interface TopPagesResponse {
  period: { startDate: string; endDate: string };
  data: TopPage[];
}

export interface TrafficSource {
  source: string;
  medium: string;
  sessions: number;
  totalUsers: number;
  bounceRate: number;
}

export interface TrafficChannel {
  channel: string;
  sessions: number;
  totalUsers: number;
  bounceRate: number;
}

export interface TrafficSourcesResponse {
  period: { startDate: string; endDate: string };
  data: TrafficSource[];
  byChannel: TrafficChannel[];
}

export interface GeoCountry {
  country: string;
  countryId: string;
  totalUsers: number;
  sessions: number;
}

export interface GeoCity {
  city: string;
  totalUsers: number;
  sessions: number;
}

export interface GeoResponse {
  period: { startDate: string; endDate: string };
  byCountry: GeoCountry[];
  byCity: GeoCity[];
}

export interface DeviceCategory {
  category: string;
  totalUsers: number;
  sessions: number;
  percentage: number;
}

export interface DeviceBrowser {
  browser: string;
  totalUsers: number;
  sessions: number;
  percentage: number;
}

export interface DevicesResponse {
  period: { startDate: string; endDate: string };
  byCategory: DeviceCategory[];
  byBrowser: DeviceBrowser[];
}

export interface RealtimePage {
  page: string;
  activeUsers: number;
}

export interface RealtimeCountry {
  country: string;
  activeUsers: number;
}

export interface RealtimeDevice {
  device: string;
  activeUsers: number;
}

export interface RealtimeResponse {
  activeUsers: number;
  byPage: RealtimePage[];
  byCountry: RealtimeCountry[];
  byDevice: RealtimeDevice[];
  updatedAt: string;
}
