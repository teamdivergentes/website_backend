# US — Auditer le code backend pour la compatibilite Prisma 7

## Role / Action / Benefice

> **En tant que** Architecte BDD PostgreSQL,
> **je veux** identifier les ruptures de compatibilite entre Prisma 6 et 7 dans la codebase backend,
> **afin que** le bump puisse etre realise sans surprise et que les corrections soient anticipees.

## Criteres d'acceptation

- [ ] Lecture du changelog Prisma 7.0 et 7.6 → liste des breaking changes documentee dans le PR.
- [ ] Recherche dans `backend/src/` des usages potentiellement impactes :
  - `prisma.$queryRaw` / `$executeRaw` (validation typage)
  - `findUniqueOrThrow` / `findFirstOrThrow`
  - Filtres `mode: 'insensitive'` sur PostgreSQL
  - JSON filters avancees
- [ ] Verification du `schema.prisma` : annotations deprecated (`@@map`, `@@index` syntax).
- [ ] Note redigee dans le PR sur les points a tester en priorite (auth, uploads, articles, sitemap).

## Dependances

Aucune (US d'audit en amont).

## Effort

S (≈ 2 h).
