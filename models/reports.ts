import { getGuildById } from "./guilds.js";
import { getSummonersByGuildId } from "./summoners.js";
import prisma from "../utils/prisma.js";
import { calculateStatsRankedSolo, SummonerStats } from "./stats.js";
import { RankedSoloMatch } from "@prisma/client";

/**
 * A lookup dictionary for mapping queue types to their respective stat calculation functions.
 * To support additional queue types, add new key-value pairs here.
 */
export const CALCULATE_STATS_MAP: Record<
    string,
    (puuid: string, matches: RankedSoloMatch[]) => SummonerStats
> = {
    ranked_solo: calculateStatsRankedSolo,
    // Example:
    // ranked_flex: calculateStatsRankedFlex,
    // normal_blind: calculateStatsNormalBlind,
};

interface ReportStat {
    "Max Value": number;
    Name: string;
}

/**
 * Fetches a report for a Guild within a certain range and queue type.
 * The report displays which summoner has the highest value for each stat.
 *
 * @param guildId - The Discord guild ID.
 * @param range - The number of days to look back. Defaults to 7.
 * @param queueType - The queue type to filter matches. Defaults to "ranked_solo".
 * @returns Returns the report object or null if no summoners/guild found.
 */
export async function fetchReportByDayRange(
    guildId: string,
    range: number = 7,
    queueType: string = "ranked_solo"
): Promise<Record<string, ReportStat> | null> {
    try {
        const guildData = await getGuildById(guildId);
        const guildName = guildData?.name || "None";
        console.log(
            `Fetching ${range}-day report for Guild: ${guildName} [Queue Type: ${queueType}]...`
        );

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

        // Calculate the time range (lower bound)
        const now = new Date();
        const lowerBound = new Date();
        lowerBound.setDate(now.getDate() - range);

        const aggStats: Array<SummonerStats & { Name: string }> = [];
        for (const summoner of summoners) {
            const puuid = summoner.puuid;

            // Fetch matches from RankedSoloMatch table
            const matchesData = await prisma.rankedSoloMatch.findMany({
                where: {
                    summoner_puuid: puuid,
                    game_start_timestamp: {
                        gte: BigInt(lowerBound.getTime()),
                    },
                },
            });

            const stats = calculateStats(puuid, matchesData);
            const weeklyStatsWithName = { ...stats, Name: summoner.name };
            aggStats.push(weeklyStatsWithName);
        }

        if (aggStats.length === 0) {
            console.log(`No valid match data found for summoners in guild ${guildId}.`);
            return null;
        }

        // Extract stat keys excluding 'Name'
        const keys = Object.keys(aggStats[0]).filter((key) => key !== "Name");

        // Initialize max_values dictionary
        const maxValues: Record<string, { value: number; Name: string }> = {};
        for (const key of keys) {
            maxValues[key] = { value: -Infinity, Name: "" };
        }

        // Determine the maximum value and corresponding summoner for each stat
        for (const item of aggStats) {
            for (const key of keys) {
                const typedKey = key as keyof SummonerStats;
                if (item[typedKey] > maxValues[key].value) {
                    maxValues[key] = {
                        value: item[typedKey] as number,
                        Name: item.Name,
                    };
                }
            }
        }

        // Construct the final report object
        const result: Record<string, ReportStat> = {};
        for (const key of keys) {
            result[key] = {
                "Max Value": maxValues[key].value,
                Name: maxValues[key].Name,
            };
        }

        console.log(
            `Finished fetching ${range}-day report for Guild: ${guildName}. Compared stats of ${summoners.length} summoners.`
        );
        return result;
    } catch (error) {
        console.error(
            `Error fetching report for Guild '${guildId}':`,
            error instanceof Error ? error.message : error
        );
        throw new Error("Failed to fetch report");
    }
}
