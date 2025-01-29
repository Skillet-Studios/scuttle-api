import { getDB } from "../utils/db.js";
import { Long } from "mongodb";

/**
 * Gets the total number of summoners across all guilds.
 *
 * @returns {Promise<number>} The total count of summoners.
 */
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

/**
 * Gets all summoners for a specific guild ID.
 *
 * @param {string} guildId - The guild ID (as a string).
 * @returns {Promise<Array<object>>} An array of summoner objects, or an empty array if none exist.
 */
export async function getSummonersByGuildId(guildId) {
    try {
        const db = await getDB();
        const collection = db.collection("discord_servers");

        // Convert string guildId to Long before query, if needed
        const result = await collection.findOne({ guild_id: Long.fromString(guildId) });

        return result && result.summoners ? result.summoners : [];
    } catch (error) {
        console.error("Error fetching summoners by guild ID:", error);
        throw new Error("Database query failed");
    }
}

/**
 * Updates the 'last_cached' timestamp for a summoner in the 'cached_match_data_timestamps'
 * collection via an upsert operation.
 *
 * @param {{ name: string, puuid: string }} summoner - Summoner data containing name and PUUID.
 * @returns {Promise<any>} The result of the MongoDB update operation.
 */
export async function updateCachedTimestamp(summoner) {
    try {
        const db = await getDB();
        const collection = db.collection("cached_match_data_timestamps");

        const now = new Date();
        const query = { puuid: summoner.puuid };
        const update = {
            $set: {
                last_cached: now,
            },
            $setOnInsert: {
                name: summoner.name,
                puuid: summoner.puuid,
            },
        };

        // Perform an upsert
        const result = await collection.updateOne(query, update, { upsert: true });

        if (result.upsertedId) {
            console.log(`Inserted a new last_cached document for ${summoner.name}`);
        } else {
            console.log(`Modified last_cached document for ${summoner.name}`);
        }
        return result;
    } catch (error) {
        console.error("Error updating cached timestamp:", error);
        throw new Error("Database query failed");
    }
}

/**
 * Checks if the summoner's match data has been cached within a given date range (in days).
 *
 * @param {{ name: string, puuid: string }} summoner - Summoner with name & PUUID.
 * @param {number} [range=1] - Number of days to look back from now.
 * @returns {Promise<boolean>} True if the last_cached date is within [now - range, now], else false.
 */
export async function checkIfCachedWithinRange(summoner, range = 1) {
    try {
        const db = await getDB();
        const collection = db.collection("cached_match_data_timestamps");

        const now = new Date();
        // The earliest acceptable time
        const lowerRange = new Date(now);
        lowerRange.setDate(now.getDate() - range);

        // Look for an existing timestamp doc for this summoner
        const document = await collection.findOne({ puuid: summoner.puuid });

        if (!document) {
            console.log(`${summoner.name} has no last cached data.`);
            return false;
        }

        // last_cached is stored in the DB; convert it to a Date object
        const lastCachedDate = new Date(document.last_cached);

        // Check if last_cached is between lowerRange and now
        if (lastCachedDate > lowerRange && lastCachedDate < now) {
            console.log(
                `${summoner.name}'s match data has been cached within the last ${range} day(s).`
            );
            return true;
        }
        // If outside that range, return false
        return false;
    } catch (error) {
        console.error("Error checking cached timestamp range:", error);
        throw new Error("Database query failed");
    }
}
