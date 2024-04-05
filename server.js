const express = require("express");
const cors = require("cors");
require("dotenv").config();
const MongoDB = require("./models/MongoDB");
const Utils = require("./models/Utils");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
    cors({
        credentials: true,
        origin: [
            "http://localhost:3000",
            /\.scuttle\.gg%/,
            "https://www.scuttle.gg",
            "https://api.scuttle.gg",
            "https://scuttle-website-aa38f423d608.herokuapp.com",
        ],
    })
);

app.get("/api", (req, res) => {
    res.json({ message: "Welcome to your Express server!" });
});

app.get("/guilds", async (req, res) => {
    try {
        const numGuilds = await MongoDB.getNumGuilds();
        res.json({ numGuilds });
    } catch (error) {
        console.error("Error fetching number of guilds:", error);
        res.status(500).json({
            message:
                "Failed to fetch number of guilds. Please try again later.",
        });
    }
});

app.get("/commands", async (req, res) => {
    try {
        const numCommandsSent = await MongoDB.getNumCommandsSent();
        res.json({ numCommandsSent });
    } catch (error) {
        console.error("Error fetching number of commands sent:", error);
        // Respond with a 500 Internal Server Error status code and error message
        res.status(500).json({
            message:
                "Failed to fetch number of commands sent. Please try again later.",
        });
    }
});

app.get("/stats/weekly/:summonerPuuid", async (req, res) => {
    const { summonerPuuid } = req.params;
    try {
        const today = new Date();
        let daysSinceMonday = today.getDay() - 1; // Assuming week starts on Monday
        if (daysSinceMonday < 0) {
            // Adjust for Sunday
            daysSinceMonday = 6;
        }

        const matchesData = await MongoDB.fetchAllSummonerMatchDataByRange(
            summonerPuuid,
            daysSinceMonday
        );
        const stats = Utils.calculateStats(summonerPuuid, matchesData);

        if (stats) {
            res.json(stats);
        } else {
            res.status(404).json({
                message: "No data found for the given summoner.",
            });
        }
    } catch (error) {
        console.error("Error fetching summoner stats:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.get("/stats/monthly/:summonerPuuid", async (req, res) => {
    const { summonerPuuid } = req.params;
    try {
        const today = new Date();
        const daysSinceBeginningOfMonth = today.getDate() - 1; // Subtract 1 so the first day of the month is 0

        const matchesData = await MongoDB.fetchAllSummonerMatchDataByRange(
            summonerPuuid,
            daysSinceBeginningOfMonth
        );
        const stats = Utils.calculateStats(summonerPuuid, matchesData);

        if (stats) {
            res.json(stats);
        } else {
            res.status(404).json({
                message: "No data found for the given summoner.",
            });
        }
    } catch (error) {
        console.error("Error fetching summoner stats:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
