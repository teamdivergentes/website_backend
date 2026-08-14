# US — Corriger le prefixe Open Graph `published_time` / `modified_time`

## Role / Action / Benefice

En tant que **crawler Facebook / LinkedIn**, je veux trouver les balises `<meta property="article:published_time">` et `<meta property="article:modified_time">` avec le **prefixe officiel `article:`** (et non `og:article:`) afin d'enrichir correctement la preview de partage.

## Criteres d'acceptation

- [ ] `SeoService.updateMetaTags()` ligne 88 emet `property: 'article:published_time'` (et non `og:article:published_time`)
- [ ] Idem ligne 91 pour `modified_time`
- [ ] Aucune balise `og:article:*` ne subsiste dans le DOM des pages d'articles
- [ ] Test unitaire : verifie que `updateMetaTags({ publishedTime: '...' })` cree bien `<meta property="article:published_time">`
- [ ] Test E2E : visiter `/articles/<slug>` en preprod et verifier la presence des deux balises avec le bon prefixe
- [ ] Validation manuelle via FB Debugger : la date apparait dans la preview

## Fichiers concernes

- `frontend/src/app/shared/services/seo.service.ts` (l.88, l.91)
- `frontend/src/app/shared/services/seo.service.spec.ts` (mise a jour tests)

## Notes historiques

Cette regression a ete introduite dans EPIC-23 `ENABLERS/twitter-social-metadata/us-og-article-times.md` (Fait Claude). L'us n'avait pas verifie la conformite a la spec OpenGraph. A documenter dans le commit message.

## DoD

- Lint + tests OK
- Capture FB Debugger avant/apres jointe a la PR
