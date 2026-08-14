# US — Modele Prisma `TwitchChannel`

## Role / Action / Benefice

> **En tant que** developpeur backend,
> **je veux** un modele Prisma `TwitchChannel` standalone avec liaison optionnelle a un `TeamMember`,
> **afin de** persister les chaines Twitch a afficher sur la page En Live et dans l'admin.

## Criteres d'acceptation

- [x] Migration Prisma creee : `20260425165113_add_twitch_channel_model`.
- [x] Le schema final correspond a celui defini dans le README de l'enabler.
- [x] Index sur `teamMemberId` (pour le filtre admin par joueur).
- [x] Cascade `SetNull` sur la suppression d'un `TeamMember` (la chaine Twitch reste, juste delie).
- [x] Le client Prisma genere ne casse aucune compilation existante.
- [x] Seed : 2 chaines de demo (pendulelapin7 lié à un TeamMember, teamdivergentes ambassadeur sans lien).

## Statut Claude

Fait

## Effort estime

XS (≈ 2 h)
