# US — Renseigner les alt texts des images d'articles

## Role / Action / Benefice

> **En tant que** utilisateur malvoyant et comme signal SEO Google,
> **je veux** que les images des articles aient un texte alternatif descriptif,
> **afin que** le contenu soit accessible et que Google Images indexe correctement les visuels.

## Contexte

`frontend/src/app/pages/articles/articles-page.component.html` :
- Ligne 95 : `<img ... alt="">` sur l'image hero du grand article a la une
- Ligne 142 : `<img ... alt="">` sur l'image des cartes article

Le `alt=""` est reserve aux images **purement decoratives**. Une image illustrant un article est du contenu — son alt doit reprendre au minimum le titre de l'article.

## Criteres d'acceptation

- [x] L. 95 : `<img [src]="hero.imageUrl" [alt]="hero.title">` (ou equivalent selon le binding)
- [x] L. 142 : `<img [src]="article.imageUrl" [alt]="article.title">`
- [x] Tous les autres `alt=""` dans le projet sont audites (`grep -rn 'alt=""' frontend/src`) — chaque cas est soit confirme decoratif, soit corrige
- [ ] Lighthouse Accessibility >= 90 maintenu

## Effort estime

XS (≈ 0.1 j)

## Dependances

Aucune.
