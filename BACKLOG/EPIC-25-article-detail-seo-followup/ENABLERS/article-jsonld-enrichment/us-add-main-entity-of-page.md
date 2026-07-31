# US — Ajouter `mainEntityOfPage`, `inLanguage` et `isPartOf` au JSON-LD Article

## Role / Action / Benefice

En tant que **Googlebot**, je veux trouver les champs `mainEntityOfPage`, `inLanguage` et `isPartOf` dans le JSON-LD Article afin d'eligibler la page aux rich snippets Article et de comprendre la langue + le site parent.

## Criteres d'acceptation

- [ ] Le JSON-LD `Article` contient `mainEntityOfPage` : `{ "@type": "WebPage", "@id": "<URL absolue canonique de l'article>" }`
- [ ] Le JSON-LD `Article` contient `inLanguage: "fr-FR"`
- [ ] Le JSON-LD `Article` contient `isPartOf: { "@type": "WebSite", "name": "Team Divergentes", "url": "<siteUrl>" }`
- [ ] Le JSON-LD `Article` contient `author.url` (URL absolue vers la racine du site)
- [ ] Tests unitaires : la methode `buildArticleJsonLd` retourne un objet contenant ces 4 cles
- [ ] Validation https://validator.schema.org/ : 0 warning, 0 error

## Fichiers concernes

- `frontend/src/app/shared/services/seo.service.ts` (nouvelle methode `buildArticleJsonLd`)
- `frontend/src/app/pages/articles/article-detail/article-detail.component.ts` (utilise la nouvelle methode)

## DoD

- Validation schema.org passee (capture jointe a la PR)
- Lint + tests OK
