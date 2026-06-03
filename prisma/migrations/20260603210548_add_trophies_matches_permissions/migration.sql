-- Ajout des permissions trophies/matches aux rôles système Admin et CM (EPIC-37)
-- Idempotent : n'ajoute que les permissions absentes.
UPDATE "roles"
SET "permissions" = (
  SELECT ARRAY(
    SELECT DISTINCT perm FROM unnest(
      array_cat("permissions", ARRAY[
        'trophies:read','trophies:write','trophies:delete',
        'matches:read','matches:write','matches:delete'
      ])
    ) AS perm
  )
)
WHERE "name" IN ('Admin', 'CM');
