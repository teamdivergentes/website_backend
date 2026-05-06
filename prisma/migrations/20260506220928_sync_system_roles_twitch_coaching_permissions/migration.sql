-- Migration: sync_system_roles_twitch_coaching_permissions
-- Ajoute les permissions twitch_channels:* et coaching_staff:* sur les roles
-- systeme Admin et Gestionnaire.
--
-- Idempotente : ARRAY(SELECT DISTINCT unnest(...)) garantit qu'un double passage
-- ne cree aucun doublon dans le tableau permissions.
-- Les permissions custom ajoutees par un admin sont preservees (union, pas remplacement).

UPDATE "roles"
SET "permissions" = (
  SELECT ARRAY(
    SELECT DISTINCT unnest(
      "permissions" || ARRAY[
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
WHERE "name" IN ('Admin', 'Gestionnaire')
  AND "isSystem" = true;
