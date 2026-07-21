-- B5 : préserver l'historique des matchs après suppression d'une équipe.
-- Aligne Match sur Trophy : teamId nullable + ON DELETE SET NULL + snapshot du nom d'équipe.

-- DropForeignKey
ALTER TABLE "public"."matches" DROP CONSTRAINT "matches_teamId_fkey";

-- AlterTable
ALTER TABLE "public"."matches" ALTER COLUMN "teamId" DROP NOT NULL,
ADD COLUMN     "teamNameSnapshot" TEXT;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
