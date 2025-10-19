import axios from "axios";
import prisma from "../utils/prisma.js";
import {
    checkIfCachedWithinRange,
    updateCachedTimestamp,
    getUniqueSummoners,
} from "./summoners.js";
import { getAreaFromRegion } from "../utils/processing.js";
import { RiotMatchResponse } from "../types/riot.js";
import { logger } from "../utils/logger.js";
import { QUEUE_IDS_TO_CACHE, getQueueName } from "../const/queues.js";

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const DEFAULT_FETCH_DAYS = 30;
const RECENT_CACHE_DAYS = 1;
const DAYS_PER_BATCH = 5;

export const QUEUE_ID_MAP = {
    // 0–100 range, including customs and old event queues
    custom: 0,
    snowdown_1v1: 72,
    snowdown_2v2: 73,
    hexakill_summoners_rift: 75,
    urf_snowdown: 76,
    one_for_all_snowdown: 78,
    one_for_all_mirror_mode: 79,
    urf: 83,
    bot_urf: 91,

    // 300 range: mostly older or special event queues
    showdown_1v1: 72,
    showdown_2v2: 73,
    hexakill_crystal_scar: 98,
    arurf_5v5: 100,
    nemesis_draft: 310,
    black_market_brawlers: 313,
    definitely_not_dominion: 317,
    all_random_summoners_rift: 325,
    draft_summoners_rift_6: 400,

    // Modern Summoner's Rift (400–499 range)
    normal_draft: 400,
    ranked_solo: 420,
    normal_blind: 430,
    ranked_flex: 440,
    aram: 450,
    blood_hunt_assassin: 600,
    dark_star_singularity: 610,
    clash: 700,
    arurf: 900,

    // Co-op vs AI
    coop_vs_ai_intro: 830,
    coop_vs_ai_beginner: 840,
    coop_vs_ai_intermediate: 850,

    // Special or event game modes
    nexus_siege: 940,
    doom_bots_doom: 950,
    doom_bots_ranked: 960,
    project_hunters: 1000,
    snow_arurf: 1010,
    one_for_all: 1020,
    odyssey_extraction_intro: 1030,
    odyssey_extraction_cadet: 1040,
    odyssey_extraction_crewmember: 1050,
    odyssey_extraction_captain: 1060,
    odyssey_extraction_onslaught: 1070,
    nexus_blitz: 1200,
    ultimate_spellbook: 1400,
    arena: 1700,
} as const;

function calculateKDA(kills: number, deaths: number, assists: number): number {
    return deaths === 0 ? kills + assists : (kills + assists) / deaths;
}

async function fetchMatchIds(
    summonerPuuid: string,
    area: string,
    startTimestamp: number,
    endTimestamp: number,
    queueId: number
): Promise<string[]> {
    const url = `https://${area}.api.riotgames.com/lol/match/v5/matches/by-puuid/${summonerPuuid}/ids?startTime=${startTimestamp}&endTime=${endTimestamp}&queueId=${queueId}&start=0&count=100&api_key=${RIOT_API_KEY}`;
    const response = await axios.get<string[]>(url);
    return response.data;
}

async function fetchMatchDetails(
    matchId: string,
    area: string
): Promise<RiotMatchResponse> {
    const url = `https://${area}.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${RIOT_API_KEY}`;
    const response = await axios.get<RiotMatchResponse>(url);
    return response.data;
}

async function getNewMatchIds(
    matchIds: string[],
    summonerPuuid: string
): Promise<string[]> {
    // Check both Ranked Solo and Arena tables due to Riot API queue mismatch bug
    const [rankedMatches, arenaMatches] = await Promise.all([
        prisma.rankedSoloMatch.findMany({
            where: {
                match_id: { in: matchIds },
                summoner_puuid: summonerPuuid,
            },
            select: { match_id: true },
        }),
        prisma.arenaMatch.findMany({
            where: {
                match_id: { in: matchIds },
                summoner_puuid: summonerPuuid,
            },
            select: { match_id: true },
        }),
    ]);

    const existingIds = new Set([
        ...rankedMatches.map((m) => m.match_id),
        ...arenaMatches.map((m) => m.match_id),
    ]);
    return matchIds.filter((id) => !existingIds.has(id));
}

async function saveMatchData(
    matchData: RiotMatchResponse,
    summonerPuuid: string
): Promise<void> {
    const participant = matchData.info.participants.find(
        (p) => p.puuid === summonerPuuid
    );

    if (!participant) {
        throw new Error(`Participant not found for ${summonerPuuid}`);
    }

    const challenges = participant.challenges || {};

    await prisma.rankedSoloMatch.create({
        data: {
            match_id: matchData.metadata.matchId,
            summoner_puuid: summonerPuuid,
            end_of_game_result: matchData.info.endOfGameResult,
            game_creation: BigInt(matchData.info.gameCreation),
            game_duration: matchData.info.gameDuration,
            game_end_timestamp: matchData.info.gameEndTimestamp
                ? BigInt(matchData.info.gameEndTimestamp)
                : null,
            game_id: BigInt(matchData.info.gameId),
            game_mode: matchData.info.gameMode,
            game_name: matchData.info.gameName,
            game_start_timestamp: BigInt(matchData.info.gameStartTimestamp),
            game_type: matchData.info.gameType,
            game_version: matchData.info.gameVersion,
            map_id: matchData.info.mapId,
            queue_id: matchData.info.queueId,
            champion_id: participant.championId,
            champion_name: participant.championName,
            win: participant.win,
            kills: participant.kills,
            deaths: participant.deaths,
            assists: participant.assists,
            kda: calculateKDA(
                participant.kills,
                participant.deaths,
                participant.assists
            ),
            solo_kills: challenges.soloKills ?? 0,
            vision_score: participant.visionScore ?? 0,
            team_damage_percentage: challenges.teamDamagePercentage ?? 0,
            kill_participation: challenges.killParticipation ?? 0,
            gold_per_minute: challenges.goldPerMinute ?? 0,
            damage_per_minute: challenges.damagePerMinute ?? 0,
            damage_to_champions: participant.totalDamageDealtToChampions,
            enemy_missing_pings: participant.enemyMissingPings,
            assist_me_pings: participant.assistMePings,
            control_wards_placed: challenges.controlWardsPlaced,
            ability_uses: challenges.abilityUses ?? 0,
            scuttle_crab_kills: challenges.scuttleCrabKills ?? 0,
            game_surrendered: participant.gameEndedInSurrender,
        },
    });
}

async function saveArenaMatchData(
    matchData: RiotMatchResponse,
    summonerPuuid: string
): Promise<void> {
    const participant = matchData.info.participants.find(
        (p) => p.puuid === summonerPuuid
    );

    if (!participant) {
        throw new Error(`Participant not found for ${summonerPuuid}`);
    }

    await prisma.arenaMatch.create({
        data: {
            match_id: matchData.metadata.matchId,
            summoner_puuid: summonerPuuid,
            end_of_game_result: matchData.info.endOfGameResult,
            game_creation: BigInt(matchData.info.gameCreation),
            game_duration: matchData.info.gameDuration,
            game_end_timestamp: matchData.info.gameEndTimestamp
                ? BigInt(matchData.info.gameEndTimestamp)
                : null,
            game_id: BigInt(matchData.info.gameId),
            game_mode: matchData.info.gameMode,
            game_name: matchData.info.gameName,
            game_start_timestamp: BigInt(matchData.info.gameStartTimestamp),
            game_type: matchData.info.gameType,
            game_version: matchData.info.gameVersion,
            map_id: matchData.info.mapId,
            queue_id: matchData.info.queueId,
            champion_id: participant.championId,
            champion_name: participant.championName,
            win: participant.win,
            kills: participant.kills,
            deaths: participant.deaths,
            assists: participant.assists,
            kda: calculateKDA(
                participant.kills,
                participant.deaths,
                participant.assists
            ),
            placement: participant.placement ?? 0,
            subteam_placement: participant.subteamPlacement ?? 0,
            player_subteam_id: participant.playerSubteamId ?? 0,
            player_augment_1: participant.playerAugment1 ?? 0,
            player_augment_2: participant.playerAugment2 ?? 0,
            player_augment_3: participant.playerAugment3 ?? 0,
            player_augment_4: participant.playerAugment4 ?? 0,
            player_augment_5: participant.playerAugment5 ?? 0,
            player_augment_6: participant.playerAugment6 ?? 0,
            damage_to_champions: participant.totalDamageDealtToChampions,
            item_0: participant.item0 ?? 0,
            item_1: participant.item1 ?? 0,
            item_2: participant.item2 ?? 0,
            item_3: participant.item3 ?? 0,
            item_4: participant.item4 ?? 0,
            item_5: participant.item5 ?? 0,
            item_6: participant.item6 ?? 0,
        },
    });
}

async function processSummonerMatches(
    summoner: { name: string; puuid: string; region: string },
    queueId: number
): Promise<number> {
    const cachedRecently = await checkIfCachedWithinRange(
        summoner,
        RECENT_CACHE_DAYS
    );
    const daysToFetch = cachedRecently ? RECENT_CACHE_DAYS : DEFAULT_FETCH_DAYS;
    const region = summoner.region ?? "na1";
    const area = getAreaFromRegion(region) || "americas";
    const queueName = getQueueName(queueId);

    const isArena = queueId === 1700;

    // Count existing matches in database for this summoner/queue
    const existingInDb = isArena
        ? await prisma.arenaMatch.count({
              where: { summoner_puuid: summoner.puuid },
          })
        : await prisma.rankedSoloMatch.count({
              where: { summoner_puuid: summoner.puuid },
          });

    let newMatchesFound = 0;
    let newMatchesSaved = 0;
    let daysFetched = 0;

    while (daysFetched < daysToFetch) {
        const batchDays = Math.min(DAYS_PER_BATCH, daysToFetch - daysFetched);
        const endTime = new Date();
        endTime.setDate(endTime.getDate() - daysFetched);
        const startTime = new Date(endTime);
        startTime.setDate(startTime.getDate() - batchDays);

        const startTimestamp = Math.floor(startTime.getTime() / 1000);
        const endTimestamp = Math.floor(endTime.getTime() / 1000);

        try {
            const matchIds = await fetchMatchIds(
                summoner.puuid,
                area,
                startTimestamp,
                endTimestamp,
                queueId
            );

            const newMatchIds = await getNewMatchIds(matchIds, summoner.puuid);
            newMatchesFound += newMatchIds.length;

            for (const matchId of newMatchIds) {
                try {
                    const matchData = await fetchMatchDetails(matchId, area);

                    // Save to the correct table based on actual queue ID
                    const actualIsArena = matchData.info.queueId === 1700;
                    const actualSaveData = actualIsArena
                        ? saveArenaMatchData
                        : saveMatchData;

                    try {
                        await actualSaveData(matchData, summoner.puuid);
                        newMatchesSaved++;
                    } catch (saveError: any) {
                        throw saveError;
                    }
                } catch (error) {
                    logger.error(
                        `Models > matches > Error processing match ${matchId} for ${summoner.name}`,
                        error
                    );
                }
            }
        } catch (error) {
            logger.error(
                `Models > matches > Error fetching ${queueName} matches for ${summoner.name}`,
                error
            );
        }

        daysFetched += batchDays;
    }

    // Log summary
    logger.info(
        `Models > matches > ${summoner.name} - ${queueName}: ${existingInDb} in DB, ${newMatchesFound} new found, ${newMatchesSaved} saved`
    );

    return newMatchesSaved;
}

export async function cacheMatchData(
    queueIds: number[] = QUEUE_IDS_TO_CACHE
): Promise<void> {
    try {
        const startTime = Date.now();
        const summoners = await getUniqueSummoners();
        const queueNames = queueIds.map(getQueueName).join(", ");

        logger.info(
            `Models > matches > Starting match data caching for ${summoners.length} summoners across ${queueIds.length} queue(s): ${queueNames}`
        );

        const totals: Record<number, number> = {};
        queueIds.forEach((id) => (totals[id] = 0));

        for (const summoner of summoners) {
            for (const queueId of queueIds) {
                const matchesCached = await processSummonerMatches(
                    summoner,
                    queueId
                );
                totals[queueId] += matchesCached;
            }
            await updateCachedTimestamp(summoner);
        }

        const elapsed = Date.now() - startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);

        const totalMatches = Object.values(totals).reduce(
            (sum, count) => sum + count,
            0
        );
        const breakdown = queueIds
            .map((id) => `${getQueueName(id)}: ${totals[id]}`)
            .join(", ");

        logger.success(
            `Models > matches > Caching complete: ${totalMatches} total matches (${breakdown}) in ${minutes}m ${seconds}s`
        );
    } catch (error) {
        logger.error("Models > matches > Error in cacheMatchData", error);
        throw error;
    }
}

export async function deleteMatchesOlderThan(days = 31): Promise<number> {
    try {
        const cutoffMs = days * 24 * 60 * 60 * 1000;
        const cutoffTimestamp = BigInt(Date.now() - cutoffMs);

        const rankedResult = await prisma.rankedSoloMatch.deleteMany({
            where: {
                game_start_timestamp: { lt: cutoffTimestamp },
            },
        });

        const arenaResult = await prisma.arenaMatch.deleteMany({
            where: {
                game_start_timestamp: { lt: cutoffTimestamp },
            },
        });

        const totalDeleted = rankedResult.count + arenaResult.count;

        logger.info(
            `Models > matches > Deleted ${totalDeleted} matches older than ${days} days (Ranked: ${rankedResult.count}, Arena: ${arenaResult.count})`
        );
        return totalDeleted;
    } catch (error) {
        logger.error("Models > matches > Error deleting old matches", error);
        throw error;
    }
}

function serializeMatch(match: any): any {
    return {
        ...match,
        game_creation: match.game_creation?.toString(),
        game_end_timestamp: match.game_end_timestamp?.toString(),
        game_id: match.game_id?.toString(),
        game_start_timestamp: match.game_start_timestamp?.toString(),
    };
}

export async function fetchAllSummonerMatchDataByRange(
    summonerPuuid: string,
    range = 7,
    queueType = "ranked_solo"
): Promise<any[] | null> {
    try {
        const now = new Date();
        const lowerRange = new Date(now.setDate(now.getDate() - range));
        const lowerRangeEpoch = BigInt(lowerRange.getTime());

        let matches;
        if (queueType === "arena") {
            matches = await prisma.arenaMatch.findMany({
                where: {
                    summoner_puuid: summonerPuuid,
                    game_start_timestamp: { gte: lowerRangeEpoch },
                },
                orderBy: {
                    game_start_timestamp: "desc",
                },
            });
        } else {
            matches = await prisma.rankedSoloMatch.findMany({
                where: {
                    summoner_puuid: summonerPuuid,
                    game_start_timestamp: { gte: lowerRangeEpoch },
                },
                orderBy: {
                    game_start_timestamp: "desc",
                },
            });
        }

        if (!matches || matches.length === 0) {
            logger.debug(
                `Models > matches > No ${queueType} matches found for ${summonerPuuid} within ${range} days`
            );
            return null;
        }
        return matches.map(serializeMatch);
    } catch (error) {
        logger.error(
            `Models > matches > Error fetching ${queueType} summoner matches`,
            error
        );
        throw error;
    }
}

export async function fetchAllSummonerMatchDataSinceDate(
    summonerPuuid: string,
    startDate: Date,
    queueType = "ranked_solo"
): Promise<any[] | null> {
    try {
        const startDateEpoch = BigInt(startDate.getTime());

        let matches;
        if (queueType === "arena") {
            matches = await prisma.arenaMatch.findMany({
                where: {
                    summoner_puuid: summonerPuuid,
                    game_start_timestamp: { gte: startDateEpoch },
                },
                orderBy: {
                    game_start_timestamp: "desc",
                },
            });
        } else {
            matches = await prisma.rankedSoloMatch.findMany({
                where: {
                    summoner_puuid: summonerPuuid,
                    game_start_timestamp: { gte: startDateEpoch },
                },
                orderBy: {
                    game_start_timestamp: "desc",
                },
            });
        }

        if (!matches || matches.length === 0) {
            logger.debug(
                `Models > matches > No ${queueType} matches found for ${summonerPuuid} since ${startDate.toISOString()}`
            );
            return null;
        }
        return matches.map(serializeMatch);
    } catch (error) {
        logger.error(
            `Models > matches > Error fetching ${queueType} summoner matches since date`,
            error
        );
        throw error;
    }
}

export async function deleteMatchesForRemovedSummoners(): Promise<number> {
    try {
        logger.info("Models > matches > Fetching active summoners");
        const activeSummoners = await getUniqueSummoners();
        const activePuuids = activeSummoners.map((s) => s.puuid);

        const rankedResult = await prisma.rankedSoloMatch.deleteMany({
            where: {
                summoner_puuid: { notIn: activePuuids },
            },
        });

        const arenaResult = await prisma.arenaMatch.deleteMany({
            where: {
                summoner_puuid: { notIn: activePuuids },
            },
        });

        const totalDeleted = rankedResult.count + arenaResult.count;

        if (totalDeleted === 0) {
            logger.info("Models > matches > No orphaned matches found");
            return 0;
        }

        logger.info(
            `Models > matches > Deleted ${totalDeleted} orphaned matches (Ranked: ${rankedResult.count}, Arena: ${arenaResult.count})`
        );
        return totalDeleted;
    } catch (error) {
        logger.error(
            "Models > matches > Error deleting orphaned matches",
            error
        );
        throw error;
    }
}
