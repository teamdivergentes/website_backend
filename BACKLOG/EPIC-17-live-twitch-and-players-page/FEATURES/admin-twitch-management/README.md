# Feature — Admin Twitch CRUD

## Routes

- `/admin/twitch-channels` (nouveau, requiere `twitch_channels:read`)

## Branche git

`feat/epic-17-admin-twitch-channels` — PR #119 mergée develop 2026-05-04

## Fonctionnalites

Page admin de gestion CRUD des chaines Twitch :

- Table avec drag-handle (ordre), pseudo, display name, jeu, joueur lié, statut LIVE temps reel (lecture seule), actif (toggle), actions (edit/delete)
- Modal de creation / edition avec preview URL `twitch.tv/<pseudo>`, select du joueur lie optionnel, checkbox actif
- Bouton "Refresh status live" qui force un appel API Twitch (sinon refresh auto toutes les 60 s)

## Suivi US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-admin-twitch-page-list.md](us-admin-twitch-page-list.md) | Fait (PR #119 mergee develop 2026-05-04) | Fait (recette 2026-05-05) | A faire | A faire |
| [us-admin-twitch-form-modal.md](us-admin-twitch-form-modal.md) | Fait (PR #119 mergee develop 2026-05-04) | Fait (recette 2026-05-05) | A faire | A faire |
