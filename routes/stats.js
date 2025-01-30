import { Router } from "express";
import { fetchSummonerStatsByDayRange, makePretty } from "../models/stats.js";

const router = Router();

/**
 * GET /stats/:summonerPuuid
 * Example usage: /stats/<PUUID>?range=7&queueType=ranked_solo
 *
 * Fetches a summoner's stats for all matches played in the last `range` days
 * and for an optional queueType (defaults to "ranked_solo").
 * Returns {} if not "ranked_solo" (based on our logic).
 */
router.get("/:summonerPuuid", async (req, res) => {
    try {
        const summonerPuuid = req.params.summonerPuuid;
        const range = parseInt(req.query.range, 10) || 7;
        const queueType = req.query.queueType || "ranked_solo";

        const stats = await fetchSummonerStatsByDayRange(
            summonerPuuid,
            range,
            queueType
        );

        return res.json({
            success: true,
            range,
            queueType: queueType,
            summonerPuuid,
            stats,
        });
    } catch (error) {
        console.error("Error with GET /stats/:summonerPuuid", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch summoner stats. Please try again later.",
        });
    }
});

/**
 * GET /stats/pretty/:summonerPuuid
 * Example usage: /stats/pretty/<PUUID>?range=7&queueType=ranked_solo
 *
 * Same as GET /stats/:summonerPuuid but returns data in a user-friendly
 * format using the `makePretty` method.
 * Defaults queueType to "ranked_solo" if not provided.
 */
router.get("/pretty/:summonerPuuid", async (req, res) => {
    try {
        const summonerPuuid = req.params.summonerPuuid;
        const range = parseInt(req.query.range, 10) || 7;
        const queueType = req.query.queueType || "ranked_solo";

        // Fetch stats
        const stats = await fetchSummonerStatsByDayRange(
            summonerPuuid,
            range,
            queueType
        );

        // Convert to a user-friendly format (if it's the ranked_solo stats)
        const prettyStats = makePretty(stats);

        return res.json({
            success: true,
            range,
            queueType: queueType,
            summonerPuuid,
            stats: prettyStats,
        });
    } catch (error) {
        console.error("Error with GET /stats/pretty/:summonerPuuid", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch summoner stats. Please try again later.",
        });
    }
});

export default router;
