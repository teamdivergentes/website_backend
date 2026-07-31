# Feature F1 — Upgrade Angular 20 → 21

## Repo

`frontend`

## Branche git

`chore/angular-21-upgrade` depuis `develop`.

## Contexte

8 PR Dependabot ouvertes sur le meme bump majeur. Le build casse car le bump touche `core`, `compiler`, `router`, `forms`, `material`, `cli`, `build` simultanement, et `ng-bootstrap` doit suivre la peer dependency.

> **Note 2026-05-17** : Dependabot a re-rouvert les PRs apres les bumps `21.2.12` (core/compiler/router/etc.) et `21.2.10` (cdk/build). L'etat actuel des PRs ouvertes ciblees par cette feature :

`package.json` frontend reste sur `^20.2.x` (core/compiler/forms/material/router/cdk/build/cli/platform-browser/compiler-cli). Cible : 21.2.x.

PRs Dependabot a fermer apres merge de la branche manuelle (etat 2026-05-17) :

| PR | Bump |
|----|------|
| #184 | @angular/core 20.3.20 → 21.2.12 |
| #183 | @angular/platform-browser 20.3.20 → 21.2.12 |
| #182 | @angular/compiler-cli 20.3.20 → 21.2.12 (dev) |
| #181 | @angular/router 20.3.20 → 21.2.12 |
| #179 | @angular/compiler 20.3.20 → 21.2.12 |
| #177 | @angular/cdk 20.2.14 → 21.2.10 |
| #166 | @angular/build 20.3.25 → 21.2.10 (dev) |

PRs annexes a regrouper dans la meme branche (peer deps ou outillage couple) :

| PR | Bump | Note |
|----|------|------|
| #178 | @fortawesome/angular-fontawesome 3.0.0 → 4.0.0 | Probable peer dep Angular 21 |

PRs Dependabot manquantes (a verifier / a creer) :

- `@angular/forms` (encore en 20.2.0 dans package.json)
- `@angular/material` (encore en 20.2.2)
- `@angular/cli` (encore en 20.2.2)
- `@ng-bootstrap/ng-bootstrap` (peer dep Angular 21 requis)

## Ordre de merge recommande

Pour minimiser les conflits sur `package.json` / `package-lock.json` :

1. Creer la branche `chore/angular-21-upgrade` depuis `develop` a jour
2. Lancer `ng update @angular/core@21 @angular/cli@21` puis `ng update @angular/material@21` — laissez la CLI Angular gerer les peer deps automatiquement
3. Bumper manuellement `@ng-bootstrap/ng-bootstrap` a 20 (peer dep `@angular/core@21`)
4. Bumper `eslint@10` + `@typescript-eslint/parser@8.59`
5. Mettre a jour les workflows CI (actions/* + sonarqube + trivy) — paquet annexe
6. Lancer `npm ci && npm run lint && npm run test && ng build` jusqu'a vert
7. Tester manuellement les pages publiques + admin (zoneless + Signals + Material)
8. Push + PR vers `develop` qui ferme automatiquement les PRs Dependabot listees ci-dessus (en commentaire `closes #184, closes #183, closes #182, closes #181, closes #179, closes #177, closes #166, closes #178`)

## Suivi US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-bump-angular-core-pack.md](us-bump-angular-core-pack.md) | A faire | A faire | A faire | A faire |
| [us-bump-angular-tooling.md](us-bump-angular-tooling.md) | A faire | A faire | A faire | A faire |
| [us-bump-ng-bootstrap-20.md](us-bump-ng-bootstrap-20.md) | A faire | A faire | A faire | A faire |
| [us-validation-non-regression.md](us-validation-non-regression.md) | A faire | A faire | A faire | A faire |

## Risques

- API breaking sur `@angular/router` (signal-based router state) et `@angular/forms` (typed forms par defaut).
- Material 21 peut imposer une revue des themes (token system).
- Le project utilise `zoneless` + Signals → bien tester le change detection.
- ng-bootstrap 20 requiert Angular 21 (peer dep) → upgrade groupe obligatoire.

## Charge estimee

L (≈ 1 a 2 jours dev + tests).
