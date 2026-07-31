# US — Prerender des routes `/articles/:slug`

**En tant que** developpeur frontend
**Je veux** prerendre la page detail de chaque article publie
**Afin que** Discord, LinkedIn, Twitter et Facebook affichent la bonne preview lors du partage

## Acceptance criteria

- [ ] Configuration `getPrerenderParams()` ajoutee a la route `articles/:slug`
- [ ] Au build, frontend fetch `${PRERENDER_API_URL}/prerender/routes` et recupere la liste des slugs articles
- [ ] Variable `PRERENDER_API_URL` injectee dans le Dockerfile multi-stage (build stage) selon l'environnement
- [ ] Chaque article publie genere un `.html` dans `dist/<app>/browser/articles/<slug>.html`
- [ ] Le `.html` contient :
  - `<title>` = titre de l'article
  - `<meta name="description">` = description specifique (premiers 160 char du contenu ou champ dedie)
  - `<meta property="og:title|og:description|og:image|og:url>` corrects
  - `<meta property="article:published_time|article:modified_time|article:author|article:section>` corrects (deja livre dans EPIC-25)
  - JSON-LD `Article` complet (deja livre dans EPIC-25)
- [ ] Test E2E Playwright : pour 1 article publie, `request.get('/articles/<slug>').text()` contient les bonnes meta tags
- [ ] Pas de regression sur le rendu cote client : les utilisateurs voient le meme contenu apres hydratation
- [ ] Si `PRERENDER_API_URL` est inaccessible au build, fallback gracieux : aucun article prerendere, route reste SPA, le build ne casse pas
