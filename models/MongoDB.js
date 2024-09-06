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

async function getNumSummoners() {
  const collection = db.collection("discord_servers");

  // Perform the aggregation to count the total number of summoners
  const result = await collection
    .aggregate([
      {
        // Match documents that have a summoners array
        $match: {
          summoners: { $exists: true, $type: "array" },
        },
      },
      {
        // Project the count of summoners in each document
        $project: {
          summonerCount: { $size: "$summoners" },
        },
      },
      {
        // Sum all the summoner counts
        $group: {
          _id: null,
          totalSummoners: { $sum: "$summonerCount" },
        },
      },
    ])
    .toArray();

  // Return the total count of summoners if available, otherwise 0
  if (result.length > 0) {
    return result[0].totalSummoners;
  } else {
    return 0;
  }
}

module.exports = {
  getNumGuilds,
  getNumCommandsSent,
  getNumSummoners,
};
