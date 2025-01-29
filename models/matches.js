import axios from "axios";
import { getDB } from "../utils/db.js";
import {
    getSummonersByGuildId,
    checkIfCachedWithinRange,
    updateCachedTimestamp,
} from "./summoners.js";
import { processMatchData } from "../utils/processing.js";
import { getAreaFromRegion } from "../utils/processing.js";

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