const { MongoClient } = require("mongodb");
var ObjectId = require("mongodb").ObjectId;
require("dotenv").config();

const uri = process.env.MONGO_DB_URI;
const client = new MongoClient(uri);
const db = client.db("league_discord_bot");

async function getNumGuilds() {
    const collection = db.collection("guild_count");

    const id = new ObjectId("660f547946c0829673957eba");
    const document = await collection.findOne({
        _id: id,
    });
    return document.num_guilds;
}

async function getNumCommandsSent() {
    const collection = db.collection("command_analytics");

    const result = await collection
        .aggregate([
            {
                $group: {
                    _id: null,
                    totalTimesSent: { $sum: "$times_called" },
                },
            },
        ])
        .toArray();

    if (result.length > 0) {
        return result[0].totalTimesSent;
    } else {
        return 0;
    }
}

async function fetchAllSummonerMatchDataByRange(summonerPuuid, range = 7) {
    console.log(
        `Fetching all matches for ${summonerPuuid} within the last ${range} days`
    );
    const collection = db.collection("cached_match_data");

    const now = new Date();
    const lowerRange = new Date(now.getTime() - range * 24 * 60 * 60 * 1000);
    const lowerRangeEpoch = lowerRange.getTime();

    await collection.createIndex({ summoner_puuid: 1 });
    await collection.createIndex({ "info.gameStartTimestamp": 1 });

    const query = {
        summoner_puuid: summonerPuuid,
        "info.gameStartTimestamp": { $gte: lowerRangeEpoch },
    };

    const documents = await collection.find(query).toArray();

    if (documents.length === 0) {
        console.log(
            `No summoner match data found for ${summonerPuuid} within the last ${range} days.`
        );
        return null;
    } else {
        return documents;
    }
}

module.exports = {
    getNumGuilds,
    getNumCommandsSent,
    fetchAllSummonerMatchDataByRange,
};
