# US — Tester les services des modules prioritaires (>= 80 % par module)

## Rôle / Action / Bénéfice

> **En tant que** Expert QA,
> **je veux** que tous les services métier critiques aient au moins 80 % de couverture lignes/branches,
> **afin que** toute régression sur les CRUD principaux soit détectée immédiatement.

## Périmètre

| Module | Services à couvrir | Effort estimé |
|--------|-------------------|---------------|
| `users/` | `users.service.ts` | S |
| `roles/` | `roles.service.ts` | S |
| `analytics/` (après refacto) | les 4 services issus du découpage | M |
| `recruitment/` | `recruitment.service.ts`, `recruitment-application.service.ts` (après refacto) | M |
| `contact/` | `contact.service.ts` (mock SMTP + Discord) | S |
| `teams/`, `team-members/` | `teams.service.ts`, `team-members.service.ts` | M |
| `staff/` | `staff.service.ts` | S |
| `sponsors/` (après refacto) | `sponsors.service.ts`, `sponsor-images.service.ts`, `sponsor-links.service.ts` | M |
| `games/` | `games.service.ts` | S |
| `articles/` | `articles.service.ts`, `link-meta.service.ts` | M |
| `config/` | `config.service.ts` | S |
| `profile/` | `profile.service.ts` | S |

## Critères d'acceptation

- [ ] Pour chaque service listé : fichier `*.spec.ts` créé ou complété
- [ ] Couverture lignes >= **80 %** par fichier
- [ ] Couverture branches >= **70 %** par fichier
- [ ] Tests des cas d'erreur explicites (NotFoundException, ConflictException, BadRequestException)
- [ ] Mock Prisma centralisé via le helper créé dans `us-jest-coverage-config-and-helpers.md`
- [ ] Aucun TU > 5 secondes (tests rapides)
- [ ] `npm run test:cov` passe avec les seuils stricts activés

## Effort estimé

XL (~5-7 j) — l'US peut être éclatée en sous-tâches par module si besoin

## Dépendances

- US `us-jest-coverage-config-and-helpers.md`
- Refactos des gros services (`backend-code-quality`) idéalement terminés
