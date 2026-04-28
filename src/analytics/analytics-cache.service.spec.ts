import { Test, TestingModule } from '@nestjs/testing';
import { GatewayTimeoutException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AnalyticsCacheService } from './analytics-cache.service';

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
};

describe('AnalyticsCacheService', () => {
  let service: AnalyticsCacheService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.set.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsCacheService, { provide: CACHE_MANAGER, useValue: mockCacheManager }],
    }).compile();

    service = module.get<AnalyticsCacheService>(AnalyticsCacheService);
  });

  describe('sanitizeCacheKey', () => {
    it('devrait remplacer les caractères interdits par _', () => {
      expect(service.sanitizeCacheKey('analytics:overview:2024/01/01')).toBe(
        'analytics:overview:2024_01_01',
      );
    });

    it('devrait conserver les caractères autorisés', () => {
      expect(service.sanitizeCacheKey('analytics:overview:2024-01-01')).toBe(
        'analytics:overview:2024-01-01',
      );
    });
  });

  describe('withCache', () => {
    it('devrait retourner la valeur du cache si disponible', async () => {
      const cachedValue = { data: 'test' };
      mockCacheManager.get.mockResolvedValue(cachedValue);

      const fn = jest.fn().mockResolvedValue({ data: 'fresh' });
      const result = await service.withCache('test-key', 1000, fn);

      expect(result).toBe(cachedValue);
      expect(fn).not.toHaveBeenCalled();
    });

    it('devrait appeler fn et stocker le résultat si cache manquant', async () => {
      const freshValue = { data: 'fresh' };
      const fn = jest.fn().mockResolvedValue(freshValue);

      const result = await service.withCache('test-key', 5000, fn);

      expect(result).toEqual(freshValue);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(mockCacheManager.set).toHaveBeenCalledWith('test-key', freshValue, 5000);
    });

    it('devrait dédupliquer les requêtes en vol (inflight)', async () => {
      let resolve: (v: string) => void;
      const promise = new Promise<string>((r) => {
        resolve = r;
      });
      const fn = jest.fn().mockReturnValue(promise);

      const p1 = service.withCache('inflight-key', 1000, fn);
      const p2 = service.withCache('inflight-key', 1000, fn);

      resolve!('result');
      const [r1, r2] = await Promise.all([p1, p2]);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(r1).toBe('result');
      expect(r2).toBe('result');
    });

    it('devrait continuer si la lecture du cache échoue', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Redis down'));
      const fn = jest.fn().mockResolvedValue('fallback');

      const result = await service.withCache('error-key', 1000, fn);
      expect(result).toBe('fallback');
    });

    it("devrait ignorer silencieusement l'erreur d'écriture du cache", async () => {
      mockCacheManager.set.mockRejectedValue(new Error('Redis write fail'));
      const fn = jest.fn().mockResolvedValue('value');

      await expect(service.withCache('write-error-key', 1000, fn)).resolves.toBe('value');
    });
  });

  describe('withTimeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('devrait lever GatewayTimeoutException si la promesse dépasse le délai', async () => {
      const neverResolve = new Promise<never>(() => undefined);
      const promise = service.withTimeout(neverResolve, 100);

      jest.advanceTimersByTime(100);

      await expect(promise).rejects.toThrow(GatewayTimeoutException);
    });

    it('devrait résoudre si la promesse termine avant le délai', async () => {
      const fast = Promise.resolve('ok');
      const result = await service.withTimeout(fast, 5000);
      expect(result).toBe('ok');
    });
  });
});
