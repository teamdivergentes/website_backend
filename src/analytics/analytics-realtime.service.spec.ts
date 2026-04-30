import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { BetaAnalyticsDataClient } from '@google-analytics/data';
import { AnalyticsRealtimeService } from './analytics-realtime.service';
import { AnalyticsCacheService } from './analytics-cache.service';

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockRunRealtimeReport = jest.fn();

jest.mock('@google-analytics/data', () => ({
  BetaAnalyticsDataClient: jest.fn().mockImplementation(() => ({
    runRealtimeReport: mockRunRealtimeReport,
  })),
}));

const mockClient = {
  runRealtimeReport: mockRunRealtimeReport,
} as unknown as BetaAnalyticsDataClient;

describe('AnalyticsRealtimeService', () => {
  let service: AnalyticsRealtimeService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.set.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsRealtimeService,
        AnalyticsCacheService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<AnalyticsRealtimeService>(AnalyticsRealtimeService);
  });

  describe('getRealtime', () => {
    const mockPageResponse = {
      rows: [
        { dimensionValues: [{ value: '/' }], metricValues: [{ value: '12' }] },
        { dimensionValues: [{ value: '/structure/equipes' }], metricValues: [{ value: '5' }] },
      ],
    };
    const mockCountryResponse = {
      rows: [{ dimensionValues: [{ value: 'France' }], metricValues: [{ value: '14' }] }],
    };
    const mockDeviceResponse = {
      rows: [
        { dimensionValues: [{ value: 'desktop' }], metricValues: [{ value: '10' }] },
        { dimensionValues: [{ value: 'mobile' }], metricValues: [{ value: '7' }] },
      ],
    };

    it('devrait retourner les données temps réel avec activeUsers agrégés', async () => {
      mockRunRealtimeReport
        .mockResolvedValueOnce([mockPageResponse])
        .mockResolvedValueOnce([mockCountryResponse])
        .mockResolvedValueOnce([mockDeviceResponse]);

      const result = await service.getRealtime(mockClient, '123456789', null, {});

      expect(result.activeUsers).toBe(17);
      expect(result.byPage).toHaveLength(2);
      expect(result.byPage[0]).toHaveProperty('page', '/');
      expect(result.byPage[0]).toHaveProperty('activeUsers', 12);
      expect(result).toHaveProperty('updatedAt');
    });

    it('devrait stocker en cache avec TTL 30000ms (sans streamId)', async () => {
      mockRunRealtimeReport.mockResolvedValue([{ rows: [] }]);

      await service.getRealtime(mockClient, '123456789', null, {});

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'analytics:realtime:123456789',
        expect.any(Object),
        30000,
      );
    });

    it('devrait inclure le streamId dans la clé de cache si fourni', async () => {
      mockRunRealtimeReport.mockResolvedValue([{ rows: [] }]);

      await service.getRealtime(mockClient, '123456789', '987654321', {});

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'analytics:realtime:123456789:987654321',
        expect.any(Object),
        30000,
      );
    });

    it('devrait retourner des listes vides si rows est null', async () => {
      mockRunRealtimeReport.mockResolvedValue([{ rows: null }]);

      const result = await service.getRealtime(mockClient, '123456789', null, {});
      expect(result.byPage).toHaveLength(0);
      expect(result.byCountry).toHaveLength(0);
      expect(result.byDevice).toHaveLength(0);
      expect(result.activeUsers).toBe(0);
    });

    it('devrait utiliser runRealtimeReport exclusivement', async () => {
      const mockRunReport = jest.fn();
      mockRunRealtimeReport.mockResolvedValue([{ rows: [] }]);

      await service.getRealtime(mockClient, '123456789', null, {});

      expect(mockRunRealtimeReport).toHaveBeenCalled();
      expect(mockRunReport).not.toHaveBeenCalled();
    });

    it('devrait lever BadGatewayException sur erreur gRPC 429', async () => {
      const error429 = Object.assign(new Error('Quota exceeded'), { code: 429 });
      mockRunRealtimeReport.mockRejectedValue(error429);

      await expect(service.getRealtime(mockClient, '123456789', null, {})).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('devrait lever BadGatewayException sur erreur réseau', async () => {
      mockRunRealtimeReport.mockRejectedValue(new Error('Connection refused'));

      await expect(service.getRealtime(mockClient, '123456789', null, {})).rejects.toThrow(
        BadGatewayException,
      );
    });
  });
});
