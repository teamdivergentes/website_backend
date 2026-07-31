# US — Préserver l'historique des matchs à la suppression d'une équipe

**Sévérité** : 🔴 Bloquant (risque de perte de données)
**Domaine** : Backend / BDD (Prisma)
**ID audit** : BACK-B5

## Rôle / Action / Bénéfice

**En tant que** gestionnaire de contenu,
**je veux** que la suppression d'une équipe n'efface pas silencieusement son historique de matchs,
**afin de** conserver la mémoire sportive de la structure (scores, adversaires passés).

## Contexte technique

`Match.teamId` est `Int` (non nullable) avec `onDelete: Cascade` → supprimer une équipe **efface tous ses matchs**. Incohérent avec `Trophy` (`teamId Int?` + `onDelete: SetNull` + champ de secours `teamLabel`). `TeamsService.delete()` n'avertit pas du nombre de matchs/trophées impactés.

## Décision attendue (PO + Architecte BDD)

Deux options :
- **(a) Recommandée** — Aligner `Match` sur `Trophy` : `teamId Int?`, `onDelete: SetNull`, ajouter un champ de secours (`teamNameSnapshot`) pour préserver l'affichage historique. Via **nouvelle migration** (ne jamais modifier la migration existante).
- **(b)** — Assumer le cascade comme choix produit (match = donnée liée à l'équipe), le **documenter** explicitement dans `teams.service.ts` et exiger une **confirmation front** avec avertissement du volume impacté avant suppression.

## Critères d'acceptation

- [ ] Décision (a) ou (b) tranchée et tracée ici.
- [ ] Si (a) : nouvelle migration Prisma créée (`npx prisma migrate dev --name ...`), schéma + DTO + service adaptés, tests mis à jour.
- [ ] Si (b) : commentaire explicite dans `teams.service.ts` + avertissement/confirmation côté admin.
- [ ] Test couvrant le comportement retenu à la suppression d'une équipe ayant des matchs.

> Par défaut, l'agent implémente l'option (a) sauf indication contraire du PO.

## Complément 2026-07-26 — backfill manquant sur le snapshot

**Constat** (recette visuelle sur l'instance Docker isolée) : la migration `20260722120000_match_team_setnull_snapshot` ajoute bien `teamNameSnapshot` mais **sans remplir les lignes existantes**. Vérifié en base : tous les matchs antérieurs à la migration ont `teamNameSnapshot = NULL`.

**Conséquence** : l'objectif de l'US n'est atteint que pour les matchs créés *après* la migration. Pour tout match déjà en base (préprod et prod incluses), la suppression de l'équipe met `teamId` à `NULL` via `ON DELETE SET NULL` **et** laisse `teamNameSnapshot` à `NULL` — le match perd donc toute trace de l'équipe, exactement le scénario que l'US visait à empêcher.

**Correction** : nouvelle migration `20260726120000_backfill_match_team_name_snapshot` (la migration d'origine n'est pas modifiée, conformément à la règle d'immuabilité). Elle remplit `teamNameSnapshot` depuis `teams.name` pour les seules lignes encore `NULL` — donc sans effet sur les matchs récents, et rejouable sans risque.

**Vérification effectuée** : 6 matchs remis manuellement à `NULL`, `prisma migrate deploy` relancé → les 6 ont récupéré le nom de leur équipe, et `count(*) where teamNameSnapshot IS NULL AND teamId IS NOT NULL` retombe à 0.
