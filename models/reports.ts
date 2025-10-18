import { getGuildById } from "./guilds.js";
import { getSummonersByGuildId } from "./summoners.js";
import { getQueueHandler } from "./queues.js";
import { fetchSummonerStatsWithName } from "./stats.js";
import { logger } from "../utils/logger.js";

interface ReportStat {
    "Max Value": number;
    Name: string;
}

function findMaxStats(
    summonerStats: ({ name: string; stats: Record<string, number> } | null)[]
): Record<string, ReportStat> {
    const result: Record<string, ReportStat> = {};

    summonerStats.forEach((summoner) => {
        if (!summoner) return;

        for (const [statName, value] of Object.entries(summoner.stats)) {
            if (!result[statName] || value > result[statName]["Max Value"]) {
                result[statName] = {
                    "Max Value": value,
                    Name: summoner.name,
                };
            }
        }
    });

    return result;
}

export async function fetchReportByDayRange(
    guildId: string,
    range: number = 7,
    queueType: string = "ranked_solo"
): Promise<Record<string, ReportStat> | null> {
    try {
        const guildData = await getGuildById(guildId);
        if (!guildData) {
            logger.warn(`Models > reports > Guild ${guildId} not found`);
            return null;
        }

        const summoners = await getSummonersByGuildId(guildId);
        if (!summoners?.length) {
            logger.warn(
                `Models > reports > No summoners found for guild ${guildId}`
            );
            return null;
        }

        const handler = getQueueHandler(queueType);
        if (!handler) {
            logger.warn(
                `Models > reports > Queue type '${queueType}' not supported`
            );
            return null;
        }

        const startDateEpoch = Date.now() - range * 24 * 60 * 60 * 1000;

        const summonerStatsPromises = summoners.map((summoner) =>
            fetchSummonerStatsWithName(summoner, startDateEpoch, queueType)
        );

        const summonerStats = await Promise.all(summonerStatsPromises);

        if (summonerStats.every((s) => s === null)) {
            logger.warn(`Models > reports > No valid stats found for guild ${guildId}`);
            return null;
        }

        return findMaxStats(summonerStats);
    } catch (error) {
        logger.error(
            `Models > reports > Error fetching report for guild ${guildId}`,
            error
        );
        throw error;
    }
}
