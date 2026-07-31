# US — Restructurer la hierarchie visuelle de `/structure/equipes/:slug`

## Role / Action / Benefice

> **En tant que** visiteur,
> **je veux** que la page detail d'une equipe affiche en premier le nom de l'equipe en gros, puis "NOS JOUEURS" comme section distincte centree,
> **afin de** comprendre immediatement quelle equipe je consulte avec une hierarchie visuelle claire.

## Criteres d'acceptation (maquette validee 2026-04-25)

### Avant (actuel)

- Petit subtitle "Nos joueurs" + nom equipe en titre vert

### Apres (cible)

- [ ] **H1 nom equipe** : en haut, blanc `#fff`, Bebas Neue, centre, taille `48px` (desktop) / `36px` (mobile), letter-spacing 4px
- [ ] Bouton retour (← fleche verte) repositionne en haut a gauche absolu, ne perturbe pas le centrage du H1
- [ ] **H2 "NOS JOUEURS"** : sous le H1, espace `48px` au-dessus, vert `#32D299`, Bebas Neue, centre, taille `42px` (desktop) / `32px` (mobile), letter-spacing 3px, font-weight bold
- [ ] Grille des joueurs : inchangee (grid desktop / slider mobile existants).
- [ ] **H2 "NOTRE COACHING STAFF"** : visible uniquement si `team.coachingStaff?.length > 0`, meme style que "NOS JOUEURS" mais legerement plus petit (`38px` desktop)
- [ ] Section image + description en bas : inchangee.
- [ ] Tous les espacements (margin-bottom 64px entre sections) respectes.

### Tests

- [ ] Test unitaire : verifier la presence/absence de la section coaching selon donnees mockees.
- [ ] Test snapshot du DOM (apres restructuration).
- [ ] Test E2E :
  - Equipe avec coaching staff : voir 4 sections (H1, "NOS JOUEURS", "NOTRE COACHING STAFF", description)
  - Equipe sans coaching staff : voir 3 sections (H1, "NOS JOUEURS", description) — section coaching absente

### Accessibilite

- [ ] H1 unique sur la page (le nom de l'equipe).
- [ ] H2 pour chaque section (nos joueurs, coaching staff, info equipe).
- [ ] Le bouton retour reste accessible au focus malgre le repositionnement absolu.

## Effort estime

M (≈ 1 j)

## Dependances

Aucune dans le strict cadre frontend, mais l'affichage du coaching staff necessite la US `us-frontend-coaching-staff-section.md`.
