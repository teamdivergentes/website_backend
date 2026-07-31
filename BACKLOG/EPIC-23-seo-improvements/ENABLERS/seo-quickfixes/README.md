# Enabler — Quickfixes SEO P0

## Contexte technique

L'audit SEO du 2026-05-09 a identifie 6 corrections a faible effort et impact eleve, qui ne necessitent aucune coordination entre couches. Toutes peuvent etre livrees en une seule PR de quelques lignes chacune.

Ces corrections doivent passer en premier car elles eliminent des erreurs evidentes (page transactionnelle indexable, alt vides, page /twitch absente du sitemap) avant la mise en place des chantiers plus larges (JSON-LD, prerender).

## Direction technique

- Une PR unique `chore/seo-quickfixes-p0` regroupant les 6 US (chacune en commit atomique)
- Pas de refacto, pas de tests E2E supplementaires hors verification de non-regression — chaque correction est une ligne ou un fichier de config
- Validation manuelle apres deploiement : Lighthouse local + Rich Results Test sur la home

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-noindex-postuler.md](us-noindex-postuler.md) | Fait | A faire | A faire | A faire |
| [us-twitch-sitemap.md](us-twitch-sitemap.md) | Fait | A faire | Fait | A faire |
| [us-alt-articles.md](us-alt-articles.md) | Fait | A faire | A faire | A faire |
| [us-og-dimensions.md](us-og-dimensions.md) | Fait | A faire | A faire | A faire |
| [us-og-image-fallback.md](us-og-image-fallback.md) | A faire | A faire | A faire | A faire |
| [us-lighthouse-seo-gate.md](us-lighthouse-seo-gate.md) | A faire | A faire | A faire | A faire |
