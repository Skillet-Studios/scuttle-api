import axios from "axios";
import { logger } from "../utils/logger.js";

export async function updateStats(
    guildCount: number,
    shardCount: number
): Promise<void> {
    try {
        const TOPGG_ID = process.env.TOPGG_ID;
        const TOPGG_TOKEN = process.env.TOPGG_TOKEN;

        if (!TOPGG_ID || !TOPGG_TOKEN) {
            throw new Error(
                "TOPGG_ID and TOPGG_TOKEN must be set in environment variables"
            );
        }

        const url = `https://top.gg/api/bots/${TOPGG_ID}/stats`;
        const data = {
            server_count: guildCount,
            shard_count: shardCount,
        };
        const headers = {
            Authorization: TOPGG_TOKEN,
            "Content-Type": "application/json",
        };

        await axios.post(url, data, { headers });

        logger.info(
            `Models > topgg > Updated stats: ${guildCount} servers, ${shardCount} shards`
        );
    } catch (error) {
        logger.error(
            `Models > topgg > Error updating stats for ${guildCount} servers, ${shardCount} shards`,
            error
        );
        throw error;
    }
}
