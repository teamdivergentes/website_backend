-- =============================================
-- SEED DATA - Initialisation base de donnees
-- Team Divergente - DVG
-- =============================================
--
-- Usage (depuis la racine du projet):
--   docker compose exec -T postgres psql -U teamdivergent -d teamdivergente < backend/prisma/seed.sql
--
-- Ou manuellement:
--   docker compose exec postgres psql -U teamdivergent -d teamdivergente
--   puis copier/coller le contenu
-- =============================================

-- 1. Creation des roles avec leurs permissions

-- Role Admin (toutes les permissions)
INSERT INTO roles (name, permissions, "isSystem", "createdAt", "updatedAt") VALUES
  ('Admin', ARRAY[
    'users:read','users:write','users:delete',
    'roles:read','roles:write','roles:delete',
    'teams:read','teams:write','teams:delete',
    'games:read','games:write','games:delete',
    'sponsors:read','sponsors:write','sponsors:delete',
    'staff:read','staff:write','staff:delete',
    'config:read','config:write',
    'annonces:read','annonces:write','annonces:delete',
    'articles:read','articles:write','articles:delete'
  ], true, NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  "isSystem" = EXCLUDED."isSystem",
  "updatedAt" = NOW();

-- Role CM (Community Manager - annonces et articles uniquement)
INSERT INTO roles (name, permissions, "isSystem", "createdAt", "updatedAt") VALUES
  ('CM', ARRAY[
    'annonces:read','annonces:write','annonces:delete',
    'articles:read','articles:write','articles:delete'
  ], true, NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  "isSystem" = EXCLUDED."isSystem",
  "updatedAt" = NOW();

-- Role Gestionnaire (equipes, jeux, sponsors, staff + droits CM)
INSERT INTO roles (name, permissions, "isSystem", "createdAt", "updatedAt") VALUES
  ('Gestionnaire', ARRAY[
    'teams:read','teams:write','teams:delete',
    'games:read','games:write','games:delete',
    'sponsors:read','sponsors:write','sponsors:delete',
    'staff:read','staff:write','staff:delete',
    'annonces:read','annonces:write','annonces:delete',
    'articles:read','articles:write','articles:delete'
  ], true, NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  "isSystem" = EXCLUDED."isSystem",
  "updatedAt" = NOW();

-- 2. Creation de l'utilisateur admin
-- Email: admin@teamdivergentes.fr
-- Mot de passe: admin123 (hashe bcrypt)
-- CHANGER LE MOT DE PASSE EN PRODUCTION !
INSERT INTO users (email, password, "roleId", actif, "createdAt", "updatedAt") VALUES
  ('admin@teamdivergentes.fr', '$2a$10$tyWgTRo7cB8WlUCbs.O4b.ZNRQD.0oLvFntOuw/BLmgvi08vC6S6W',
   (SELECT id FROM roles WHERE name = 'Admin'), true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- 3. Creation des configurations initiales
INSERT INTO configs (key, value, description, "createdAt", "updatedAt") VALUES
  ('youtube_link', 'https://www.youtube.com/embed/IqoIktEIeU0', 'Lien de la video YouTube de presentation', NOW(), NOW()),
  ('site_name', 'TeamDivergentes - Structure Esportive Francaise', 'Nom du site', NOW(), NOW()),
  ('contact_email', 'contact@teamdivergentes.fr', 'Email de contact', NOW(), NOW()),
  ('facebook_url', '', 'Lien Facebook', NOW(), NOW()),
  ('twitter_url', 'https://x.com/teamdivergentes', 'Lien Twitter/X', NOW(), NOW()),
  ('instagram_url', 'https://www.instagram.com/teamdivergentes/', 'Lien Instagram', NOW(), NOW()),
  ('discord_url', 'https://discord.com/invite/mF67YZKnU3', 'Lien Discord', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- 4. Creation des membres du staff initiaux
INSERT INTO staff_members (name, role, category, position, "createdAt", "updatedAt") VALUES
  ('Vilvi', 'President', 'ADMIN', 0, NOW(), NOW()),
  ('Ianis', 'Directeur General', 'HEADSTAFF', 0, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 5. Creation des jeux initiaux
INSERT INTO games (key, name, position, active, "createdAt", "updatedAt") VALUES
  ('lol', 'League of Legends', 0, true, NOW(), NOW()),
  ('valorant', 'Valorant', 1, true, NOW(), NOW()),
  ('rl', 'Rocket League', 2, true, NOW(), NOW()),
  ('cs', 'Counter-Strike', 3, true, NOW(), NOW()),
  ('tft', 'Teamfight Tactics', 4, true, NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- 6. Creation des sponsors initiaux
INSERT INTO sponsors (name, slug, description, "imageLayout", position, active, "createdAt", "updatedAt") VALUES
  ('Pulsar Corp', 'pulsar-corp',
   'Pulsar Corp est une micro entreprise de graphisme qui se distingue par son approche innovante et creative. Pilotee par un talentueux graphiste passionne, elle propose des services sur mesure, transformant chaque projet en une oeuvre d''art visuelle.',
   'LAYOUT_1', 0, true, NOW(), NOW()),
  ('Monster Energy', 'monster-energy',
   'Nous sommes fiers d''annoncer notre partenariat avec Monster Energy, une marque emblematique connue pour ses boissons energetiques qui repoussent les limites de l''ordinaire.',
   'LAYOUT_2', 1, true, NOW(), NOW()),
  ('SecretLab', 'secretlab',
   'Nous sommes ravis d''annoncer notre partenariat avec Secretlab, la marque de chaises gaming et de bureau de renommee mondiale, reputee pour son confort et sa qualite inegales.',
   'LAYOUT_3', 2, true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 7. Verification
SELECT '=== SEED RESULTS ===' as info;
SELECT 'Roles:' as entity, count(*) as count FROM roles
UNION ALL
SELECT 'Users:', count(*) FROM users
UNION ALL
SELECT 'Configs:', count(*) FROM configs
UNION ALL
SELECT 'Staff:', count(*) FROM staff_members
UNION ALL
SELECT 'Games:', count(*) FROM games
UNION ALL
SELECT 'Sponsors:', count(*) FROM sponsors;
