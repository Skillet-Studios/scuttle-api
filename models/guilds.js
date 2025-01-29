import { getDB } from "../utils/db.js";
import { ObjectId } from "mongodb";

/**
 * Gets the total number of guilds from the "guild_count" collection.
 * 
 * - Assumes there is a single document with a known _id, containing a field "num_guilds".
 * - If the document is not found, returns 0.
 *
 * @returns {Promise<number>} The total count of guilds.
 */
export async function getNumGuilds() {
    try {
        const db = await getDB();
        const collection = db.collection("guild_count");

        // Replace with actual known ObjectId
        const id = new ObjectId("660f547946c0829673957eba");
        const document = await collection.findOne({ _id: id });

        return document ? document.num_guilds : 0;
    } catch (error) {
        console.error("Error fetching total guilds:", error);
        throw new Error("Database query failed");
    }
}

/**
 * Retrieves all guild documents from the "discord_servers" collection.
 *
 * - Converts "guild_id" and "main_channel_id" (if present) to strings.
 * - Returns an array of all guild documents.
 *
 * @returns {Promise<Array<object>>} An array of guild documents.
 */
export async function getAllGuilds() {
    try {
        const db = await getDB();
        const collection = db.collection("discord_servers");

        // Get all documents
        const result = await collection.find().toArray();

        // Convert any Long values to string for convenience
        result.forEach((doc) => {
            if (doc.guild_id && doc.guild_id.toString) {
                doc.guild_id = doc.guild_id.toString();
            }

            if (doc.main_channel_id && doc.main_channel_id.toString) {
                doc.main_channel_id = doc.main_channel_id.toString();
            }
        });

        return result;
    } catch (error) {
        console.error("Error fetching total guilds:", error);
        throw new Error("Database query failed");
    }
}
