# US — Migrer le token JWT du localStorage vers un cookie HttpOnly

## Role / Action / Benefice

> **En tant que** Responsable securite,
> **je veux** que le token JWT admin soit stocke dans un cookie `HttpOnly Secure SameSite=Strict` plutot que dans `localStorage`,
> **afin que** le token devienne inaccessible au JavaScript et soit immune au vol par injection XSS.

## Criteres d'acceptation

### Backend

- [x] `POST /api/auth/login` :
  - Retourne le JWT dans un cookie : `Set-Cookie: dvg_auth_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`
  - Retourne aussi `{ user }` dans le body (sans le `access_token`)
- [x] `POST /api/auth/logout` : supprime le cookie (`clearCookie`).
- [x] `JwtStrategy` extrait le token depuis le cookie en priorite, fallback `Authorization: Bearer` pour compatibilite descendante (a supprimer apres deploy stable).
- [x] CORS configure avec `credentials: true` et origines whitelist explicites (pas de `*`). *(deja present dans main.ts)*
- [ ] Token CSRF genere au login (cookie non-HttpOnly + retour body), verifie au backend sur les routes mutables. *(reporté, hors périmètre de cette US selon décision brainstorming)*

### Frontend

- [x] `AuthService` :
  - Retire `getStoredToken()`, `setToken()`, `clearSession()` localStorage
  - `tokenSignal` n'est plus alimente par le frontend (le cookie sert seul de source de verite serveur)
  - `isAuthenticated` se base uniquement sur `userSignal` (charge via `/api/auth/me`)
- [x] `ApiService` : tous les appels HTTP ajoutent `withCredentials: true`.
- [x] `authInterceptor` : retire l'ajout manuel du header `Authorization`. Garde uniquement la gestion des 401.
- [x] Login + reload page → toujours connecte (le cookie persiste).
- [x] DevTools → onglet Application → Local Storage : aucune cle `dvg_auth_token`.

### Securite

- [ ] Test : injection JS dans la console → `document.cookie` ne contient pas le JWT (HttpOnly).
- [ ] Test CSRF : appel `POST /api/auth/logout` depuis un autre site → rejete (SameSite=Strict).
- [ ] Test XSS simulee (admin entree controlee) : le token n'est pas exfiltrable.

### Tests

- [x] Tests unitaires backend : controller login retourne bien `Set-Cookie`, JwtStrategy extrait depuis cookie.
- [x] Tests unitaires frontend : AuthService ne touche pas localStorage.
- [x] Test E2E : login → cookie `HttpOnly` present, navigation interne OK, logout → cookie supprime.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Backend (cette branche) | Fait | A faire | A faire | A faire |
| Frontend | Fait | A faire | A faire | A faire |

> **Note** : Le volet backend est livré sur la branche `fix/admin-auth-httponly-cookie`.
> Le volet frontend est livré sur la branche `fix/admin-auth-frontend`.

## Effort estime

L (≈ 2 j) — touche backend + frontend + tests + securite

## Dependances

Bloque les US suivantes de l'enabler.
