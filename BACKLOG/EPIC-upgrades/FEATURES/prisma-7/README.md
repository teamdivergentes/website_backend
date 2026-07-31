# Feature F2 — Upgrade Prisma 6 → 7

## Repo

`backend`

## Branche git

`chore/prisma-7-upgrade` depuis `develop`.

## Contexte

Bump majeur 6.19.2 → 7.6.0 ouvert par Dependabot, build CI casse (PRs #49 + #50). Les `MEMORY.md` et `CLAUDE.md` mentionnent Prisma 6 ; il faut auditer schema, seed et generation des types.

PRs a fermer apres merge :

| PR | Bump |
|----|------|
| #49 | @prisma/client 6.19.2 → 7.6.0 |
| #50 | prisma 6.19.2 → 7.6.0 (dev) |

## Suivi US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-prepa-prisma-7-audit.md](us-prepa-prisma-7-audit.md) | A faire | A faire | A faire | A faire |
| [us-bump-prisma-7.md](us-bump-prisma-7.md) | A faire | A faire | A faire | A faire |
| [us-validation-non-regression.md](us-validation-non-regression.md) | A faire | A faire | A faire | A faire |

## Risques

- Generation des types : `prisma generate` peut produire des types incompatibles avec les DTO existants.
- API breaking sur `findUnique` / `findFirst` (renforcement de la validation).
- Migrations : Prisma 7 peut refuser des constructions de schema acceptees en 6.
- Seed (`seed.ts` + `seed.sql`) doit etre rejoue end to end.

## Charge estimee

M (≈ 1 jour dev + tests).
