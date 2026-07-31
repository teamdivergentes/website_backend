# Enabler — JSON-LD Article enrichi

## Contexte technique

Le composant `article-detail.component.ts` (ligne 109-140 environ) injecte un `<script type="application/ld+json">` minimaliste :

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "...",
  "description": "...",
  "image": "/uploads/<hash>.png",         // URL relative
  "datePublished": "...",
  "dateModified": "...",
  "author": { "@type": "Organization", "name": "Team Divergentes" },
  "publisher": { ... }
}
```

**Manques (audit 2026-05-17 + recos `seo-expert`)** :
- `mainEntityOfPage` (obligatoire pour les rich snippets Article selon Google)
- `image` doit etre un `ImageObject` avec `url` absolu + `width` + `height` (pas une string relative)
- `articleSection` (categorie : "EVA Esport", "Interview", etc. — disponible via `article.type.name`)
- `keywords` (tags ou mots-cles separes par virgule)
- `wordCount` (entier, derive du contenu EditorJS)
- `inLanguage` ("fr-FR")
- `isPartOf` (le WebSite parent)
- `author.url` (URL absolue vers la page Team Divergentes)

## Direction technique

Centraliser la construction du JSON-LD `Article` dans une methode `SeoService.buildArticleJsonLd(article)` plutot que dans le composant, pour reutilisation potentielle (RSS, AMP futur, etc.).

Calcul du `wordCount` : parser le `content` EditorJS, concatener les `text` des blocs `paragraph`/`header`/`list` (strip HTML), `text.split(/\s+/).length`.

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-add-main-entity-of-page.md](us-add-main-entity-of-page.md) | Fait | A faire | A faire | A faire |
| [us-image-object-absolute.md](us-image-object-absolute.md) | Fait | A faire | A faire | A faire |
| [us-section-keywords-wordcount.md](us-section-keywords-wordcount.md) | Fait | A faire | A faire | A faire |

## Dependances

- L'US `us-image-object-absolute.md` depend de l'enabler [`canonical-and-og-url-runtime`](../canonical-and-og-url-runtime/README.md) — la resolution d'URL doit etre disponible avant
- L'US `us-section-keywords-wordcount.md` necessite que le champ `tags` soit ajoute au modele Article (a evaluer : peut-on deriver les keywords du nom du type ? sinon ouvrir un us complementaire pour le champ tags BDD)
