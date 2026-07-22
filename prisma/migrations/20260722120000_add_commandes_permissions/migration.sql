-- Ajout des permissions commandes:read et commandes:write au role Admin.
-- Idempotent : n'ajoute que les permissions absentes (calque sur 20260603210548_add_trophies_matches_permissions).
UPDATE "roles"
SET "permissions" = (
  SELECT ARRAY(
    SELECT DISTINCT perm FROM unnest(
      array_cat("permissions", ARRAY['commandes:read', 'commandes:write'])
    ) AS perm
  )
)
WHERE "name" = 'Admin';
