import { Router } from "express";
import { fetchAllSummonerMatchDataByRange } from "../models/matches.js"; // Adjust the import path as needed

const router = Router();

/**
 * GET /matches/:summonerPuuid
 * Example usage: /matches/<PUUID>?range=7&queueType=ranked_solo
 * 
 * Returns all match documents for a summoner within the specified day range.
 * If `range` is not specified, defaults to 7 days.
 * If `queueType` is provided (e.g., "ranked_solo"), only matches of that type are fetched.
 */
router.get("/:summonerPuuid", async (req, res) => {
    try {
        // Extract params and query
        const summonerPuuid = req.params.summonerPuuid;
        const range = parseInt(req.query.range, 10) || 7;
        const queueType = req.query.queueType || "ranked_solo"; // e.g., "ranked_solo"

        const matches = await fetchAllSummonerMatchDataByRange(
            summonerPuuid,
            range,
            queueType
        );

        // If no matches found, return a 404
        if (!matches) {
            return res.status(404).json({
                success: false,
                message: `No match data found for summoner PUUID '${summonerPuuid}' within the last ${range} day(s).`,
            });
        }

        // Otherwise, return the matches
        return res.json({
            success: true,
            range,
            queueType: queueType || "all",
            summonerPuuid,
            matches,
        });
    } catch (error) {
        console.error("Error with GET /matches/:summonerPuuid", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch match data. Please try again later.",
        });
    }
});

export default router;
