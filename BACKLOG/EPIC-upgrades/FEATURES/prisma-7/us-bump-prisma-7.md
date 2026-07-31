# US — Bumper prisma + @prisma/client en 7.6.0

## Role / Action / Benefice

> **En tant que** Architecte BDD PostgreSQL,
> **je veux** mettre a jour `prisma` (dev) et `@prisma/client` de 6.19.2 vers 7.6.0,
> **afin que** le backend reste sur une version supportee de l'ORM.

## Criteres d'acceptation

- [ ] `package.json` met `prisma` et `@prisma/client` a `^7.6.0`.
- [ ] `npm install` passe sans warning de peer dep.
- [ ] `npx prisma generate` produit le client sans erreur.
- [ ] `npx prisma validate` passe sur le schema actuel.
- [ ] `npx prisma migrate status` confirme que la base de dev est synchronisee.
- [ ] `npm run build` du backend passe (TypeScript compile contre les nouveaux types).
- [ ] `npm run test` reste vert (tests unitaires service + repository).
- [ ] Le seed `seed.ts` execute sans erreur sur une base vierge.

## Dependances

`us-prepa-prisma-7-audit.md` (les corrections identifiees doivent etre integrees dans le PR de bump).

## Effort

M (≈ 4 h).
