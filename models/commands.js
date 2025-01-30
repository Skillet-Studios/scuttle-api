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

/**
 * Updates the analytics count for a specific command.
 *
 * @param {string} command - The name of the command to update analytics for.
 * @returns {Promise<boolean>} - Returns `true` if the analytics were successfully updated, else `false`.
 */
export async function updateCommandAnalytics(command) {
    try {
        const db = await getDB();
        const collection = db.collection("command_analytics");

        const result = await collection.updateOne(
            { command_name: command },
            { $inc: { times_called: 1 } },
            { upsert: true }
        );

        if (result.acknowledged) {
            console.log(`Command '${command}' analytics updated.`);
            return true;
        } else {
            console.log(`Failed to update analytics for command '${command}'.`);
            return false;
        }
    } catch (error) {
        console.error(`Error updating analytics for command '${command}':`, error.message);
        return false;
    }
}