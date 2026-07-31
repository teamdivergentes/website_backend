-- B5 (complement) : backfill de "teamNameSnapshot" pour les matchs crees avant son ajout.
--
-- La migration 20260722120000_match_team_setnull_snapshot ajoute la colonne sans la remplir.
-- Consequence : pour tout match existant, "teamNameSnapshot" reste NULL. Si l'equipe liee est
-- ensuite supprimee, "teamId" passe a NULL via ON DELETE SET NULL et le match perd toute trace
-- du nom de l'equipe — exactement ce que l'US B5 vise a eviter.
--
-- Ce backfill n'est applique qu'aux lignes encore NULL : il est donc sans effet sur les matchs
-- crees apres la migration precedente, et rejouable sans risque.

UPDATE "public"."matches" AS m
SET "teamNameSnapshot" = t."name"
FROM "public"."teams" AS t
WHERE m."teamId" = t."id"
  AND m."teamNameSnapshot" IS NULL;
