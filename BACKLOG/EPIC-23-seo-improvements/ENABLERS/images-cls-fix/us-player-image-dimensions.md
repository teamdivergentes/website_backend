# US — Dimensions explicites sur la photo joueur

## Role / Action / Benefice

> **En tant que** utilisateur arrivant sur une fiche joueur,
> **je veux** que la mise en page ne saute pas pendant le chargement de la photo,
> **afin que** la lecture soit confortable et que le score CLS du site reste sous 0.1.

## Contexte

`frontend/src/app/pages/equipes/player-detail/player-detail.html` l. 167 :

```html
<img [src]="player()!.image" [alt]="player()!.name" class="player-photo" />
```

Aucun `width`/`height` HTML, et la classe `.player-photo` n'a probablement pas d'`aspect-ratio` CSS (a verifier dans le SCSS associe).

## Criteres d'acceptation

- [x] Audit du SCSS `.player-photo` : si dimensions fixes, ajouter `width="X" height="Y"` HTML correspondant
- [x] Si dimensions variables : ajouter `aspect-ratio: 1 / 1;` (ou ratio reel) en CSS sur `.player-photo` + `width: 100%; height: auto;`
- [x] Meme traitement pour le placeholder (l. 173 ou equivalent) si applicable
- [ ] Mesure CLS via Lighthouse mobile sur la page joueur **avant** et **apres** : valeur cible < 0.1
- [ ] Coordination avec `ui-ux` pour s'assurer que le rendu mobile / desktop n'est pas casse
- [ ] Pas de regression visuelle (test E2E ou capture comparative)

## Implementation

- `.photo-container` avait deja `width: 450px; aspect-ratio: 495/527` en SCSS
- Ajout `width="450" height="479"` sur `<img class="player-photo">` (ratio 495:527 applique a 450px)
- Le placeholder logo est dans un conteneur a hauteur fixe (meme `aspect-ratio: 495/527`) — pas de CLS
- Lint : OK | Build : OK

## Effort estime

XS (≈ 0.25 j)

## Dependances

Aucune.
