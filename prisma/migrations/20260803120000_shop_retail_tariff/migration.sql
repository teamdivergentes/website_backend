-- Tarif reserve : un porteur de `boutique:retail` achete au prix coutant.
--
-- Le bareme est choisi par le serveur a partir de l'identite authentifiee. Rien
-- ici ne depend d'une valeur transmise par le client.

-- ---------------------------------------------------------------------------
-- Bareme applique a une commande
-- ---------------------------------------------------------------------------

CREATE TYPE "PricingTier" AS ENUM ('PUBLIC', 'RETAIL');

-- `PUBLIC` par defaut, y compris sur les commandes deja en base : une commande
-- dont on ne sait rien est une vente ordinaire, jamais une vente a prix coutant.
ALTER TABLE "orders"
  ADD COLUMN "pricingTier"      "PricingTier" NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN "buyerUserId"      INTEGER,
  ADD COLUMN "publicTotalCents" INTEGER       NOT NULL DEFAULT 0;

-- Ce que la meme commande aurait coute au prix catalogue, fige a l'achat. Sur
-- l'existant, toutes les commandes sont au prix public : le total paye EST le
-- total public. Sans ce rattrapage, les commandes anterieures afficheraient un
-- ecart de 100 % avec le prix catalogue.
UPDATE "orders" SET "publicTotalCents" = "totalCents";

-- `SET NULL` et non `CASCADE` : une commande est une piece comptable, elle ne
-- disparait pas avec le compte de son acheteur.
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_buyerUserId_fkey"
  FOREIGN KEY ("buyerUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "orders_pricingTier_idx" ON "orders"("pricingTier");
CREATE INDEX "orders_buyerUserId_idx" ON "orders"("buyerUserId");

-- ---------------------------------------------------------------------------
-- Permission
-- ---------------------------------------------------------------------------
--
-- `boutique:retail` est une permission a part entiere, et non un effet de bord
-- de `boutique:write` : administrer le catalogue et acheter a prix coutant sont
-- deux droits sans rapport. Quiconque peut corriger une faute dans une fiche
-- produit n'a pas a acheter sous le prix public pour autant.
--
-- Attribuee au seul role Admin, nommement. Le `WHERE` est volontairement
-- restrictif : le role Gestionnaire administre le catalogue et ne doit PAS
-- heriter de ce droit.
--
-- A noter pour le jour ou ce droit s'elargira : le prix coutant revele les
-- marges fournisseur. Aujourd'hui Admin detient deja `boutique:read`, qui donne
-- acces aux reglages et donc aux couts — l'accorder ne divulgue donc rien de
-- neuf. Accorder `boutique:retail` a un role qui n'a pas `boutique:read`
-- reviendrait, lui, a ouvrir les couts a ce role.
--
-- Idempotent, calque sur 20260722120000 et 20260728120000.
UPDATE "roles"
SET "permissions" = (
  SELECT ARRAY(
    SELECT DISTINCT perm FROM unnest(
      array_cat("permissions", ARRAY['boutique:retail'])
    ) AS perm
  )
)
WHERE "name" = 'Admin';
