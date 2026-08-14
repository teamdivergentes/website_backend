# US — Modele Prisma `CoachingStaff`

## Role / Action / Benefice

> **En tant que** developpeur backend,
> **je veux** un modele Prisma `CoachingStaff` lie a `Team`,
> **afin de** persister les membres du staff coaching d'une equipe (Head Coach, Drafter, Preparateur, Analyste, Manager…) avec un vocabulaire de role distinct des joueurs.

## Criteres d'acceptation

- [x] Migration Prisma creee : `20260425165113_add_twitch_channel_model` (incluait CoachingStaff car les deux modeles etaient dans le meme diff schema).
- [x] Le schema final correspond a celui defini dans le README de l'enabler.
- [x] Cascade `Cascade` sur la suppression d'une `Team` (les coachs sont supprimes avec l'equipe).
- [x] La relation est ajoutee cote `Team` :
  ```prisma
  model Team {
    ...
    coachingStaff CoachingStaff[]
  }
  ```
- [x] Index sur `teamId` + `position` (pour les listings par equipe tries).
- [x] Index unique conditionnel sur `slug` (NULL non concerne par la contrainte unique PostgreSQL).
- [x] Le client Prisma genere ne casse aucune compilation existante.

## Statut Claude

Fait

## Effort estime

XS (≈ 2 h)
