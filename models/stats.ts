import { getQueueHandler, QueueStats } from "./queues.js";
import { logger } from "../utils/logger.js";

export interface SummonerStatsWithName {
    name: string;
    stats: Record<string, number>;
}

const PRETTY_KEYS: Record<string, string> = {
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
    avgPlacement: "🏆 Avg. Placement",
    firstPlaceFinishes: "🥇 1st Place Finishes",
    secondPlaceFinishes: "🥈 2nd Place Finishes",
    thirdPlaceFinishes: "🥉 3rd Place Finishes",
    fourthPlaceFinishes: "4️⃣ 4th Place Finishes",
    winRate: "✨ Win Rate (%)",
};

export function makePretty(stats: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key in stats) {
        const prettyKey = PRETTY_KEYS[key] || key;
        result[prettyKey] = stats[key];
    }
    return result;
}

export async function fetchSummonerStatsWithName(
    summoner: { name: string; puuid: string },
    startDateEpoch: number,
    queueType: string
): Promise<SummonerStatsWithName | null> {
    const handler = getQueueHandler(queueType);
    if (!handler) return null;

    const matches = await handler.fetchMatches(summoner.puuid, startDateEpoch);
    if (!matches?.length) return null;

    const stats = handler.calculateStats(matches);
    return {
        name: summoner.name,
        stats: stats as unknown as Record<string, number>,
    };
}

export async function fetchSummonerStats(
    summonerPuuid: string,
    range: number,
    queueType: string
): Promise<QueueStats | null> {
    try {
        const handler = getQueueHandler(queueType);
        if (!handler) {
            logger.warn(
                `Models > stats > Queue type '${queueType}' not supported`
            );
            return null;
        }

        const startDateEpoch = Date.now() - range * 24 * 60 * 60 * 1000;
        const matches = await handler.fetchMatches(
            summonerPuuid,
            startDateEpoch
        );
        return handler.calculateStats(matches);
    } catch (error) {
        logger.error(
            `Models > stats > Error fetching stats for ${summonerPuuid}`,
            error
        );
        throw error;
    }
}
