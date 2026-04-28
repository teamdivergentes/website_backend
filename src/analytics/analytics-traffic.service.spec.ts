import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { BetaAnalyticsDataClient } from '@google-analytics/data';
import { AnalyticsTrafficService } from './analytics-traffic.service';
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

describe('AnalyticsTrafficService', () => {
  let service: AnalyticsTrafficService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.set.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsTrafficService,
        AnalyticsCacheService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<AnalyticsTrafficService>(AnalyticsTrafficService);
  });

  describe('getTrafficSources', () => {
    const mockGaResponse = {
      rows: [
        {
          dimensionValues: [{ value: 'google' }, { value: 'organic' }, { value: 'Organic Search' }],
          metricValues: [{ value: '500' }, { value: '400' }, { value: '0.35' }],
        },
        {
          dimensionValues: [{ value: 'twitter.com' }, { value: 'referral' }, { value: 'Referral' }],
          metricValues: [{ value: '200' }, { value: '180' }, { value: '0.50' }],
        },
        {
          dimensionValues: [{ value: '(direct)' }, { value: '(none)' }, { value: 'Direct' }],
          metricValues: [{ value: '150' }, { value: '140' }, { value: '0.40' }],
        },
      ],
    };

    it('devrait retourner data et byChannel', async () => {
      mockRunReport.mockResolvedValue([mockGaResponse]);

      const result = await service.getTrafficSources(
        mockClient,
        '123456789',
        {},
        '2024-01-01',
        '2024-01-31',
      );

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('byChannel');
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toHaveProperty('source', 'google');
      expect(result.data[0]).toHaveProperty('medium', 'organic');
      expect(result.byChannel).toHaveLength(3);
    });

    it('ne devrait pas inclure channel dans data', async () => {
      mockRunReport.mockResolvedValue([mockGaResponse]);

      const result = await service.getTrafficSources(
        mockClient,
        '123456789',
        {},
        '2024-01-01',
        '2024-01-31',
      );
      expect(result.data[0]).not.toHaveProperty('channel');
    });

    it('devrait calculer le bounceRate pondéré par sessions dans byChannel', async () => {
      mockRunReport.mockResolvedValue([
        {
          rows: [
            {
              dimensionValues: [
                { value: 'google' },
                { value: 'organic' },
                { value: 'Organic Search' },
              ],
              metricValues: [{ value: '100' }, { value: '80' }, { value: '0.20' }],
            },
            {
              dimensionValues: [
                { value: 'bing' },
                { value: 'organic' },
                { value: 'Organic Search' },
              ],
              metricValues: [{ value: '400' }, { value: '300' }, { value: '0.60' }],
            },
          ],
        },
      ]);

      const result = await service.getTrafficSources(
        mockClient,
        '123456789',
        {},
        '2024-01-01',
        '2024-01-31',
      );
      const channel = result.byChannel.find((c) => c.channel === 'Organic Search');
      expect(channel).toBeDefined();
      // Moyenne pondérée : (0.20 * 100 + 0.60 * 400) / (100 + 400) = (20 + 240) / 500 = 0.52
      expect(channel!.bounceRate).toBeCloseTo(0.52, 4);
    });

    it('devrait retourner bounceRate 0 pour un canal sans sessions', async () => {
      mockRunReport.mockResolvedValue([
        {
          rows: [
            {
              dimensionValues: [{ value: '(direct)' }, { value: '(none)' }, { value: 'Direct' }],
              metricValues: [{ value: '0' }, { value: '0' }, { value: '0.50' }],
            },
          ],
        },
      ]);

      const result = await service.getTrafficSources(
        mockClient,
        '123456789',
        {},
        '2024-01-01',
        '2024-01-31',
      );
      const channel = result.byChannel.find((c) => c.channel === 'Direct');
      expect(channel!.bounceRate).toBe(0);
    });

    it('devrait retourner data: [], byChannel: [] quand rows est null', async () => {
      mockRunReport.mockResolvedValue([{ rows: null }]);

      const result = await service.getTrafficSources(
        mockClient,
        '123456789',
        {},
        '2024-01-01',
        '2024-01-31',
      );
      expect(result.data).toEqual([]);
      expect(result.byChannel).toEqual([]);
    });

    it('devrait lever BadGatewayException sur erreur réseau', async () => {
      mockRunReport.mockRejectedValue(new Error('Connection refused'));

      await expect(
        service.getTrafficSources(mockClient, '123456789', {}, '2024-01-01', '2024-01-31'),
      ).rejects.toThrow(BadGatewayException);
    });
  });

  describe('getGeography', () => {
    it('devrait retourner byCountry et byCity', async () => {
      mockRunReport
        .mockResolvedValueOnce([
          {
            rows: [
              {
                dimensionValues: [{ value: 'France' }, { value: 'FR' }],
                metricValues: [{ value: '800' }, { value: '1000' }],
              },
            ],
          },
        ])
        .mockResolvedValueOnce([
          {
            rows: [
              {
                dimensionValues: [{ value: 'Paris' }],
                metricValues: [{ value: '400' }, { value: '500' }],
              },
            ],
          },
        ]);

      const result = await service.getGeography(
        mockClient,
        '123456789',
        {},
        '2024-01-01',
        '2024-01-31',
      );

      expect(result.byCountry[0]).toHaveProperty('country', 'France');
      expect(result.byCountry[0]).toHaveProperty('countryId', 'FR');
      expect(result.byCity[0]).toHaveProperty('city', 'Paris');
    });

    it('devrait stocker en cache avec TTL 900000ms', async () => {
      mockRunReport.mockResolvedValue([{ rows: [] }]);

      await service.getGeography(mockClient, '123456789', {}, '2024-01-01', '2024-01-31');

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('analytics:geography'),
        expect.any(Object),
        900000,
      );
    });

    it('devrait lever BadGatewayException si le 2ème appel (cities) échoue', async () => {
      mockRunReport
        .mockResolvedValueOnce([{ rows: [] }])
        .mockRejectedValueOnce(new Error('Network error'));

      await expect(
        service.getGeography(mockClient, '123456789', {}, '2024-01-01', '2024-01-31'),
      ).rejects.toThrow(BadGatewayException);
    });

    it('devrait lever BadGatewayException si le 1er appel (countries) échoue', async () => {
      mockRunReport.mockRejectedValue(new Error('Network error'));

      await expect(
        service.getGeography(mockClient, '123456789', {}, '2024-01-01', '2024-01-31'),
      ).rejects.toThrow(BadGatewayException);
    });
  });

  describe('getDevices', () => {
    it('devrait retourner byCategory et byBrowser avec pourcentages', async () => {
      mockRunReport
        .mockResolvedValueOnce([
          {
            rows: [
              {
                dimensionValues: [{ value: 'desktop' }],
                metricValues: [{ value: '600' }, { value: '700' }],
              },
              {
                dimensionValues: [{ value: 'mobile' }],
                metricValues: [{ value: '300' }, { value: '350' }],
              },
              {
                dimensionValues: [{ value: 'tablet' }],
                metricValues: [{ value: '100' }, { value: '110' }],
              },
            ],
          },
        ])
        .mockResolvedValueOnce([
          {
            rows: [
              {
                dimensionValues: [{ value: 'Chrome' }],
                metricValues: [{ value: '700' }, { value: '800' }],
              },
              {
                dimensionValues: [{ value: 'Firefox' }],
                metricValues: [{ value: '300' }, { value: '360' }],
              },
            ],
          },
        ]);

      const result = await service.getDevices(
        mockClient,
        '123456789',
        {},
        '2024-01-01',
        '2024-01-31',
      );

      expect(result.byCategory).toHaveLength(3);
      expect(result.byBrowser).toHaveLength(2);
      const totalPercent = result.byCategory.reduce((s, c) => s + c.percentage, 0);
      expect(totalPercent).toBeCloseTo(100, 0);
    });

    it('devrait retourner des listes vides si rows est null', async () => {
      mockRunReport.mockResolvedValue([{ rows: null }]);

      const result = await service.getDevices(
        mockClient,
        '123456789',
        {},
        '2024-01-01',
        '2024-01-31',
      );
      expect(result.byCategory).toHaveLength(0);
      expect(result.byBrowser).toHaveLength(0);
    });

    it('devrait retourner percentage 0 si totalUsers est 0', async () => {
      mockRunReport.mockResolvedValue([
        {
          rows: [
            {
              dimensionValues: [{ value: 'desktop' }],
              metricValues: [{ value: '0' }, { value: '0' }],
            },
          ],
        },
      ]);

      const result = await service.getDevices(
        mockClient,
        '123456789',
        {},
        '2024-01-01',
        '2024-01-31',
      );
      expect(result.byCategory[0].percentage).toBe(0);
    });

    it('devrait lever BadGatewayException sur erreur réseau', async () => {
      mockRunReport.mockRejectedValue(new Error('Network error'));

      await expect(
        service.getDevices(mockClient, '123456789', {}, '2024-01-01', '2024-01-31'),
      ).rejects.toThrow(BadGatewayException);
    });
  });
});
