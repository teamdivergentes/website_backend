import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { BetaAnalyticsDataClient } from '@google-analytics/data';
import { AnalyticsPagesService } from './analytics-pages.service';
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

describe('AnalyticsPagesService', () => {
  let service: AnalyticsPagesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.set.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsPagesService,
        AnalyticsCacheService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<AnalyticsPagesService>(AnalyticsPagesService);
  });

  describe('getTopPages', () => {
    const mockGaResponse = {
      rows: [
        {
          dimensionValues: [{ value: '/' }, { value: 'Accueil - Team Divergentes' }],
          metricValues: [
            { value: '5000' },
            { value: '3000' },
            { value: '90.0' },
            { value: '0.30' },
          ],
        },
        {
          dimensionValues: [
            { value: '/structure/equipes' },
            { value: 'Équipes - Team Divergentes' },
          ],
          metricValues: [
            { value: '2000' },
            { value: '1500' },
            { value: '75.0' },
            { value: '0.40' },
          ],
        },
      ],
    };

    it('devrait retourner les pages les plus vues', async () => {
      mockRunReport.mockResolvedValue([mockGaResponse]);

      const result = await service.getTopPages(
        mockClient,
        '123456789',
        {},
        '2024-01-01',
        '2024-01-31',
      );

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toHaveProperty('path', '/');
      expect(result.data[0]).toHaveProperty('title', 'Accueil - Team Divergentes');
      expect(result.data[0]).toHaveProperty('pageViews', 5000);
      expect(result.data[0]).toHaveProperty('totalUsers', 3000);
      expect(result.data[0]).toHaveProperty('avgSessionDuration', 90);
      expect(result.data[0]).toHaveProperty('bounceRate', 0.3);
    });

    it('devrait passer la limite à GA', async () => {
      mockRunReport.mockResolvedValue([{ rows: [] }]);

      await service.getTopPages(mockClient, '123456789', {}, '2024-01-01', '2024-01-31', 25);

      expect(mockRunReport).toHaveBeenCalledWith(expect.objectContaining({ limit: 25 }));
    });

    it('devrait utiliser 10 comme limite par défaut', async () => {
      mockRunReport.mockResolvedValue([{ rows: [] }]);

      await service.getTopPages(mockClient, '123456789', {}, '2024-01-01', '2024-01-31');

      expect(mockRunReport).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }));
    });

    it('devrait stocker en cache avec TTL 300000ms', async () => {
      mockRunReport.mockResolvedValue([mockGaResponse]);

      await service.getTopPages(mockClient, '123456789', {}, '2024-01-01', '2024-01-31');

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('analytics:top-pages'),
        expect.any(Object),
        300000,
      );
    });

    it('devrait retourner un tableau vide si rows est null', async () => {
      mockRunReport.mockResolvedValue([{ rows: null }]);

      const result = await service.getTopPages(
        mockClient,
        '123456789',
        {},
        '2024-01-01',
        '2024-01-31',
      );
      expect(result.data).toHaveLength(0);
    });

    it('devrait lever BadGatewayException sur erreur gRPC 429', async () => {
      const error429 = Object.assign(new Error('Quota exceeded'), { code: 429 });
      mockRunReport.mockRejectedValue(error429);

      await expect(
        service.getTopPages(mockClient, '123456789', {}, '2024-01-01', '2024-01-31'),
      ).rejects.toThrow(BadGatewayException);
    });

    it('devrait lever BadGatewayException sur erreur réseau', async () => {
      mockRunReport.mockRejectedValue(new Error('Connection refused'));

      await expect(
        service.getTopPages(mockClient, '123456789', {}, '2024-01-01', '2024-01-31'),
      ).rejects.toThrow(BadGatewayException);
    });
  });
});
