import { getDB } from "../utils/db.js";

export async function getNumSummoners() {
    try {
        const db = await getDB();
        const collection = db.collection("discord_servers");

        const result = await collection
            .aggregate([
                { $match: { summoners: { $exists: true, $type: "array" } } },
                { $project: { summonerCount: { $size: "$summoners" } } },
                { $group: { _id: null, totalSummoners: { $sum: "$summonerCount" } } },
            ])
            .toArray();

        return result.length > 0 ? result[0].totalSummoners : 0;
    } catch (error) {
        console.error("Error fetching total summoners:", error);
        throw new Error("Database query failed");
    }
}
