# US — Seed automatique des catégories d'articles en production

## Rôle / Action / Bénéfice

> **En tant que** Community Manager (CM),
> **je veux** que les 5 catégories d'articles standards (`Actualité`, `Annonce`, `Match Report`, `eSport`, `Interview`) soient disponibles immédiatement après chaque déploiement prod,
> **afin de** pouvoir créer et publier un article sans dépendre d'une intervention manuelle SQL en base.

## Contexte

`backend/entrypoint.sh` ne lance pas `prisma db seed` en prod. Sur une instance fraîche (ou après reset BDD), la table `article_types` reste vide → l'admin ne peut sélectionner aucune catégorie dans le formulaire de création d'article, et le backend rejette tout `POST /api/articles` faute de FK valide.

## Critères d'acceptation

- [x] Une nouvelle migration `backend/prisma/migrations/20260517140000_seed_article_types/migration.sql` insère les 5 catégories par défaut via `INSERT ... ON CONFLICT ("name") DO NOTHING`.
- [x] La migration est **idempotente** : la rejouer ne provoque pas d'erreur, n'écrase pas une catégorie ajoutée manuellement.
- [x] Aucune migration existante (notamment `migration_lock.toml`) n'est modifiée.
- [x] Le fichier `backend/prisma/seed.ts` insère également ces 5 catégories via `prisma.articleType.upsert`, pour cohérence avec le sidecar E2E qui exécute `seed.ts` (`frontend/docker-compose.e2e.yml` lignes 63-84).
- [x] `npm run lint` et `npm run test` du backend passent sans régression (625/625 tests verts, 2026-05-17).
- [ ] Après merge sur `main` et tag prod, la table `article_types` contient au moins ces 5 lignes sans intervention humaine. *(vérification post-déploiement)*

## Effort estimé

XS (≈ 0.25 j).

## Dépendances

Aucune.
