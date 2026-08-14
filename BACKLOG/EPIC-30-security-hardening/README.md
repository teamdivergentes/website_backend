# EPIC-30 — Durcissement sécurité (post-audit prod 2026-05-27)

## Objectif

Corriger les vulnérabilités identifiées lors de l'audit sécurité complet de la production du 2026-05-27. Deux failles **CRITIQUES** exposent une escalade de privilèges et une compromission d'authentification.

## Priorité

**HAUTE** — contient 2 findings critiques. SEC-001 et SEC-002 doivent idéalement faire l'objet d'un **hotfix immédiat hors cycle backlog** (escalade admin + secret forgeable).

## Contexte

Audit mené par l'agent Red Team sur le code backend/frontend + config Nginx/Ansible + tests non intrusifs en prod. 14 findings classés OWASP Top 10. Rapport complet : `audit/RAPPORT-AUDIT-PROD-2026-05-27.md`.

## Enablers / findings

| Enabler | Sévérité | OWASP | Fichier principal | Claude | PO | E2E | Livré |
|---------|----------|-------|-------------------|--------|----|----|-------|
| SEC-001 : `@UseGuards(RolesGuard)` sur POST /api/auth/register | 🔴 CRITIQUE | A01 | `backend/src/auth/auth.controller.ts` | Fait | A faire | A faire | Fait |
| SEC-002 : fail-fast si JWT_SECRET absent (supprimer fallback en dur) | 🔴 CRITIQUE | A02/A05 | `backend/src/auth/auth.module.ts`, `jwt.strategy.ts` | Fait | A faire | A faire | Fait |
| SEC-003 : durcir SSRF link-meta (résoudre DNS + valider IP, `redirect: manual`) | 🟠 HAUTE | A03 | `backend/src/articles/link-meta.service.ts` | Fait | A faire | A faire | Fait |
| SEC-005 : `@MaxLength(72)` sur password (anti-DoS bcrypt) | 🟠 HAUTE | A07 | `backend/src/auth/dto/{login,register}.dto.ts` | Fait | A faire | A faire | Fait |
| SEC-004 : CSP sans `unsafe-inline` (nonces) — dépend EPIC-29 SSR | 🟠 HAUTE | A05 | `frontend/nginx.conf`, `dynamic.yml.j2` | A faire | A faire | N/A | A faire |
| SEC-006 : exclure `userId`/`user` des réponses publiques articles | 🟡 MOYENNE | A01 | `backend/src/articles/articles.service.ts` | Fait | A faire | A faire | Fait |
| SEC-008 : stratégie révocation JWT (refresh token court ou denylist) | 🟡 MOYENNE | A07 | `backend/src/auth/` | A faire | A faire | A faire | A faire |
| SEC-009 : protéger /metrics (IP allowlist ou port interne) | 🟡 MOYENNE | A05 | `backend/src/metrics/metrics.controller.ts` | Fait | A faire | N/A | Fait |
| SEC-010 : bloc Nginx `deny .map` + vérifier `sourceMap:false` prod | 🟡 MOYENNE | A08 | `frontend/nginx.conf`, `angular.json` | Fait | A faire | N/A | Fait |
| SEC-013 : logger les échecs de connexion (sans secret) | 🟢 BASSE | A09 | `backend/src/auth/auth.service.ts` | Fait | A faire | A faire | Fait |
| SEC-014 : politique de complexité mot de passe (`@Matches`) | 🟢 BASSE | A05 | `backend/src/auth/dto/register.dto.ts` | Fait | A faire | A faire | Fait |
| SEC-011 : supprimer header obsolète `X-XSS-Protection` | 🟢 BASSE | A05 | `frontend/nginx.conf`, `dynamic.yml.j2` | Fait | A faire | N/A | Fait |
| SEC-012 : externaliser l'URL Matomo en variable Ansible | 🟢 INFO | RGPD | `ansible_vps/.../main.yml` | A faire | A faire | N/A | A faire |

> Note : SEC-007 (redirect www→apex) est traité dans **EPIC-31** (transverse SEO/infra) pour éviter le doublon.

## Priorisation

1. **CRITIQUE (hotfix immédiat)** : SEC-001 + SEC-002 — escalade privilège et secret forgeable.
2. **HAUTE** : SEC-005 (effort minime, anti-DoS), SEC-003 (SSRF).
3. **MOYENNE** : SEC-006, SEC-009, SEC-010, SEC-008.
4. **BASSE/INFO** : SEC-004 (dépend EPIC-29), SEC-011, SEC-013, SEC-014, SEC-012.

## Hors scope
- Refonte complète de l'authentification (OAuth, MFA) — backlog ultérieur.
- SEC-004 nonces dépend de la livraison SSR (EPIC-29) ; bloqué jusque-là, documenté comme tel.
  - **MAJ 2026-07-29** : EPIC-29 a pivoté du prerendering statique vers le **SSR runtime**. C'est une bonne nouvelle pour SEC-004 : un serveur de rendu peut générer un **nonce par requête**, ce qu'un HTML prerenderé ne permettait pas. SEC-004 devient réalisable dans sa forme complète une fois EPIC-29 livré.

## Points positifs (à préserver)
JWT cookie HttpOnly+Secure+SameSite, bcrypt rounds=12, validation DTO globale, Swagger off prod, secrets Ansible Vault, RolesGuard/PermissionsGuard bien appliqués partout ailleurs, HSTS preload, pas de `$queryRawUnsafe`.
