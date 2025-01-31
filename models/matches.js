import axios from "axios";
import chalk from "chalk"; // Import chalk for colored console logs
import { getDB } from "../utils/db.js";
import {
    getSummonersByGuildId,
    checkIfCachedWithinRange,
    updateCachedTimestamp,
    getUniqueSummoners,
} from "./summoners.js";
import { processMatchData } from "../utils/processing.js";
import { getAreaFromRegion } from "../utils/processing.js";

/*******************************************************
 * FULL QUEUE_ID_MAP
 *
 * Maps a friendly queueType string -> Riot's queueId.
 * Adapt as needed. Many of these modes are historical or
 * limited-time. Check their current availability in game.
 ******************************************************/
export const QUEUE_ID_MAP = {
    // 0–100 range, including customs and old event queues
    custom: 0,
    snowdown_1v1: 72,
    snowdown_2v2: 73,
    hexakill_summoners_rift: 75,
    urf_snowdown: 76,
    one_for_all_snowdown: 78,
    one_for_all_mirror_mode: 79,
    urf: 83, // Old URF queue
    bot_urf: 91, // Bot URF mode

    // 300 range: mostly older or special event queues
    showdown_1v1: 72, // sometimes repeated in different docs
    showdown_2v2: 73,
    hexakill_crystal_scar: 98,
    arurf_5v5: 100, // ARURF
    nemesis_draft: 310,
    black_market_brawlers: 313,
    definitely_not_dominion: 317,
    all_random_summoners_rift: 325,
    draft_summoners_rift_6: 400, // old references

    // Modern Summoner's Rift (400–499 range)
    normal_draft: 400, // 5v5 Draft Pick
    ranked_solo: 420, // 5v5 Ranked Solo
    normal_blind: 430, // 5v5 Blind Pick
    ranked_flex: 440, // 5v5 Ranked Flex
    aram: 450, // ARAM on Howling Abyss
    blood_hunt_assassin: 600,
    dark_star_singularity: 610,
    clash: 700, // Team-based competition
    arurf: 900, // ARURF on Summoner’s Rift

    // Co-op vs AI (Intro/Beginner/Intermediate)
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
};

/**
 * Caches the last 30 days worth of ranked solo queue (queue=420) match data
 * for every summoner in each provided guild.
 *
 * - Iterates all guilds and their summoners.
 * - Skips summoners if we already processed them during this run.
 * - If a summoner’s data was cached within the last day, only fetch 1 day of matches;
 *   otherwise fetch up to 30 days, in 5-day increments.
 * - Deduplicates matches that are already in the "cached_match_data" collection.
 * - Inserts only new matches with minimal participant data (via `processMatchData`).
 * - Updates the summoner’s "last_cached" timestamp once done.
 *
 * @param {Array<Object>} guilds - An array of guild documents from your database.
 * @returns {Promise<void>}
 */
export async function cacheMatchData(guilds) {
    try {
        const db = await getDB();
        const matchCollection = db.collection("cached_match_data");

        const summonersChecked = new Set();
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

                // Check if summoner’s data was recently cached
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

                    let matchIds = [];
                    try {
                        const response = await axios.get(matchIdsUrl);
                        matchIds = response.data;
                    } catch (err) {
                        console.error(
                            chalk.red(
                                `❌ Error fetching match IDs: ${err.message}`
                            )
                        );
                        daysFetched += daysToFetch;
                        continue;
                    }

                    const existingDocs = await matchCollection
                        .find({
                            "metadata.matchId": { $in: matchIds },
                            summoner_puuid: summonerPuuid,
                        })
                        .toArray();

                    const existingIds = existingDocs.map(
                        (doc) => doc.metadata.matchId
                    );
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

                        let singleMatchData = null;
                        try {
                            const response = await axios.get(matchUrl);
                            singleMatchData = response.data;
                        } catch (err) {
                            console.error(
                                chalk.red(
                                    `❌ Error fetching match ${matchId}: ${err.message}`
                                )
                            );
                            continue;
                        }

                        if (singleMatchData) {
                            matchesCached++;
                            totalMatchesCached++;

                            const processedData = processMatchData(
                                summonerPuuid,
                                singleMatchData
                            );
                            await matchCollection.insertOne(processedData);
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
        const elapsedMs = jobEndTime - jobStartTime;
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
 * Deletes matches older than a specified number of days from the "cached_match_data" collection.
 *
 * - Uses `info.gameStartTimestamp` as the date/time the game started (in milliseconds).
 * - Calculates a cutoff date based on (current time - days).
 * - Removes any match whose `info.gameStartTimestamp` is less than that cutoff.
 *
 * @param {number} days - The number of days to keep. Matches older than this will be deleted.
 * @returns {Promise<number>} The number of documents deleted.
 */
export async function deleteMatchesOlderThan(days = 31) {
    try {
        const db = await getDB();
        const matchCollection = db.collection("cached_match_data");

        // Convert days into milliseconds
        const cutoffMs = days * 24 * 60 * 60 * 1000;
        const cutoffTimestamp = Date.now() - cutoffMs;

        // Delete all matches older than our cutoff
        const result = await matchCollection.deleteMany({
            "info.gameStartTimestamp": { $lt: cutoffTimestamp },
        });

        console.log(
            `Deleted ${result.deletedCount} match(es) older than ${days} day(s).`
        );
        return result.deletedCount;
    } catch (error) {
        console.error("Error deleting old matches:", error);
        throw error;
    }
}

/**
 * Fetches all matches stored in the "cached_match_data" collection for a summoner
 * within the specified number of days, filtered optionally by queue type.
 *
 * @param {string} summonerPuuid - The summoner's PUUID.
 * @param {number} [range=7] - The day range to look back, defaults to 7.
 * @param {string} [queueType] - The queue type to filter, e.g. "ranked_solo".
 * @returns {Promise<Array|null>} - A Promise that resolves to an array of match documents or null if none found.
 */
export async function fetchAllSummonerMatchDataByRange(
    summonerPuuid,
    range = 7,
    queueType
) {
    try {
        const db = await getDB();
        const collection = db.collection("cached_match_data");

        console.log(
            `Fetching all matches for ${summonerPuuid} within the last ${range} days` +
                (queueType ? ` [queueType=${queueType}]` : "")
        );

        // Calculate the time range (lower bound in milliseconds)
        const now = new Date();
        const lowerRange = new Date(now.setDate(now.getDate() - range));
        const lowerRangeEpoch = lowerRange.getTime(); // milliseconds since epoch

        // Create indexes on fields used for querying (if not already done)
        await collection.createIndex({ summoner_puuid: 1 });
        await collection.createIndex({ "info.gameStartTimestamp": 1 });

        // Define the base query
        const query = {
            summoner_puuid: summonerPuuid,
            "info.gameStartTimestamp": { $gte: lowerRangeEpoch },
        };

        // If a recognized queueType is provided, filter by queueId
        if (queueType && QUEUE_ID_MAP[queueType]) {
            query["info.queueId"] = QUEUE_ID_MAP[queueType];
        }

        // Fetch documents
        const documents = await collection.find(query).toArray();

        // If no documents found, return null
        if (!documents || documents.length === 0) {
            console.log(
                `No summoner match data found for ${summonerPuuid} within the last ${range} days.`
            );
            return null;
        }
        return documents;
    } catch (error) {
        console.error(`Error fetching summoner matches: ${error.message}`);
        throw error;
    }
}

/**
 * Fetches all matches stored in the "cached_match_data" collection for a summoner
 * from a specified start date until the current datetime, optionally filtered by queue type.
 *
 * @param {string} summonerPuuid - The summoner's PUUID.
 * @param {Date} startDate - The start date from which to fetch matches.
 * @param {string} [queueType] - The queue type to filter matches, e.g., "ranked_solo".
 * @returns {Promise<Array|null>} - A Promise that resolves to an array of match documents or null if none found.
 */
export async function fetchAllSummonerMatchDataSinceDate(
    summonerPuuid,
    startDate,
    queueType
) {
    try {
        const db = await getDB();
        const collection = db.collection("cached_match_data");

        console.log(
            `Fetching all matches for ${summonerPuuid} since ${startDate.toISOString()}` +
                (queueType ? ` [queueType=${queueType}]` : "")
        );

        // Convert startDate to epoch milliseconds
        const startDateEpoch = startDate.getTime();

        // Create indexes on fields used for querying (if not already done)
        await collection.createIndex({ summoner_puuid: 1 });
        await collection.createIndex({ "info.gameStartTimestamp": 1 });

        // Define the base query
        const query = {
            summoner_puuid: summonerPuuid,
            "info.gameStartTimestamp": { $gte: startDateEpoch },
        };

        // If a recognized queueType is provided, filter by queueId
        if (queueType && QUEUE_ID_MAP[queueType]) {
            query["info.queueId"] = QUEUE_ID_MAP[queueType];
        }

        // Fetch documents
        const documents = await collection.find(query).toArray();

        // If no documents found, return null
        if (!documents || documents.length === 0) {
            console.log(
                `No summoner match data found for ${summonerPuuid} since ${startDate.toISOString()}.`
            );
            return null;
        }
        return documents;
    } catch (error) {
        console.error(
            `Error fetching summoner matches since date: ${error.message}`
        );
        throw error;
    }
}

/**
 * Deletes matches from "cached_match_data" for summoners who are no longer part of any guild.
 *
 * - Retrieves all unique summoners still present in guilds using `getAllUniqueSummoners()`.
 * - Identifies match documents where `summoner_puuid` does not exist in the active summoner list.
 * - Deletes only those matches that belong to removed summoners.
 *
 * @returns {Promise<number>} The number of deleted matches.
 */
export async function deleteMatchesForRemovedSummoners() {
    try {
        const db = await getDB();
        const matchCollection = db.collection("cached_match_data");

        console.log("🔍 Fetching all active summoners from guilds...");
        const activeSummoners = await getUniqueSummoners();
        const activePuuids = new Set(activeSummoners.map((s) => s.puuid));

        console.log("🔍 Identifying matches belonging to removed summoners...");
        const matchesToDelete = await matchCollection
            .find(
                { summoner_puuid: { $nin: [...activePuuids] } },
                { projection: { _id: 1 } }
            )
            .toArray();

        if (matchesToDelete.length === 0) {
            console.log(
                "✅ No orphaned match data found. No deletions necessary."
            );
            return 0;
        }

        console.log(
            `🗑️ Deleting ${matchesToDelete.length} matches with removed summoners...`
        );

        // Perform batch deletion
        const result = await matchCollection.deleteMany({
            summoner_puuid: { $nin: [...activePuuids] },
        });

        console.log(
            `✅ Deleted ${result.deletedCount} match(es) for removed summoners.`
        );
        return result.deletedCount;
    } catch (error) {
        console.error(
            "❌ Error deleting matches for removed summoners:",
            error
        );
        throw error;
    }
}
