# US — Valider la non-regression apres bump Angular 21

## Role / Action / Benefice

> **En tant que** Expert QA,
> **je veux** executer une passe complete de tests unitaires + E2E + lint + build,
> **afin que** je puisse certifier qu'aucune page publique ni admin n'a regresse apres le passage Angular 21.

## Criteres d'acceptation

- [ ] `cd frontend && npm run lint` passe.
- [ ] `cd frontend && npm run test` passe avec coverage >= seuil actuel.
- [ ] `cd frontend && ng build` produit un bundle prod sans erreur.
- [ ] `npx playwright test` (suite admin + public) passe sur la branche.
- [ ] Lighthouse sur la home : Performance >= 90, SEO >= 95.
- [ ] Smoke manuel : navigation header, page accueil, equipes, sponsors, recrutement, boutique, admin login + dashboard.
- [ ] Les 7 PRs Dependabot listees dans le README de la feature sont fermees apres merge sur develop (`@dependabot close` ou close manuel).

## Dependances

Toutes les autres US de la feature angular-21.

## Effort

M (≈ 3 h).
