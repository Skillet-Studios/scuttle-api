import { Router, Request, Response } from "express";
import { getSummonerPlaytime } from "../models/hours.js";

const router = Router();

/**
 * @route GET /hours/:summonerPuuid
 * @desc Fetches total playtime and match count for a given summoner within a specified time range.
 * @query {string} queueType (Optional) - The type of queue (e.g., ranked_solo, aram). Defaults to "ranked_solo".
 * @query {number} range - The number of days to look back (e.g., 1 for daily, 7 for weekly).
 */
router.get("/:summonerPuuid", async (req: Request, res: Response) => {
    try {
        const { summonerPuuid } = req.params;
        const { queueType = "ranked_solo", range } = req.query;

        if (!range) {
            return res
                .status(400)
                .json({ message: "Missing required 'range' query parameter." });
        }

        const { playtime, matchesPlayed, pretty } = await getSummonerPlaytime(
            summonerPuuid,
            Number(range),
            queueType as string
        );

        return res.json({
            summonerPuuid,
            queueType,
            playtime, // Numeric value in hours
            matchesPlayed,
            pretty, // Formatted string (e.g., "32h 25m 02s")
        });
    } catch (error) {
        console.error("❌ Error in GET /hours:", error);
        return res.status(500).json({
            message: "Failed to fetch playtime data. Please try again later.",
        });
    }
});

export default router;
