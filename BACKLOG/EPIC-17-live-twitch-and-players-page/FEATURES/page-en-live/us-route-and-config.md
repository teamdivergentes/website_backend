# US — Activer la route `/twitch` et l'integrer a la config

## Role / Action / Benefice

> **En tant que** developpeur frontend,
> **je veux** activer la route `/twitch` (deja prevue inactive en `navigation-pages.ts`) et l'ajouter au systeme de visibilite config,
> **afin que** la nouvelle page En Live soit accessible et toggleable depuis l'admin.

## Criteres d'acceptation

- [ ] Dans `navigation-pages.ts` : entry `stream` / `path: '/twitch'` passe a `active: true`.
- [ ] Le label affiche est **"EN LIVE"** (pas "stream") et capitalise via `[uppercase]` pipe — voir feature F2 pour le badge.
- [ ] Nouvelle config admin : `pageTwitchVisible` (booleen, default `true`).
- [ ] `ConfigService` expose `pageTwitchVisible()` signal.
- [ ] La methode partagee `isPageVisible()` (cf. EPIC-16 enabler footer) prend en compte `/twitch`.
- [ ] Route enregistree dans `app.routes.ts` :
  ```ts
  {
    path: 'twitch',
    loadComponent: () => import('./pages/twitch/twitch.component').then(m => m.TwitchComponent),
    title: 'En live · Team Divergentes',
  }
  ```
- [ ] Composant standalone `TwitchComponent` cree (squelette minimal — le contenu est traite dans les US suivantes).
- [ ] Test unitaire : la route `/twitch` est accessible sans authentification.

## Effort estime

XS (≈ 1 h)

## Dependances

Aucune.
