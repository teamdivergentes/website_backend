# EPIC-36 — Audit sécurité API & mode admin (findings complémentaires)

## Objectif

Traiter les vulnérabilités identifiées lors de l'audit sécurité **indépendant ciblé API + mode admin** du 2026-05-27, mené par l'Expert Red Team en complément de l'audit prod global (EPIC-30). Cet EPIC regroupe les **findings nouveaux** (SEC-N01 → SEC-N06) non couverts par l'EPIC-30.

## Priorité

**MOYENNE** — pas de nouveau finding CRITIQUE, mais SEC-N01 (IDOR articles inter-CM) est exploitable par un compte légitime, et SEC-N03 est une dette de contrôle d'accès structurelle créant déjà un bug fonctionnel.

> ⚠️ Les 2 CRITIQUES (SEC-001 escalade admin, SEC-002 fallback JWT secret) restent dans **EPIC-30** et confirmés non corrigés. SEC-N06 démontre que SEC-001 + `roleId` libre au register = auto-promotion admin directe → **hotfix EPIC-30 prioritaire sur cet EPIC**.

## Contexte

Audit en lecture seule sur les 22 controllers backend + guards + frontend admin. Méthodologie OWASP Top 10 2021. Périmètre : tous les endpoints API et le backoffice admin (back + front). Les findings EPIC-30 ont été re-confirmés présents (voir tableau de confirmation en bas).

## Enablers / findings nouveaux

| Enabler | Sévérité | OWASP | Fichier principal | Claude | PO | E2E | Livré |
|---------|----------|-------|-------------------|--------|----|----|-------|
| SEC-N01 : ownership articles — un CM ne peut modifier/toggle que ses articles | 🟡 MOYENNE | A01 (IDOR) | `backend/src/articles/articles.controller.ts:73-101`, `articles.service.ts` | A faire | A faire | A faire | A faire |
| SEC-N03 : uniformiser autorisation sur `PermissionsGuard` (supprimer `@Roles` en dur) | 🟢 BASSE | A01 | `users/`, `teams/`, `sponsors/`, `games/`, `staff/`, `recruitment/`, `articles/`, `config/`, `upload/`, `twitch-channels/` | A faire | A faire | A faire | A faire |
| SEC-N04 : `path.basename` + rejet `..` sur DELETE upload | 🟢 BASSE | A01/A03 | `backend/src/upload/upload.service.ts:74` | A faire | A faire | A faire | A faire |
| SEC-N06 : aligner rôle par défaut register + interdire `roleId` libre hors admin | 🟢 INFO | A01 | `backend/src/auth/auth.service.ts`, `dto/register.dto.ts` | A faire | A faire | A faire | A faire |
| SEC-N02 : statuer sur `GET /` (`getHello`) — `@Public()` ou suppression | 🟢 INFO | A05 | `backend/src/app.controller.ts:7-10` | A faire | A faire | N/A | A faire |
| SEC-N05 : corriger doc `frontend/CLAUDE.md` (cookie HttpOnly, pas localStorage) | 🟢 INFO | A09 | `frontend/CLAUDE.md` | A faire | A faire | N/A | A faire |

## Priorisation

1. **SEC-N01** (IDOR articles) — exploitable par CM légitime, effort modéré. À traiter dès le hotfix EPIC-30 livré.
2. **SEC-N06** — à coupler avec le correctif SEC-001 (EPIC-30) : même surface (`register` + `roleId`).
3. **SEC-N04** — défense en profondeur, effort minime.
4. **SEC-N03** — dette structurelle, enabler de refonte RBAC à planifier (migration `@Roles` → `@RequirePermission`). Corrige aussi le bug fonctionnel Gestionnaire bloqué en API.
5. **SEC-N02 / SEC-N05** — INFO, nettoyage rapide.

## Dépendances

- **SEC-001/SEC-002 (EPIC-30)** doivent être corrigés en priorité (hotfix). SEC-N06 dépend du correctif SEC-001.
- SEC-N03 : migration RBAC potentiellement large → décision PO sur le périmètre (peut nécessiter un EPIC enabler dédié si la refonte est conséquente).

## Hors scope

- Findings backend déjà tracés dans EPIC-30 (SEC-001/002/003/005/006/008/009/013/014).
- Findings infra/Nginx/CSP EPIC-30/31 (SEC-004/007/010/011/012).
- Décision « contenu partagé » sur SEC-N01 : si le PO assume que tout CM gère tout le contenu, SEC-N01 devient un choix documenté plutôt qu'une faille.

## Confirmation findings EPIC-30 (re-testés, toujours présents)

| ID | Statut | Sévérité |
|----|--------|----------|
| SEC-001 (register sans RolesGuard actif) | ❌ Présent | 🔴 CRITIQUE |
| SEC-002 (fallback JWT secret en dur) | ❌ Présent | 🔴 CRITIQUE |
| SEC-003 (SSRF link-meta, redirect follow) | ❌ Présent | 🟠 HAUTE |
| SEC-005 (MaxLength password) | ❌ Présent | 🟠 HAUTE |
| SEC-006 (userId/email exposés articles) | ❌ Présent | 🟡 MOYENNE |
| SEC-008 (révocation JWT) | ❌ Présent | 🟡 MOYENNE |
| SEC-009 (/metrics public) | ❌ Présent | 🟡 MOYENNE |
| SEC-013/014 (logs échec, complexité mdp) | ❌ Présent | 🟢 BASSE |

## Points positifs confirmés (à préserver)

JwtAuthGuard global fail-secure, ValidationPipe `whitelist+forbidNonWhitelisted+transform`, **zéro** `$queryRaw` (100% Prisma paramétré), cookie JWT HttpOnly+Secure+SameSite (pas de token localStorage dans le code réel), bcrypt rounds=12, password jamais renvoyé, SVG en `Content-Disposition: attachment` + nosniff, upload MIME allowlist + noms hex aléatoires, config allowlist publique fail-safe (secrets SMTP/webhook protégés), EditorJS renderer sanitize + allowlist embeds, rate limiting ciblé (login 5/min, register 3/min, contact 3/min...), guards de route frontend avec contrôle serveur dupliqué.
