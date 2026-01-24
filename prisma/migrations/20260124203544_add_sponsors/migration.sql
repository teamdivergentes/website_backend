-- CreateEnum
CREATE TYPE "link_type" AS ENUM ('WEBSITE', 'TWITTER', 'INSTAGRAM', 'DISCORD', 'PROMO_CODE', 'OTHER');

-- CreateEnum
CREATE TYPE "image_layout" AS ENUM ('LAYOUT_1', 'LAYOUT_2', 'LAYOUT_3');

-- CreateTable
CREATE TABLE "sponsors" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "imageLayout" "image_layout" NOT NULL DEFAULT 'LAYOUT_1',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsor_images" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "sponsorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsor_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsor_links" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "link_type" NOT NULL DEFAULT 'WEBSITE',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sponsorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsor_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sponsors_slug_key" ON "sponsors"("slug");

-- CreateIndex
CREATE INDEX "sponsor_images_sponsorId_idx" ON "sponsor_images"("sponsorId");

-- CreateIndex
CREATE INDEX "sponsor_links_sponsorId_idx" ON "sponsor_links"("sponsorId");

-- AddForeignKey
ALTER TABLE "sponsor_images" ADD CONSTRAINT "sponsor_images_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "sponsors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_links" ADD CONSTRAINT "sponsor_links_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "sponsors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
