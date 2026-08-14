# Feature — Socle SSR Angular (P0)

## Contexte

Deuxième lot de l'EPIC-29, à livrer **après** l'enabler `server-compatibility`. Met en place la configuration SSR Angular : point d'entrée serveur, table de rendu par route, hydratation.

Angular 20.2 est déjà en place, `@angular/ssr` ne demande aucune montée de version majeure.

Cette feature est **sans effet visible en production** tant que la feature `ssr-infra-integration` n'est pas livrée : le serveur Node est bâti mais rien ne route encore vers lui.

## Fichiers touchés

| Fichier | Nature | Contenu |
|---|---|---|
| `angular.json` | modifié | `"outputMode": "server"`, `"ssr": { "entry": "src/server.ts" }` |
| `src/server.ts` | nouveau | `AngularNodeAppEngine` + Express, écoute `:4000`, `allowedHosts` |
| `src/app/app.routes.server.ts` | nouveau | table de rendu par route |
| `src/app/app.config.server.ts` | nouveau | `provideServerRendering(withRoutes(serverRoutes))` + intercepteur d'URL de base |
| `src/app/app.config.ts` | modifié | ajout de `provideClientHydration(withEventReplay())` |
| `package.json` | modifié | dépendances `@angular/ssr` et `express` |

## Table de rendu

**`RenderMode.Server`** — 25 routes publiques, dérivées de `src/app/app.routes.ts` :

`/`, `/contact`, `/boutique`, `/boutique/:slug`, `/boutique/panier`, `/boutique/merci`, `/structure`, `/structure/sponsors`, `/structure/palmares`, `/structure/equipes`, `/structure/equipes/:teamId`, `/structure/equipes/:teamId/joueur/:playerSlug`, `/structure/equipes/:teamId/coach/:slug`, `/structure/recrutement`, `/structure/recrutement/:slug`, `/structure/recrutement/postuler`, `/twitch`, `/articles`, `/articles/:slug`, `/privacy-optout`, `/mentions-legales`, `/politique-de-confidentialite`, `/conditions-generales-de-vente`, `/retractation`, `/404`.

**`RenderMode.Client`** — `/admin/**`, `/auth/**`, `/profile`.

## Points de vigilance

- **`allowedHosts` est obligatoire.** Sans lui, le moteur Angular rejette les requêtes proxifiées par Nginx. Valeurs : `teamdivergentes.fr`, le domaine de preprod, `localhost` en développement. Configurable aussi par `NG_ALLOWED_HOSTS`.
- **`provideClientHydration()` doit figurer dans la configuration serveur comme dans la configuration client**, sinon erreur `NG0505` au runtime.
- L'ordre `provideAppInitializer` / `RuntimeConfigService` doit être revérifié côté serveur : `assets/config.json` est généré par `entrypoint.sh` et lu au démarrage. Le piège `APP_INITIALIZER` consigné dans `WEB/CLAUDE.md` s'applique ici.
- Toute route publique ajoutée ultérieurement doit être déclarée dans `app.routes.server.ts`, sinon elle retombe silencieusement en rendu client et perd ses previews sociales.

## Branche

`feat/epic-29-ssr` (depuis `develop`) — PR distincte de celle de l'enabler `server-compatibility`.

## US

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-angular-ssr-setup.md](us-angular-ssr-setup.md) | A faire | A faire | A faire | A faire |
| [us-server-routes-render-modes.md](us-server-routes-render-modes.md) | A faire | A faire | A faire | A faire |
| [us-client-hydration.md](us-client-hydration.md) | A faire | A faire | A faire | A faire |

## Validation

- `npm run build` produit `dist/frontend/browser/` **et** `dist/frontend/server/`
- Le serveur SSR démarre en local et rend la home avec son contenu réel, pas un squelette vide
- `curl -s http://localhost:4000/articles/<slug>` retourne le titre et la description de l'article
- `curl -s http://localhost:4000/admin/users` retourne le shell SPA, pas une page rendue
- Aucune erreur `window is not defined` ni `document is not defined` au rendu d'une page publique
- Aucune erreur `NG0505` ni avertissement d'hydratation en console navigateur
- `npm run lint` et `npm test` passent
- `frontend/CLAUDE.md` documente le fonctionnement SSR et la règle « toute nouvelle route publique se déclare dans `app.routes.server.ts` »
