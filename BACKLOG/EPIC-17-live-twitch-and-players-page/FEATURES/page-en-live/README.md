# Feature — Page En Live (`/twitch`)

## Routes

- `/twitch` (public, dans `MainLayout`)

## Branche git

`feat/epic-17-live-twitch` (commune a tout l'EPIC-17).

## Fonctionnalites

Page publique qui affiche les streamers Divergentes en cours de stream avec un layout adaptatif selon le nombre de streams actifs :

- **1 seul streamer en live** : embed Twitch plein 16:9 + nom + jeu + viewers + badge "EN DIRECT" pulsant
- **>= 2 streamers en live** : grille 3 colonnes de cards (preview, pseudo, jeu, viewers, lien chaine) + section "Toutes nos chaines" en bas pour les chaines offline
- **0 streamer en live** : badge gris "HORS LIGNE" + message "Personne n'est en live actuellement, retrouvez nos streamers Divergentes sur leurs chaines Twitch" + grille des chaines en lien direct

## Charte

- Fond `#0C0D0C`
- Accent `#32D299`
- Rouge live `#ff3030`
- LED pulsante (animation CSS keyframes)

## Suivi US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-route-and-config.md](us-route-and-config.md) | Fait (PR #103 mergee sur develop) | Fait | A faire | A faire |
| [us-display-states-live-grid-empty.md](us-display-states-live-grid-empty.md) | Fait (PR #154 mergee develop 2026-05-05) | Fait | A faire | A faire |
| [us-frontend-live-polling.md](us-frontend-live-polling.md) | Fait (PR #154 mergee develop 2026-05-05) | Fait | A faire | A faire |
