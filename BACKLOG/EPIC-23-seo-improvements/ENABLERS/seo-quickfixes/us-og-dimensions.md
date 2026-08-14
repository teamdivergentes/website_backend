# US — Ajouter og:image:width et og:image:height dans SeoService

## Role / Action / Benefice

> **En tant que** reseau social (Facebook, LinkedIn, WhatsApp) parsant la page partagee,
> **je veux** connaitre les dimensions de l'image OG,
> **afin que** je puisse afficher la preview correctement sans recharger l'image deux fois.

## Contexte

`frontend/src/app/shared/services/seo.service.ts::updateMetaTags()` (l. 64-71) emet `og:image` et `twitter:image` mais **pas** `og:image:width` ni `og:image:height`. Facebook et LinkedIn recommandent les dimensions explicites pour eviter le re-crawl post-affichage.

Format standard : 1200 x 630 (ratio 1.91:1).

## Criteres d'acceptation

- [x] Ajout des balises dans `updateMetaTags()` quand `config.image` est fourni :
  - `<meta property="og:image:width" content="1200">`
  - `<meta property="og:image:height" content="630">`
  - `<meta property="og:image:alt" content="{title}">`
- [x] Optionnel : permettre l'override via `config.imageWidth`, `config.imageHeight`, `config.imageAlt`
- [x] Mise a jour de `index.html` pour les balises statiques (valeurs hardcodees 1200/630 + og:image:alt avec __OG_TITLE__)
- [x] Test unitaire Jasmine verifiant les appels `meta.updateTag` correspondants
- [ ] Validation Facebook Sharing Debugger : la preview est correcte sans warning de re-fetch

## Effort estime

XS (≈ 0.25 j)

## Dependances

Aucune.
