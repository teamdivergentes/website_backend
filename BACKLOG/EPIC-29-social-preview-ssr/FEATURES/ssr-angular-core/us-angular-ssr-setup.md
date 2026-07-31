# US — Mettre en place le point d'entrée serveur SSR

**En tant que** développeur frontend
**Je veux** un serveur Node capable de rendre l'application Angular
**Afin de** produire un HTML complet pour les requêtes des crawlers et des visiteurs

## Acceptance criteria

- [ ] `@angular/ssr` et `express` ajoutés à `package.json`
- [ ] `angular.json` configuré avec `"outputMode": "server"` et `"ssr": { "entry": "src/server.ts" }`
- [ ] `src/server.ts` créé : `AngularNodeAppEngine` derrière Express, écoute sur le port `4000` (surchargeable par `PORT`)
- [ ] `allowedHosts` configuré avec `teamdivergentes.fr`, le domaine de preprod et `localhost` ; surchargeable par `NG_ALLOWED_HOSTS`
- [ ] `src/app/app.config.server.ts` créé avec `provideServerRendering(withRoutes(serverRoutes))`, fusionné à `appConfig` via `mergeApplicationConfig`
- [ ] `npm run build` produit `dist/frontend/browser/` **et** `dist/frontend/server/`
- [ ] Le serveur démarre en local et rend la home avec son contenu réel
- [ ] Aucune erreur `window is not defined` ni `document is not defined` au rendu
- [ ] `npm run lint` et `npm test` passent
- [ ] Les scripts npm de démarrage du serveur SSR sont documentés dans `frontend/README.md`

## Dépendances

Bloquée par les deux US de l'enabler `server-compatibility`.
