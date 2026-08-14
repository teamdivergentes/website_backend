# US — Corriger la rehydratation de session a l'arrivee sur /admin

## Role / Action / Benefice

> **En tant qu'**administrateur deja connecte,
> **je veux** que mon retour sur `/admin` (apres avoir navigue sur le site public ou apres un refresh) me reconnecte automatiquement avec mes donnees chargees,
> **afin de** ne pas avoir a me deconnecter / reconnecter a chaque retour sur le panel.

## Bug actuel

1. Login OK → token cookie / localStorage present, `userSignal` rempli, navigation admin OK
2. Navigation sur `/` (site public) → service `AuthService` reste en memoire mais le composant Header public est affiche
3. Re-tape `/admin` dans l'URL ou refresh la page → AuthService est reinitialise : `tokenSignal` recupere le stocke, `userSignal = null` jusqu'a ce que `loadProfile()` resolve
4. Avant la resolution : `authGuard` et `permissionGuard` evaluent `permissions = []` → renvoient `false` ou rendent partiellement → le layout admin s'affiche sans donnees
5. L'utilisateur doit se deconnecter / reconnecter pour reset l'etat

## Criteres d'acceptation

### Frontend

- [x] `authGuard` (`src/shared/guards/auth.guard.ts`) :
  - **Avant** de retourner `true/false`, fait `await authService.waitForInitialization()`.
  - Si initialisation OK et `isAuthenticated()` true → return true.
  - Si initialisation OK et `isAuthenticated()` false → redirige vers `/auth/login`.
- [x] `permissionGuard` : meme principe, attend l'initialisation puis check les permissions.
- [x] `roleGuard` : idem.
- [x] `APP_INITIALIZER` dans `app.config.ts` : garantit que `loadProfile()` est complete avant tout rendu.
- [x] Le `AuthService.initialize()` est appele une seule fois (via `initPromise` cache).

### Tests

- [x] Test unitaire `authGuard` : si le profil n'est pas encore charge, le guard attend `waitForInitialization()` puis evalue.
- [x] Test unitaire `permissionGuard` : idem.
- [x] Test E2E :
  - Etape 1 : login → admin OK
  - Etape 2 : navigation sur `/` (page publique)
  - Etape 3 : retour sur `/admin` (sans deconnexion)
  - Etape 4 : verifier que les donnees sont chargees, sans deco/reco intermediaire
- [x] Test E2E refresh : sur `/admin/users`, touche F5 → la page reste sur `/admin/users`, pas de redirection vers login.

### Fix complémentaire (2026-05-05)

- [x] `noAuthGuard` (`src/shared/guards/no-auth.guard.ts`) :
  - Appliqué sur la route `/auth/login`.
  - Si `isAuthenticated()` true après `waitForInitialization()` → redirige vers `/admin`.
  - Résout le cas de session valide atterrissant sur la page login après F5.

### Fix critique preprod (2026-05-06) — APP_INITIALIZER → provideAppInitializer

- [x] Bug observé en preprod (build prod AOT) : navigation `/admin` (full reload) redirige vers `/auth/login` malgré un cookie `dvg_auth_token` valide. AUCUNE requête `/api/auth/me` n'est émise au bootstrap → `userSignal` reste `null` → guard redirige.
- [x] Cause racine : `APP_INITIALIZER` legacy avec `useFactory` + `deps: [AuthService]` est **déprécié depuis Angular 19** et silencieusement ignoré dans certaines configurations AOT (probable interaction avec la circular DI `HttpClient` ↔ `authInterceptor` ↔ `AuthService` ↔ `ApiService` ↔ `HttpClient`). Les autres APP_INITIALIZER (Analytics, Config) tiennent parce qu'ils sont aussi tirés par d'autres composants au runtime.
- [x] Fix : migration vers `provideAppInitializer(() => inject(AuthService).initialize())` (API Angular 19+) dans `src/app/app.config.ts`. Plus de `deps` array, plus d'ambiguité de résolution DI.
- [x] Diagnostic Playwright reproduit en headless : `goto /auth/login` → login OK → `goto /` → `goto /admin` → redirige vers `/auth/login` SANS appeler `/api/auth/me`. Sur le bundle préprod déployé : `useFactory:Ei,deps:[z]` (style legacy). Sur le bundle local après fix : `inject(z).initialize()` direct.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | Fait | A faire | A faire | A faire |

> Livré sur la branche `fix/admin-auth-frontend`.
> Fix complémentaire `noAuthGuard` appliqué le 2026-05-05 (même branche).
> Fix `provideAppInitializer` appliqué le 2026-05-06 sur la branche `fix/preprod-admin-cookie-bootstrap`.

## Effort estime

M (≈ 1 j)

## Dependances

Idealement faite apres la migration cookie (`us-migrate-token-to-httponly-cookie.md`). Effectivement faite ensuite.
