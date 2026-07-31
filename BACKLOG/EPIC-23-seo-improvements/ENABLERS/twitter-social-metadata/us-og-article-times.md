# US — Emettre og:article:published_time et modified_time sur les articles

## Role / Action / Benefice

> **En tant que** LinkedIn / Facebook affichant la preview d'un article DVG,
> **je veux** connaitre la date de publication et de derniere modification,
> **afin que** la preview indique la fraicheur du contenu et que les previews soient classees temporellement.

## Contexte

`frontend/src/app/pages/articles/article-detail/article-detail.component.ts` (l. 99-105) appelle `seoService.updateMetaTags({ ..., type: 'article' })` mais aucune balise `og:article:published_time` n'est emise. Open Graph definit ces meta pour le type `article`.

Documentation : https://ogp.me/#type_article

## Criteres d'acceptation

- [x] Etendre `SeoService.updateMetaTags()` pour accepter `publishedTime?: string` et `modifiedTime?: string` (ISO 8601)
- [x] Emettre `<meta property="og:article:published_time" content="...">` et `<meta property="og:article:modified_time" content="...">` quand fournis
- [ ] Optionnel : `<meta property="og:article:author" content="...">` si l'article a un auteur
- [x] Appel mis a jour dans `article-detail.component.ts` avec `article.createdAt` / `article.updatedAt`
- [x] Test unitaire Jasmine `seo.service.spec.ts` couvrant les cas avec / sans ces parametres
- [ ] Validation Facebook Sharing Debugger : preview affiche bien la date

## Effort estime

XS (≈ 0.25 j)

## Dependances

Aucune.
