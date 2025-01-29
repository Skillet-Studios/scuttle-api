import { getDB } from "../utils/db.js";

export async function getNumCommandsSent() {
    try {
        const db = await getDB();
        const collection = db.collection("command_analytics");

        const result = await collection
            .aggregate([
                { $group: { _id: null, totalTimesSent: { $sum: "$times_called" } } },
            ])
            .toArray();

        return result.length > 0 ? result[0].totalTimesSent : 0;
    } catch (error) {
        console.error("Error fetching total commands sent:", error);
        throw new Error("Database query failed");
    }
}
