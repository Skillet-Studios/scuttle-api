import prisma from "../utils/prisma.js";
import { RankedSoloMatch } from "@prisma/client";

/**
 * A lookup dictionary for converting machine-friendly keys
 * into user-friendly keys (with emojis and spaces).
 */
const PRETTY_KEYS_DICTIONARY: Record<string, string> = {
    totalMatches: "🎮 Total Matches",
    avgKills: "🔪 Avg. Kills",
    avgDeaths: "💀 Avg. Deaths",
    avgKDA: "🗡 Avg. KDA",
    avgSoloKills: "🔪 Avg. Solo Kills",
    avgVisionScore: "👁 Avg. Vision Score",
    avgTeamDamagePercentage: "🤝 Avg. Team Damage Percentage",
    avgAssists: "🤝 Avg. Assists",
    avgKillParticipation: "🤝 Avg. Kill Participation",
    avgGoldPerMinute: "👑 Avg. Gold Per Minute",
    avgDamagePerMinute: "💥 Avg. Damage Per Minute",
    avgDamageToChampions: "💥 Avg. Damage To Champions",
    avgAssistMePings: "🙃 Avg. Assist Me Pings",
    avgEnemyMissingPings: "🤔 Avg. Enemy Missing Pings",
    avgControlWardsPlaced: "👀 Avg. Control Wards Placed",
    abilityUses: "🖖 Ability Uses",
    gamesSurrendered: "🏳 Games Surrendered",
    scuttleCrabKills: "🐸 Scuttle Crab Kills",
};

export interface SummonerStats {
    totalMatches: number;
    avgKills: number;
    avgDeaths: number;
    avgKDA: number;
    avgSoloKills: number;
    avgVisionScore: number;
    avgTeamDamagePercentage: number;
    avgAssists: number;
    avgKillParticipation: number;
    avgGoldPerMinute: number;
    avgDamagePerMinute: number;
    avgDamageToChampions: number;
    avgAssistMePings: number;
    avgEnemyMissingPings: number;
    avgControlWardsPlaced: number;
    abilityUses: number;
    gamesSurrendered: number;
    scuttleCrabKills: number;
}

/**
 * Calculates stats for a summoner given their PUUID and an array of RankedSoloMatch data.
 * Returns an object with machine-friendly (no emojis/spaces) keys.
 *
 * @param summonerPuuid - The unique PUUID of the summoner.
 * @param matchesData - The array of RankedSoloMatch records from Prisma.
 * @returns An object containing calculated stats.
 */
export function calculateStatsRankedSolo(
    summonerPuuid: string,
    matchesData: RankedSoloMatch[]
): SummonerStats {
    // Initialize stats with zero values
    const stats: SummonerStats = {
        totalMatches: 0,
        avgKills: 0,
        avgDeaths: 0,
        avgKDA: 0,
        avgSoloKills: 0,
        avgVisionScore: 0,
        avgTeamDamagePercentage: 0,
        avgAssists: 0,
        avgKillParticipation: 0,
        avgGoldPerMinute: 0,
        avgDamagePerMinute: 0,
        avgDamageToChampions: 0,
        avgAssistMePings: 0,
        avgEnemyMissingPings: 0,
        avgControlWardsPlaced: 0,
        abilityUses: 0,
        gamesSurrendered: 0,
        scuttleCrabKills: 0,
    };

    // If matchesData is invalid or empty, log error and return default stats
    if (!Array.isArray(matchesData) || matchesData.length === 0) {
        console.error(
            `Error calculating stats for summoner with puuid ${summonerPuuid}. No match data provided.`
        );
        return stats;
    }

    // Set total match count
    stats.totalMatches = matchesData.length;

    // Aggregate sums for all relevant fields
    for (const match of matchesData) {
        // Increment if the game ended in surrender
        if (match.game_surrendered) {
            stats.gamesSurrendered += 1;
        }

        stats.avgKills += match.kills;
        stats.avgDeaths += match.deaths;
        stats.avgVisionScore += match.vision_score;
        stats.avgControlWardsPlaced += match.control_wards_placed;
        stats.avgAssistMePings += 0; // Not tracked in current schema
        stats.scuttleCrabKills += match.scuttle_crab_kills;
        stats.avgDamageToChampions += match.damage_to_champions;
        stats.avgAssists += match.assists;
        stats.abilityUses += match.ability_uses;
        stats.avgSoloKills += match.solo_kills;
        stats.avgEnemyMissingPings += match.enemy_missing_pings;
        stats.avgDamagePerMinute += match.damage_per_minute;
        stats.avgGoldPerMinute += match.gold_per_minute;
        stats.avgKDA += match.kda;
        stats.avgKillParticipation += match.kill_participation;
        stats.avgTeamDamagePercentage += match.team_damage_percentage;
    }

    // List of fields that should be averaged
    const fieldsToAverage: (keyof SummonerStats)[] = [
        "avgKills",
        "avgDeaths",
        "avgKDA",
        "avgSoloKills",
        "avgVisionScore",
        "avgTeamDamagePercentage",
        "avgAssists",
        "avgKillParticipation",
        "avgGoldPerMinute",
        "avgDamagePerMinute",
        "avgDamageToChampions",
        "avgAssistMePings",
        "avgEnemyMissingPings",
        "avgControlWardsPlaced",
    ];

    // Compute averages
    for (const field of fieldsToAverage) {
        stats[field] = stats[field] / stats.totalMatches;
    }

    // Round all numeric fields to 2 decimal places
    for (const key in stats) {
        const statKey = key as keyof SummonerStats;
        if (typeof stats[statKey] === "number") {
            stats[statKey] = parseFloat(
                stats[statKey].toFixed(2)
            ) as SummonerStats[typeof statKey];
        }
    }

    return stats;
}

/**
 * Converts a structured stats object (keys without emojis/spaces)
 * into a user-friendly object (with emojis/spaces) based on
 * the PRETTY_KEYS_DICTIONARY.
 *
 * @param stats - The object returned from calculateStatsRankedSolo.
 * @returns A new object with user-friendly (emoji and spaced) keys.
 */
export function makePretty(stats: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key in stats) {
        const prettyKey = PRETTY_KEYS_DICTIONARY[key] || key;
        result[prettyKey] = stats[key];
    }
    return result;
}

/**
 * Fetches a summoner's stats for the specified queue type within the last `range` days.
 * Only calls `calculateStatsRankedSolo` if queueType is "ranked_solo".
 * Otherwise returns an empty object.
 *
 * @param summonerPuuid - The summoner's PUUID.
 * @param range - The day range to look back. Defaults to 7.
 * @param queueType - The queue type (e.g. "ranked_solo"). Defaults to "ranked_solo".
 * @returns A stats object, either from calculateStatsRankedSolo or empty if not "ranked_solo".
 */
export async function fetchSummonerStatsByDayRange(
    summonerPuuid: string,
    range: number = 7,
    queueType: string = "ranked_solo"
): Promise<SummonerStats | Record<string, never>> {
    try {
        console.log(
            `Fetching ${range}-day stats for ${summonerPuuid} [queueType=${queueType}]...`
        );

        // Only support ranked_solo for now
        if (queueType !== "ranked_solo") {
            console.log(
                `Queue type '${queueType}' is not supported yet. Only 'ranked_solo' is available.`
            );
            return {};
        }

        // Calculate the time range (lower bound)
        const now = new Date();
        const lowerBound = new Date();
        lowerBound.setDate(now.getDate() - range);

        // Fetch matches from RankedSoloMatch table
        const matchesData = await prisma.rankedSoloMatch.findMany({
            where: {
                summoner_puuid: summonerPuuid,
                game_start_timestamp: {
                    gte: BigInt(lowerBound.getTime()),
                },
            },
        });

        const stats = calculateStatsRankedSolo(summonerPuuid, matchesData);
        return stats;
    } catch (error) {
        console.error(
            `Error fetching summoner stats for ${summonerPuuid} (queueType: ${queueType}):`,
            error instanceof Error ? error.message : error
        );
        throw error;
    }
}
