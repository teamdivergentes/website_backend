# US — Tests E2E des meta tags et du contenu sur HTML brut

**En tant que** Expert QA
**Je veux** un test E2E qui vérifie les meta tags **et le contenu** dans le HTML brut, sans exécution de JavaScript
**Afin que** toute régression du rendu serveur soit détectée avant promotion en production

## Contexte

Deux modes de défaillance distincts doivent être couverts :

- **meta tags manquantes** — la route n'est pas déclarée en `RenderMode.Server`, elle retombe en rendu client
- **contenu absent** — la route est bien rendue côté serveur, mais les appels API ont échoué et la page est vide

Le second est le plus dangereux : la page a l'air correcte, le `<title>` est bon, et seul le corps est vide.

## Acceptance criteria

- [ ] Nouveau fichier `e2e/specs/ssr-meta-tags.spec.ts`
- [ ] Utilise `request.get(url)` et non `page.goto`, pour récupérer le HTML brut tel qu'un bot le lit
- [ ] Routes échantillons couvertes : une page statique, un article, une fiche joueur, une fiche coach, un produit boutique
- [ ] Pour chaque route, vérifie la présence de :
  - `<title>` avec un contenu spécifique à la page, distinct du titre de la home
  - `<meta name="description">` avec un contenu spécifique
  - `<meta property="og:title">` et `og:description` spécifiques
  - `<meta property="og:image">` avec une URL absolue en `https://`
  - `<meta property="og:url">` correspondant à l'URL demandée
- [ ] **Pour chaque route, vérifie aussi la présence de contenu métier dans le corps** : titre de l'article, nom du joueur, nom du produit — selon la route
- [ ] Le test échoue clairement si une meta tag contient encore un placeholder `__OG_*__`
- [ ] Un test vérifie qu'une route admin (`/admin/users`) retourne bien le shell SPA et **n'est pas** rendue côté serveur
- [ ] Job CI `e2e-ssr-validation` ajouté après le déploiement en preprod, bloquant pour la promotion en production
- [ ] Le test est exécutable en local contre un serveur SSR démarré depuis `dist/`
- [ ] Documentation ajoutée dans `e2e/README.md`

## Dépendances

Bloquée par la feature `ssr-infra-integration`.
