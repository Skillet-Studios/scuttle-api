import { Router } from "express";
import {
    getNumSummoners,
    getSummonersByGuildId,
    updateCachedTimestamp,
    checkIfCachedWithinRange,
} from "../models/summoners.js";

const router = Router();

/**
 * GET /summoners/count
 * Returns the total number of summoners across all guilds.
 */
router.get("/count", async (req, res) => {
    try {
        const totalSummoners = await getNumSummoners();
        res.json(totalSummoners);
    } catch (error) {
        console.error("Error with GET /summoners/count", error);
        res.status(500).json({
            message: "Failed to fetch number of summoners. Please try again later.",
        });
    }
});

/**
 * GET /summoners/guild/:guildId
 * Returns all summoners for a specific guild ID.
 */
router.get("/guild/:guildId", async (req, res) => {
    try {
        const summoners = await getSummonersByGuildId(req.params.guildId);
        res.json(summoners);
    } catch (error) {
        console.error("Error with GET /summoners/guild/:guildId", error);
        res.status(500).json({
            message: "Failed to fetch summoners by guild ID. Please try again later.",
        });
    }
});

/**
 * POST /summoners/cache/timestamp
 * Expects JSON body: { "name": "...", "puuid": "..." }
 * Updates the summoner's last_cached timestamp in the DB.
 */
router.post("/cache/timestamp", async (req, res) => {
    try {
        const summoner = req.body;
        if (!summoner || !summoner.puuid || !summoner.name) {
            return res.status(400).json({
                message: "Missing required summoner data (name, puuid).",
            });
        }

        const result = await updateCachedTimestamp(summoner);
        return res.json({
            success: true,
            message: "Cached timestamp updated successfully",
            result,
        });
    } catch (error) {
        console.error("Error with POST /summoners/cache/timestamp", error);
        res.status(500).json({
            success: false,
            message: "Failed to update cached timestamp. Please try again later.",
        });
    }
});

/**
 * GET /summoners/cache/:summonerId
 * Example usage: /summoners/cache/<PUUID>?range=1&name=VASK3N
 * Checks if the summoner's match data is cached within the specified range (in days).
 */
router.get("/cache/:summonerId", async (req, res) => {
    try {
        // Extract the summonerId (puuid) from route params
        const puuid = req.params.summonerId;
        // Default range to 1 day if not provided
        const range = parseInt(req.query.range, 10) || 1;
        // Summoner name is optional; default to 'Unknown'
        const name = req.query.name || "Unknown";

        // Construct a summoner object
        const summoner = { name, puuid };

        const isCached = await checkIfCachedWithinRange(summoner, range);

        return res.json({
            isCached,
            range,
            message: isCached
                ? `Summoner '${summoner.name}' was cached within the last ${range} day(s).`
                : `Summoner '${summoner.name}' was NOT cached within the last ${range} day(s).`,
        });
    } catch (error) {
        console.error("Error with GET /summoners/cache/:summonerId", error);
        res.status(500).json({
            success: false,
            message: "Failed to check cached timestamp. Please try again later.",
        });
    }
});

export default router;
