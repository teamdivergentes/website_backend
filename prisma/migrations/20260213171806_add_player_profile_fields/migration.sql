-- AlterTable
ALTER TABLE "team_members" ADD COLUMN "biography" TEXT,
ADD COLUMN "birthDate" TIMESTAMP(3),
ADD COLUMN "customFields" JSONB,
ADD COLUMN "nationality" TEXT,
ADD COLUMN "slug" TEXT;

-- AlterTable
ALTER TABLE "teams" ADD COLUMN "memberFieldsConfig" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "team_members_slug_key" ON "team_members"("slug");
