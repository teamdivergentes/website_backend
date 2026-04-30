import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { BetaAnalyticsDataClient } from '@google-analytics/data';
import { AnalyticsOverviewService } from './analytics-overview.service';
import { AnalyticsCacheService } from './analytics-cache.service';

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockRunReport = jest.fn();

jest.mock('@google-analytics/data', () => ({
  BetaAnalyticsDataClient: jest.fn().mockImplementation(() => ({
    runReport: mockRunReport,
  })),
}));

const mockClient = { runReport: mockRunReport } as unknown as BetaAnalyticsDataClient;

describe('AnalyticsOverviewService', () => {
  let service: AnalyticsOverviewService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.set.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsOverviewService,
        AnalyticsCacheService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<AnalyticsOverviewService>(AnalyticsOverviewService);
  });

  describe('getOverview', () => {
    const mockGaResponse = {
      rows: [
        {
          metricValues: [
            { value: '1000' },
            { value: '800' },
            { value: '1200' },
            { value: '3000' },
            { value: '120.5' },
            { value: '0.45' },
          ],
        },
        {
          metricValues: [
            { value: '900' },
            { value: '700' },
            { value: '1100' },
            { value: '2700' },
            { value: '110.0' },
            { value: '0.50' },
          ],
        },
      ],
    };

    it('devrait retourner les KPIs avec comparaison', async () => {
      mockRunReport.mockResolvedValue([mockGaResponse]);

      const result = await service.getOverview(
        mockClient,
        '123456789',
        {},
        '2024-01-01',
        '2024-01-31',
      );

      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('previousPeriod');
      expect(result).toHaveProperty('metrics');
      expect(result.metrics.totalUsers).toHaveProperty('value', 1000);
      expect(result.metrics.totalUsers).toHaveProperty('previous', 900);
      expect(result.metrics.totalUsers).toHaveProperty('changePercent');
      expect(result.period.startDate).toBe('2024-01-01');
    });

    it('devrait calculer correctement le pourcentage de changement', async () => {
      mockRunReport.mockResolvedValue([
        {
          rows: [
            {
              metricValues: [
                { value: '1100' },
                { value: '0' },
                { value: '0' },
                { value: '0' },
                { value: '0' },
                { value: '0' },
              ],
            },
            {
              metricValues: [
                { value: '1000' },
                { value: '0' },
                { value: '0' },
                { value: '0' },
                { value: '0' },
                { value: '0' },
              ],
            },
          ],
        },
      ]);

      const result = await service.getOverview(
        mockClient,
        '123456789',
        {},
        '2024-01-01',
        '2024-01-31',
      );
      expect(result.metrics.totalUsers.changePercent).toBe(10);
    });

    it('devrait gérer le cas où previous = 0 (changePercent = 100)', async () => {
      mockRunReport.mockResolvedValue([
        {
          rows: [
            {
              metricValues: [
                { value: '500' },
                { value: '0' },
                { value: '0' },
                { value: '0' },
                { value: '0' },
                { value: '0' },
              ],
            },
            {
              metricValues: [
                { value: '0' },
                { value: '0' },
                { value: '0' },
                { value: '0' },
                { value: '0' },
                { value: '0' },
              ],
            },
          ],
        },
      ]);

      const result = await service.getOverview(
        mockClient,
        '123456789',
        {},
        '2024-01-01',
        '2024-01-31',
      );
      expect(result.metrics.totalUsers.changePercent).toBe(100);
    });

    it('devrait retourner 0 si rows est null', async () => {
      mockRunReport.mockResolvedValue([{ rows: null }]);

      const result = await service.getOverview(
        mockClient,
        '123456789',
        {},
        '2024-01-01',
        '2024-01-31',
      );
      expect(result.metrics.totalUsers.value).toBe(0);
      expect(result.metrics.sessions.value).toBe(0);
    });

    it('devrait utiliser le cache si disponible', async () => {
      const cachedData = {
        period: { startDate: '2024-01-01', endDate: '2024-01-31' },
        previousPeriod: { startDate: '2023-12-01', endDate: '2023-12-31' },
        metrics: {},
      };
      mockCacheManager.get.mockResolvedValue(cachedData);

      const result = await service.getOverview(
        mockClient,
        '123456789',
        {},
        '2024-01-01',
        '2024-01-31',
      );

      expect(result).toBe(cachedData);
      expect(mockRunReport).not.toHaveBeenCalled();
    });

    it('devrait stocker en cache avec TTL 300000ms', async () => {
      mockRunReport.mockResolvedValue([mockGaResponse]);

      await service.getOverview(mockClient, '123456789', {}, '2024-01-01', '2024-01-31');

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('analytics:overview'),
        expect.any(Object),
        300000,
      );
    });

    it('devrait lever BadGatewayException sur erreur réseau', async () => {
      mockRunReport.mockRejectedValue(new Error('Connection refused'));

      await expect(
        service.getOverview(mockClient, '123456789', {}, '2024-01-01', '2024-01-31'),
      ).rejects.toThrow(BadGatewayException);
    });

    it('devrait lever BadGatewayException sur erreur gRPC 403', async () => {
      const error403 = Object.assign(new Error('Permission denied'), { code: 403 });
      mockRunReport.mockRejectedValue(error403);

      await expect(
        service.getOverview(mockClient, '123456789', {}, '2024-01-01', '2024-01-31'),
      ).rejects.toThrow(BadGatewayException);
    });
  });

  describe('getVisitorsByDay', () => {
    const mockGaResponse = {
      rows: [
        {
          dimensionValues: [{ value: '20240101' }],
          metricValues: [{ value: '100' }, { value: '80' }, { value: '120' }, { value: '300' }],
        },
        {
          dimensionValues: [{ value: '20240102' }],
          metricValues: [{ value: '150' }, { value: '120' }, { value: '180' }, { value: '450' }],
        },
      ],
    };

    it('devrait retourner les données quotidiennes', async () => {
      mockRunReport.mockResolvedValue([mockGaResponse]);

      const result = await service.getVisitorsByDay(
        mockClient,
        '123456789',
        {},
        '2024-01-01',
        '2024-01-07',
      );

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toHaveProperty('date', '20240101');
      expect(result.data[0]).toHaveProperty('totalUsers', 100);
      expect(result.data[0]).toHaveProperty('newUsers', 80);
      expect(result.data[0]).toHaveProperty('sessions', 120);
      expect(result.data[0]).toHaveProperty('pageViews', 300);
    });

    it('devrait stocker en cache avec TTL 600000ms', async () => {
      mockRunReport.mockResolvedValue([mockGaResponse]);

      await service.getVisitorsByDay(mockClient, '123456789', {}, '2024-01-01', '2024-01-07');

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('analytics:visitors'),
        expect.any(Object),
        600000,
      );
    });

    it('devrait retourner un tableau vide si rows est vide', async () => {
      mockRunReport.mockResolvedValue([{ rows: [] }]);

      const result = await service.getVisitorsByDay(
        mockClient,
        '123456789',
        {},
        '2024-01-01',
        '2024-01-07',
      );
      expect(result.data).toHaveLength(0);
    });

    it('devrait retourner un tableau vide si rows est null', async () => {
      mockRunReport.mockResolvedValue([{ rows: null }]);

      const result = await service.getVisitorsByDay(
        mockClient,
        '123456789',
        {},
        '2024-01-01',
        '2024-01-07',
      );
      expect(result.data).toHaveLength(0);
    });

    it('devrait lever BadGatewayException sur erreur gRPC 403', async () => {
      const error403 = Object.assign(new Error('Permission denied'), { code: 403 });
      mockRunReport.mockRejectedValue(error403);

      await expect(
        service.getVisitorsByDay(mockClient, '123456789', {}, '2024-01-01', '2024-01-31'),
      ).rejects.toThrow(BadGatewayException);
    });
  });
});
