-- Deux modes de livraison, une franchise de port, et le modele de couts qui
-- permet de calculer une marge par commande.

-- Mode de livraison choisi par le client.
CREATE TYPE "ShippingMethod" AS ENUM ('STANDARD', 'EXPRESS');

-- --- Ce que paie le client -------------------------------------------------
ALTER TABLE "shop_settings"
  ADD COLUMN "shippingStandardCents"      INTEGER NOT NULL DEFAULT 500,
  ADD COLUMN "shippingExpressCents"       INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN "freeShippingThresholdCents" INTEGER NOT NULL DEFAULT 12000;

-- Le tarif deja parametre devient celui de la livraison standard : ecraser un
-- reglage metier par la valeur par defaut serait une regression silencieuse.
UPDATE "shop_settings" SET "shippingStandardCents" = "shippingFeeCents";

ALTER TABLE "shop_settings" DROP COLUMN "shippingFeeCents";

-- --- Ce que ca coute a la structure ----------------------------------------
ALTER TABLE "shop_settings"
  ADD COLUMN "costProductionCents"       INTEGER NOT NULL DEFAULT 1600,
  ADD COLUMN "costPartnerCents"          INTEGER NOT NULL DEFAULT 700,
  ADD COLUMN "costPartnerEnabled"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "costEcommerceCents"        INTEGER NOT NULL DEFAULT 300,
  ADD COLUMN "costFlockingCents"         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "costShippingStandardCents" INTEGER NOT NULL DEFAULT 900,
  ADD COLUMN "costShippingExpressCents"  INTEGER NOT NULL DEFAULT 1200;

-- --- Couts figes sur la commande -------------------------------------------
-- Les commandes anterieures gardent 0 : aucun cout n'etait connu a l'epoque,
-- et inventer une marge retroactive vaudrait moins que l'absence de marge.
ALTER TABLE "orders"
  ADD COLUMN "shippingMethod"    "ShippingMethod" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "unitCostCents"     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "shippingCostCents" INTEGER NOT NULL DEFAULT 0;
