-- Les visuels d'un produit passent de trois colonnes fixes a une collection.
--
-- Chaque nouvelle vue coutait jusqu'ici une migration : la collection 2026
-- demande deja une face, un dos et un dos floque par maillot, plus des photos
-- portees sur une seule declinaison. Les colonnes obligeaient a creer des
-- champs vides sur les produits qui ne les utilisent pas.

CREATE TABLE "shop_product_images" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isBack" BOOLEAN NOT NULL DEFAULT false,
    "isCard" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "shop_product_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shop_product_images_productId_position_idx" ON "shop_product_images"("productId", "position");

ALTER TABLE "shop_product_images"
    ADD CONSTRAINT "shop_product_images_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "shop_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reprise des visuels existants. L'ordre des trois INSERT fixe l'ordre
-- d'affichage : face, puis dos, puis la vue distincte qui servait de vignette.

INSERT INTO "shop_product_images" ("productId", "url", "label", "position", "isBack", "isCard")
SELECT "id", "imageFront", 'face', 0, false,
       ("imageCard" IS NULL OR "imageCard" = "imageFront")
FROM "shop_products"
WHERE "imageFront" IS NOT NULL;

INSERT INTO "shop_product_images" ("productId", "url", "label", "position", "isBack", "isCard")
SELECT "id", "imageBack", 'dos', 1, true,
       ("imageCard" IS NOT NULL AND "imageCard" = "imageBack")
FROM "shop_products"
WHERE "imageBack" IS NOT NULL;

-- Une vignette qui ne reprend ni la face ni le dos est une vue a part entiere :
-- elle rejoint la galerie plutot que de disparaitre avec la colonne.
INSERT INTO "shop_product_images" ("productId", "url", "label", "position", "isBack", "isCard")
SELECT "id", "imageCard", 'porté', 2, false, true
FROM "shop_products"
WHERE "imageCard" IS NOT NULL
  AND "imageCard" <> COALESCE("imageFront", '')
  AND "imageCard" <> COALESCE("imageBack", '');

ALTER TABLE "shop_products" DROP COLUMN "imageFront";
ALTER TABLE "shop_products" DROP COLUMN "imageBack";
ALTER TABLE "shop_products" DROP COLUMN "imageCard";
