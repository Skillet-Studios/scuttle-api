import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_DB_URI;
let client;
let db;

export async function getDB() {
    if (!client) {
        client = new MongoClient(uri);
        await client.connect();
        db = client.db("league_discord_bot");
    }
    return db;
}
