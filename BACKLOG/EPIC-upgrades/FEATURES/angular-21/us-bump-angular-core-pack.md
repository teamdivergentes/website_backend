# US — Bumper le pack Angular core (core, router, forms, material) en 21

## Role / Action / Benefice

> **En tant que** developpeur frontend,
> **je veux** mettre a jour `@angular/core`, `@angular/router`, `@angular/forms` et `@angular/material` de 20.x vers 21.x,
> **afin que** l'application reste sur une version supportee et beneficie des dernieres features (Signals API stabilisee, router resource API).

## Criteres d'acceptation

- [ ] `package.json` met `@angular/core`, `@angular/router`, `@angular/forms`, `@angular/common`, `@angular/animations`, `@angular/platform-browser`, `@angular/cdk` et `@angular/material` a `^21.2.6` (ou la derniere disponible).
- [ ] `npm install` passe sans warning de peer dependency.
- [ ] `ng update @angular/core@21 @angular/cli@21` execute (les schematics doivent passer).
- [ ] `ng build` passe en mode prod sans warning bloquant.
- [ ] Les tests unitaires `npm run test` restent verts.
- [ ] Aucune utilisation deprecated detectee par `tsc --noEmit` (a verifier avec strict mode).

## Dependances

Aucune (US foundation, doit passer en premier).

## Effort

M (≈ 4 h).
