-- CreateTable
CREATE TABLE "arena_matches" (
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
    "placement" INTEGER NOT NULL,
    "subteam_placement" INTEGER NOT NULL,
    "player_subteam_id" INTEGER NOT NULL,
    "player_augment_1" INTEGER NOT NULL,
    "player_augment_2" INTEGER NOT NULL,
    "player_augment_3" INTEGER NOT NULL,
    "player_augment_4" INTEGER NOT NULL,
    "player_augment_5" INTEGER NOT NULL,
    "player_augment_6" INTEGER NOT NULL,
    "damage_to_champions" INTEGER NOT NULL,
    "item_0" INTEGER NOT NULL,
    "item_1" INTEGER NOT NULL,
    "item_2" INTEGER NOT NULL,
    "item_3" INTEGER NOT NULL,
    "item_4" INTEGER NOT NULL,
    "item_5" INTEGER NOT NULL,
    "item_6" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arena_matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "arena_matches_summoner_puuid_idx" ON "arena_matches"("summoner_puuid");

-- CreateIndex
CREATE INDEX "arena_matches_game_start_timestamp_idx" ON "arena_matches"("game_start_timestamp");

-- CreateIndex
CREATE INDEX "arena_matches_summoner_puuid_game_start_timestamp_idx" ON "arena_matches"("summoner_puuid", "game_start_timestamp");

-- CreateIndex
CREATE INDEX "arena_matches_champion_id_idx" ON "arena_matches"("champion_id");

-- CreateIndex
CREATE INDEX "arena_matches_placement_idx" ON "arena_matches"("placement");

-- CreateIndex
CREATE UNIQUE INDEX "arena_matches_match_id_summoner_puuid_key" ON "arena_matches"("match_id", "summoner_puuid");
