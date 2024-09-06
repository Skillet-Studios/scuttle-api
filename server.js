const express = require("express");
const cors = require("cors");
require("dotenv").config();
const MongoDB = require("./models/MongoDB");

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
      message: "Failed to fetch number of guilds. Please try again later.",
    });
  }
});

app.get("/commands", async (req, res) => {
  try {
    const numCommandsSent = await MongoDB.getNumCommandsSent();
    res.json({ numCommandsSent });
  } catch (error) {
    console.error("Error fetching number of commands sent:", error);
    res.status(500).json({
      message:
        "Failed to fetch number of commands sent. Please try again later.",
    });
  }
});

app.get("/summoners", async (req, res) => {
  try {
    const totalSummoners = await MongoDB.getNumSummoners();
    res.json({ totalSummoners });
  } catch (error) {
    console.error("Error fetching number of summoners:", error);
    res.status(500).json({
      message: "Failed to fetch number of summoners. Please try again later.",
    });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
