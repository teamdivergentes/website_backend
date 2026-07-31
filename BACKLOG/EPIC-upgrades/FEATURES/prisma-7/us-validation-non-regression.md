# US — Valider la non-regression backend apres Prisma 7

## Role / Action / Benefice

> **En tant que** Expert QA,
> **je veux** executer la suite complete de tests + smoke E2E backend,
> **afin que** je puisse certifier qu'aucune route API ni job (cron, sitemap) n'a regresse apres le passage Prisma 7.

## Criteres d'acceptation

- [ ] `cd backend && npm run lint` passe.
- [ ] `cd backend && npm run test` passe avec coverage >= seuil actuel.
- [ ] Tests d'integration sur les modules critiques verts : auth, articles, sitemap, upload, contact, recrutement.
- [ ] `npx playwright test` (smoke E2E full stack via Docker) passe.
- [ ] Verification manuelle : login admin, creation d'un article, upload d'image, generation du sitemap (`/sitemap.xml`), endpoint `/api/health`.
- [ ] Les PRs #49 et #50 sont closed apres le merge sur develop.

## Dependances

`us-bump-prisma-7.md`.

## Effort

S (≈ 2 h).
