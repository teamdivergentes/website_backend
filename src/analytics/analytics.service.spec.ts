import { Test, TestingModule } from '@nestjs/testing';
// FIX [BETA-009] Import statique de GatewayTimeoutException pour le test timeout
import { ServiceUnavailableException, GatewayTimeoutException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AnalyticsService } from './analytics.service';

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
};

// Mock @google-analytics/data before module import
const mockRunReport = jest.fn();
const mockRunRealtimeReport = jest.fn();

jest.mock('@google-analytics/data', () => ({
  BetaAnalyticsDataClient: jest.fn().mockImplementation(() => ({
    runReport: mockRunReport,
    runRealtimeReport: mockRunRealtimeReport,
  })),
}));

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const setupEnv = (configured: boolean) => {
    if (configured) {
      process.env.GA_PROPERTY_ID = '123456789';
      process.env.GA_CLIENT_EMAIL = 'sa@project.iam.gserviceaccount.com';
      process.env.GA_PRIVATE_KEY =
        '-----BEGIN RSA PRIVATE KEY-----\\ntest\\n-----END RSA PRIVATE KEY-----';
    } else {
      delete process.env.GA_PROPERTY_ID;
      delete process.env.GA_CLIENT_EMAIL;
      delete process.env.GA_PRIVATE_KEY;
    }
  };

  const createService = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: CACHE_MANAGER, useValue: mockCacheManager }],
    }).compile();
    return module.get<AnalyticsService>(AnalyticsService);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.set.mockResolvedValue(undefined);
  });

  describe('Service non configuré', () => {
    beforeEach(() => setupEnv(false));

    it('devrait démarrer sans erreur quand les variables GA sont absentes', async () => {
      service = await createService();
      expect(service).toBeDefined();
    });

    it('devrait lever ServiceUnavailableException sur getOverview', async () => {
      service = await createService();
      await expect(service.getOverview('2024-01-01', '2024-01-31')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('devrait lever ServiceUnavailableException sur getVisitorsByDay', async () => {
      service = await createService();
      await expect(service.getVisitorsByDay('2024-01-01', '2024-01-31')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('devrait lever ServiceUnavailableException sur getRealtime', async () => {
      service = await createService();
      await expect(service.getRealtime()).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('Service configuré', () => {
    beforeEach(() => setupEnv(true));

    describe('getOverview', () => {
      const mockGaResponse = {
        rows: [
          {
            metricValues: [
              { value: '1000' }, // totalUsers
              { value: '800' }, // newUsers
              { value: '1200' }, // sessions
              { value: '3000' }, // screenPageViews
              { value: '120.5' }, // averageSessionDuration
              { value: '0.45' }, // bounceRate
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
        service = await createService();

        const result = await service.getOverview('2024-01-01', '2024-01-31');

        expect(result).toHaveProperty('period');
        expect(result).toHaveProperty('previousPeriod');
        expect(result).toHaveProperty('metrics');
        expect(result.metrics).toHaveProperty('totalUsers');
        expect(result.metrics.totalUsers).toHaveProperty('value');
        expect(result.metrics.totalUsers).toHaveProperty('previous');
        expect(result.metrics.totalUsers).toHaveProperty('changePercent');
        expect(result.period.startDate).toBe('2024-01-01');
        expect(result.period.endDate).toBe('2024-01-31');
      });

      it('devrait utiliser le cache si disponible', async () => {
        const cachedData = {
          period: { startDate: '2024-01-01', endDate: '2024-01-31' },
          previousPeriod: { startDate: '2023-12-01', endDate: '2023-12-31' },
          metrics: {},
        };
        mockCacheManager.get.mockResolvedValue(cachedData);
        service = await createService();

        const result = await service.getOverview('2024-01-01', '2024-01-31');

        expect(result).toBe(cachedData);
        expect(mockRunReport).not.toHaveBeenCalled();
      });

      it('devrait stocker le résultat en cache avec TTL 300000ms', async () => {
        mockRunReport.mockResolvedValue([mockGaResponse]);
        service = await createService();

        await service.getOverview('2024-01-01', '2024-01-31');

        expect(mockCacheManager.set).toHaveBeenCalledWith(
          expect.stringContaining('analytics:overview'),
          expect.any(Object),
          300000,
        );
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
        service = await createService();

        const result = await service.getOverview('2024-01-01', '2024-01-31');
        expect(result.metrics.totalUsers.changePercent).toBe(10);
      });

      it('devrait gérer le cas où previous = 0', async () => {
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
        service = await createService();

        const result = await service.getOverview('2024-01-01', '2024-01-31');
        expect(result.metrics.totalUsers.changePercent).toBe(100);
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
        service = await createService();

        const result = await service.getVisitorsByDay('2024-01-01', '2024-01-07');

        expect(result).toHaveProperty('period');
        expect(result).toHaveProperty('data');
        expect(result.data).toHaveLength(2);
        expect(result.data[0]).toHaveProperty('date', '20240101');
        expect(result.data[0]).toHaveProperty('totalUsers', 100);
        expect(result.data[0]).toHaveProperty('newUsers', 80);
        expect(result.data[0]).toHaveProperty('sessions', 120);
        expect(result.data[0]).toHaveProperty('pageViews', 300);
      });

      it('devrait stocker en cache avec TTL 600000ms', async () => {
        mockRunReport.mockResolvedValue([mockGaResponse]);
        service = await createService();

        await service.getVisitorsByDay('2024-01-01', '2024-01-07');

        expect(mockCacheManager.set).toHaveBeenCalledWith(
          expect.stringContaining('analytics:visitors'),
          expect.any(Object),
          600000,
        );
      });

      it('devrait retourner un tableau vide si GA ne retourne pas de rows', async () => {
        mockRunReport.mockResolvedValue([{ rows: [] }]);
        service = await createService();

        const result = await service.getVisitorsByDay('2024-01-01', '2024-01-07');
        expect(result.data).toHaveLength(0);
      });
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
        service = await createService();

        const result = await service.getTopPages('2024-01-01', '2024-01-31');

        expect(result.data).toHaveLength(2);
        expect(result.data[0]).toHaveProperty('path', '/');
        expect(result.data[0]).toHaveProperty('title', 'Accueil - Team Divergentes');
        expect(result.data[0]).toHaveProperty('pageViews', 5000);
      });

      it('devrait passer la limite à GA', async () => {
        mockRunReport.mockResolvedValue([{ rows: [] }]);
        service = await createService();

        await service.getTopPages('2024-01-01', '2024-01-31', 25);

        expect(mockRunReport).toHaveBeenCalledWith(expect.objectContaining({ limit: 25 }));
      });
    });

    describe('getTrafficSources', () => {
      const mockGaResponse = {
        rows: [
          {
            dimensionValues: [
              { value: 'google' },
              { value: 'organic' },
              { value: 'Organic Search' },
            ],
            metricValues: [{ value: '500' }, { value: '400' }, { value: '0.35' }],
          },
          {
            dimensionValues: [
              { value: 'twitter.com' },
              { value: 'referral' },
              { value: 'Referral' },
            ],
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
        service = await createService();

        const result = await service.getTrafficSources('2024-01-01', '2024-01-31');

        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('byChannel');
        expect(result.data).toHaveLength(3);
        expect(result.data[0]).toHaveProperty('source', 'google');
        expect(result.data[0]).toHaveProperty('medium', 'organic');
        expect(result.byChannel).toHaveLength(3);
        expect(result.byChannel[0]).toHaveProperty('channel');
        expect(result.byChannel[0]).toHaveProperty('sessions');
      });

      it('ne devrait pas inclure channel dans data', async () => {
        mockRunReport.mockResolvedValue([mockGaResponse]);
        service = await createService();

        const result = await service.getTrafficSources('2024-01-01', '2024-01-31');
        expect(result.data[0]).not.toHaveProperty('channel');
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

        service = await createService();
        const result = await service.getGeography('2024-01-01', '2024-01-31');

        expect(result).toHaveProperty('byCountry');
        expect(result).toHaveProperty('byCity');
        expect(result.byCountry[0]).toHaveProperty('country', 'France');
        expect(result.byCountry[0]).toHaveProperty('countryId', 'FR');
        expect(result.byCity[0]).toHaveProperty('city', 'Paris');
      });

      it('devrait stocker en cache avec TTL 900000ms', async () => {
        mockRunReport.mockResolvedValue([{ rows: [] }]);
        service = await createService();

        await service.getGeography('2024-01-01', '2024-01-31');

        expect(mockCacheManager.set).toHaveBeenCalledWith(
          expect.stringContaining('analytics:geography'),
          expect.any(Object),
          900000,
        );
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

        service = await createService();
        const result = await service.getDevices('2024-01-01', '2024-01-31');

        expect(result.byCategory).toHaveLength(3);
        expect(result.byBrowser).toHaveLength(2);
        expect(result.byCategory[0]).toHaveProperty('percentage');
        expect(result.byBrowser[0]).toHaveProperty('percentage');

        // Somme des pourcentages doit être ~100%
        const totalPercent = result.byCategory.reduce((s, c) => s + c.percentage, 0);
        expect(totalPercent).toBeCloseTo(100, 0);
      });
    });

    describe('getRealtime', () => {
      const mockPageResponse = {
        rows: [
          {
            dimensionValues: [{ value: '/' }],
            metricValues: [{ value: '12' }],
          },
          {
            dimensionValues: [{ value: '/structure/equipes' }],
            metricValues: [{ value: '5' }],
          },
        ],
      };

      const mockCountryResponse = {
        rows: [
          {
            dimensionValues: [{ value: 'France' }],
            metricValues: [{ value: '14' }],
          },
        ],
      };

      const mockDeviceResponse = {
        rows: [
          {
            dimensionValues: [{ value: 'desktop' }],
            metricValues: [{ value: '10' }],
          },
          {
            dimensionValues: [{ value: 'mobile' }],
            metricValues: [{ value: '7' }],
          },
        ],
      };

      it('devrait retourner les données temps réel', async () => {
        mockRunRealtimeReport
          .mockResolvedValueOnce([mockPageResponse])
          .mockResolvedValueOnce([mockCountryResponse])
          .mockResolvedValueOnce([mockDeviceResponse]);

        service = await createService();
        const result = await service.getRealtime();

        expect(result).toHaveProperty('activeUsers', 17);
        expect(result).toHaveProperty('byPage');
        expect(result).toHaveProperty('byCountry');
        expect(result).toHaveProperty('byDevice');
        expect(result).toHaveProperty('updatedAt');
        expect(result.byPage).toHaveLength(2);
        expect(result.byPage[0]).toHaveProperty('page', '/');
        expect(result.byPage[0]).toHaveProperty('activeUsers', 12);
      });

      it('devrait stocker en cache avec TTL 30000ms', async () => {
        mockRunRealtimeReport.mockResolvedValue([{ rows: [] }]);
        service = await createService();

        await service.getRealtime();

        expect(mockCacheManager.set).toHaveBeenCalledWith(
          'analytics:realtime',
          expect.any(Object),
          30000,
        );
      });

      it('devrait utiliser runRealtimeReport et non runReport', async () => {
        mockRunRealtimeReport.mockResolvedValue([{ rows: [] }]);
        service = await createService();

        await service.getRealtime();

        expect(mockRunRealtimeReport).toHaveBeenCalled();
        expect(mockRunReport).not.toHaveBeenCalled();
      });
    });

    // FIX [BETA-009] Tests des cas d'erreur de l'API GA
    describe('Gestion des erreurs API Google Analytics', () => {
      describe('Erreur 403 - Accès refusé', () => {
        it("devrait propager l'erreur 403 de GA sur getOverview", async () => {
          const error403 = Object.assign(new Error('Permission denied'), { code: 403 });
          mockRunReport.mockRejectedValue(error403);
          service = await createService();

          await expect(service.getOverview('2024-01-01', '2024-01-31')).rejects.toThrow(
            'Permission denied',
          );
        });

        it("devrait propager l'erreur 403 de GA sur getVisitorsByDay", async () => {
          const error403 = Object.assign(new Error('Permission denied'), { code: 403 });
          mockRunReport.mockRejectedValue(error403);
          service = await createService();

          await expect(service.getVisitorsByDay('2024-01-01', '2024-01-31')).rejects.toThrow(
            'Permission denied',
          );
        });
      });

      describe('Erreur 429 - Quota dépassé', () => {
        it("devrait propager l'erreur 429 de GA sur getTopPages", async () => {
          const error429 = Object.assign(new Error('Quota exceeded'), { code: 429 });
          mockRunReport.mockRejectedValue(error429);
          service = await createService();

          await expect(service.getTopPages('2024-01-01', '2024-01-31')).rejects.toThrow(
            'Quota exceeded',
          );
        });

        it("devrait propager l'erreur 429 de GA sur getRealtime", async () => {
          const error429 = Object.assign(new Error('Quota exceeded'), { code: 429 });
          mockRunRealtimeReport.mockRejectedValue(error429);
          service = await createService();

          await expect(service.getRealtime()).rejects.toThrow('Quota exceeded');
        });
      });

      describe('Réponse avec rows=null (pas undefined)', () => {
        it('devrait retourner un tableau vide sur getVisitorsByDay quand rows est null', async () => {
          mockRunReport.mockResolvedValue([{ rows: null }]);
          service = await createService();

          const result = await service.getVisitorsByDay('2024-01-01', '2024-01-07');
          expect(result.data).toHaveLength(0);
        });

        it('devrait retourner des listes vides sur getTopPages quand rows est null', async () => {
          mockRunReport.mockResolvedValue([{ rows: null }]);
          service = await createService();

          const result = await service.getTopPages('2024-01-01', '2024-01-31');
          expect(result.data).toHaveLength(0);
        });

        it('devrait retourner des listes vides sur getRealtime quand rows est null', async () => {
          mockRunRealtimeReport.mockResolvedValue([{ rows: null }]);
          service = await createService();

          const result = await service.getRealtime();
          expect(result.byPage).toHaveLength(0);
          expect(result.byCountry).toHaveLength(0);
          expect(result.byDevice).toHaveLength(0);
          expect(result.activeUsers).toBe(0);
        });

        it('devrait retourner 0 sur getOverview quand rows est null', async () => {
          mockRunReport.mockResolvedValue([{ rows: null }]);
          service = await createService();

          const result = await service.getOverview('2024-01-01', '2024-01-31');
          expect(result.metrics.totalUsers.value).toBe(0);
          expect(result.metrics.sessions.value).toBe(0);
        });
      });

      describe("Timeout de l'API GA", () => {
        // Utilisation des fake timers pour éviter les timers pendants qui empêchent Jest de terminer
        beforeEach(() => {
          jest.useFakeTimers();
        });

        afterEach(() => {
          jest.useRealTimers();
        });

        it("devrait lever GatewayTimeoutException si l'API GA ne répond pas dans les délais", async () => {
          service = await createService();

          // On accède à la méthode privée via un cast explicitement typé
          const serviceAny = service as unknown as {
            withTimeout: <T>(p: Promise<T>, ms: number) => Promise<T>;
          };

          // FIX [BETA-009] Import statique GatewayTimeoutException utilisé (voir imports en haut du fichier)
          // On démarre l'assertion sur une promesse qui ne se résout jamais avec un timeout de 100ms
          const promise = serviceAny.withTimeout(new Promise<never>(() => undefined), 100);

          // On avance les timers de 100ms pour déclencher le timeout
          jest.advanceTimersByTime(100);

          await expect(promise).rejects.toThrow(GatewayTimeoutException);
        });
      });
    });

    describe('Gestion du cache', () => {
      it('chaque endpoint doit avoir une clé de cache unique par période', async () => {
        mockRunReport.mockResolvedValue([{ rows: [] }]);
        mockRunRealtimeReport.mockResolvedValue([{ rows: [] }]);
        service = await createService();

        await service.getOverview('2024-01-01', '2024-01-31');
        await service.getVisitorsByDay('2024-01-01', '2024-01-31');
        await service.getTopPages('2024-01-01', '2024-01-31');

        const setCalls = mockCacheManager.set.mock.calls.map(
          (c: [string, unknown, number]) => c[0],
        );
        expect(new Set(setCalls).size).toBe(setCalls.length);
      });
    });
  });
});
