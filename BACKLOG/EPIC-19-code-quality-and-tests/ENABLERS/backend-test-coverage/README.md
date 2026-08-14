# Enabler — Backend test coverage >= 80 %

## Contexte technique

Audit local (2026-04-25) :

- 54 fichiers source TypeScript
- 19 fichiers `.spec.ts` (~35 % des fichiers ont un compagnon de test)
- 10 fichiers `.e2e-spec.ts` dans `backend/test/`
- Stryker (mutation testing) configuré mais jamais lancé en CI
- Couverture Sonar à confirmer après baseline (cf. `sonar-baseline-and-gates`)

Exclusions de couverture (Sonar) déjà définies dans `backend/sonar-project.properties` :
- `main.ts`, `*.module.ts`, `*.dto.ts`, migrations, `seed.ts`, `app.module.ts`, `app.controller.ts`, `app.service.ts`

## Objectifs

- **Couverture lignes >= 80 %** sur le périmètre testable (`src/` hors exclusions)
- **Couverture branches >= 70 %** sur les services métier
- **100 %** sur les guards (`JwtAuthGuard`, `RolesGuard`)
- **100 %** sur les utils purs extraits dans `backend-code-quality`
- Tests d'intégration (Supertest) sur **tous** les controllers (au moins le happy path + 1 erreur)

## Direction technique

### Stratégie

- **Unit tests** (Jest + ts-jest) pour les services métier (mock Prisma via `prisma-mock`)
- **Controller tests** (Supertest + `INestApplication`) pour la couche HTTP
- **E2E tests** (Jest e2e dans `backend/test/`) pour les parcours bout-en-bout (DB de test postgres in-memory ou `pg-mem`)

### Conventions

- 1 fichier `*.spec.ts` côte à côte avec le source
- Helper de mock Prisma centralisé dans `backend/test/helpers/prisma-mock.ts`
- Factory de seed test centralisée dans `backend/test/helpers/factories/`
- Pas de mock partiel des dépendances internes — préférer la vraie implémentation quand possible

### Modules prioritaires (par criticité)

1. `auth/` (JWT, guards) — sécurité critique
2. `upload/` (Multer + Sharp) — sécurité critique (XSS image, path traversal)
3. `users/`, `roles/` — gestion des permissions
4. `analytics/` (après refacto) — logique complexe
5. `recruitment/`, `contact/` — emails sortants (vérifier bonne sanitisation)
6. `teams/`, `staff/`, `sponsors/`, `games/`, `articles/` — CRUD standards

## US

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-jest-coverage-config-and-helpers.md](us-jest-coverage-config-and-helpers.md) | Fait | A faire | A faire | A faire |
| [us-test-auth-and-guards.md](us-test-auth-and-guards.md) | A faire | A faire | A faire | A faire |
| [us-test-upload-module.md](us-test-upload-module.md) | A faire | A faire | A faire | A faire |
| [us-test-services-priority-modules.md](us-test-services-priority-modules.md) | A faire | A faire | A faire | A faire |
| [us-test-controllers-supertest.md](us-test-controllers-supertest.md) | A faire | A faire | A faire | A faire |
