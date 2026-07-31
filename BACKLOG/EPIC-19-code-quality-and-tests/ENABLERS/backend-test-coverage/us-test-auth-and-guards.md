# US — Tester en profondeur le module Auth et les guards

## Rôle / Action / Bénéfice

> **En tant que** Expert Red Team,
> **je veux** une couverture de **100 %** sur `auth/`, `JwtAuthGuard`, `RolesGuard` et le décorateur `@Public()`,
> **afin que** toute régression sur la sécurité soit détectée immédiatement par la CI.

## Critères d'acceptation

### Périmètre

- [ ] `auth.service.ts` — login, refreshToken, validateUser, hash password
- [ ] `auth.controller.ts` — `/login`, `/refresh`, `/me`, `/logout`
- [ ] `jwt.strategy.ts` — extraction Bearer + (à venir) cookie HttpOnly
- [ ] `jwt-auth.guard.ts` — décorateur `@Public()` respecté
- [ ] `roles.guard.ts` — comparaison case-insensitive, refus si rôle absent
- [ ] `decorators/public.decorator.ts`, `decorators/roles.decorator.ts`

### Cas couverts

- [ ] Login OK / mot de passe invalide / user inexistant
- [ ] Token expiré / token invalide / token absent
- [ ] Endpoint `@Public` accessible sans token
- [ ] Endpoint protégé refusé sans token (401)
- [ ] Endpoint avec `@Roles('admin')` refusé pour un user non-admin (403)
- [ ] Endpoint avec `@Roles('admin', 'cm')` accepté pour CM
- [ ] Refresh token : flux complet
- [ ] Logout : invalide la session

### Couverture

- [ ] **100 %** lignes + branches sur le module `auth/`
- [ ] **100 %** sur `JwtAuthGuard`, `RolesGuard`

## Effort estimé

M (~1 j)

## Dépendances

- US `us-jest-coverage-config-and-helpers.md`
