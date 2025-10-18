-- CreateTable
CREATE TABLE "ranked_solo_matches" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "summoner_puuid" TEXT NOT NULL,
    "end_of_game_result" TEXT NOT NULL,
    "game_creation" BIGINT NOT NULL,
    "game_duration" INTEGER NOT NULL,
    "game_end_timestamp" BIGINT,
    "game_id" BIGINT NOT NULL,
    "game_mode" TEXT NOT NULL,
    "game_name" TEXT NOT NULL,
    "game_start_timestamp" BIGINT NOT NULL,
    "game_type" TEXT NOT NULL,
    "game_version" TEXT NOT NULL,
    "map_id" INTEGER NOT NULL,
    "queue_id" INTEGER NOT NULL,
    "champion_id" INTEGER NOT NULL,
    "champion_name" TEXT NOT NULL,
    "win" BOOLEAN NOT NULL,
    "kills" INTEGER NOT NULL,
    "deaths" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "kda" DOUBLE PRECISION NOT NULL,
    "solo_kills" INTEGER NOT NULL,
    "vision_score" INTEGER NOT NULL,
    "team_damage_percentage" DOUBLE PRECISION NOT NULL,
    "kill_participation" DOUBLE PRECISION NOT NULL,
    "gold_per_minute" DOUBLE PRECISION NOT NULL,
    "damage_per_minute" DOUBLE PRECISION NOT NULL,
    "damage_to_champions" INTEGER NOT NULL,
    "enemy_missing_pings" INTEGER NOT NULL,
    "control_wards_placed" INTEGER NOT NULL,
    "ability_uses" INTEGER NOT NULL,
    "scuttle_crab_kills" INTEGER NOT NULL,
    "game_surrendered" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ranked_solo_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "summoner_cache_logs" (
    "id" TEXT NOT NULL,
    "summoner_puuid" TEXT NOT NULL,
    "cached_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "summoner_cache_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ranked_solo_matches_summoner_puuid_idx" ON "ranked_solo_matches"("summoner_puuid");

-- CreateIndex
CREATE INDEX "ranked_solo_matches_game_start_timestamp_idx" ON "ranked_solo_matches"("game_start_timestamp");

-- CreateIndex
CREATE INDEX "ranked_solo_matches_summoner_puuid_game_start_timestamp_idx" ON "ranked_solo_matches"("summoner_puuid", "game_start_timestamp");

-- CreateIndex
CREATE INDEX "ranked_solo_matches_champion_id_idx" ON "ranked_solo_matches"("champion_id");

-- CreateIndex
CREATE UNIQUE INDEX "ranked_solo_matches_match_id_summoner_puuid_key" ON "ranked_solo_matches"("match_id", "summoner_puuid");

-- CreateIndex
CREATE INDEX "summoner_cache_logs_summoner_puuid_idx" ON "summoner_cache_logs"("summoner_puuid");

-- CreateIndex
CREATE INDEX "summoner_cache_logs_summoner_puuid_cached_at_idx" ON "summoner_cache_logs"("summoner_puuid", "cached_at");

-- CreateIndex
CREATE INDEX "summoner_cache_logs_cached_at_idx" ON "summoner_cache_logs"("cached_at");
