import axios from "axios";
import chalk from "chalk";
import prisma from "../utils/prisma.js";
import {
    getSummonersByGuildId,
    checkIfCachedWithinRange,
    updateCachedTimestamp,
    getUniqueSummoners,
} from "./summoners.js";
import { getAreaFromRegion } from "../utils/processing.js";
import { Guild } from "../types/guilds.js";
import { RiotMatchResponse, RiotParticipant } from "../types/riot.js";

/**
 * Map of friendly queue type names to Riot's queue IDs
 */
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

/**
 * Caches the last 30 days worth of ranked solo queue (queue=420) match data
 * for every summoner in each provided guild.
 *
 * - Iterates all guilds and their summoners.
 * - Skips summoners if we already processed them during this run.
 * - If a summoner's data was cached within the last day, only fetch 1 day of matches;
 *   otherwise fetch up to 30 days, in 5-day increments.
 * - Deduplicates matches that are already in the database.
 * - Inserts only new ranked solo matches with extracted stats.
 * - Updates the summoner's cache log once done.
 *
 * @param guilds - An array of guild objects from your database.
 */
export async function cacheMatchData(guilds: Guild[]): Promise<void> {
    try {
        const summonersChecked = new Set<string>();
        let totalMatchesCached = 0;
        const jobStartTime = new Date();

        console.log(chalk.green.bold("\n=============================="));
        console.log(chalk.green.bold("🚀 Starting Match Data Caching"));
        console.log(chalk.green.bold("==============================\n"));

        for (const guild of guilds) {
            console.log(
                chalk.blue(
                    `🔹 Processing Guild: ${guild.name || "Unknown"} (${
                        guild.guild_id
                    })`
                )
            );

            const summoners = await getSummonersByGuildId(guild.guild_id);

            if (!summoners || summoners.length === 0) {
                console.log(
                    chalk.yellow(
                        `⚠️ No summoners found for this guild. Skipping.`
                    )
                );
                continue;
            }

            for (const summoner of summoners) {
                if (summonersChecked.has(summoner.puuid)) {
                    console.log(
                        chalk.gray(
                            `🔄 Skipping already processed summoner: ${summoner.name}`
                        )
                    );
                    continue;
                }

                let matchesCached = 0;
                let daysFetched = 0;
                let daysToFetchMax = 30;

                // Check if summoner's data was recently cached
                const cachedRecently = await checkIfCachedWithinRange(
                    summoner,
                    1
                );
                if (cachedRecently) {
                    daysToFetchMax = 1;
                }

                const summonerPuuid = summoner.puuid;
                const region = summoner.region ?? "na1";
                const area = getAreaFromRegion(region) || "americas";

                console.log(
                    chalk.cyan(
                        `\n📌 Fetching Matches for Summoner: ${
                            summoner.name
                        } (${region.toUpperCase()})`
                    )
                );

                while (daysFetched < daysToFetchMax) {
                    const daysToFetch = Math.min(
                        5,
                        daysToFetchMax - daysFetched
                    );
                    const endTime = new Date();
                    endTime.setDate(endTime.getDate() - daysFetched);
                    const startTime = new Date(endTime);
                    startTime.setDate(startTime.getDate() - daysToFetch);

                    const startTimestamp = Math.floor(
                        startTime.getTime() / 1000
                    );
                    const endTimestamp = Math.floor(endTime.getTime() / 1000);

                    console.log(
                        chalk.magenta(
                            `🕒 Date Range: ${startTime.toDateString()} → ${endTime.toDateString()}`
                        )
                    );

                    const matchIdsUrl = `https://${area}.api.riotgames.com/lol/match/v5/matches/by-puuid/${summonerPuuid}/ids?startTime=${startTimestamp}&endTime=${endTimestamp}&queueId=420&start=0&count=100&api_key=${process.env.RIOT_API_KEY}`;

                    let matchIds: string[] = [];
                    try {
                        const response = await axios.get<string[]>(matchIdsUrl);
                        matchIds = response.data;
                    } catch (err) {
                        const error = err as Error;
                        console.error(
                            chalk.red(
                                `❌ Error fetching match IDs: ${error.message}`
                            )
                        );
                        daysFetched += daysToFetch;
                        continue;
                    }

                    const existingMatches = await prisma.rankedSoloMatch.findMany({
                        where: {
                            match_id: { in: matchIds },
                            summoner_puuid: summonerPuuid,
                        },
                        select: { match_id: true },
                    });

                    const existingIds = existingMatches.map((m) => m.match_id);
                    const newMatchIds = matchIds.filter(
                        (matchId) => !existingIds.includes(matchId)
                    );

                    console.log(
                        chalk.yellow(
                            `📊 Already Cached: ${existingIds.length} matches`
                        )
                    );
                    console.log(
                        chalk.green(
                            `🆕 New Matches to Cache: ${newMatchIds.length} matches`
                        )
                    );

                    for (const matchId of newMatchIds) {
                        const matchUrl = `https://${area}.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${process.env.RIOT_API_KEY}`;

                        let matchData: RiotMatchResponse | null = null;
                        try {
                            const response = await axios.get<RiotMatchResponse>(matchUrl);
                            matchData = response.data;
                        } catch (err) {
                            const error = err as Error;
                            console.error(
                                chalk.red(
                                    `❌ Error fetching match ${matchId}: ${error.message}`
                                )
                            );
                            continue;
                        }

                        if (matchData && matchData.info.queueId === 420) {
                            // Find this summoner's participant data
                            const participant = matchData.info.participants.find(
                                (p) => p.puuid === summonerPuuid
                            );

                            if (!participant) {
                                console.error(
                                    chalk.red(
                                        `❌ Participant not found for ${summonerPuuid} in match ${matchId}`
                                    )
                                );
                                continue;
                            }

                            // Calculate KDA
                            const kda =
                                participant.deaths === 0
                                    ? participant.kills + participant.assists
                                    : (participant.kills + participant.assists) /
                                      participant.deaths;

                            // Extract stats from challenges (with safe defaults)
                            const challenges = participant.challenges || {};

                            // Create the ranked solo match record
                            await prisma.rankedSoloMatch.create({
                                data: {
                                    match_id: matchData.metadata.matchId,
                                    summoner_puuid: summonerPuuid,

                                    // Match metadata
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

                                    // Basic participant info
                                    champion_id: participant.championId,
                                    champion_name: participant.championName,
                                    win: participant.win,

                                    // Core stats
                                    kills: participant.kills,
                                    deaths: participant.deaths,
                                    assists: participant.assists,
                                    kda: kda,

                                    // Advanced stats from challenges
                                    solo_kills: challenges.soloKills ?? 0,
                                    vision_score: challenges.visionScore ?? 0,
                                    team_damage_percentage: challenges.teamDamagePercentage ?? 0,
                                    kill_participation: challenges.killParticipation ?? 0,
                                    gold_per_minute: challenges.goldPerMinute ?? 0,
                                    damage_per_minute: challenges.damagePerMinute ?? 0,
                                    damage_to_champions: participant.totalDamageDealtToChampions,
                                    enemy_missing_pings: participant.enemyMissingPings,
                                    control_wards_placed: participant.controlWardsPlaced,
                                    ability_uses: challenges.abilityUses ?? 0,
                                    scuttle_crab_kills: challenges.scuttleCrabKills ?? 0,

                                    // Match outcome
                                    game_surrendered: participant.gameEndedInSurrender,
                                },
                            });

                            matchesCached++;
                            totalMatchesCached++;
                        }
                    }

                    daysFetched += daysToFetch;
                }

                summonersChecked.add(summoner.puuid);
                await updateCachedTimestamp(summoner);

                console.log(
                    chalk.green(
                        `✅ Cached ${matchesCached} matches for ${summoner.name}\n`
                    )
                );
            }
        }

        console.log(chalk.green.bold("\n=============================="));
        console.log(
            chalk.green.bold(`🏆 Total Matches Cached: ${totalMatchesCached}`)
        );

        const jobEndTime = new Date();
        const elapsedMs = jobEndTime.getTime() - jobStartTime.getTime();
        const hours = Math.floor(elapsedMs / 3600000);
        const minutes = Math.floor((elapsedMs % 3600000) / 60000);
        const seconds = Math.floor((elapsedMs % 60000) / 1000);

        console.log(
            chalk.green.bold(
                `⏳ Elapsed Time: ${hours}h ${minutes}m ${seconds}s`
            )
        );
        console.log(chalk.green.bold("==============================\n"));
    } catch (error) {
        console.error(chalk.red("🚨 Error in cacheMatchData:"), error);
        throw error;
    }
}

/**
 * Deletes ranked solo matches older than a specified number of days.
 *
 * @param days - The number of days to keep. Matches older than this will be deleted.
 * @returns The number of documents deleted.
 */
export async function deleteMatchesOlderThan(days = 31): Promise<number> {
    try {
        // Convert days into milliseconds
        const cutoffMs = days * 24 * 60 * 60 * 1000;
        const cutoffTimestamp = BigInt(Date.now() - cutoffMs);

        // Delete all matches older than our cutoff
        const result = await prisma.rankedSoloMatch.deleteMany({
            where: {
                game_start_timestamp: { lt: cutoffTimestamp },
            },
        });

        console.log(
            `Deleted ${result.count} match(es) older than ${days} day(s).`
        );
        return result.count;
    } catch (error) {
        console.error("Error deleting old matches:", error);
        throw error;
    }
}

/**
 * Fetches all ranked solo matches for a summoner within the specified number of days.
 *
 * @param summonerPuuid - The summoner's PUUID.
 * @param range - The day range to look back, defaults to 7.
 * @returns A Promise that resolves to an array of match documents or null if none found.
 */
export async function fetchAllSummonerMatchDataByRange(
    summonerPuuid: string,
    range = 7
): Promise<any[] | null> {
    try {
        console.log(
            `Fetching all ranked solo matches for ${summonerPuuid} within the last ${range} days`
        );

        // Calculate the time range (lower bound in milliseconds)
        const now = new Date();
        const lowerRange = new Date(now.setDate(now.getDate() - range));
        const lowerRangeEpoch = BigInt(lowerRange.getTime());

        // Fetch matches
        const matches = await prisma.rankedSoloMatch.findMany({
            where: {
                summoner_puuid: summonerPuuid,
                game_start_timestamp: { gte: lowerRangeEpoch },
            },
            orderBy: {
                game_start_timestamp: "desc",
            },
        });

        // If no matches found, return null
        if (!matches || matches.length === 0) {
            console.log(
                `No ranked solo match data found for ${summonerPuuid} within the last ${range} days.`
            );
            return null;
        }
        return matches;
    } catch (error) {
        const err = error as Error;
        console.error(`Error fetching summoner matches: ${err.message}`);
        throw error;
    }
}

/**
 * Fetches all ranked solo matches for a summoner from a specified start date until now.
 *
 * @param summonerPuuid - The summoner's PUUID.
 * @param startDate - The start date from which to fetch matches.
 * @returns A Promise that resolves to an array of match documents or null if none found.
 */
export async function fetchAllSummonerMatchDataSinceDate(
    summonerPuuid: string,
    startDate: Date
): Promise<any[] | null> {
    try {
        console.log(
            `Fetching all ranked solo matches for ${summonerPuuid} since ${startDate.toISOString()}`
        );

        // Convert startDate to epoch milliseconds
        const startDateEpoch = BigInt(startDate.getTime());

        // Fetch matches
        const matches = await prisma.rankedSoloMatch.findMany({
            where: {
                summoner_puuid: summonerPuuid,
                game_start_timestamp: { gte: startDateEpoch },
            },
            orderBy: {
                game_start_timestamp: "desc",
            },
        });

        // If no matches found, return null
        if (!matches || matches.length === 0) {
            console.log(
                `No ranked solo match data found for ${summonerPuuid} since ${startDate.toISOString()}.`
            );
            return null;
        }
        return matches;
    } catch (error) {
        const err = error as Error;
        console.error(
            `Error fetching summoner matches since date: ${err.message}`
        );
        throw error;
    }
}

/**
 * Deletes ranked solo matches for summoners who are no longer part of any guild.
 *
 * @returns The number of deleted matches.
 */
export async function deleteMatchesForRemovedSummoners(): Promise<number> {
    try {
        console.log("🔍 Fetching all active summoners from guilds...");
        const activeSummoners = await getUniqueSummoners();
        const activePuuids = activeSummoners.map((s) => s.puuid);

        console.log("🔍 Deleting matches belonging to removed summoners...");

        // Perform deletion
        const result = await prisma.rankedSoloMatch.deleteMany({
            where: {
                summoner_puuid: { notIn: activePuuids },
            },
        });

        if (result.count === 0) {
            console.log(
                "✅ No orphaned match data found. No deletions necessary."
            );
            return 0;
        }

        console.log(
            `✅ Deleted ${result.count} match(es) for removed summoners.`
        );
        return result.count;
    } catch (error) {
        console.error(
            "❌ Error deleting matches for removed summoners:",
            error
        );
        throw error;
    }
}
