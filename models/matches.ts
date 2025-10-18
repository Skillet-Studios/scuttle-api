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

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const RANKED_SOLO_QUEUE_ID = 420;
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
    const existingMatches = await prisma.rankedSoloMatch.findMany({
        where: {
            match_id: { in: matchIds },
            summoner_puuid: summonerPuuid,
        },
        select: { match_id: true },
    });

    const existingIds = new Set(existingMatches.map((m) => m.match_id));
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
            vision_score: challenges.visionScore ?? 0,
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

    let matchesCached = 0;
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

            for (const matchId of newMatchIds) {
                try {
                    const matchData = await fetchMatchDetails(matchId, area);

                    if (matchData.info.queueId === queueId) {
                        await saveMatchData(matchData, summoner.puuid);
                        matchesCached++;
                    }
                } catch (error) {
                    logger.error(
                        `Models > matches > Error processing match ${matchId}`,
                        error
                    );
                }
            }
        } catch (error) {
            logger.error(
                `Models > matches > Error fetching matches for ${summoner.name}`,
                error
            );
        }

        daysFetched += batchDays;
    }

    await updateCachedTimestamp(summoner);
    return matchesCached;
}

export async function cacheMatchData(
    queueId: number = RANKED_SOLO_QUEUE_ID
): Promise<void> {
    try {
        const startTime = Date.now();
        const summoners = await getUniqueSummoners();
        let totalMatches = 0;

        logger.info(
            `Models > matches > Starting match data caching for ${summoners.length} summoners`
        );

        for (const summoner of summoners) {
            const matchesCached = await processSummonerMatches(
                summoner,
                queueId
            );
            totalMatches += matchesCached;

            if (matchesCached > 0) {
                logger.info(
                    `Models > matches > Cached ${matchesCached} matches for ${summoner.name}`
                );
            }
        }

        const elapsed = Date.now() - startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);

        logger.success(
            `Models > matches > Caching complete: ${totalMatches} matches in ${minutes}m ${seconds}s`
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

        const result = await prisma.rankedSoloMatch.deleteMany({
            where: {
                game_start_timestamp: { lt: cutoffTimestamp },
            },
        });

        logger.info(
            `Models > matches > Deleted ${result.count} matches older than ${days} days`
        );
        return result.count;
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
    range = 7
): Promise<any[] | null> {
    try {
        const now = new Date();
        const lowerRange = new Date(now.setDate(now.getDate() - range));
        const lowerRangeEpoch = BigInt(lowerRange.getTime());

        const matches = await prisma.rankedSoloMatch.findMany({
            where: {
                summoner_puuid: summonerPuuid,
                game_start_timestamp: { gte: lowerRangeEpoch },
            },
            orderBy: {
                game_start_timestamp: "desc",
            },
        });

        if (!matches || matches.length === 0) {
            logger.debug(
                `Models > matches > No matches found for ${summonerPuuid} within ${range} days`
            );
            return null;
        }
        return matches.map(serializeMatch);
    } catch (error) {
        logger.error(
            "Models > matches > Error fetching summoner matches",
            error
        );
        throw error;
    }
}

export async function fetchAllSummonerMatchDataSinceDate(
    summonerPuuid: string,
    startDate: Date
): Promise<any[] | null> {
    try {
        const startDateEpoch = BigInt(startDate.getTime());

        const matches = await prisma.rankedSoloMatch.findMany({
            where: {
                summoner_puuid: summonerPuuid,
                game_start_timestamp: { gte: startDateEpoch },
            },
            orderBy: {
                game_start_timestamp: "desc",
            },
        });

        if (!matches || matches.length === 0) {
            logger.debug(
                `Models > matches > No matches found for ${summonerPuuid} since ${startDate.toISOString()}`
            );
            return null;
        }
        return matches.map(serializeMatch);
    } catch (error) {
        logger.error(
            "Models > matches > Error fetching summoner matches since date",
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

        const result = await prisma.rankedSoloMatch.deleteMany({
            where: {
                summoner_puuid: { notIn: activePuuids },
            },
        });

        if (result.count === 0) {
            logger.info("Models > matches > No orphaned matches found");
            return 0;
        }

        logger.info(
            `Models > matches > Deleted ${result.count} orphaned matches`
        );
        return result.count;
    } catch (error) {
        logger.error(
            "Models > matches > Error deleting orphaned matches",
            error
        );
        throw error;
    }
}
