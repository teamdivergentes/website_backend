import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { MetricsAccessGuard } from './metrics-access.guard';

function makeContext(
  remoteAddress: string,
  forwardedFor?: string,
  _trustProxy = false,
): ExecutionContext {
  const req = {
    ip: remoteAddress,
    socket: { remoteAddress },
    headers: {
      ...(forwardedFor ? { 'x-forwarded-for': forwardedFor } : {}),
    },
  };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
}

describe('MetricsAccessGuard', () => {
  afterEach(() => {
    delete process.env['METRICS_ALLOWED_IPS'];
    delete process.env['TRUST_PROXY'];
  });

  // -------------------------------------------------------------------------
  // IP loopback autorisées par défaut
  // -------------------------------------------------------------------------
  describe('loopback autorisé par défaut (sans METRICS_ALLOWED_IPS)', () => {
    it('autorise 127.0.0.1', () => {
      const guard = new MetricsAccessGuard();
      const ctx = makeContext('127.0.0.1');
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('autorise ::1', () => {
      const guard = new MetricsAccessGuard();
      const ctx = makeContext('::1');
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('autorise le loopback IPv4-mapped IPv6', () => {
      const guard = new MetricsAccessGuard();
      const ctx = makeContext('::ffff:127.0.0.1');
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('autorise la plage Docker 172.x.x.x', () => {
      const guard = new MetricsAccessGuard();
      const ctx = makeContext('172.20.0.5');
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // IP externe non listée → 403
  // -------------------------------------------------------------------------
  describe('IP externe non autorisée → 403', () => {
    it('bloque une IP publique non listée', () => {
      const guard = new MetricsAccessGuard();
      const ctx = makeContext('8.8.8.8');
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('bloque 192.168.1.100 si non listée', () => {
      const guard = new MetricsAccessGuard();
      const ctx = makeContext('192.168.1.100');
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  // -------------------------------------------------------------------------
  // METRICS_ALLOWED_IPS configurée
  // -------------------------------------------------------------------------
  describe('METRICS_ALLOWED_IPS configurée', () => {
    it('autorise une IP présente dans METRICS_ALLOWED_IPS', () => {
      process.env['METRICS_ALLOWED_IPS'] = '10.0.0.5,10.0.0.6';
      const guard = new MetricsAccessGuard();
      const ctx = makeContext('10.0.0.5');
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it("bloque une IP absente de METRICS_ALLOWED_IPS même si elle n'est pas publique", () => {
      process.env['METRICS_ALLOWED_IPS'] = '10.0.0.5';
      const guard = new MetricsAccessGuard();
      const ctx = makeContext('10.0.0.99');
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('autorise loopback même si METRICS_ALLOWED_IPS est défini', () => {
      process.env['METRICS_ALLOWED_IPS'] = '10.0.0.5';
      const guard = new MetricsAccessGuard();
      const ctx = makeContext('127.0.0.1');
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('normalise les IP IPv4-mapped configurées', () => {
      process.env['METRICS_ALLOWED_IPS'] = '10.0.0.5';
      const guard = new MetricsAccessGuard();
      const ctx = makeContext('::ffff:10.0.0.5');
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // TRUST_PROXY + X-Forwarded-For
  // -------------------------------------------------------------------------
  describe('TRUST_PROXY activé → lecture X-Forwarded-For', () => {
    it('utilise X-Forwarded-For si TRUST_PROXY=true et IP autorisée', () => {
      process.env['METRICS_ALLOWED_IPS'] = '10.0.0.5';
      process.env['TRUST_PROXY'] = 'true';
      const guard = new MetricsAccessGuard();
      const ctx = makeContext('172.20.0.1', '10.0.0.5');
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('bloque si X-Forwarded-For contient une IP non autorisée (TRUST_PROXY=true)', () => {
      process.env['METRICS_ALLOWED_IPS'] = '10.0.0.5';
      process.env['TRUST_PROXY'] = 'true';
      const guard = new MetricsAccessGuard();
      const ctx = makeContext('172.20.0.1', '8.8.8.8');
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('ignore X-Forwarded-For si TRUST_PROXY non activé', () => {
      process.env['METRICS_ALLOWED_IPS'] = '10.0.0.5';
      const guard = new MetricsAccessGuard();
      // remoteAddress = 10.0.0.5 (autorisé), XFF = 8.8.8.8 (ignoré)
      const ctx = makeContext('10.0.0.5', '8.8.8.8', false);
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });
});
