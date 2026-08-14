# US — SEO de la page d'adhésion

## Role / Action / Benefice

> **En tant que** structure cherchant des membres,
> **je veux** que la page d'adhésion soit bien référencée et partageable,
> **afin de** capter les recherches « adhérer Team Divergentes » et les partages sociaux.

## Criteres d'acceptation

- [ ] `title` et `meta description` dédiés et optimisés (via `SeoService`).
- [ ] Balises Open Graph + Twitter Card (titre, description, image dédiée 1200×630).
- [ ] `canonical` vers `https://teamdivergentes.fr/adherer`.
- [ ] JSON-LD pertinent : `BreadcrumbList` + (au choix validé) `Organization` rappelant l'asso. Les 3 offres étant affichées nativement, évaluer un `ItemList` d'`Offer` (montants structurés) → éligibilité rich results.
- [ ] Ajout de `/adherer` au `sitemap.xml` (priorité ~0.7, changefreq monthly).
- [ ] `/adherer` est `index, follow`.
- [ ] **`/adherer/helloasso`** (page widget, contenu mince) → **`noindex, follow`** + `canonical` vers `/adherer` ; **non ajoutée** au sitemap.

## Notes

- Comme les autres pages, les meta/JSON-LD ne seront visibles aux bots sociaux qu'une fois **EPIC-29 (prerendering)** livré. Côté code, suivre les conventions `SeoService` existantes.
- Ajout sitemap : `backend/src/sitemap/sitemap.service.ts` (route statique).

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| SEO | A faire | A faire | A faire | A faire |
