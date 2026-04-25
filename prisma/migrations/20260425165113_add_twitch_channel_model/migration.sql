-- CreateTable
CREATE TABLE "twitch_channels" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "gameLabel" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "teamMemberId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "twitch_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coaching_staff" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "realName" TEXT,
    "role" TEXT NOT NULL,
    "image" TEXT,
    "biography" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "socials" JSONB,
    "slug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coaching_staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "twitch_channels_username_key" ON "twitch_channels"("username");

-- CreateIndex
CREATE INDEX "twitch_channels_active_position_idx" ON "twitch_channels"("active", "position");

-- CreateIndex
CREATE INDEX "twitch_channels_teamMemberId_idx" ON "twitch_channels"("teamMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "coaching_staff_slug_key" ON "coaching_staff"("slug");

-- CreateIndex
CREATE INDEX "coaching_staff_teamId_position_idx" ON "coaching_staff"("teamId", "position");

-- AddForeignKey
ALTER TABLE "twitch_channels" ADD CONSTRAINT "twitch_channels_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaching_staff" ADD CONSTRAINT "coaching_staff_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
