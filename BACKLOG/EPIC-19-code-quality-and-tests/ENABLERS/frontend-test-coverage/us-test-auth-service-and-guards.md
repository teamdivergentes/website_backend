# US — Tester en profondeur AuthService, interceptor et guards

## Rôle / Action / Bénéfice

> **En tant que** Expert Red Team,
> **je veux** une couverture **100 %** sur la chaîne d'authentification frontend (`AuthService`, `authInterceptor`, `authGuard`, `permissionGuard`, `roleGuard`),
> **afin que** la moindre régression sur la sécurité front soit détectée immédiatement.

## Critères d'acceptation

### Périmètre

- [ ] `shared/services/api/auth.service.ts` (Signals)
- [ ] `shared/interceptors/auth.interceptor.ts`
- [ ] `shared/guards/auth.guard.ts`
- [ ] `shared/guards/permission.guard.ts`
- [ ] `shared/guards/role.guard.ts`

### Cas couverts

- [ ] `AuthService` :
  - Login OK → tokenSignal et userSignal alimentés
  - Login KO → erreur propagée, tokenSignal vide
  - `isAuthenticated` reflète l'état
  - `hasPermission()` retourne la bonne valeur selon permissions
  - `loadProfile()` charge `/api/auth/me`
  - `refreshToken()` met à jour la session
  - `logout()` vide tout + redirige `/auth/login`
  - `waitForInitialization()` (US existante EPIC-16) attend bien
- [ ] `authInterceptor` :
  - Ajoute `Authorization: Bearer <token>` si présent (puis `withCredentials` quand cookie HttpOnly actif)
  - 401 sur route non-auth → logout déclenché
  - 401 sur `/api/auth/*` → pas de logout (pour login échoué)
- [ ] `authGuard` :
  - `await authService.waitForInitialization()` avant la décision
  - Refuse + redirige `/auth/login` si non authentifié
  - Accepte sinon
- [ ] `permissionGuard` :
  - Lit `route.data.permission`
  - Refuse + redirige si permission manquante
- [ ] `roleGuard` :
  - Lit `route.data.role`
  - Refuse + redirige si rôle absent

### Couverture

- [ ] **100 %** lignes + branches sur les 5 fichiers

## Effort estimé

M (~1 j)

## Dépendances

- US `us-karma-coverage-config-and-helpers.md`
