import { getDB } from "../utils/db.js";
import { ObjectId } from "mongodb";

export async function getNumGuilds() {
    try {
        const db = await getDB();
        const collection = db.collection("guild_count");

        const id = new ObjectId("660f547946c0829673957eba");
        const document = await collection.findOne({ _id: id });

        return document ? document.num_guilds : 0;
    } catch (error) {
        console.error("Error fetching total guilds:", error);
        throw new Error("Database query failed");
    }
}
