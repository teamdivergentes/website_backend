# US — Dimensions explicites sur les logos sponsors

## Role / Action / Benefice

> **En tant que** utilisateur consultant la page sponsors,
> **je veux** que les logos s'affichent dans des cadres stables,
> **afin que** la grille ne change pas pendant le chargement.

## Contexte

`frontend/src/app/pages/sponsors/` affiche les logos sponsors en grille. Les logos sont uploades en formats varies (PNG / SVG / WebP) avec des dimensions naturelles disparates.

## Criteres d'acceptation

- [x] Cadre uniforme pour chaque logo via `aspect-ratio` CSS (ex : 3 / 2) avec `object-fit: contain`
- [x] La grille reserve l'espace avant le chargement
- [ ] Mesure CLS < 0.1 sur la page sponsors avec >= 6 logos
- [ ] Coordination `ui-ux` pour valider que tous les logos rendent correctement avec le `aspect-ratio` choisi

## Implementation

- `.images-container` avait deja une hauteur fixe `clamp(350px, 45vw, 500px)` — pas de CLS sur le conteneur
- `.main-card` avait deja `aspect-ratio: 1` et `width: clamp(...)` — conteneur stable
- `.main-logo` : passage de `max-width/max-height: 100%` a `width: 100%; height: 100%` + ajout `aspect-ratio: 1` pour que le navigateur pre-reserve l'espace sans attendre le chargement
- `.secondary-image` : ajout `aspect-ratio: 1` (images carrees selon les layouts)
- `object-fit: contain` conserve pour le logo principal, `object-fit: cover` conserve pour les secondaires
- Lint : OK | Build : OK

## Effort estime

XS (≈ 0.25 j)

## Dependances

Coordination `ui-ux`.
