import { Injectable, Inject, Logger, GatewayTimeoutException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { GA_API_TIMEOUT_MS } from './analytics.helpers';

@Injectable()
export class AnalyticsCacheService {
  private readonly logger = new Logger(AnalyticsCacheService.name);
  private inflightRequests = new Map<string, Promise<unknown>>();

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  sanitizeCacheKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9:\-_]/g, '_');
  }

  async withCache<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const safeKey = this.sanitizeCacheKey(key);

    let cached: T | undefined;
    try {
      cached = (await this.cacheManager.get<T>(safeKey)) ?? undefined;
    } catch (err: unknown) {
      this.logger.warn(
        `Échec de lecture du cache pour "${safeKey}" : ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (cached !== undefined) return cached;

    const inflight = this.inflightRequests.get(safeKey) as Promise<T> | undefined;
    if (inflight) return inflight;

    const promise = fn()
      .then(async (result) => {
        await this.cacheManager.set(safeKey, result, ttl).catch((err: unknown) => {
          this.logger.warn(
            `Échec d'écriture du cache pour "${safeKey}" : ${err instanceof Error ? err.message : String(err)}`,
          );
        });
        return result;
      })
      .finally(() => {
        this.inflightRequests.delete(safeKey);
      });

    this.inflightRequests.set(safeKey, promise);
    return promise;
  }

  // Wrapper qui ajoute un timeout sur tout appel à l'API GA
  // FIX [ALPHA-PERF-001/ALPHA-RES-002] Annulation du timer via .finally() pour éviter les fuites
  withTimeout<T>(promise: Promise<T>, timeoutMs: number = GA_API_TIMEOUT_MS): Promise<T> {
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
}
