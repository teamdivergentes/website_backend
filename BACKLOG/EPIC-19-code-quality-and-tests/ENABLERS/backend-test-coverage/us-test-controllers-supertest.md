# US — Tests d'intégration des controllers (Supertest)

## Rôle / Action / Bénéfice

> **En tant que** Expert QA,
> **je veux** un test Supertest par controller couvrant le happy path + 1 erreur,
> **afin que** la couche HTTP (validation DTO, guards, sérialisation) soit validée bout-en-bout sans dépendre d'un vrai postgres.

## Critères d'acceptation

- [ ] Pour chaque controller backend (`auth`, `users`, `roles`, `teams`, `team-members`, `games`, `sponsors`, `staff`, `recruitment`, `contact`, `upload`, `articles`, `config`, `profile`, `analytics`) :
  - [ ] Un fichier `*.controller.spec.ts` Supertest
  - [ ] Boot d'un `INestApplication` via le helper `createTestApp()`
  - [ ] Au moins 1 test happy path (200/201/204)
  - [ ] Au moins 1 test erreur de validation (400)
  - [ ] Au moins 1 test guard (401/403)
- [ ] Couverture controllers >= **90 %**
- [ ] Aucun test ne dépend d'un vrai postgres (mock Prisma uniquement)
- [ ] Temps total `npm run test` < 60 secondes

## Effort estimé

L (~3 j)

## Dépendances

- US `us-jest-coverage-config-and-helpers.md`
- US `us-test-auth-and-guards.md` (bonne pratique guards déjà en place)
