# Enabler — CI quality enforcement

## Contexte technique

Aujourd'hui, la CI GitHub Actions ne bloque pas systématiquement sur :
- Lint backend / frontend
- Tests unitaires
- Couverture (LCOV)
- Quality Gate Sonar
- E2E Playwright

Conséquence : il est possible de merger du code qui dégrade la qualité sans alerte.

## Objectif

Rendre la qualité **non-régressable** : la CI bloque tout merge dans `main` qui dégrade les indicateurs.

## Direction technique

- Workflow unifié `.github/workflows/ci.yml` avec jobs en parallèle :
  - `lint-backend` / `lint-frontend`
  - `unit-backend` / `unit-frontend` (avec coverage LCOV)
  - `sonar-backend` / `sonar-frontend` (Quality Gate)
  - `e2e-frontend`
  - `build-backend` / `build-frontend`
- Chacun **required** dans la branch protection rule de `main`
- Cache npm + cache Playwright pour temps de run < 10 min total
- Reporting final dans le commentaire de PR (résumé tests + coverage + Sonar)

## US

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-ci-lint-and-build-jobs.md](us-ci-lint-and-build-jobs.md) | Fait | A faire | A faire | A faire |
| [us-ci-coverage-thresholds.md](us-ci-coverage-thresholds.md) | Fait | A faire | A faire | A faire |
| [us-ci-required-checks-and-pr-summary.md](us-ci-required-checks-and-pr-summary.md) | Fait | A faire | A faire | A faire |
| [us-ci-a11y-axe-lighthouse.md](us-ci-a11y-axe-lighthouse.md) | A faire (cree 2026-05-19 suite VQO findings residuels) | A faire | A faire | A faire |

> Note : la branche Sonar est livrée dans l'enabler `sonar-baseline-and-gates`, et l'E2E dans `e2e-coverage`. Cet enabler termine en intégrant tout dans une CI cohérente et en imposant les checks comme bloquants.
