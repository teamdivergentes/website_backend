-- Cles de configuration de la boutique, editables depuis l'admin.
-- Volontairement absentes de public-config-keys.ts : ne doivent pas etre exposees publiquement.
-- Note : le modele Prisma Config est mappe sur la table "configs" (@@map("configs")),
-- pas "config" comme indique dans le plan d'origine.
INSERT INTO configs (key, value, "createdAt", "updatedAt")
VALUES
  ('shop_discord_webhook', '', NOW(), NOW()),
  ('shop_team_email', '', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;
