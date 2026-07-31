# US — Configurer Jest coverage et créer les helpers de test

## Rôle / Action / Bénéfice

> **En tant que** Expert QA + Expert Backend NestJS,
> **je veux** une configuration Jest stricte (seuils de couverture, reporters LCOV) et des helpers réutilisables (mock Prisma, factories),
> **afin que** chaque nouveau test soit rapide à écrire et que la CI échoue si la couverture régresse.

## Critères d'acceptation

### Configuration Jest

- [x] `backend/jest.config.ts` (ou `package.json > jest`) avec :
  - `coverageReporters: ['text', 'lcov', 'html']`
  - `coverageDirectory: 'coverage'`
  - `coverageThreshold.global` : `lines: 80, branches: 70, functions: 80, statements: 80`
  - `coveragePathIgnorePatterns` aligné avec `sonar.coverage.exclusions`
  - `testEnvironment: 'node'`
- [x] `npm run test:cov` génère `coverage/lcov.info` exploitable par Sonar
- [x] La commande échoue si seuils non atteints

### Helpers

- [x] `backend/test/helpers/prisma-mock.ts` : helper `createPrismaMock()` retournant un mock complet du `PrismaClient`
- [x] `backend/test/helpers/factories/` : 1 fichier par modèle (`user.factory.ts`, `team.factory.ts`, `sponsor.factory.ts`, etc.)
- [x] `backend/test/helpers/test-app.ts` : helper `createTestApp()` qui boote un `INestApplication` avec mocks injectés
- [x] Documentation rapide dans `backend/test/README.md`

### Validation

- [x] Au moins 1 test existant migré vers les nouveaux helpers (preuve d'utilisabilité)
- [x] `npm run test:cov` passe sur la baseline actuelle (les seuils peuvent être abaissés temporairement avec un TODO si la baseline est < 80 %)
- [ ] Build CI verte

## Effort estimé

S-M (~1 j)

## Dépendances

- Aucune (peut être la 1ʳᵉ US à attaquer côté coverage)
