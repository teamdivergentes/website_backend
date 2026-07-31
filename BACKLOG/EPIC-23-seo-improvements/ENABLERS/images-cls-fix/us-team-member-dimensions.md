# US — Dimensions explicites sur les images de membres d'equipe

## Role / Action / Benefice

> **En tant que** utilisateur consultant une equipe,
> **je veux** que la grille de membres ne se reorganise pas pendant le chargement des photos,
> **afin que** le rendu soit stable.

## Contexte

`frontend/src/app/pages/equipes/team-detail/team-detail.html` affiche en grille les membres de l'equipe (joueurs + staff). Chaque image membre doit avoir un ratio fige.

## Criteres d'acceptation

- [x] Toutes les images de membres ont soit `width`/`height` HTML, soit `aspect-ratio` CSS
- [x] L'image de l'equipe (logo / hero) a egalement ses dimensions
- [ ] Mesure CLS Lighthouse < 0.1 sur la page d'une equipe avec >= 5 membres
- [ ] Pas de regression mobile (les images ne sont pas tronquees ni distordues)

## Implementation

- Images joueurs desktop : `width="280" height="480"` (correspond aux dimensions CSS de `.player-card`)
- Images joueurs mobile slider : `width="310" height="390"` (correspond a `.player-card-mobile`)
- Images coach : `width="300" height="400"` (ratio 3:4, correspond a `aspect-ratio: 3/4` de `.coach-card`)
- Banner equipe `.info-image` : ajout `aspect-ratio: 16/9` en SCSS (conteneur variable, pas de dimensions fixes)
- Lint : OK | Build : OK

## Effort estime

XS (≈ 0.25 j)

## Dependances

Aucune.
