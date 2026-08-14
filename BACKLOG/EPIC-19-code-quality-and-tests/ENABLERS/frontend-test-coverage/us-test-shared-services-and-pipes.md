# US — Tester les services partagés et pipes

## Rôle / Action / Bénéfice

> **En tant que** Expert QA,
> **je veux** que tous les services partagés et pipes purs aient une couverture >= 80 %,
> **afin que** les briques transverses soient validées et que les régressions soient bloquées en CI.

## Périmètre

| Élément | Path | Effort |
|---------|------|--------|
| `ApiService` | `shared/services/api/api.service.ts` | S |
| `UsersService` (front) | `shared/services/api/users.service.ts` | S |
| `RolesService` (front) | `shared/services/api/roles.service.ts` | S |
| `ProfileService` | `shared/services/api/profile.service.ts` | S |
| `ConfigService` | `app/shared/services/config.service.ts` | S |
| `UploadService` | `app/shared/services/upload.service.ts` | M |
| `TeamsService` | `app/shared/services/teams.service.ts` | S |
| `GamesService` | `app/shared/services/games.service.ts` | S |
| `StaffService` | `app/shared/services/staff.service.ts` | S |
| `SponsorsService` | `app/shared/services/sponsors.service.ts` | S |
| `ContactService` | `app/shared/services/contact.service.ts` | S |
| `RecruitmentService` | `app/shared/services/recruitment.service.ts` | S |
| `ScreenSizeService` | `shared/services/screen-size.service.ts` | S |
| `AnalyticsService` | `shared/services/analytics.service.ts` | S |
| `RuntimeConfigService` | `shared/services/runtime-config.service.ts` | S |
| `SafePipe` | `app/shared/pipes/safe.pipe.ts` | XS |

## Critères d'acceptation

- [ ] Pour chaque élément : fichier `*.spec.ts` créé ou complété
- [ ] Couverture lignes >= **80 %** par fichier
- [ ] Pipes : **100 %**
- [ ] Tests des cas d'erreur HTTP (4xx, 5xx)
- [ ] Mocks via `HttpTestingController` (jamais de vrai HTTP)
- [ ] `npm test` passe avec seuils stricts

## Effort estimé

L (~2-3 j)

## Dépendances

- US `us-karma-coverage-config-and-helpers.md`
