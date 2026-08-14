# Enabler — Persistance de la session admin

## Contexte technique

Etat actuel (`frontend/src/shared/services/api/auth.service.ts` + `backend/src/auth/`) :

- Token JWT stocke dans `localStorage` (cle `dvg_auth_token`) → vulnerable aux attaques XSS
- `JWT_EXPIRES_IN=1d` (24 h) → deconnexion brutale apres 1 j
- Methode `refreshToken()` existe **mais n'est jamais appelee automatiquement** (pas d'intercepteur de refresh, pas de timer)
- **Bug critique de rehydratation** : si l'admin navigue sur le site public puis revient sur `/admin` (ou refresh la page), le token est toujours dans `localStorage` mais `userSignal` est `null` a la frame 1 → les guards/layouts ne `await waitForInitialization()` pas → l'admin layout s'affiche sans donnees, l'utilisateur est oblige de se deco/reco.

## Decisions retenues (brainstorming 2026-04-25)

- **Duree** : 7 jours (A2)
- **Stockage** : migration vers cookie HttpOnly Secure SameSite=Strict (B2) → token inaccessible au JS, immune au vol par XSS
- **Pas de "remember me"** : persistance toujours active, panel admin reserve a un staff restreint (C1)
- **Refresh token automatique** silencieux avant expiration (intercepteur ou timer)
- **Fix rehydratation** : tous les guards admin et le layout admin doivent `await authService.waitForInitialization()` avant de rendre les enfants
- **Stateless** : pas de stockage du refresh token en base. Le JWT 7j dans le cookie fait office de token de session. Invalidation par expiration naturelle.

## Direction technique

### Backend (livré — branche fix/admin-auth-httponly-cookie)
- `AuthController.login()` : retourne le JWT dans un cookie `Set-Cookie: dvg_auth_token; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`
- `AuthController.logout()` : supprime le cookie via `clearCookie`
- `AuthController.refresh()` : émet un nouveau cookie et retourne 204
- `JwtStrategy` : extraction du token via cookie en priorité, fallback `Bearer` header
- `JWT_EXPIRES_IN` configurable via env, défaut 7d
- CORS avec `credentials: true` déjà présent

### Frontend (à faire — expert frontend-angular)
- `AuthService` : retirer la lecture/ecriture localStorage, basculer sur cookie (le navigateur gere automatiquement)
- `ApiService` : configurer `withCredentials: true` sur tous les appels backend
- `authInterceptor` : retirer l'injection manuelle du Bearer token (le cookie est inclus automatiquement)
- Ajouter un timer ou intercepteur de refresh : si le token est proche de l'expiration (< 1 h), appeler `/api/auth/refresh` silencieusement
- `authGuard` et `permissionGuard` : `await authService.waitForInitialization()` avant de retourner `true/false`
- `AdminLayout` : afficher un skeleton tant que `authService.initialized()` n'est pas `true`

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-migrate-token-to-httponly-cookie.md](us-migrate-token-to-httponly-cookie.md) | Fait | A faire | A faire | A faire |
| [us-extend-session-7-days-with-refresh.md](us-extend-session-7-days-with-refresh.md) | Fait | A faire | A faire | A faire |
| [us-fix-rehydration-on-admin-route.md](us-fix-rehydration-on-admin-route.md) | Fait (PR #160 mergee 2026-05-06, valide 7/7 Playwright preprod) | A faire | A faire | A faire |

## Hotfix preprod (2026-05-06)

Bug détecté après deploy preprod : `/admin` (full reload) redirige systématiquement vers `/auth/login` malgré cookie valide. Cause : `APP_INITIALIZER` legacy déprécié non exécuté en build prod AOT pour `AuthService.initialize()`. Fix : migration vers `provideAppInitializer()` (API Angular 19+). Détails dans [us-fix-rehydration-on-admin-route.md](us-fix-rehydration-on-admin-route.md). Branche : `fix/preprod-admin-cookie-bootstrap`.
