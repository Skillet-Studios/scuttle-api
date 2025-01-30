// server.js
import express from "express";
import cors from "cors";

// routes
import guilds from "./routes/guilds.js";
import commands from "./routes/commands.js";
import summoners from "./routes/summoners.js";
import matches from "./routes/matches.js";
import stats from "./routes/stats.js";
import riot from "./routes/riot.js";
import reports from "./routes/reports.js";
import rankings from "./routes/rankings.js";

// Import the cron job initializer
import { initCronJobs } from "./jobs/index.js";

const app = express();
app.use(express.json());

// Configure CORS
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

// Mount routes
app.use("/guilds", guilds);
app.use("/commands", commands);
app.use("/summoners", summoners);
app.use("/matches", matches);
app.use("/stats", stats);
app.use("/riot", riot);
app.use("/reports", reports);
app.use("/rankings", rankings);

// Decide your server port
const PORT = process.env.PORT || 4000;

// Start the server, then initialize cron jobs.
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // If DB is already connected at this point (or doesn't need manual connect),
  // can safely init cron jobs here.
  initCronJobs();
});
