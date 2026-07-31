# US — Service partage `LiveStatusService`

## Role / Action / Benefice

> **En tant que** developpeur frontend,
> **je veux** un service singleton qui expose en signal le statut live agrege (booleen "au moins 1 stream actif" + count + liste),
> **afin de** partager le meme polling entre le header et la page `/twitch` sans dupliquer les requetes API.

## Criteres d'acceptation

- [ ] Service `LiveStatusService` (`@Injectable({ providedIn: 'root' })`) avec :
  - Signal `liveStreams` : liste complete (chaines + statut)
  - Computed `hasLive` : booleen
  - Computed `liveCount` : nombre de streams actifs
  - Computed `liveChannels` : liste filtree des chaines en direct
  - Computed `offlineChannels` : liste filtree des chaines offline
  - Methode `start()` : demarre le polling 60 s
  - Methode `stop()` : arrete le polling
- [ ] Le service est demarre au bootstrap de l'application (`provideAppInitializer` ou injection dans le `MainLayout`).
- [ ] Le polling est suspendu quand le document n'est pas visible (`visibilitychange`) et reprend au focus.
- [ ] Si la requete echoue, le signal garde la derniere valeur connue, pas de reset a `[]` brutal.
- [ ] Tests unitaires : signal + polling + visibilite.

## Effort estime

S (≈ 0.5 j)

## Dependances

Bloque par : `us-twitch-helix-service.md` (backend prêt)
