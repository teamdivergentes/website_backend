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
    'articles:read','articles:write','articles:delete',
    'recrutement:read','recrutement:write','recrutement:delete',
    'analytics:read'
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

-- Role Gestionnaire (equipes, jeux, sponsors, staff + droits CM + recrutement)
INSERT INTO roles (name, permissions, "isSystem", "createdAt", "updatedAt") VALUES
  ('Gestionnaire', ARRAY[
    'teams:read','teams:write','teams:delete',
    'games:read','games:write','games:delete',
    'sponsors:read','sponsors:write','sponsors:delete',
    'staff:read','staff:write','staff:delete',
    'annonces:read','annonces:write','annonces:delete',
    'articles:read','articles:write','articles:delete',
    'recrutement:read','recrutement:write','recrutement:delete'
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
  ('admin@teamdivergentes.fr', '$2a$12$x3nEp8QwYkScMlxrALCFFeVYY6iyI7Qb1B7EJPBw4A8t3I50kLNoq',
   (SELECT id FROM roles WHERE name = 'Admin'), true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- 3. Creation des configurations initiales
INSERT INTO configs (key, value, description, "createdAt", "updatedAt") VALUES
  ('youtube_link', 'https://www.youtube.com/embed/IqoIktEIeU0', 'Lien de la video YouTube de presentation', NOW(), NOW()),
  ('site_name', 'TeamDivergentes - Structure Esportive Francaise', 'Nom du site', NOW(), NOW()),
  ('contact_email', 'contact@teamdivergentes.fr', 'Email de contact', NOW(), NOW()),

  ('twitter_url', 'https://x.com/teamdivergentes', 'Lien Twitter/X', NOW(), NOW()),
  ('instagram_url', 'https://www.instagram.com/teamdivergentes/', 'Lien Instagram', NOW(), NOW()),
  ('discord_url', 'https://discord.com/invite/mF67YZKnU3', 'Lien Discord', NOW(), NOW()),
  ('youtube_url', 'https://www.youtube.com/channel/UC5laAdDfyTTUSdK0t2wYx2g', 'Lien YouTube (chaine, affiche dans le footer)', NOW(), NOW()),
  ('twitch_url', 'https://www.twitch.tv/teamdivergentes', 'Lien Twitch', NOW(), NOW()),
  ('mail_url', 'mailto:contact@teamdivergentes.fr', 'Lien email (affiche dans le footer)', NOW(), NOW()),
  ('social_urls', E'https://www.youtube.com/channel/UC5laAdDfyTTUSdK0t2wYx2g\nhttps://www.twitch.tv/teamdivergentes\nhttps://www.facebook.com/teamdivergentes/\nhttps://www.linkedin.com/company/team-divergentes/\nhttps://www.helloasso.com/associations/team-divergentes', 'Liens supplementaires pour le referencement SEO (un lien par ligne, les liens Twitter/Instagram/Discord sont deja inclus)', NOW(), NOW()),
  ('og_title', 'Team Divergentes | Organisation Esportive', 'Titre Open Graph pour les apercus Discord/reseaux sociaux', NOW(), NOW()),
  ('og_description', E'Team Divergentes, organisation e-sportive creee en 2017. Decouvrez nos joueurs, nos equipes et rejoignez l''aventure !', 'Description Open Graph pour les apercus Discord/reseaux sociaux', NOW(), NOW()),
  ('og_image', '', 'Image Open Graph pour les apercus Discord/reseaux sociaux (URL absolue ou chemin /uploads/...)', NOW(), NOW()),
  -- Visibilite des pages
  ('page_shop_visible', 'true', 'Afficher la page Boutique', NOW(), NOW()),
  ('page_contact_visible', 'true', 'Afficher la page Contact', NOW(), NOW()),
  ('page_equipes_visible', 'true', 'Afficher la page Equipes/Ambassadeurs', NOW(), NOW()),
  ('page_sponsors_visible', 'true', 'Afficher la page Sponsors', NOW(), NOW()),
  ('page_recrutement_visible', 'true', 'Afficher la page Recrutement', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- 4. Creation des membres du staff initiaux
INSERT INTO staff_members (name, role, category, position, "createdAt", "updatedAt") VALUES
  ('Vilvi', 'President', 'ADMIN', 0, NOW(), NOW()),
  ('Ficello', 'Vice-President', 'ADMIN', 0, NOW(), NOW()),
  ('Julien', 'Tresorier', 'ADMIN', 0, NOW(), NOW()),
  ('Tano', 'Membre', 'ADMIN', 0, NOW(), NOW()),
  ('Maxime', 'Membre', 'ADMIN', 0, NOW(), NOW()),
  ('Hugo', 'Membre', 'ADMIN', 0, NOW(), NOW()),
  ('Maxime', 'Responsable Developpement', 'HEADSTAFF', 0, NOW(), NOW()),
  ('Ge0tank', 'Responsable Esportif', 'HEADSTAFF', 0, NOW(), NOW()),
  ('Emerode', 'Responsable Communication', 'HEADSTAFF', 0, NOW(), NOW()),
  ('Alice', 'Responsable Ressources Humaines', 'HEADSTAFF', 0, NOW(), NOW())
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

-- 7. Creation des offres de recrutement
INSERT INTO recruitment_posts (title, type, description, active, position, slug, location, duration, missions, skills, requirements, benefits, "createdAt", "updatedAt") VALUES
  ('Développeur', 'Bénévole',
   'Participaer dans le développement d''une application Mobile',
   true, 0, 'developpeur', 'Télétravail', 'Long terme',
   E'Développer et maintenir les sites et applications web de l''association\nGérer l''infrastructure technique : déploiement, serveurs, sauvegardes, sécurité\nOptimiser les performances : rapidité, accessibilité, SEO technique\nCollaborer avec l''équipe pour traduire les besoins en solutions techniques',
   E'Frontend: Angular\nBackend: TypeScript / NestJS\nPostgreSQL : conception, gestion et optimisation',
   E'Formation ou expérience significative en développement web\nAutonomie et capacité à travailler en équipe à distance\nSens de l''organisation et respect des délais\nIntérêt pour le secteur associatif et/ou le gaming/esport\nCuriosité, proactivité et envie d''apprendre\nEsprit d''équipe et adaptabilité',
   E'Une expérience enrichissante au sein d''une équipe passionnée\nFlexibilité totale dans l''organisation du temps de travail\nPossibilité de développer vos compétences sur des projets concrets\nAttestation de bénévolat sur demande\nIntégration dans une communauté gaming/esport dynamique',
   NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 8. Verification
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
SELECT 'Sponsors:', count(*) FROM sponsors
UNION ALL
SELECT 'Recruitment:', count(*) FROM recruitment_posts;
