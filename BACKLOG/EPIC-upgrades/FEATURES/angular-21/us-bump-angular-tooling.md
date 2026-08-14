# US — Bumper le tooling Angular (cli, build) en 21

## Role / Action / Benefice

> **En tant que** developpeur frontend,
> **je veux** mettre a jour `@angular/cli` et `@angular/build` de 20.x vers 21.x,
> **afin que** la chaine de build (esbuild, application builder) reste alignee avec le runtime Angular 21.

## Criteres d'acceptation

- [ ] `package.json` met `@angular/cli` et `@angular/build` a `^21.2.5` (devDependencies).
- [ ] `angular.json` migre par les schematics si necessaire (ne pas le toucher manuellement avant `ng update`).
- [ ] `ng serve` demarre sans warning.
- [ ] `ng build --configuration production` passe et produit le bundle attendu.
- [ ] Le ratio de taille du bundle reste comparable a la version 20 (tolerance +/- 10 %).
- [ ] CI build vert sur la branche.

## Dependances

`us-bump-angular-core-pack.md` (les schematics CLI 21 attendent core 21).

## Effort

S (≈ 2 h).
