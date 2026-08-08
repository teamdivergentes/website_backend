-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('FIXED', 'PERCENTAGE');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "discountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discountCode" TEXT,
ADD COLUMN     "discountCodeId" INTEGER,
ADD COLUMN     "sessionExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "shop_products" ADD COLUMN     "promoEndsAt" TIMESTAMP(3),
ADD COLUMN     "promoPriceCents" INTEGER,
ADD COLUMN     "promoStartsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "shop_discount_codes" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "type" "DiscountType" NOT NULL,
    "value" INTEGER NOT NULL,
    "minSubtotalCents" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_discount_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shop_discount_codes_code_key" ON "shop_discount_codes"("code");

-- CreateIndex
CREATE INDEX "shop_discount_codes_active_idx" ON "shop_discount_codes"("active");

-- CreateIndex
CREATE INDEX "orders_discountCodeId_status_idx" ON "orders"("discountCodeId", "status");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "shop_discount_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

