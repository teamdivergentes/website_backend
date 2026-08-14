# US — Polling frontend du statut live (rafraichissement auto)

## Role / Action / Benefice

> **En tant que** visiteur sur la page `/twitch`,
> **je veux** que la liste des streamers en live se mette a jour automatiquement sans rechargement,
> **afin de** voir un streamer apparaitre ou disparaitre dans la minute suivant son demarrage / arret.

## Criteres d'acceptation

- [ ] Le composant `TwitchComponent` declenche un fetch `/api/twitch/live` toutes les **60 secondes** (RxJS `interval(60000)` + `switchMap`).
- [ ] Le polling est **annule au destroy** du composant (`takeUntilDestroyed`) — pas de fuite memoire si l'utilisateur navigue ailleurs.
- [ ] Le polling est aussi annule si l'onglet n'est pas visible (`document.visibilityState === 'hidden'`) et reactive au retour focus → economise les requetes.
- [ ] La transition entre etats (1 stream <-> N streams <-> 0 stream) ne provoque pas de "flash" : utiliser `signal()` + `@if` Angular 20.
- [ ] Test unitaire avec `fakeAsync` : verifier que le polling appelle bien le service toutes les 60 s.
- [ ] Test E2E : rester 90 s sur la page → 2 fetchs visibles cote DevTools Network.

## Effort estime

S (≈ 0.5 j)

## Dependances

Bloque par : `us-display-states-live-grid-empty.md`
