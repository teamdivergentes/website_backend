# US — Service backend d'integration Twitch Helix

## Role / Action / Benefice

> **En tant que** developpeur backend,
> **je veux** un service NestJS encapsulant l'authentification et l'appel a l'API Twitch Helix `GET /streams`,
> **afin de** recuperer le statut live de toutes les chaines actives avec un cache de 60 s et de l'exposer aux features publiques (page En Live) et indicateurs (header LED).

## Criteres d'acceptation

### Authentification

- [ ] Variables d'env `TWITCH_CLIENT_ID` et `TWITCH_CLIENT_SECRET` declarees et documentees (README backend + `.env.example`).
- [ ] Methode `getAppAccessToken()` :
  - Appelle `POST https://id.twitch.tv/oauth2/token?grant_type=client_credentials`
  - Cache le token en memoire jusqu'a expiration (- 60 s de marge)
  - Refresh automatiquement a la demande suivante apres expiration
- [ ] Si les variables d'env manquent, le service log un warning au demarrage et toutes les methodes retournent une liste vide (le site continue a fonctionner avec "personne en live").

### Fetch des streams

- [ ] Methode `getLiveStreams(usernames: string[]): Promise<TwitchLiveStream[]>` :
  - Recupere la liste depuis Twitch Helix `GET /helix/streams?user_login=...` (max 100 logins / requete, batch si besoin)
  - Retourne uniquement les streams `type=live`
  - Format : `{ username, displayName, gameId, gameLabel, viewerCount, thumbnailUrl, startedAt, title }`

### Cache

- [ ] Cache backend 60 s sur le resultat de `getLiveStreams()` (cle = liste triee des usernames).
- [ ] Cache invalide automatiquement apres 60 s.
- [ ] En cas d'erreur API Twitch (5xx, timeout) : retourner le dernier cache valide pendant 5 min, puis liste vide.

### API publique

- [ ] Endpoint public `GET /api/twitch/live` :
  - `@Public()` decorateur (pas d'auth)
  - Lit toutes les `TwitchChannel` actives en BDD
  - Appelle `getLiveStreams()` avec leurs usernames
  - Retourne la liste enrichie de toutes les chaines (live ou non) avec le statut, jeu, viewers, thumbnail, lien vers le `TeamMember` lie si present
  - Format de reponse documente dans le DTO `TwitchLiveResponseDto`
- [ ] Le statut LIVE est accessible aussi via `GET /api/admin/twitch-channels` (pour l'admin) — bouton "Force refresh" cote admin.

### Tests

- [x] Tests unitaires : mock fetch, verifier auth, cache, retry, fallback.
- [x] Tests d'integration : appel reel optionnel (skip si pas de credentials env).
- [x] Test E2E : `GET /api/twitch-channels/live` retourne 200 avec liste valide.

## Effort estime

M (≈ 1 j)

## Dependances

Bloque par : `us-prisma-twitch-channel-model.md`
