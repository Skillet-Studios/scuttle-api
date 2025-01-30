import { getDB } from "../utils/db.js";
import { Long, ObjectId } from "mongodb";

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

/**
 * Adds a new Guild to the "discord_servers" collection.
 *
 * @param {string} guildName - The name of the guild.
 * @param {string} guildId - The Discord guild ID (as a string).
 * @returns {Promise<boolean>} - Returns `true` if the guild was successfully added, else `false`.
 */
export async function addGuild(guildName, guildId) {
    try {
        const db = await getDB();
        const collection = db.collection("discord_servers");

        // Check if guild_id already exists
        const existingGuild = await collection.findOne({ guild_id: Long.fromString(guildId) });
        if (existingGuild) {
            console.log(`A document with the guild_id '${guildId}' already exists.`);
            return false;
        }

        // Create the new guild document
        const document = {
            name: guildName,
            guild_id: Long.fromString(guildId),
            date_added: new Date(),
        };

        const result = await collection.insertOne(document);

        if (result.acknowledged) {
            console.log(
                `Document for guild '${guildName}' was successfully inserted into MongoDB with _id: ${result.insertedId}`
            );
            return true;
        } else {
            console.log(`Failed to insert document into MongoDB for guild '${guildName}'.`);
            return false;
        }
    } catch (error) {
        console.error(`Error adding guild '${guildName}' with ID '${guildId}':`, error.message);
        return false;
    }
}

/**
 * Sets the main channel for a specific Guild.
 *
 * The main channel is where automatic messages will be sent.
 *
 * @param {string} guildId - The Discord guild ID (as a string).
 * @param {string} channelId - The Discord channel ID to set as the main channel.
 * @returns {Promise<boolean>} - Returns `true` if the main channel was successfully set, else `false`.
 */
export async function setMainChannel(guildId, channelId) {
    try {
        const db = await getDB();
        const collection = db.collection("discord_servers");

        // Update the main_channel_id for the specified guild
        const result = await collection.updateOne(
            { guild_id: Long.fromString(guildId) },
            { $set: { main_channel_id: Long.fromString(channelId) } },
            { upsert: true } // Creates a new document if one doesn't exist
        );

        if (result.modifiedCount > 0 || result.upsertedId) {
            console.log(`Main channel for Guild: ${guildId} updated to ${channelId}.`);
            return true;
        } else {
            console.log(`Main channel for guild ${guildId} not changed.`);
            return false;
        }
    } catch (error) {
        console.error(`Error setting main channel for Guild '${guildId}':`, error.message);
        return false;
    }
}

/**
 * Retrieves the main_channel_id for a specific Guild.
 *
 * @param {string} guildId - The Discord guild ID (as a string).
 * @returns {Promise<string|null>} - Returns the main_channel_id if found, else null.
 */
export async function getMainChannel(guildId) {
    try {
        const db = await getDB();
        const collection = db.collection("discord_servers");

        // Find the guild document by guild_id
        const document = await collection.findOne({ guild_id: Long.fromString(guildId) });

        if (document) {
            const mainChannelId = document.main_channel_id ? document.main_channel_id.toString() : null;
            return mainChannelId;
        } else {
            console.log(`Document with Guild ID ${guildId} not found.`);
            return null;
        }
    } catch (error) {
        console.error(`Error retrieving main channel for Guild '${guildId}':`, error.message);
        throw new Error("Database query failed");
    }
}

/**
 * Updates the guild count in the "guild_count" collection.
 *
 * @param {number} count - The new total number of guilds.
 * @returns {Promise<boolean>} - Returns `true` if the update was successful, else `false`.
 */
export async function updateGuildCount(count) {
    try {
        const db = await getDB();
        const collection = db.collection("guild_count");

        const result = await collection.updateOne(
            { _id: new ObjectId("660f547946c0829673957eba") },
            {
                $set: {
                    num_guilds: count,
                    last_updated: new Date()
                }
            },
            { upsert: true }
        );

        if (result.acknowledged) {
            console.log(`Guild count updated to ${count}.`);
            return true;
        } else {
            console.log(`Failed to update guild count to ${count}.`);
            return false;
        }
    } catch (error) {
        console.error(`Error updating guild count:`, error.message);
        return false;
    }
}

/**
 * Retrieves guild data by its Discord guild ID.
 *
 * @param {string} guildId - The Discord guild ID as a string.
 * @returns {Promise<Object|null>} - Returns the guild document if found, else null.
 */
export async function getGuildById(guildId) {
    try {
        const db = await getDB();
        const collection = db.collection("discord_servers");

        // Convert guildId to Long if necessary
        const guildIdLong = Long.fromString(guildId);

        // Find the guild document by guild_id
        const document = await collection.findOne({ guild_id: guildIdLong });

        if (document) {
            // Optionally convert Long fields to string for easier handling
            if (document.guild_id && document.guild_id.toString) {
                document.guild_id = document.guild_id.toString();
            }
            if (document.main_channel_id && document.main_channel_id.toString) {
                document.main_channel_id = document.main_channel_id.toString();
            }
            return document;
        } else {
            console.log(`Guild with ID ${guildId} not found.`);
            return null;
        }
    } catch (error) {
        console.error(`Error retrieving guild with ID '${guildId}':`, error.message);
        throw new Error("Database query failed");
    }
}