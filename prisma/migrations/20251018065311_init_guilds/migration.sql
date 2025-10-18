-- CreateTable
CREATE TABLE "guilds" (
    "id" TEXT NOT NULL,
    "guild_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "main_channel_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guilds_guild_id_key" ON "guilds"("guild_id");

-- CreateIndex
CREATE INDEX "guilds_guild_id_idx" ON "guilds"("guild_id");
