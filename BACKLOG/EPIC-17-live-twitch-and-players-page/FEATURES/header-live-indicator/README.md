# Feature — Indicateur live dans le header

## Routes

Aucun nouveau route — modification du composant `Header` existant (`src/shared/headers/header/`).

## Branche git

`feat/epic-17-live-twitch` (commune a tout l'EPIC-17).

## Fonctionnalites

- Item de menu "EN LIVE" tout a droite (avant l'icone Twitch existante)
- Style **rectangulaire** (border-radius 0), pas arrondi
- LED rouge **pulsante** si au moins 1 streamer est live, LED **grise** sinon
- Lien direct vers `/twitch` (cliquable dans les deux cas)
- Item present egalement dans le menu mobile hamburger
- Le statut est partage avec la page `/twitch` via un `LiveStatusService` singleton (evite les double-fetchs)

## Suivi US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-live-status-service.md](us-live-status-service.md) | Fait (PR #154 mergee develop 2026-05-05) | Fait | A faire | A faire |
| [us-add-live-menu-item-with-led.md](us-add-live-menu-item-with-led.md) | Fait (PR #154 mergee develop 2026-05-05) | Fait | A faire | A faire |
