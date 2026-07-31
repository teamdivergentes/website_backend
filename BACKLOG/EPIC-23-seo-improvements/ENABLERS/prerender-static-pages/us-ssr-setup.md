# US — Installer @angular/ssr en mode prerender uniquement

## Role / Action / Benefice

> **En tant que** mainteneur du projet,
> **je veux** activer le prerender statique d'Angular 20+ sans server Node a runtime,
> **afin que** les pages publiques soient servies en HTML complet aux crawlers non-Google.

## Contexte

Angular 19+ a unifie SSR et prerender via `@angular/ssr`. Le mode prerender pur (`outputMode: 'static'` ou equivalent recent) genere uniquement des `.html` au build, sans dependance Node en production.

## Criteres d'acceptation

- [ ] `ng add @angular/ssr --skip-server=true` (ou flags equivalents Angular 20+)
- [ ] Configuration `angular.json` ajustee : `outputMode: 'static'` ou `prerender: true` selon la version
- [ ] Le build local `npm run build` produit bien un dossier avec des `.html` par route prerenderee (a verifier dans `dist/.../browser/`)
- [ ] Le bundle JS reste identique pour les routes non-prerenderees (zoneless preserve)
- [ ] `npm test` passe sans regression
- [ ] Documentation : note dans `frontend/CLAUDE.md` expliquant le mode prerender et les limitations (pas d'API `window` au constructeur)

## Effort estime

L (≈ 1.5 j) — incluant resolution des composants utilisant `window`/`document` au mauvais moment

## Dependances

Coordination `devsecops` pour le Dockerfile et la config Nginx.
