// server.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { verifyApiKey } from "./middlewares/auth.js";

// routes
import guilds from "./routes/guilds.js";
import commands from "./routes/commands.js";
import summoners from "./routes/summoners.js";
import matches from "./routes/matches.js";
import stats from "./routes/stats.js";
import riot from "./routes/riot.js";
import reports from "./routes/reports.js";
import rankings from "./routes/rankings.js";
import topgg from "./routes/topgg.js";
import hours from "./routes/hours.js";

// Import the cron job initializer
import { initCronJobs } from "./jobs/index.js";

dotenv.config();

const app = express();
app.use(express.json());

// Configure CORS
app.use(
    cors({
        credentials: true,
        origin: [
            "http://localhost:3000",
            /\.scuttle\.gg$/,
            "https://www.scuttle.gg",
            "https://api.scuttle.gg",
            "https://scuttle-website-aa38f423d608.herokuapp.com",
        ],
    })
);

// Apply API key verification middleware globally
app.use(verifyApiKey);

// Mount routes
app.use("/guilds", guilds);
app.use("/commands", commands);
app.use("/summoners", summoners);
app.use("/matches", matches);
app.use("/stats", stats);
app.use("/riot", riot);
app.use("/reports", reports);
app.use("/rankings", rankings);
app.use("/topgg", topgg);
app.use("/hours", hours);

// Decide your server port
const PORT = process.env.PORT || 4000;

// Start the server, then initialize cron jobs.
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    initCronJobs();
});
