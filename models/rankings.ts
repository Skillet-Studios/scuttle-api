import { getGuildById } from "./guilds.js";
import { getSummonersByGuildId } from "./summoners.js";
import prisma from "../utils/prisma.js";
import { CALCULATE_STATS_MAP } from "./reports.js";

interface RankingEntry {
    name: string;
    value: number;
}

/**
 * Fetches the top summoners by stat from a specific start date for a given guild.
 *
 * @param guildId - The Discord guild ID.
 * @param startDate - The start date from which to fetch matches.
 * @param limit - The number of top summoners to retrieve per stat. Defaults to 5.
 * @param queueType - The queue type to filter matches. Defaults to "ranked_solo".
 * @returns Returns an object with top summoners per stat or null if guild/summoners not found.
 */
export async function fetchRankings(
    guildId: string,
    startDate: Date,
    limit: number = 5,
    queueType: string = "ranked_solo"
): Promise<Record<string, RankingEntry[]> | null> {
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

        const topStats: Record<string, RankingEntry[]> = {};

        // To improve performance, fetch all match data concurrently
        const summonerPromises = summoners.map(async (summoner) => {
            const puuid = summoner.puuid;

            // Fetch match data since startDate from RankedSoloMatch table
            const matchesData = await prisma.rankedSoloMatch.findMany({
                where: {
                    summoner_puuid: puuid,
                    game_start_timestamp: {
                        gte: BigInt(startDateEpoch),
                    },
                },
            });

            // If no matches found for the summoner, skip to the next
            if (!matchesData || matchesData.length === 0) {
                console.log(
                    `No match data found for summoner '${summoner.name}' since ${startDate.toISOString()}.`
                );
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
                topStats[statName].push({ name, value: value as number });
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
        console.error(
            `Error fetching rankings for guild '${guildId}':`,
            error instanceof Error ? error.message : error
        );
        throw new Error("Failed to fetch rankings.");
    }
}
