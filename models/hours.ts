import prisma from "../utils/prisma.js";
import { logger } from "../utils/logger.js";

interface PlaytimeResult {
    playtimeSeconds: number;
    matchesPlayed: number;
    pretty: string;
}

function formatPlaytime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
}

export async function getSummonerPlaytime(
    summonerPuuid: string,
    range: number,
    queueType: string = "ranked_solo"
): Promise<PlaytimeResult> {
    try {
        if (queueType !== "ranked_solo") {
            logger.warn(
                `Models > hours > Queue type '${queueType}' not supported`
            );
            return { playtimeSeconds: 0, matchesPlayed: 0, pretty: "0h 0m 0s" };
        }

        const lowerBound = new Date();
        lowerBound.setDate(lowerBound.getDate() - range);

        const matches = await prisma.rankedSoloMatch.findMany({
            where: {
                summoner_puuid: summonerPuuid,
                game_start_timestamp: { gte: BigInt(lowerBound.getTime()) },
            },
            select: { game_duration: true },
        });

        if (!matches.length) {
            logger.debug(
                `Models > hours > No matches found for ${summonerPuuid} in past ${range} days`
            );
            return { playtimeSeconds: 0, matchesPlayed: 0, pretty: "0h 0m 0s" };
        }

        const totalSeconds = matches.reduce(
            (sum, match) => sum + match.game_duration,
            0
        );

        return {
            playtimeSeconds: totalSeconds,
            matchesPlayed: matches.length,
            pretty: formatPlaytime(totalSeconds),
        };
    } catch (error) {
        logger.error(
            "Models > hours > Error fetching summoner playtime",
            error
        );
        throw error;
    }
}
