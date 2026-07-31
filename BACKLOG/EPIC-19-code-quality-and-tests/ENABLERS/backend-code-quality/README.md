# Enabler — Backend code quality

## Contexte technique

Audit local (2026-04-25) :

- 54 fichiers source TypeScript dans `backend/src/`
- Plusieurs fichiers dépassent la limite douce de 400 lignes :
  - `backend/src/analytics/analytics.service.ts` — **678 lignes**
  - `backend/src/sponsors/sponsors.service.ts` — **486 lignes**
  - `backend/src/recruitment/recruitment-application.service.ts` — 355 lignes
  - `backend/src/articles/articles.service.ts` — 318 lignes
  - `backend/src/teams/teams.service.ts` — 308 lignes
- Les seuils Sonar exacts (bugs, vulns, smells, duplications) seront connus après l'enabler `sonar-baseline-and-gates`.

## Objectifs

Atteindre sur `dvg-backend` :

- Reliability rating **A** (0 bug)
- Security rating **A** (0 vulnérabilité, 100 % security hotspots reviewed)
- Maintainability rating **A** (technical debt ratio < 5 %)
- Duplications **< 3 %**
- Aucun fichier non-test > 400 lignes (sauf justification documentée)

## Direction technique

### Refactoring des gros services

| Fichier | Stratégie |
|---------|-----------|
| `analytics.service.ts` (678) | Découper par domaine : `analytics-overview.service.ts`, `analytics-pages.service.ts`, `analytics-traffic.service.ts`, `analytics-cache.service.ts` |
| `sponsors.service.ts` (486) | Sortir la gestion des `SponsorImage` et `SponsorLink` dans des services dédiés |
| `recruitment-application.service.ts` (355) | Extraire l'envoi mail/Discord dans un `application-notifier.service.ts` |
| `articles.service.ts` (318) | Extraire le rendu des blocs d'éditeur dans un util pur |
| `teams.service.ts` (308) | Sortir la logique de tri/filtrage des members dans un util |

### Hygiène globale

- Linter (`npm run lint`) sans warning
- Imports triés, dead code supprimé (vérification via `ts-prune` ou Sonar)
- Fonctions > 50 lignes cassées (règle interne `CLAUDE.md`)
- `any` interdits sauf justification (`// eslint-disable-next-line` documenté)
- Conventions de nommage uniformes (PascalCase classes, camelCase variables)

### Sécurité (Sonar Hotspots)

- Vérifier toutes les concaténations SQL (interdit : `$queryRawUnsafe` avec entrée user)
- Vérifier la gestion des secrets (jamais en dur dans le code)
- Cookies, headers, CORS conformes au CLAUDE.md backend

## US

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-refactor-analytics-service.md](us-refactor-analytics-service.md) | A faire | A faire | A faire | A faire |
| [us-refactor-sponsors-service.md](us-refactor-sponsors-service.md) | A faire | A faire | A faire | A faire |
| [us-split-other-large-services.md](us-split-other-large-services.md) | A faire | A faire | A faire | A faire |
| [us-fix-sonar-bugs-vulnerabilities.md](us-fix-sonar-bugs-vulnerabilities.md) | A faire | A faire | A faire | A faire |
| [us-resolve-sonar-code-smells.md](us-resolve-sonar-code-smells.md) | A faire | A faire | A faire | A faire |
| [us-eliminate-backend-duplications.md](us-eliminate-backend-duplications.md) | A faire | A faire | A faire | A faire |
