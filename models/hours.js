import { getDB } from "../utils/db.js";
import { QUEUE_ID_MAP } from "./matches.js";

/**
 * Fetches total playtime (in hours) and total matches played for a summoner over a specified time range.
 *
 * @param {string} summonerPuuid - The summoner's PUUID.
 * @param {number} range - The number of days to look back (e.g., 1 for daily, 7 for weekly).
 * @param {string} [queueType="ranked_solo"] - (Optional) The queue type (e.g., "ranked_solo", "aram").
 * @returns {Promise<{ playtime: number, matchesPlayed: number, pretty: string }>} - Total hours spent, total matches played, and a pretty-formatted playtime.
 */
export async function getSummonerPlaytime(
    summonerPuuid,
    range,
    queueType = "ranked_solo"
) {
    try {
        const db = await getDB();
        const collection = db.collection("cached_match_data");

        console.log(
            `🔍 Fetching playtime for ${summonerPuuid} over the last ${range} day(s).`
        );

        // Calculate the time range (lower bound in milliseconds)
        const now = new Date();
        const lowerBound = new Date(
            now.setDate(now.getDate() - range)
        ).getTime();

        // Construct query to filter matches by summoner and time range
        const query = {
            summoner_puuid: summonerPuuid,
            "info.gameStartTimestamp": { $gte: lowerBound },
        };

        // If a queueType is provided, map it to Riot's queueId (default: ranked_solo)
        if (queueType && QUEUE_ID_MAP[queueType]) {
            query["info.queueId"] = QUEUE_ID_MAP[queueType];
        }

        // Fetch matches within the time range
        const matches = await collection.find(query).toArray();
        const matchesPlayed = matches.length;

        if (!matchesPlayed) {
            console.log(
                `⚠️ No matches found for ${summonerPuuid} in the past ${range} days.`
            );
            return { playtime: 0, matchesPlayed: 0, pretty: "0h 0m 0s" };
        }

        // Calculate total playtime
        let totalPlaytimeMs = 0;
        matches.forEach((match) => {
            totalPlaytimeMs +=
                match.info.gameEndTimestamp - match.info.gameStartTimestamp;
        });

        // Convert milliseconds to hours
        const totalPlaytimeHours = totalPlaytimeMs / (1000 * 60 * 60);

        // Convert to pretty format (hh:mm:ss)
        const totalSeconds = Math.floor(totalPlaytimeMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

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
