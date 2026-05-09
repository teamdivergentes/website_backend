-- Migration: add page visibility config keys for Twitch (and Articles if missing)
-- Ajoute les cles `page_twitch_visible` et `page_articles_visible` a la table configs.
--
-- Idempotente : ON CONFLICT (key) DO NOTHING garantit qu'un double passage ne
-- duplique pas les lignes ni n'ecrase une valeur deja modifiee par l'admin.

INSERT INTO configs (key, value, description, "createdAt", "updatedAt") VALUES
  ('page_twitch_visible', 'true', 'Afficher la page En Live (Twitch)', NOW(), NOW()),
  ('page_articles_visible', 'true', 'Afficher la page Articles/Annonces', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;
