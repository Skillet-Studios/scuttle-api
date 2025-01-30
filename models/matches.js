import axios from "axios";
import { getDB } from "../utils/db.js";
import {
    getSummonersByGuildId,
    checkIfCachedWithinRange,
    updateCachedTimestamp,
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
    normal_draft: 400,      // 5v5 Draft Pick
    ranked_solo: 420,       // 5v5 Ranked Solo
    normal_blind: 430,      // 5v5 Blind Pick
    ranked_flex: 440,       // 5v5 Ranked Flex
    aram: 450,              // ARAM on Howling Abyss
    blood_hunt_assassin: 600,
    dark_star_singularity: 610,
    clash: 700,             // Team-based competition
    arurf: 900,             // ARURF on Summoner’s Rift

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

        const summonersChecked = [];
        let totalMatchesCached = 0;
        const jobStartTime = new Date();

        console.log(`\nStarting cache process for up to 30 days of data...`);

        for (const guild of guilds) {
            // Fetch summoners for this guild
            const summoners = await getSummonersByGuildId(guild.guild_id);

            // If no summoners, skip
            if (!summoners || summoners.length === 0) {
                console.log(
                    `Guild "${guild.name || "Unknown"}" has no summoners. Skipping.`
                );
                continue;
            }

            for (const summoner of summoners) {
                // Avoid processing the same summoner multiple times
                if (summonersChecked.includes(summoner.puuid)) {
                    console.log(
                        `Already processed summoner "${summoner.name}". Skipping.`
                    );
                    continue;
                }

                let matchesCached = 0;
                let daysFetched = 0;
                let daysToFetchMax = 30; // default: 30 days

                // Check if summoner’s data was cached within the last day
                const cachedRecently = await checkIfCachedWithinRange(summoner, 1);
                if (cachedRecently) {
                    daysToFetchMax = 1;
                }

                const summonerPuuid = summoner.puuid;
                const region = summoner.region ?? "na1"; // fallback if region missing
                const area = getAreaFromRegion(region) || "americas";

                // Fetch match data in 5-day increments
                while (daysFetched < daysToFetchMax) {
                    // e.g., 30 days => chunked by 5 => 6 iterations
                    const daysToFetch = Math.min(5, daysToFetchMax - daysFetched);

                    // Calculate time window [startTime, endTime)
                    const endTime = new Date();
                    endTime.setDate(endTime.getDate() - daysFetched);
                    const startTime = new Date(endTime);
                    startTime.setDate(startTime.getDate() - daysToFetch);

                    const endTimestamp = Math.floor(endTime.getTime() / 1000);
                    const startTimestamp = Math.floor(startTime.getTime() / 1000);

                    console.log(
                        `\nFetching match IDs for summoner "${summoner.name}" from ${startTime.toDateString()} to ${endTime.toDateString()}...`
                    );

                    // Construct Riot API URL for match IDs
                    const matchIdsUrl = `https://${area}.api.riotgames.com/lol/match/v5/matches/by-puuid/${summonerPuuid}/ids?startTime=${startTimestamp}&endTime=${endTimestamp}&queueId=420&start=0&count=100&api_key=${process.env.RIOT_API_KEY}`;

                    // Fetch match IDs with Axios
                    let matchIds = [];
                    try {
                        const response = await axios.get(matchIdsUrl);
                        matchIds = response.data; // should be an array of match IDs
                    } catch (err) {
                        console.error(`Error fetching match IDs: ${err.message}`);
                        // If an error occurs, skip this chunk (continue to next iteration)
                        daysFetched += daysToFetch;
                        continue;
                    }

                    // Find which match IDs are already cached
                    const existingDocs = await matchCollection
                        .find({
                            "metadata.matchId": { $in: matchIds },
                            summoner_puuid: summonerPuuid,
                        })
                        .toArray();

                    const existingIds = existingDocs.map((doc) => doc.metadata.matchId);

                    // Filter out match IDs that we already have
                    const newMatchIds = matchIds.filter(
                        (matchId) => !existingIds.includes(matchId)
                    );

                    console.log(`- Already cached: ${existingIds}`);
                    console.log(`- Needs caching: ${newMatchIds}`);

                    // Fetch & insert new matches
                    for (const matchId of newMatchIds) {
                        const matchUrl = `https://${area}.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${process.env.RIOT_API_KEY}`;

                        let singleMatchData = null;
                        try {
                            const response = await axios.get(matchUrl);
                            singleMatchData = response.data;
                        } catch (err) {
                            console.error(`Error fetching match ${matchId}: ${err.message}`);
                            // Skip this match if there's an error
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
                } // end while

                // Mark this summoner as processed, then update "last_cached"
                summonersChecked.push(summoner.puuid);
                await updateCachedTimestamp(summoner);

                console.log(
                    `${matchesCached} match(es) cached for summoner "${summoner.name}".`
                );
            } // end summoners loop
        } // end guilds loop

        // Print summary
        console.log(`\n${totalMatchesCached} total new matches cached.`);
        const jobEndTime = new Date();
        const elapsedMs = jobEndTime - jobStartTime;

        // Format elapsed time
        const hours = Math.floor(elapsedMs / 3600000);
        const minutes = Math.floor((elapsedMs % 3600000) / 60000);
        const seconds = Math.floor((elapsedMs % 60000) / 1000);

        console.log(
            `Done caching match data. Elapsed time: ${hours}h ${minutes}m ${seconds}s.\n`
        );
    } catch (error) {
        console.error("Error in cacheMatchData:", error);
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
        console.error(`Error fetching summoner matches since date: ${error.message}`);
        throw error;
    }
}