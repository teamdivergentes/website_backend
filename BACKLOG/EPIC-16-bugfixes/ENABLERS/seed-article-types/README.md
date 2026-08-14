# Enabler — Seed des catégories d'articles en production

## Contexte technique

Le `backend/entrypoint.sh` exécute `npx prisma migrate deploy` au démarrage mais **JAMAIS** `npx prisma db seed`. Conséquence : sur toute instance prod fraîche, la table `article_types` reste vide après la migration `20260317230452_add_articles` qui ne fait que créer le schéma.

Le fichier `backend/prisma/seed.sql` (lignes 147-154) contient pourtant les 5 catégories par défaut (`Actualité`, `Annonce`, `Match Report`, `eSport`, `Interview`), mais personne ne l'exécute en prod. Le `seed.ts` (utilisé par le sidecar E2E `frontend/docker-compose.e2e.yml`) ne contient pas non plus d'`INSERT` pour les `ArticleType`.

**Bug constaté en prod** : aucune catégorie disponible côté admin → impossible de créer/publier un article (FK `articles.type_id` obligatoire).

## Direction technique

Solution durable, automatique au prochain déploiement :

1. **Nouvelle migration Prisma idempotente** `20260517140000_seed_article_types/migration.sql` qui fait `INSERT INTO "article_types" ... ON CONFLICT ("name") DO NOTHING`. Appliquée automatiquement par `entrypoint.sh` via `prisma migrate deploy`.
2. **Alignement de `seed.ts`** avec un bloc `prisma.articleType.upsert` idempotent, pour cohérence avec le sidecar E2E et le seed local.

Pas de modification de migrations existantes (règle absolue CLAUDE.md). Pas de SQL manuel en prod.

## US

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-seed-article-types.md](us-seed-article-types.md) | Fait | A faire | A faire | A faire |
