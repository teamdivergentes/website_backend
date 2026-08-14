# US — Etendre la session admin a 7 jours avec refresh automatique

## Role / Action / Benefice

> **En tant qu'**administrateur,
> **je veux** rester connecte 7 jours sans avoir a me re-loguer chaque jour,
> **afin de** travailler sur le panel admin sans interruption tant que je suis actif.

## Criteres d'acceptation

### Backend

- [x] `JWT_EXPIRES_IN` passe a `7d` (variable d'env documentee, configuree dans auth.module.ts).
- [x] `JWT_EXPIRES_IN` aligné sur la durée du cookie (7 jours) dans `docker-compose.yml`.
  - Avant : `JWT_EXPIRES_IN: ${JWT_EXPIRES_IN:-1d}` (désalignement détecté en recette le 2026-05-05).
  - Fix : `JWT_EXPIRES_IN: ${JWT_EXPIRES_IN:-7d}` — après 24h sans refresh timer actif, le token n'expire plus avant le cookie.
- [x] `NODE_ENV: ${NODE_ENV:?NODE_ENV is required}` dans `docker-compose.yml` (fail-fast identique à `JWT_SECRET`).
  - Empêche un déploiement prod sans `.env` correct (cookie sans `Secure`, mode dev activé silencieusement).
- [x] Endpoint `POST /api/auth/refresh` :
  - Verifie le token courant (cookie HttpOnly), meme proche de l'expiration
  - Genere un nouveau JWT avec une nouvelle expiration de 7 j
  - Met a jour le cookie via un nouveau `Set-Cookie`
  - Retourne `204 No Content`
- [x] Endpoint protege par `JwtAuthGuard` (donc ne fonctionne que si le token actuel est encore valide).

### Frontend

- [x] Au demarrage de l'app, si l'utilisateur est authentifie : creer un timer (via RxJS `interval`) qui declenche `authService.refreshToken()` toutes les **6 heures**.
- [x] Si le refresh echoue (401, 403) : ne pas crasher, juste laisser le flow normal de l'intercepteur gerer la deconnexion.
- [x] Le timer est annule au `logout()` et au `destroy` du service.
- [x] Test unitaire : `startRefreshTimer` et `stopRefreshTimer` couverts.
- [x] Test E2E : login → refresh → session maintenue (scenario couvert dans auth-cookie-flow.e2e.spec.ts).

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Backend (cette branche) | Fait | A faire | A faire | A faire |
| Frontend | Fait | A faire | A faire | A faire |

> **Note** : Le volet backend est livré sur la branche `fix/admin-auth-httponly-cookie`.
> Le volet frontend est livré sur la branche `fix/admin-auth-frontend`.
> Décision : pas de stockage du refresh token en base (stateless). Le token actuel fait office de refresh token via le cookie HttpOnly. L'invalidation se fait par expiration naturelle (7j).

## Effort estime

S (≈ 0.5 j)

## Dependances

Bloque par : `us-migrate-token-to-httponly-cookie.md`
