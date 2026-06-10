import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

/** Plages IP autorisées par défaut (loopback + Docker interne) */
const DEFAULT_ALLOWED_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/** Préfixe des plages Docker internes (172.16.0.0/12) */
const DOCKER_PRIVATE_PREFIX = /^172\.(1[6-9]|2\d|3[01])\./;

function isDockerRange(ip: string): boolean {
  return DOCKER_PRIVATE_PREFIX.test(ip);
}

function isDefaultAllowed(ip: string): boolean {
  return DEFAULT_ALLOWED_IPS.has(ip) || isDockerRange(ip);
}

function parseAllowedIps(): string[] | null {
  const raw = process.env['METRICS_ALLOWED_IPS'];
  if (!raw || raw.trim() === '') return null;
  return raw
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);
}

function isTrustProxyEnabled(): boolean {
  return process.env['TRUST_PROXY'] === 'true';
}

function resolveClientIp(req: Request): string {
  if (isTrustProxyEnabled()) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const firstIp = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
      if (firstIp) return firstIp;
    }
  }
  return req.ip ?? req.socket?.remoteAddress ?? '';
}

/**
 * SEC-009 — Restreint l'accès à /metrics par IP allowlist.
 *
 * Autorisation par défaut : loopback (127.0.0.1, ::1) + plage Docker 172.16–31.x.x
 * Configurable via la variable d'env METRICS_ALLOWED_IPS (liste séparée par virgules).
 * TRUST_PROXY=true active la lecture de X-Forwarded-For pour les déploiements derrière un reverse-proxy.
 */
@Injectable()
export class MetricsAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const clientIp = resolveClientIp(req);

    if (isDefaultAllowed(clientIp)) {
      return true;
    }

    const allowedIps = parseAllowedIps();
    if (allowedIps?.includes(clientIp)) {
      return true;
    }

    throw new ForbiddenException('Accès refusé : adresse IP non autorisée');
  }
}
