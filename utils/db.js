import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

/**
 * Global MongoDB connection URI from environment variables.
 */
const uri = process.env.MONGO_DB_URI;

/**
 * Cached MongoClient instance.
 * @type {MongoClient | undefined}
 */
let client;

/**
 * Cached Database reference.
 * @type {import("mongodb").Db | undefined}
 */
let db;

/**
 * Returns the MongoDB database instance.
 *
 * - Connects once and caches the `MongoClient` and `Db` reference.
 * - Subsequent calls reuse the existing connection.
 *
 * @returns {Promise<import("mongodb").Db>} The MongoDB database object.
 */
export async function getDB() {
    if (!client) {
        client = new MongoClient(uri);
        await client.connect();
        db = client.db("Scuttle");
    }
    return db;
}
