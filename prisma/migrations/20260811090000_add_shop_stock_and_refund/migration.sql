-- AlterTable
ALTER TABLE "shop_product_sizes" ADD COLUMN     "stock" INTEGER;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "stripeRefundId" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3);
