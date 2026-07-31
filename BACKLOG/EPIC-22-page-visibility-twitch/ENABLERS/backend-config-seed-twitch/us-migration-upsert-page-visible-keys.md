# US — Migration Prisma idempotente pour `page_twitch_visible`

## Role / Action / Benefice

> **En tant que** Architecte BDD,
> **je veux** une migration Prisma data idempotente qui INSERT la cle `page_twitch_visible` (et `page_articles_visible` si manquante) dans la table `Config` des bases existantes,
> **afin que** preprod et prod recuperent la cle apres deploiement, sans duplications ni risque sur les valeurs admin existantes.

## Perimetre fichiers

- `backend/prisma/migrations/<YYYYMMDDHHMMSS>_add_page_twitch_visible_config/migration.sql` (nouveau)

## Description

`prisma/seed.ts` ne tourne pas en production. Pour que la cle `page_twitch_visible` apparaisse dans le panneau admin de preprod/prod, il faut une migration data dediee. La migration doit etre idempotente (re-run safe) en utilisant `ON CONFLICT DO NOTHING`.

Profitons-en pour ajouter aussi `page_articles_visible` si elle est absente (incoherence historique entre seed.ts et seed.sql).

## Cible — `migration.sql`

```sql
-- Migration: add page visibility config keys for Twitch (and Articles if missing)
-- Ajoute les cles `page_twitch_visible` et `page_articles_visible` a la table Config.
--
-- Idempotente : ON CONFLICT (key) DO NOTHING garantit qu'un double passage ne
-- duplique pas les lignes ni n'ecrase une valeur deja modifiee par l'admin.

INSERT INTO "Config" ("key", "value", "description", "createdAt", "updatedAt") VALUES
  ('page_twitch_visible', 'true', 'Afficher la page En Live (Twitch)', NOW(), NOW()),
  ('page_articles_visible', 'true', 'Afficher la page Articles/Annonces', NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;
```

## Criteres d'acceptation

- [ ] Nouveau dossier `prisma/migrations/<timestamp>_add_page_twitch_visible_config/`
- [ ] `migration.sql` contient l'INSERT avec `ON CONFLICT DO NOTHING`
- [ ] Le commentaire SQL explique l'idempotence et le perimetre
- [ ] `npx prisma migrate deploy` applique la migration sans erreur sur DB existante (preprod simulee)
- [ ] Re-execution de la migration ne cree pas de doublon (pas de violation de contrainte)
- [ ] La cle `page_twitch_visible` apparait avec `value = 'true'` apres deploy
- [ ] `_prisma_migrations.applied_steps_count = 1` apres premier deploy
- [ ] Tests e2e backend continuent de passer

## Notes techniques

**REGLE ABSOLUE** : ne JAMAIS modifier un fichier `migration.sql` existant. Si un correctif est necessaire, creer une nouvelle migration. Cf. `backend/CLAUDE.md` section "Prisma Migrations (CRITICAL)".

- Utiliser `npx prisma migrate dev --create-only --name add_page_twitch_visible_config` pour generer le squelette
- Editer le SQL genere pour utiliser `ON CONFLICT DO NOTHING`
- Verifier que la contrainte d'unicite sur `key` existe (elle est garantie si `key` est `@unique` dans `schema.prisma`)
- Pas de modification du `schema.prisma` (uniquement migration data)

## Effort

XS (~15 min).

## Dependances

Depend de `us-add-page-twitch-visible-seed.md` (meme branche, meme PR).
