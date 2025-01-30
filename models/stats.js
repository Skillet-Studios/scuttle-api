import { fetchAllSummonerMatchDataByRange } from "./matches.js";
/**
 * A lookup dictionary for converting machine-friendly keys
 * into user-friendly keys (with emojis and spaces).
 */
const PRETTY_KEYS_DICTIONARY = {
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

/**
 * Calculates stats for a summoner given their PUUID and an array of match data.
 * Returns an object with machine-friendly (no emojis/spaces) keys.
 *
 * @param {string} summonerPuuid - The unique PUUID of the summoner.
 * @param {Array} matchesData - The array of match data objects.
 * @returns {Object} - An object containing calculated stats.
 */
export function calculateStatsRankedSolo(summonerPuuid, matchesData) {
    // Initialize stats with zero values
    const stats = {
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
        const participants = match?.info?.participants || [];
        const participant = participants.find(
            (p) => p.puuid === summonerPuuid
        );

        // If no matching participant found, skip this match
        if (!participant) continue;

        const challenges = participant.challenges || {};

        // Increment if the game ended in surrender
        if (participant.gameEndedInSurrender) {
            stats.gamesSurrendered += 1;
        }

        stats.avgKills += participant.kills || 0;
        stats.avgDeaths += participant.deaths || 0;
        stats.avgVisionScore += participant.visionScore || 0;
        stats.avgControlWardsPlaced += challenges.controlWardsPlaced || 0;
        stats.avgAssistMePings += participant.assistMePings || 0;
        stats.scuttleCrabKills += challenges.scuttleCrabKills || 0;
        stats.avgDamageToChampions += participant.totalDamageDealtToChampions || 0;
        stats.avgAssists += participant.assists || 0;
        stats.abilityUses += challenges.abilityUses || 0;
        stats.avgSoloKills += challenges.soloKills || 0;
        stats.avgEnemyMissingPings += participant.enemyMissingPings || 0;
        stats.avgDamagePerMinute += challenges.damagePerMinute || 0;
        stats.avgGoldPerMinute += challenges.goldPerMinute || 0;
        stats.avgKDA += challenges.kda || 0;
        stats.avgKillParticipation += challenges.killParticipation || 0;
        stats.avgTeamDamagePercentage += challenges.teamDamagePercentage || 0;
    }

    // List of fields that should be averaged
    const fieldsToAverage = [
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
        if (typeof stats[key] === "number") {
            stats[key] = parseFloat(stats[key].toFixed(2));
        }
    }

    return stats;
}

/**
 * Converts a structured stats object (keys without emojis/spaces)
 * into a user-friendly object (with emojis/spaces) based on
 * the PRETTY_KEYS_DICTIONARY.
 *
 * @param {Object} stats - The object returned from calculateStatsRankedSolo.
 * @returns {Object} - A new object with user-friendly (emoji and spaced) keys.
 */
export function makePretty(stats) {
    const result = {};
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
 * @param {string} summonerPuuid - The summoner's PUUID.
 * @param {number} [range=7] - The day range to look back.
 * @param {string} [queueType="ranked_solo"] - The queue type (e.g. "ranked_solo").
 * @returns {Promise<Object>} - A stats object, either from calculateStatsRankedSolo or empty if not "ranked_solo".
 */
export async function fetchSummonerStatsByDayRange(
    summonerPuuid,
    range = 7,
    queueType = "ranked_solo"
) {
    try {
        console.log(
            `Fetching ${range}-day stats for ${summonerPuuid} [queueType=${queueType}]...`
        );

        // Fetch matches data for the range and queue
        const matchesData = await fetchAllSummonerMatchDataByRange(
            summonerPuuid,
            range,
            queueType
        );

        const safeMatchesData = matchesData || [];

        // Only compute ranked solo stats if queueType === "ranked_solo"
        if (queueType === "ranked_solo") {
            const stats = calculateStatsRankedSolo(summonerPuuid, safeMatchesData);
            return stats;
        } else {
            // For now, return an empty object for non-ranked-solo
            return {};
        }
    } catch (error) {
        console.error(
            `Error fetching summoner stats for ${summonerPuuid} (queueType: ${queueType}): ${error.message}`
        );
        throw error;
    }
}
