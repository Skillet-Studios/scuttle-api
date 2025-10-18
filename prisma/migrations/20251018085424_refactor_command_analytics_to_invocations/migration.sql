/*
  Warnings:

  - You are about to drop the `command_analytics` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."command_analytics";

-- CreateTable
CREATE TABLE "command_invocations" (
    "id" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "discord_user_id" TEXT,
    "discord_username" TEXT,
    "guild_id" TEXT,
    "guild_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "command_invocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "command_invocations_command_idx" ON "command_invocations"("command");

-- CreateIndex
CREATE INDEX "command_invocations_discord_user_id_idx" ON "command_invocations"("discord_user_id");

-- CreateIndex
CREATE INDEX "command_invocations_guild_id_idx" ON "command_invocations"("guild_id");

-- CreateIndex
CREATE INDEX "command_invocations_created_at_idx" ON "command_invocations"("created_at");
