-- CreateTable
CREATE TABLE "public"."trophies" (
    "id" SERIAL NOT NULL,
    "competition" TEXT NOT NULL,
    "placement" INTEGER NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "image" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "teamId" INTEGER,
    "teamLabel" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trophies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."matches" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "opponentName" TEXT NOT NULL,
    "opponentLogo" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "competition" TEXT,
    "streamUrl" TEXT,
    "scoreDvg" INTEGER,
    "scoreOpponent" INTEGER,
    "articleId" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trophies_teamId_idx" ON "public"."trophies"("teamId");

-- CreateIndex
CREATE INDEX "trophies_active_featured_idx" ON "public"."trophies"("active", "featured");

-- CreateIndex
CREATE INDEX "matches_teamId_idx" ON "public"."matches"("teamId");

-- CreateIndex
CREATE INDEX "matches_scheduledAt_idx" ON "public"."matches"("scheduledAt");

-- AddForeignKey
ALTER TABLE "public"."trophies" ADD CONSTRAINT "trophies_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
