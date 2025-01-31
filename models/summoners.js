import { getDB } from "../utils/db.js";
import { Long } from "mongodb";
import { fetchSummonerPuuidByRiotId, getSummonerRegion } from "./riot.js";

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
                {
                    $group: {
                        _id: null,
                        totalSummoners: { $sum: "$summonerCount" },
                    },
                },
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
        const result = await collection.findOne({
            guild_id: Long.fromString(guildId),
        });

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
        const result = await collection.updateOne(query, update, {
            upsert: true,
        });

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
            return true;
        }
        // If outside that range, return false
        return false;
    } catch (error) {
        console.error("Error checking cached timestamp range:", error);
        throw new Error("Database query failed");
    }
}

/**
 * Adds a summoner to a specific Guild.
 *
 * - Validates the Riot ID format and existence.
 * - Retrieves the summoner's PUUID and region.
 * - Inserts the summoner into the `summoners` array of the specified guild.
 *
 * @param {string} summonerRiotId - The summoner's Riot ID (e.g., "GameName #Tag").
 * @param {string} guildId - The Discord guild ID to which the summoner should be added.
 * @returns {Promise<boolean>} - Returns `true` if the summoner was successfully added, else `false`.
 */
export async function addSummoner(summonerRiotId, guildId) {
    try {
        // Fetch the PUUID using the Riot ID
        const puuid = await fetchSummonerPuuidByRiotId(summonerRiotId);
        if (!puuid) {
            console.log(
                `Failed to add summoner ${summonerRiotId} to database. Make sure this is a real Riot account.`
            );
            return false;
        }

        // Determine the summoner's region
        const region = await getSummonerRegion(puuid);
        if (!region) {
            console.log(
                `Failed to determine region for summoner '${summonerRiotId}' with PUUID '${puuid}'.`
            );
            return false;
        }

        const db = await getDB();
        const collection = db.collection("discord_servers");

        // Prepare the summoner object to be added
        const summonerData = {
            name: summonerRiotId,
            puuid: puuid,
            region: region,
        };

        // Update the guild document by adding the summoner to the summoners array
        const result = await collection.updateOne(
            { guild_id: Long.fromString(guildId) },
            { $addToSet: { summoners: summonerData } },
            { upsert: true } // Creates a new document if one doesn't exist
        );

        if (result.acknowledged) {
            if (result.upsertedId) {
                console.log(
                    `Inserted a new guild document and added summoner '${summonerRiotId}' to Guild with ID ${guildId}.`
                );
            } else {
                console.log(
                    `Successfully added summoner '${summonerRiotId}' to Guild with ID ${guildId}.`
                );
            }
            return true;
        } else {
            console.log(
                `Failed to insert summoner '${summonerRiotId}' into Guild with ID ${guildId}.`
            );
            return false;
        }
    } catch (error) {
        console.error(
            `Error adding summoner '${summonerRiotId}' to Guild '${guildId}':`,
            error.message
        );
        return false;
    }
}

/**
 * Removes a summoner from a specific Guild.
 *
 * @param {string} summonerRiotId - The summoner's Riot ID (e.g., "GameName #Tag").
 * @param {string} guildId - The Discord guild ID from which the summoner should be removed.
 * @returns {Promise<boolean>} - Returns `true` if the summoner was successfully removed, else `false`.
 */
export async function removeSummoner(summonerRiotId, guildId) {
    try {
        guildId = Long.fromString(guildId);
        const db = await getDB();
        const collection = db.collection("discord_servers");

        // Remove summoner from the summoners array
        const result = await collection.updateOne(
            { guild_id: guildId },
            { $pull: { summoners: { name: summonerRiotId } } }
        );

        if (result.acknowledged) {
            console.log(
                `Document for summoner '${summonerRiotId}' was successfully removed from Guild with id ${guildId}`
            );
            return true;
        } else {
            console.log(
                `Failed to remove document from MongoDB for summoner '${summonerRiotId}'.`
            );
            return false;
        }
    } catch (error) {
        console.error(
            `Error removing summoner '${summonerRiotId}' from Guild '${guildId}':`,
            error.message
        );
        return false;
    }
}

/**
 * Retrieves a list of unique summoners across all guilds in the database.
 *
 * - Uses MongoDB aggregation to efficiently filter, flatten, and deduplicate summoners.
 * - Groups summoners by their `puuid`, keeping only the first encountered name.
 * - Eliminates redundant processing by handling everything at the database level.
 *
 * @returns {Promise<Array<{name: string, puuid: string}>>}
 *   - Returns an array of unique summoner objects in the format:
 *     ```json
 *     [
 *       { "name": "SummonerName1", "puuid": "some-puuid-123" },
 *       { "name": "SummonerName2", "puuid": "some-puuid-456" }
 *     ]
 *     ```
 * @throws {Error} If a database query fails.
 */
export async function getUniqueSummoners() {
    try {
        const db = await getDB();
        const collection = db.collection("discord_servers");

        // MongoDB Aggregation Pipeline
        const pipeline = [
            { $match: { summoners: { $exists: true, $ne: [] } } }, // Filter guilds with summoners
            { $unwind: "$summoners" }, // Flatten the summoners array
            {
                $group: {
                    _id: "$summoners.puuid", // Group by unique puuid
                    name: { $first: "$summoners.name" }, // Take the first encountered name
                    puuid: { $first: "$summoners.puuid" },
                },
            },
            { $project: { _id: 0, name: 1, puuid: 1 } }, // Format output
        ];

        // Execute Aggregation
        const uniqueSummoners = await collection.aggregate(pipeline).toArray();
        return uniqueSummoners;
    } catch (error) {
        console.error("❌ Error fetching unique summoners:", error);
        throw new Error("Database query failed");
    }
}
