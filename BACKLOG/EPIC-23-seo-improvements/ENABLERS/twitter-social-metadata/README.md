# Enabler — Metadonnees sociales Twitter et OG articles

## Contexte technique

Les balises Open Graph et Twitter Cards sont en place mais incompletes :
1. `twitter:site` (handle officiel DVG sur X) absent dans `index.html`
2. Les pages d'articles emettent `og:type="article"` (cf. `article-detail.component.ts` l.103) mais **pas** les sous-balises `og:article:published_time` ni `og:article:modified_time` qui enrichissent les previews LinkedIn et Facebook

## Direction technique

Coordination prealable avec l'equipe communication : confirmer le handle Twitter / X officiel de Team Divergentes (`@teamdivergentes` ou autre).

Etendre `SeoService.updateMetaTags()` pour accepter `publishedTime` et `modifiedTime` optionnels et emettre les meta correspondants.

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-twitter-site-handle.md](us-twitter-site-handle.md) | A faire | A faire | A faire | A faire |
| [us-og-article-times.md](us-og-article-times.md) | Fait | A faire | A faire | A faire |
