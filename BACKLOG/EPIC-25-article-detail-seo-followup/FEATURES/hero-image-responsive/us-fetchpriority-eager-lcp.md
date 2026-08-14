# US — Hero image : `loading="eager"` + `fetchpriority="high"`

## Role / Action / Benefice

En tant que **Googlebot Lighthouse**, je veux que l'image hero d'un article ait `fetchpriority="high"` afin d'optimiser le LCP (Largest Contentful Paint) sans depend du lazy loading.

## Criteres d'acceptation

- [ ] L'`<img>` (fallback du `<picture>`) du hero porte `loading="eager"` ET `fetchpriority="high"`
- [ ] Les attributs `width` et `height` sont presents (eviter le CLS — cf. EPIC-23 enabler images-cls-fix deja livre, a aligner ici)
- [ ] Aucune autre image de la page n'a `fetchpriority="high"` (eviter la dilution)
- [ ] Mesure Lighthouse avant/apres jointe a la PR : LCP mobile diminue de >= 20%

## Fichiers concernes

- `frontend/src/app/pages/articles/article-detail/article-detail.component.html`

## Notes

- `fetchpriority="high"` est supporte par Chromium / Safari 17+. Sur les browsers non supportes : ignore (graceful degradation).
- Lighthouse CI (`.lighthouserc.json` deja en place via EPIC-19) detecte automatiquement les regressions LCP.

## DoD

- Lint + build OK
- Lighthouse mobile sur `/articles/<slug>` -> LCP < 2.5s
