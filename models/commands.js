import { getDB } from "../utils/db.js";

/**
 * Retrieves the total count of commands sent from the "command_analytics" collection.
 *
 * - Sums up the "times_called" field across all documents in "command_analytics".
 * - If no documents exist, returns 0.
 *
 * @returns {Promise<number>} The total number of commands sent.
 */
export async function getNumCommandsSent() {
    try {
        const db = await getDB();
        const collection = db.collection("command_analytics");

        // Perform an aggregation to sum the "times_called" field across all docs
        const result = await collection
            .aggregate([
                { $group: { _id: null, totalTimesSent: { $sum: "$times_called" } } },
            ])
            .toArray();

        // If the aggregation returned something, use the sum; otherwise 0
        return result.length > 0 ? result[0].totalTimesSent : 0;
    } catch (error) {
        console.error("Error fetching total commands sent:", error);
        throw new Error("Database query failed");
    }
}
