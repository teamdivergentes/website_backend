-- Les visuels de maillots passent du carre detoure 1400x1400 a un 1600x2000
-- compose sur un fond de scene. Le maillot y est agrandi du rapport des
-- largeurs et redescendu de 181 px, ce qui deplace la zone de flocage :
--
--     top%  ->  0.8 * top% + 9.05
--     left% ->  inchange (le centre horizontal est conserve)
--
-- `flockingTopPct` est une mesure faite sur le fichier, pas un reglage de gout :
-- laisser l'ancienne valeur poserait l'apercu du pseudo au-dessus du dos.

-- ---------------------------------------------------------------------------
-- Defaut du catalogue
-- ---------------------------------------------------------------------------

ALTER TABLE "shop_products" ALTER COLUMN "flockingTopPct" SET DEFAULT 34.75;

-- ---------------------------------------------------------------------------
-- Produits deja en base
-- ---------------------------------------------------------------------------
--
-- Seuls les maillots 2026 ont ete recomposes : la conversion ne s'applique
-- qu'a eux. Un produit ajoute plus tard avec ses propres visuels garde la
-- mesure faite sur ses fichiers.

UPDATE "shop_products"
SET "flockingTopPct" = ROUND((0.8 * "flockingTopPct" + 9.05)::numeric, 2)
WHERE "slug" IN ('maillot-2026-dvg', 'maillot-2026-joker', 'maillot-2026-mystic');
