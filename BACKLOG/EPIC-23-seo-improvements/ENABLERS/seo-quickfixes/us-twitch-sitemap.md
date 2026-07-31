# US — Ajouter /twitch dans le sitemap backend

## Role / Action / Benefice

> **En tant que** Googlebot,
> **je veux** decouvrir la page `/twitch` via le sitemap,
> **afin que** son indexation ne depende pas uniquement du maillage interne.

## Contexte

`backend/src/sitemap/sitemap.service.ts` (constante `STATIC_PAGES`, l. 17-28) liste les pages publiques. La page `/twitch` (route active dans `frontend/src/app/app.routes.ts` l. 203-208) est absente de cette liste.

## Criteres d'acceptation

- [x] Ajout de `{ path: '/twitch', changefreq: 'daily', priority: '0.7' }` dans `STATIC_PAGES`
- [x] Le sitemap genere contient bien `<loc>https://teamdivergentes.fr/twitch</loc>`
- [x] Le test unitaire `sitemap.service.spec.ts` est mis a jour pour valider la presence de `/twitch`
- [x] La page `/twitch` n'apparait pas si la config admin la masque (`pageTwitchVisible === false`) — logique implementee via `prisma.config.findUnique({ key: 'page_twitch_visible' })`

## Effort estime

XS (≈ 0.25 j)

## Dependances

Aucune.
