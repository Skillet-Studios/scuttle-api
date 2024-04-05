const { MongoClient } = require("mongodb");
var ObjectId = require("mongodb").ObjectId;

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

module.exports = { getNumGuilds, getNumCommandsSent };
