# US — Bumper @ng-bootstrap/ng-bootstrap en 20

## Role / Action / Benefice

> **En tant que** developpeur frontend,
> **je veux** mettre a jour `@ng-bootstrap/ng-bootstrap` de 19.0.1 vers 20.0.0,
> **afin que** la peer dependency Angular 21 soit satisfaite.

## Criteres d'acceptation

- [ ] `package.json` met `@ng-bootstrap/ng-bootstrap` a `^20.0.0`.
- [ ] `npm install` passe sans warning de peer dep.
- [ ] Les composants utilisant ng-bootstrap (modals, tooltips, dropdowns…) compilent et fonctionnent visuellement (verifier au moins la modal boutique et les tooltips header).
- [ ] Pas de `console.error` lie a ng-bootstrap dans le devtools console au runtime.

## Dependances

`us-bump-angular-core-pack.md` (peer dep).

## Effort

S (≈ 1 h).
