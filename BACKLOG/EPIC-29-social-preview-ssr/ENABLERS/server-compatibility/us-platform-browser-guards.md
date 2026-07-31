# US — Encadrer les accès navigateur du code public

**En tant que** développeur frontend
**Je veux** que le code du périmètre public n'accède à `window`, `document` et `localStorage` que côté navigateur
**Afin que** le rendu serveur puisse s'exécuter sans erreur sur toutes les pages publiques

## Contexte

Audit du 2026-07-29 : 14 fichiers du périmètre public accèdent aux API navigateur sans garde. `main-layout.ts` est bloquant à lui seul, puisqu'il enveloppe toutes les routes publiques et fait l'appel dans son constructeur.

## Acceptance criteria

- [ ] `src/shared/layouts/main-layout/main-layout.ts` : `window.matchMedia` dans le constructeur, `document.querySelectorAll`, `document.getElementById`, `window.getComputedStyle` et `window.innerWidth` encadrés par `isPlatformBrowser`
- [ ] `src/shared/headers/header/header.ts` : accès navigateur encadrés
- [ ] `src/shared/services/cookie-consent.service.ts` : lecture et écriture de `document.cookie` encadrées, valeur de repli explicite côté serveur (consentement non accordé)
- [ ] `src/shared/services/matomo.service.ts` : injection du script encadrée, aucun `document.createElement` côté serveur
- [ ] `src/shared/services/analytics.service.ts` : idem pour `gtag`
- [ ] `src/app/app.config.ts` : accès navigateur encadrés, `provideAppInitializer` vérifié côté serveur
- [ ] `src/app/pages/home.ts`, `boutique.ts`, `twitch.component.ts`, `article-detail.component.ts`, `not-found.ts`, `retractation.ts`, `editor-blocks-renderer.component.ts` : accès navigateur encadrés
- [ ] `src/app/shared/services/cart.service.ts` : le `globalThis.localStorage?.` existant est conservé ou remplacé par une garde explicite, au choix, mais le comportement navigateur reste identique
- [ ] Aucun polyfill DOM global (`domino` ou équivalent) n'est introduit
- [ ] Les comportements visuels retirés du rendu serveur se réactivent bien à l'hydratation : scroll-snap, bannière de consentement, Matomo, mesures de layout
- [ ] Tests unitaires : chaque garde ajoutée est couverte sur ses deux branches, avec `PLATFORM_ID` mocké en `'server'` puis en `'browser'`
- [ ] `npm run lint` et `npm test` passent
- [ ] Aucune régression visuelle constatée en recette manuelle sur les pages touchées

## Notes

Cette US est mergeable seule, sans SSR actif. C'est volontaire : elle réduit le risque du lot F1 sans rien changer au comportement de production.
