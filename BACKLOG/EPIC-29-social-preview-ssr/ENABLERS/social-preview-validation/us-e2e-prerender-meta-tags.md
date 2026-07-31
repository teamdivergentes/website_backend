# US — Tests E2E des meta tags sur HTML brut — `REMPLACEE`

> **2026-07-29** : remplacée par [us-e2e-ssr-meta-tags.md](us-e2e-ssr-meta-tags.md) suite au pivot d'EPIC-29 vers le SSR runtime. Conservée pour l'historique. Ne plus mettre à jour.

**En tant que** Expert QA
**Je veux** un test E2E qui verifie la presence des meta tags dans le HTML brut sans execution JS
**Afin que** toute regression du prerender soit detectee avant promotion en prod

## Acceptance criteria

- [ ] Nouveau fichier `e2e/specs/prerender-meta-tags.spec.ts`
- [ ] Utilise `request.get(url)` (pas `page.goto`) pour recuperer le HTML brut tel qu'un bot le lit
- [ ] Pour chacune des routes echantillons (1 statique + 1 article + 1 joueur + 1 coach), verifier la presence de :
  - `<title>` avec contenu specifique (pas la home generique)
  - `<meta name="description">` avec contenu specifique
  - `<meta property="og:title">` avec contenu specifique
  - `<meta property="og:description">` avec contenu specifique
  - `<meta property="og:image">` avec URL absolue commencant par `https://`
  - `<meta property="og:url">` correspondant a l'URL demandee
- [ ] Test echoue clairement si une meta tag manque ou contient encore le placeholder `__OG_DESCRIPTION__`
- [ ] Job CI `e2e-prerender-validation` ajoute apres `deploy-preprod`, bloquant pour la promotion en prod
- [ ] Test execute aussi en local via `npx playwright test prerender-meta-tags.spec.ts` (sans Docker preprod, mock du dist local)
- [ ] Documentation ajoutee dans `e2e/README.md`
