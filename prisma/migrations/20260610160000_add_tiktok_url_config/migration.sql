-- Ajoute le lien TikTok public configurable pour les surfaces front.
INSERT INTO configs (key, value, description, "createdAt", "updatedAt")
VALUES (
  'tiktok_url',
  'http://tiktok.com/@teamdivergentes',
  'Lien TikTok',
  NOW(),
  NOW()
)
ON CONFLICT (key) DO NOTHING;
