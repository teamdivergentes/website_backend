-- Boutique collection 2026 : catalogue en base, flocage, commandes multi-articles.
-- Spec : docs/superpowers/specs/2026-07-28-boutique-collection-2026-design.md

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------

CREATE TABLE "shop_products" (
    "id"               SERIAL       NOT NULL,
    "slug"             TEXT         NOT NULL,
    "name"             TEXT         NOT NULL,
    "shortDescription" TEXT,
    "description"      TEXT,
    "priceCents"       INTEGER      NOT NULL,
    "imageFront"       TEXT,
    "imageBack"        TEXT,
    "imageCard"        TEXT,
    "allowFlocking"    BOOLEAN      NOT NULL DEFAULT true,
    "flockingFeeCents" INTEGER      NOT NULL DEFAULT 0,
    "flockingTopPct"   DOUBLE PRECISION NOT NULL DEFAULT 32,
    "flockingLeftPct"  DOUBLE PRECISION NOT NULL DEFAULT 50,
    "teamId"           INTEGER,
    "active"           BOOLEAN      NOT NULL DEFAULT false,
    "position"         INTEGER      NOT NULL DEFAULT 0,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shop_products_slug_key" ON "shop_products"("slug");
CREATE INDEX "shop_products_active_position_idx" ON "shop_products"("active", "position");
CREATE INDEX "shop_products_teamId_idx" ON "shop_products"("teamId");

ALTER TABLE "shop_products"
    ADD CONSTRAINT "shop_products_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "shop_product_sizes" (
    "id"        SERIAL  NOT NULL,
    "productId" INTEGER NOT NULL,
    "label"     TEXT    NOT NULL,
    "position"  INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "shop_product_sizes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shop_product_sizes_productId_label_key"
    ON "shop_product_sizes"("productId", "label");
CREATE INDEX "shop_product_sizes_productId_idx" ON "shop_product_sizes"("productId");

ALTER TABLE "shop_product_sizes"
    ADD CONSTRAINT "shop_product_sizes_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "shop_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Reglages (singleton)
-- ---------------------------------------------------------------------------

CREATE TABLE "shop_settings" (
    "id"                INTEGER      NOT NULL DEFAULT 1,
    "shippingFeeCents"  INTEGER      NOT NULL DEFAULT 590,
    "currency"          TEXT         NOT NULL DEFAULT 'eur',
    "ordersNotifyEmail" TEXT,
    "shopEnabled"       BOOLEAN      NOT NULL DEFAULT false,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "shop_settings" ("id", "updatedAt") VALUES (1, NOW())
ON CONFLICT ("id") DO NOTHING;

-- ---------------------------------------------------------------------------
-- Commandes multi-articles
-- ---------------------------------------------------------------------------

CREATE TABLE "order_items" (
    "id"               SERIAL  NOT NULL,
    "orderId"          INTEGER NOT NULL,
    "productId"        INTEGER,
    "productName"      TEXT    NOT NULL,
    "size"             TEXT    NOT NULL,
    "flockingText"     TEXT,
    "quantity"         INTEGER NOT NULL,
    "unitPriceCents"   INTEGER NOT NULL,
    "flockingFeeCents" INTEGER NOT NULL DEFAULT 0,
    "lineTotalCents"   INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "shop_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orders" ADD COLUMN "subtotalCents" INTEGER NOT NULL DEFAULT 0;

-- La commande est desormais persistee des le checkout (statut PENDING) : les
-- metadonnees Stripe, limitees a 500 caracteres par valeur, ne peuvent pas
-- porter un panier multi-articles avec flocages. Seul le webhook signe fait
-- passer une commande en PAID.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PENDING' BEFORE 'PAID';

-- Client et adresse sont inconnus tant que le paiement n'a pas eu lieu.
ALTER TABLE "orders" ALTER COLUMN "customerEmail"   SET DEFAULT '';
ALTER TABLE "orders" ALTER COLUMN "customerName"    SET DEFAULT '';
ALTER TABLE "orders" ALTER COLUMN "shippingAddress" SET DEFAULT '{}';

-- Bascule des commandes mono-produit existantes vers order_items avant de
-- retirer les colonnes. La boutique n'a jamais ete ouverte au public, cette
-- table est donc normalement vide ; la reprise est ecrite par prudence, pour
-- qu'un environnement de test deja alimente ne perde pas ses donnees.
INSERT INTO "order_items" (
    "orderId", "productId", "productName", "size", "quantity",
    "unitPriceCents", "flockingFeeCents", "lineTotalCents"
)
SELECT
    o."id",
    NULL,
    o."productName",
    COALESCE(o."size", '-'),
    o."quantity",
    o."unitPriceCents",
    0,
    o."unitPriceCents" * o."quantity"
FROM "orders" o;

UPDATE "orders" o
SET "subtotalCents" = o."unitPriceCents" * o."quantity";

ALTER TABLE "orders" DROP COLUMN "productId";
ALTER TABLE "orders" DROP COLUMN "productName";
ALTER TABLE "orders" DROP COLUMN "size";
ALTER TABLE "orders" DROP COLUMN "quantity";
ALTER TABLE "orders" DROP COLUMN "unitPriceCents";

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

-- Le catalogue devient administrable : les permissions commandes:* ne suffisent
-- plus, on ajoute boutique:* pour le CRUD produits et les reglages.
-- Idempotent, calque sur 20260722120000_add_commandes_permissions.
UPDATE "roles"
SET "permissions" = (
  SELECT ARRAY(
    SELECT DISTINCT perm FROM unnest(
      array_cat("permissions", ARRAY['boutique:read', 'boutique:write'])
    ) AS perm
  )
)
WHERE "name" = 'Admin';
