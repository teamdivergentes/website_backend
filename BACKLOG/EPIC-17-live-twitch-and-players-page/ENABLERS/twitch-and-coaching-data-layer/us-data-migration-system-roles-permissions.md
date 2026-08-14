# US — Data migration : permissions Twitch & Coaching staff sur les rôles système

## Role / Action / Benefice

> **En tant que** DevSecOps,
> **je veux** une data migration Prisma idempotente qui ajoute les permissions `twitch_channels:*` et `coaching_staff:*` sur les rôles système existants (`Admin`, `Gestionnaire`),
> **afin que** les nouvelles fonctionnalités EPIC-17 (admin Twitch CRUD, coaching staff) soient utilisables en production sans intervention manuelle SQL après déploiement.

## Contexte

Le `seed.ts` ne s'exécute pas automatiquement en production (l'`entrypoint.sh` ne lance que `npx prisma migrate deploy`). Conséquence : sur les bases déjà déployées (preprod et prod), les rôles `Admin` et `Gestionnaire` créés avant l'EPIC-17 n'ont **pas** les permissions `twitch_channels:*` ni `coaching_staff:*`. Sans cette migration, un admin verra un 403 sur `/admin/twitch-channels` après déploiement, et il faudrait passer en SQL manuel via `psql` ou `pgadmin` pour rattraper.

Cette US instaure également le **pattern réutilisable** "data migration pour permissions de rôles système" pour les futures EPICs ajoutant des permissions (à formaliser ensuite dans EPIC-19 côté process / CI).

## Criteres d'acceptation

- [ ] Migration Prisma créée via `npx prisma migrate dev --create-only --name sync_system_roles_twitch_coaching_permissions`.
- [ ] Le SQL :
  - Cible **uniquement** les rôles `isSystem = true` (ne touche jamais les rôles custom créés par un admin).
  - Pour `Admin` : ajoute `twitch_channels:read`, `twitch_channels:write`, `twitch_channels:delete`, `coaching_staff:read`, `coaching_staff:write`, `coaching_staff:delete` si absents.
  - Pour `Gestionnaire` : ajoute les mêmes 6 permissions si absentes.
  - Pour `CM` : aucun changement (pas de permission Twitch/Coaching dans le seed).
  - Est **idempotent** : utilise `array_append` conditionnel ou `array_cat` + `DISTINCT` pour éviter les doublons. Re-run = no-op.
- [ ] La migration s'applique proprement via `npx prisma migrate deploy` sur :
  - Une base vierge (cas dev/CI : les rôles existent déjà via seed.ts puis la migration est no-op).
  - Une base existante issue de v1.3.x (cas prod : les permissions sont effectivement ajoutées).
- [ ] Test d'intégration ou script de vérification : après application, un `SELECT permissions FROM roles WHERE name = 'Admin'` retourne bien les 6 nouvelles permissions.
- [ ] La migration est documentée dans `backend/docs/devops/deployment.md` (section "Data migrations") avec une note expliquant le pattern.
- [ ] Le seed.ts reste la source de vérité pour les bases vierges — aucune modification du seed.

## Approche technique recommandée

```sql
-- Migration: sync_system_roles_twitch_coaching_permissions
-- Idempotente : utilise une CTE qui ne ré-applique pas les permissions déjà présentes.

UPDATE roles
SET permissions = (
  SELECT ARRAY(
    SELECT DISTINCT unnest(
      permissions || ARRAY[
        'twitch_channels:read',
        'twitch_channels:write',
        'twitch_channels:delete',
        'coaching_staff:read',
        'coaching_staff:write',
        'coaching_staff:delete'
      ]::text[]
    )
  )
)
WHERE name IN ('Admin', 'Gestionnaire')
  AND "isSystem" = true;
```

> **Pourquoi `DISTINCT` + `unnest`** : garantit l'idempotence sans avoir à `DROP/CREATE` quoi que ce soit. Si l'admin a déjà customisé `Admin` (ajouté une permission custom), elle est préservée — on fait une union, pas un remplacement.

## Statut Claude

Fait (PR #117 mergee sur develop 2026-05-06 — migration `20260506220928_sync_system_roles_twitch_coaching_permissions` deployable en prod v1.4.0)

## Effort estime

S (≈ 1-2 h, dont ~30 min de tests sur dump prod local)

## Dependances

- Bloquant pour le déploiement v1.4.0 (release contenant EPIC-17) en production.
- Aucune dépendance amont — peut être traitée immédiatement.

## Validation

- [ ] Test manuel : restaurer un dump preprod < v1.4.0, lancer `npx prisma migrate deploy`, vérifier en SQL que les rôles `Admin` et `Gestionnaire` ont bien les nouvelles permissions.
- [ ] Test manuel : re-lancer `npx prisma migrate deploy` une seconde fois → la migration est marquée appliquée (table `_prisma_migrations`), aucun doublon dans `permissions`.
- [ ] Test manuel : en preprod, après déploiement, se connecter avec un compte ayant le rôle `Gestionnaire` et vérifier l'accès à `/admin/twitch-channels` (200, pas 403).
