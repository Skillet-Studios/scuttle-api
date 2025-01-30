import { getDB } from "../utils/db.js";
import { getSummonersByGuildId } from "./summoners.js";
import { fetchAllSummonerMatchDataByRange } from "./matches.js";
import { calculateStatsRankedSolo } from "./stats.js";
import { Long } from "mongodb";

/**
 * A lookup dictionary for mapping queue types to their respective stat calculation functions.
 * To support additional queue types, add new key-value pairs here.
 */
export const CALCULATE_STATS_MAP = {
    "ranked_solo": calculateStatsRankedSolo,
    // Example:
    // ranked_flex: calculateStatsRankedFlex,
    // normal_blind: calculateStatsNormalBlind,
};

/**
 * Fetches a report for a Guild within a certain range and queue type.
 * The report displays which summoner has the highest value for each stat.
 *
 * @param {string} guildId - The Discord guild ID.
 * @param {number} [range=7] - The number of days to look back.
 * @param {string} [queueType="ranked_solo"] - The queue type to filter matches.
 * @returns {Promise<Object|null>} - Returns the report object or null if no summoners/guild found.
 */
export async function fetchReportByDayRange(guildId, range = 7, queueType = "ranked_solo") {
    try {
        const db = await getDB();
        const collection = db.collection("discord_servers");

        const guildData = await collection.findOne({ guild_id: Long.fromString(guildId) });
        const guildName = guildData?.name || "None";
        console.log(`Fetching ${range}-day report for Guild: ${guildName} [Queue Type: ${queueType}]...`);

        if (!guildData) {
            console.log(`Guild ${guildId} does not exist in the database.`);
            return null;
        }

        const summoners = await getSummonersByGuildId(guildId);
        if (!summoners || summoners.length === 0) {
            console.log(`No summoners found for guild with ID ${guildId}.`);
            return null;
        }

        const calculateStats = CALCULATE_STATS_MAP[queueType];
        if (!calculateStats) {
            console.log(`Queue type '${queueType}' is not supported.`);
            return null;
        }

        const aggStats = [];
        for (const summoner of summoners) {
            const puuid = summoner.puuid;
            const matchesData = await fetchAllSummonerMatchDataByRange(puuid, range, queueType);
            const stats = calculateStats(puuid, matchesData);
            const weeklyStatsWithName = { ...stats, Name: summoner.name };
            aggStats.push(weeklyStatsWithName);
        }

        if (aggStats.length === 0) {
            console.log(`No valid match data found for summoners in guild ${guildId}.`);
            return null;
        }

        // Extract stat keys excluding 'Name'
        const keys = Object.keys(aggStats[0]).filter(key => key !== "Name");

        // Initialize max_values dictionary
        const maxValues = {};
        for (const key of keys) {
            maxValues[key] = { value: -Infinity, Name: null };
        }

        // Determine the maximum value and corresponding summoner for each stat
        for (const item of aggStats) {
            for (const key of keys) {
                if (item[key] > maxValues[key].value) {
                    maxValues[key] = { value: item[key], Name: item.Name };
                }
            }
        }

        // Construct the final report object
        const result = {};
        for (const key of keys) {
            result[key] = {
                "Max Value": maxValues[key].value,
                "Name": maxValues[key].Name
            };
        }

        console.log(`Finished fetching ${range}-day report for Guild: ${guildName}. Compared stats of ${summoners.length} summoners.`);
        return result;
    } catch (error) {
        console.error(`Error fetching report for Guild '${guildId}':`, error.message);
        throw new Error("Failed to fetch report");
    }
}