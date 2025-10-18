-- CreateTable
CREATE TABLE "summoners" (
    "puuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "summoners_pkey" PRIMARY KEY ("puuid")
);

-- CreateTable
CREATE TABLE "guild_summoners" (
    "guild_id" BIGINT NOT NULL,
    "summoner_puuid" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guild_summoners_pkey" PRIMARY KEY ("guild_id","summoner_puuid")
);

-- CreateIndex
CREATE INDEX "summoners_puuid_idx" ON "summoners"("puuid");

-- CreateIndex
CREATE INDEX "guild_summoners_guild_id_idx" ON "guild_summoners"("guild_id");

-- CreateIndex
CREATE INDEX "guild_summoners_summoner_puuid_idx" ON "guild_summoners"("summoner_puuid");

-- AddForeignKey
ALTER TABLE "guild_summoners" ADD CONSTRAINT "guild_summoners_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_summoners" ADD CONSTRAINT "guild_summoners_summoner_puuid_fkey" FOREIGN KEY ("summoner_puuid") REFERENCES "summoners"("puuid") ON DELETE CASCADE ON UPDATE CASCADE;
