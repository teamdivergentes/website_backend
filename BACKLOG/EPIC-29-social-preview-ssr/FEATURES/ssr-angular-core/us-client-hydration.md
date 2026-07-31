# US — Activer l'hydratation client

**En tant que** visiteur
**Je veux** que la page rendue par le serveur devienne interactive sans être reconstruite
**Afin de** ne pas voir le contenu sauter ni perdre mes clics pendant le chargement

## Acceptance criteria

- [ ] `provideClientHydration(withEventReplay())` ajouté à `src/app/app.config.ts`
- [ ] La configuration serveur hérite bien de `provideClientHydration()` via `mergeApplicationConfig`, sans quoi l'erreur `NG0505` se déclenche au runtime
- [ ] `withHttpTransferCache` actif (comportement par défaut) : les appels HTTP résolus au rendu serveur ne sont pas rejoués par le navigateur
- [ ] Aucun avertissement d'hydratation en console sur les pages publiques : home, liste d'articles, détail d'article, fiche joueur, page boutique, détail produit
- [ ] Aucun saut visible de contenu entre le HTML serveur et le rendu hydraté
- [ ] Les interactions déclenchées avant la fin de l'hydratation sont rejouées (`withEventReplay`) : vérifié sur un ajout au panier et sur l'ouverture du menu mobile
- [ ] `SeoService` reste idempotent : les meta tags qu'il pose après hydratation sont identiques à ceux rendus par le serveur
- [ ] `npm run lint` et `npm test` passent

## Dépendances

Bloquée par `us-server-routes-render-modes.md`.
