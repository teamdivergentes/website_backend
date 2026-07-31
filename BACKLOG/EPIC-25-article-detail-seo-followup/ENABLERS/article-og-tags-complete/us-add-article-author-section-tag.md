# US — Ajouter `article:author`, `article:section`, `article:tag` dans le SeoService

## Role / Action / Benefice

En tant que **crawler social (Facebook, LinkedIn, X, WhatsApp)**, je veux trouver l'auteur, la section et les tags d'un article dans les meta OpenGraph afin de mieux categoriser le contenu dans les previews et les feeds.

## Criteres d'acceptation

- [ ] `SeoService.updateMetaTags()` accepte 3 nouveaux parametres optionnels :
  - `articleAuthor?: string` — URL de l'auteur (ou nom court si Organization)
  - `articleSection?: string` — categorie (ex : "Interview")
  - `articleTags?: string[]` — liste de tags (ex : `['Challenger League EVA', 'PaasCool', 'Mystic Divergentes']`)
- [ ] Emit `<meta property="article:author" content="...">` si parametre fourni
- [ ] Emit `<meta property="article:section" content="...">` si parametre fourni
- [ ] Emit UNE balise `<meta property="article:tag" content="...">` PAR tag
- [ ] A la navigation suivante, les anciennes balises `article:tag` sont nettoyees (cleanup explicite via `Meta.removeTag` ou strategie equivalente)
- [ ] `article-detail.component.ts` passe :
  - `articleAuthor: '<siteUrl>'` (Team Divergentes comme Organization)
  - `articleSection: article.type.name`
  - `articleTags: <derivés du type + nom equipe si detectable>` (peut etre simple pour V1 : `[article.type.name]`)
- [ ] Tests unitaires SeoService : verifie creation/suppression des balises
- [ ] Test E2E : article preprod -> au moins 3 balises `article:*` visibles dans le DOM

## Fichiers concernes

- `frontend/src/app/shared/services/seo.service.ts`
- `frontend/src/app/shared/services/seo.service.spec.ts`
- `frontend/src/app/pages/articles/article-detail/article-detail.component.ts`

## DoD

- Lint + tests OK
- Capture FB Debugger / LinkedIn Inspector jointe a la PR
