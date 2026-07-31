# US — Ajouter `articleSection`, `keywords` et `wordCount` au JSON-LD Article

## Role / Action / Benefice

En tant que **Googlebot**, je veux trouver `articleSection`, `keywords` et `wordCount` dans le JSON-LD `Article` afin de mieux categoriser le contenu (Google News, Discover) et evaluer la profondeur editoriale.

## Criteres d'acceptation

- [ ] `articleSection` est rempli avec `article.type.name` (ex : "Interview", "Annonce", "Match Report")
- [ ] `keywords` est rempli avec une liste de mots-cles separes par virgules. Source : (a) champ `tags` du modele Article si on l'ajoute (us complementaire), (b) sinon derive du nom du type + nom de l'equipe associee si detectable dans le contenu
- [ ] `wordCount` est calcule par parsing du `content` EditorJS :
  - Iterer sur `blocks`
  - Pour chaque bloc `paragraph` / `header` / `quote` : strip HTML du `text`, split sur `\s+`, count
  - Pour `list` : iterer sur `items`, strip + count
  - Ignorer `delimiter` / `image` / `embed`
- [ ] Helper `countWords(content: string): number` cree dans un util partage, testable unitairement
- [ ] Tests unitaires : 3 articles mock (court, moyen, avec listes/quotes) -> wordCount correct a +/- 5%
- [ ] Validation schema.org

## Fichiers concernes

- `frontend/src/app/shared/services/seo.service.ts`
- `frontend/src/app/pages/articles/article-detail/article-detail.component.ts`
- Nouveau : `frontend/src/app/shared/utils/editor-js-word-count.ts` + spec
- Optionnel (si extension BDD) : `backend/prisma/schema.prisma` (champ `tags String[]` sur Article)

## DoD

- Lint + tests OK
- Sur l'article PaasCool V2 preprod : `wordCount` reporte ~1900 (a verifier)
