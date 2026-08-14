# Enabler — Enrichissement du sitemap dynamique

## Contexte technique

Le sitemap est genere par `backend/src/sitemap/sitemap.service.ts` et expose en `/sitemap.xml`. Il couvre :
- Pages statiques (`STATIC_PAGES` constante)
- Articles publies (avec lastmod)
- Equipes
- Postes de recrutement actifs

**Manques identifies** :
1. La page `/twitch` est absente (deja P0 dans `seo-quickfixes`, listee ici pour cohérence)
2. Aucune entree `<image:image>` pour Google Images sur les articles
3. Le `Content-Type` du controller doit etre verifie

## Direction technique

Les images dans le sitemap utilisent l'extension officielle Google (`xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`). Pour chaque article ayant une image, ajouter dans son entree `<url>` un bloc `<image:image>` avec `<image:loc>` et `<image:title>`.

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-sitemap-image-tags.md](us-sitemap-image-tags.md) | Fait | A faire | A faire | A faire |
| [us-sitemap-xml-header.md](us-sitemap-xml-header.md) | Fait | A faire | Fait | A faire |
