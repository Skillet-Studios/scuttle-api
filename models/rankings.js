// models/rankings.js

import { getGuildById } from "./guilds.js";
import { getSummonersByGuildId } from "./summoners.js";
import { fetchAllSummonerMatchDataSinceDate } from "./matches.js";
import { CALCULATE_STATS_MAP } from "./reports.js";


/**
 * Fetches the top summoners by stat from a specific start date for a given guild.
 * 
 * @param {string} guildId - The Discord guild ID.
 * @param {Date} startDate - The start date from which to fetch matches.
 * @param {number} [limit=5] - The number of top summoners to retrieve per stat.
 * @param {string} [queueType="ranked_solo"] - The queue type to filter matches.
 * @returns {Promise<Object|null>} - Returns an object with top summoners per stat or null if guild/summoners not found.
 */
export async function fetchRankings(guildId, startDate, limit = 5, queueType = "ranked_solo") {
    try {
        // Retrieve guild data using getGuildById
        const guildData = await getGuildById(guildId);
        if (!guildData) {
            console.log(`Guild with ID ${guildId} not found.`);
            return null;
        }

        // Retrieve summoners using getSummonersByGuildId
        const summoners = await getSummonersByGuildId(guildId);
        if (!summoners || summoners.length === 0) {
            console.log(`No summoners found for guild with ID ${guildId}.`);
            return null;
        }

        // Convert startDate to epoch milliseconds
        const startDateEpoch = startDate.getTime();

        // Select the appropriate stat calculation function based on queueType
        const calculateStats = CALCULATE_STATS_MAP[queueType];
        if (!calculateStats) {
            console.log(`Queue type '${queueType}' is not supported.`);
            return null;
        }

        const topStats = {};

        // To improve performance, fetch all match data concurrently
        const summonerPromises = summoners.map(async (summoner) => {
            const puuid = summoner.puuid;

            // Fetch match data since startDate with optional queueType
            const matchesData = await fetchAllSummonerMatchDataSinceDate(puuid, startDate, queueType);

            // If no matches found for the summoner, skip to the next
            if (!matchesData || matchesData.length === 0) {
                console.log(`No match data found for summoner '${summoner.name}' since ${startDate.toISOString()}.`);
                return null;
            }

            // Calculate stats using the selected calculation function
            const stats = calculateStats(puuid, matchesData);

            return { name: summoner.name, stats };
        });

        const summonerStats = await Promise.all(summonerPromises);

        // Iterate over each summoner's stats and populate topStats
        summonerStats.forEach((summoner) => {
            if (!summoner) return; // Skip if no data

            const { name, stats } = summoner;

            for (const [statName, value] of Object.entries(stats)) {
                if (!topStats[statName]) {
                    topStats[statName] = [];
                }
                topStats[statName].push({ name, value });
            }
        });

        // For each stat, sort the summoners by value in descending order and take the top 'limit'
        for (const [statName, entries] of Object.entries(topStats)) {
            topStats[statName] = entries
                .sort((a, b) => b.value - a.value)
                .slice(0, limit);
        }

        return topStats;
    } catch (error) {
        console.error(`Error fetching rankings for guild '${guildId}':`, error.message);
        throw new Error("Failed to fetch rankings.");
    }
}
