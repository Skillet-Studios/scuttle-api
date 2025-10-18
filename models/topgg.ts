import axios from "axios";

/**
 * Updates Top.gg stats with the provided guild count and shard count.
 *
 * @param guildCount - The number of guilds the bot is in.
 * @param shardCount - The number of shards the bot is using.
 * @returns Promise<void>
 */
export async function updateStats(
    guildCount: number,
    shardCount: number
): Promise<void> {
    // Retrieve TOPGG credentials from environment variables
    const TOPGG_ID = process.env.TOPGG_ID;
    const TOPGG_TOKEN = process.env.TOPGG_TOKEN;

    // Validate that TOPGG credentials are available
    if (!TOPGG_ID || !TOPGG_TOKEN) {
        console.error(
            "TOPGG_ID and TOPGG_TOKEN must be set in environment variables."
        );
        return;
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

    try {
        const response = await axios.post(url, data, { headers });

        console.log(
            `Successfully updated top.gg stats. Server count=${guildCount} and Shard count=${shardCount}`
        );
        console.log(`Status Code: ${response.status}`);
    } catch (error: any) {
        if (error.response) {
            // Server responded with a status other than 2xx
            console.error(
                `Top.gg API responded with status ${error.response.status}: ${error.response.data}`
            );
        } else if (error.request) {
            // No response received from Top.gg
            console.error("No response received from Top.gg API:", error.request);
        } else {
            // Error setting up the request
            console.error("Error setting up Top.gg API request:", error.message);
        }
    }
}
