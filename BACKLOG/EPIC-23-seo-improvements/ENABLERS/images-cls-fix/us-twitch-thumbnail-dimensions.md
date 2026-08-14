# US — Dimensions explicites sur les miniatures Twitch

## Role / Action / Benefice

> **En tant que** utilisateur visitant la page `/twitch`,
> **je veux** que la grille de streams ne saute pas pendant le chargement des miniatures,
> **afin que** la consultation soit fluide.

## Contexte

`frontend/src/app/pages/twitch/twitch.component.html` affiche une grille de streams Twitch avec leurs miniatures (URLs `static-cdn.jtvnw.net/...`). Format Twitch standard : 440x248 (ratio 16:9).

## Criteres d'acceptation

- [x] `width="440" height="248"` ou `aspect-ratio: 16 / 9` sur les `<img>` de miniatures
- [x] L'iframe d'embed Twitch a egalement ses dimensions definies (deja le cas via Twitch SDK ?)
- [ ] Mesure CLS < 0.1 sur la page `/twitch` avec >= 3 streams charges
- [x] Compatibilite preservee avec la logique de fallback "stream offline" (placeholder image)

## Implementation

- Audit : les `<img>` de miniatures Twitch avaient **deja** `width="440" height="248"` dans le template multi-live
- `.live-card__thumbnail` avait deja `aspect-ratio: 16 / 9` en SCSS
- `.embed-container` (iframe solo) avait deja `aspect-ratio: 16 / 9` avec `.twitch-embed` en `position: absolute; inset: 0`
- Fallback `.live-card__img-placeholder` dans un conteneur a `aspect-ratio: 16/9` — CLS nul
- Aucune modification necessaire : US deja conforme

## Effort estime

XS (≈ 0.25 j)

## Dependances

Aucune.
