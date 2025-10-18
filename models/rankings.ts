import { getGuildById } from "./guilds.js";
import { getSummonersByGuildId } from "./summoners.js";
import { getQueueHandler } from "./queues.js";
import { fetchSummonerStatsWithName } from "./stats.js";
import { logger } from "../utils/logger.js";

interface RankingEntry {
    name: string;
    value: number;
}

function aggregateRankings(
    summonerStats: ({ name: string; stats: Record<string, number> } | null)[],
    limit: number
): Record<string, RankingEntry[]> {
    const rankings: Record<string, RankingEntry[]> = {};

    summonerStats.forEach((summoner) => {
        if (!summoner) return;

        for (const [statName, value] of Object.entries(summoner.stats)) {
            if (!rankings[statName]) {
                rankings[statName] = [];
            }
            rankings[statName].push({ name: summoner.name, value });
        }
    });

    for (const [statName, entries] of Object.entries(rankings)) {
        // For avgPlacement, lower is better (1st place > 4th place)
        const sortComparator = statName === "avgPlacement"
            ? (a: RankingEntry, b: RankingEntry) => a.value - b.value
            : (a: RankingEntry, b: RankingEntry) => b.value - a.value;

        rankings[statName] = entries.sort(sortComparator).slice(0, limit);
    }

    return rankings;
}

export async function fetchRankings(
    guildId: string,
    startDate: Date,
    limit: number = 5,
    queueType: string = "ranked_solo"
): Promise<Record<string, RankingEntry[]> | null> {
    try {
        const guildData = await getGuildById(guildId);
        if (!guildData) {
            logger.warn(`Models > rankings > Guild ${guildId} not found`);
            return null;
        }

        const summoners = await getSummonersByGuildId(guildId);
        if (!summoners?.length) {
            logger.warn(
                `Models > rankings > No summoners found for guild ${guildId}`
            );
            return null;
        }

        const handler = getQueueHandler(queueType);
        if (!handler) {
            logger.warn(
                `Models > rankings > Queue type '${queueType}' not supported`
            );
            return null;
        }

        const startDateEpoch = startDate.getTime();

        const summonerStatsPromises = summoners.map((summoner) =>
            fetchSummonerStatsWithName(summoner, startDateEpoch, queueType)
        );

        const summonerStats = await Promise.all(summonerStatsPromises);
        return aggregateRankings(summonerStats, limit);
    } catch (error) {
        logger.error(
            `Models > rankings > Error fetching rankings for guild ${guildId}`,
            error
        );
        throw error;
    }
}
