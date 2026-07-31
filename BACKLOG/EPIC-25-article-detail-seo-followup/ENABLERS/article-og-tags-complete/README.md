# Enabler — Open Graph Article tags complets

## Contexte technique

Deux problemes coexistants dans `SeoService.updateMetaTags()` :

1. **Prefixe incorrect** (l.88 et l.91) :
   ```ts
   this.meta.updateTag({ property: 'og:article:published_time', ... });
   this.meta.updateTag({ property: 'og:article:modified_time', ... });
   ```
   Selon la spec OpenGraph (https://ogp.me/#type_article), le prefixe est `article:` (sans `og:`). Facebook/LinkedIn ne lisent pas la version `og:article:`.

2. **Balises manquantes** : `article:author`, `article:section`, `article:tag` (×N) totalement absentes -> categorisation invisible pour les crawlers sociaux.

## Direction technique

1. Corriger le prefixe sur `published_time` et `modified_time` (regression historique introduite dans EPIC-23 enabler twitter-social-metadata).
2. Etendre `updateMetaTags()` avec parametres optionnels :
   ```ts
   articleAuthor?: string;     // URL ou nom de l'auteur
   articleSection?: string;    // categorie (article.type.name)
   articleTags?: string[];     // mots-cles (multi-balises)
   ```
3. Emettre `<meta property="article:tag" content="...">` UNE balise par tag (la spec OpenGraph permet la repetition).
4. Eviter les regressions : retro-compatibilite garantie si les nouveaux parametres sont omis.

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-fix-og-prefix-published-modified.md](us-fix-og-prefix-published-modified.md) | Fait | A faire | A faire | A faire |
| [us-add-article-author-section-tag.md](us-add-article-author-section-tag.md) | Fait | A faire | A faire | A faire |

## Validation

- https://developers.facebook.com/tools/debug/ avec un article preprod (apres deploiement) -> previsualisation enrichie (auteur + section)
- View-source : balises `<meta property="article:..."` toutes presentes
