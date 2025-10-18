import prisma from "../utils/prisma.js";

/**
 * Fetches total playtime (in hours) and total matches played for a summoner over a specified time range.
 *
 * @param summonerPuuid - The summoner's PUUID.
 * @param range - The number of days to look back (e.g., 1 for daily, 7 for weekly).
 * @param queueType - (Optional) The queue type (e.g., "ranked_solo", "aram"). Defaults to "ranked_solo".
 * @returns Total hours spent, total matches played, and a pretty-formatted playtime.
 */
export async function getSummonerPlaytime(
    summonerPuuid: string,
    range: number,
    queueType: string = "ranked_solo"
): Promise<{ playtime: number; matchesPlayed: number; pretty: string }> {
    try {
        console.log(
            `🔍 Fetching playtime for ${summonerPuuid} over the last ${range} day(s).`
        );

        // Calculate the time range (lower bound in milliseconds)
        const now = new Date();
        const lowerBound = new Date();
        lowerBound.setDate(now.getDate() - range);

        // Only support ranked_solo for now (queue ID 420)
        if (queueType !== "ranked_solo") {
            console.log(
                `⚠️ Queue type '${queueType}' is not supported yet. Only 'ranked_solo' is available.`
            );
            return { playtime: 0, matchesPlayed: 0, pretty: "0h 0m 0s" };
        }

        // Fetch matches within the time range from RankedSoloMatch table
        const matches = await prisma.rankedSoloMatch.findMany({
            where: {
                summoner_puuid: summonerPuuid,
                game_start_timestamp: {
                    gte: BigInt(lowerBound.getTime()),
                },
            },
            select: {
                game_duration: true,
            },
        });

        const matchesPlayed = matches.length;

        if (!matchesPlayed) {
            console.log(
                `⚠️ No matches found for ${summonerPuuid} in the past ${range} days.`
            );
            return { playtime: 0, matchesPlayed: 0, pretty: "0h 0m 0s" };
        }

        // Calculate total playtime (game_duration is in seconds)
        let totalPlaytimeSeconds = 0;
        matches.forEach((match) => {
            totalPlaytimeSeconds += match.game_duration;
        });

        // Convert seconds to hours
        const totalPlaytimeHours = totalPlaytimeSeconds / 3600;

        // Convert to pretty format (hh:mm:ss)
        const hours = Math.floor(totalPlaytimeSeconds / 3600);
        const minutes = Math.floor((totalPlaytimeSeconds % 3600) / 60);
        const seconds = totalPlaytimeSeconds % 60;

        const prettyPlaytime = `${hours}h ${minutes}m ${seconds}s`;

        console.log(
            `✅ Total playtime for ${summonerPuuid}: ${totalPlaytimeHours.toFixed(
                2
            )} hours across ${matchesPlayed} matches.`
        );

        return {
            playtime: totalPlaytimeHours,
            matchesPlayed,
            pretty: prettyPlaytime,
        };
    } catch (error) {
        console.error("❌ Error fetching summoner playtime:", error);
        throw error;
    }
}
