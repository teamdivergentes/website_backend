# US — Afficher la section "Notre Coaching staff" sur la page equipe

## Role / Action / Benefice

> **En tant que** visiteur,
> **je veux** voir le staff coaching d'une equipe (Head Coach, Drafter, Preparateur, Analyste, Manager) avec leurs photos et roles,
> **afin de** connaitre les personnes qui encadrent l'equipe au-dela des joueurs.

## Criteres d'acceptation (maquette validee 2026-04-25)

- [ ] Le service `TeamsService.getBySlug(slug)` ou equivalent inclut desormais `coachingStaff` (via `include: { coachingStaff: { orderBy: { position: 'asc' } } }` cote backend Prisma).
- [ ] Le composant `team-detail.ts` recupere `team.coachingStaff` et l'affiche en grille.
- [ ] Layout grille :
  - Desktop : 3 colonnes, max-width 75 % de la zone, centree
  - Tablet : 3 colonnes
  - Mobile : 2 colonnes ou slider similaire aux joueurs
- [ ] Chaque card coach :
  - Image (ratio 3/4) avec gradient `linear-gradient(180deg, #1a1a1a 60%, #0C0D0C 100%)` en fallback si pas d'image
  - Nom (white, bold, Athiti)
  - Role (vert `#32D299`, taille 11-12 px)
- [ ] Si `coachingStaff` est vide : la section entiere (titre H2 + grille) est masquee, **aucun espace blanc residuel**.
- [ ] Skeleton de chargement pour la section coaching (regle CLAUDE.md frontend : skeleton obligatoire pour contenu dynamique).
- [ ] Test unitaire : passer un tableau vide / avec coachs → verifier le rendu.
- [ ] Test E2E : seed une equipe avec 2 coachs → page detail affiche les 2 cards.

## Effort estime

M (≈ 1 j)

## Dependances

Bloque par : `us-prisma-coaching-staff-model.md`, `us-backend-coaching-staff-crud.md`, `us-restructure-team-detail-page.md`
