-- AlterTable
ALTER TABLE "recruitment_posts" ADD COLUMN "slug" TEXT,
ADD COLUMN "location" TEXT,
ADD COLUMN "duration" TEXT,
ADD COLUMN "missions" TEXT,
ADD COLUMN "skills" TEXT,
ADD COLUMN "requirements" TEXT,
ADD COLUMN "benefits" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "recruitment_posts_slug_key" ON "recruitment_posts"("slug");
