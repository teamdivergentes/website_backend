# US — Configurer Karma coverage et créer les helpers de test

## Rôle / Action / Bénéfice

> **En tant que** Expert QA + Expert Frontend Angular,
> **je veux** une configuration Karma stricte (seuils LCOV) et des helpers de mock réutilisables,
> **afin que** chaque nouveau test soit rapide à écrire et que la CI échoue si la couverture régresse.

## Critères d'acceptation

### Configuration Karma

- [ ] `frontend/karma.conf.js` (ou `angular.json > test`) avec :
  - `coverageReporter` : `dir: 'coverage/frontend'`, `reporters: ['lcov', 'html', 'text-summary']`
  - `check.global` : `lines: 80, branches: 70, functions: 80, statements: 80`
  - `singleRun: true` quand `--watch=false`
- [ ] `npm test -- --watch=false --code-coverage` génère `coverage/frontend/lcov.info`
- [ ] La commande échoue si seuils non atteints

### Helpers

- [ ] `frontend/src/testing/mock-api.service.ts`
- [ ] `frontend/src/testing/mock-auth.service.ts`
- [ ] `frontend/src/testing/mock-config.service.ts`
- [ ] `frontend/src/testing/test-helpers.ts` (factories)
- [ ] `frontend/src/testing/setup.ts` (configuration globale TestBed si nécessaire)
- [ ] Documentation rapide dans `frontend/src/testing/README.md`

### Validation

- [ ] Au moins 1 test existant migré vers les helpers
- [ ] Build CI verte
- [ ] Temps total `npm test` (mode CI) < 90 secondes

## Effort estimé

S-M (~1 j)

## Dépendances

- Aucune
