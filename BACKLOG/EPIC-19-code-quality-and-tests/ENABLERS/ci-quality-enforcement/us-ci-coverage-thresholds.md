# US — Imposer les seuils de couverture en CI

## Rôle / Action / Bénéfice

> **En tant que** Expert QA + DevSecOps,
> **je veux** que la CI échoue si la couverture descend sous 80 % lignes / 70 % branches,
> **afin que** la couverture de tests soit non-régressable.

## Critères d'acceptation

### Backend

- [ ] Job `unit-backend` :
  - `npm run test:cov`
  - Échec si seuils Jest non atteints (configurés dans `us-jest-coverage-config-and-helpers.md`)
  - Upload de `coverage/lcov.info` en artifact
  - Commentaire PR avec résumé coverage (action `romeovs/lcov-reporter-action` ou équivalent)

### Frontend

- [ ] Job `unit-frontend` :
  - `npm test -- --watch=false --code-coverage --browsers=ChromeHeadless`
  - Échec si seuils Karma non atteints
  - Upload de `coverage/frontend/lcov.info` en artifact
  - Commentaire PR avec résumé coverage

### Reporting

- [ ] Badge de couverture mis à jour automatiquement dans le README racine (si possible via Sonar badge)
- [ ] Documentation : comment lire le rapport HTML local (`open coverage/index.html`)

## Effort estimé

S (~0.5 j)

## Dépendances

- US `us-jest-coverage-config-and-helpers.md`
- US `us-karma-coverage-config-and-helpers.md`
