-- Seed les catégories d'articles par défaut.
-- Migration idempotente : ON CONFLICT DO NOTHING permet de la rejouer sans erreur
-- et de ne pas écraser des catégories ajoutées manuellement.
INSERT INTO "article_types" ("name", "created_at", "updated_at") VALUES
  ('Actualité', NOW(), NOW()),
  ('Annonce', NOW(), NOW()),
  ('Match Report', NOW(), NOW()),
  ('eSport', NOW(), NOW()),
  ('Interview', NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;
