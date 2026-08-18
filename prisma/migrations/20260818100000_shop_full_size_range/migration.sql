-- Gamme de tailles unifiee : tout maillot du catalogue se decline de XXS a 4XL.
--
-- Deux corrections en une :
--   1. « 2XS » devient « XXS ». Les autres extremites de gamme s'ecrivent deja
--      « XXL » et non « 2XL » ; garder « 2XS » faisait cohabiter deux notations
--      dans le meme selecteur de taille.
--   2. Les declinaisons Joker et Mystic s'arretaient a S..XXL la ou le maillot
--      de structure allait plus loin. Un meme patron, trois amplitudes : rien
--      ne le justifiait cote client.
--
-- Les lignes de commande (`order_items.size`) ne sont deliberement PAS
-- touchees : ce sont des instantanes figes a l'achat, une commande passee en
-- « 2XS » doit rester lisible telle qu'elle a ete passee.

-- 1. Renommage, sauf si la taille cible existe deja sur le meme produit :
--    l'unicite porte sur (productId, label) et un UPDATE aveugle la violerait.
UPDATE "shop_product_sizes" s
SET "label" = 'XXS'
WHERE s."label" = '2XS'
  AND NOT EXISTS (
    SELECT 1
    FROM "shop_product_sizes" other
    WHERE other."productId" = s."productId"
      AND other."label" = 'XXS'
  );

-- Reliquat du cas ci-dessus : le produit portait deja XXS, la ligne 2XS fait
-- doublon et n'a plus lieu d'etre.
DELETE FROM "shop_product_sizes" WHERE "label" = '2XS';

-- 2. Gamme complete sur chaque produit, et positions realignees sur l'ordre
--    de la gamme — c'est `position` qui ordonne le selecteur de taille.
INSERT INTO "shop_product_sizes" ("productId", "label", "position")
SELECT p."id", g."label", g."position"
FROM "shop_products" p
CROSS JOIN (
  VALUES
    ('XXS', 0),
    ('XS',  1),
    ('S',   2),
    ('M',   3),
    ('L',   4),
    ('XL',  5),
    ('XXL', 6),
    ('3XL', 7),
    ('4XL', 8)
) AS g("label", "position")
ON CONFLICT ("productId", "label") DO UPDATE
SET "position" = EXCLUDED."position";
