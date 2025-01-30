import { Router } from "express";
import { fetchAllSummonerMatchDataByRange, fetchAllSummonerMatchDataSinceDate } from "../models/matches.js"; // Adjust the import path as needed

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

/**
 * GET /matches/:summonerPuuid/since
 * Example usage: /matches/<PUUID>/since?startDate=2023-10-01&queueType=ranked_solo
 * 
 * Returns all match documents for a summoner from the specified start date until now.
 * Expects a `startDate` query parameter in YYYY-MM-DD format.
 * If `queueType` is provided (e.g., "ranked_solo"), only matches of that type are fetched.
 */
router.get("/:summonerPuuid/since", async (req, res) => {
    try {
        // Extract params and query
        const summonerPuuid = req.params.summonerPuuid;
        const { startDate, queueType = "ranked_solo" } = req.query;

        // Validate that startDate is provided
        if (!startDate) {
            return res.status(400).json({
                success: false,
                message: "Missing required query parameter: startDate (format: YYYY-MM-DD).",
            });
        }

        // Parse the startDate
        const parsedDate = new Date(startDate);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid startDate format. Please use YYYY-MM-DD.",
            });
        }

        const matches = await fetchAllSummonerMatchDataSinceDate(
            summonerPuuid,
            parsedDate,
            queueType
        );

        // If no matches found, return a 404
        if (!matches) {
            return res.status(404).json({
                success: false,
                message: `No match data found for summoner PUUID '${summonerPuuid}' since ${parsedDate.toISOString()}.`,
            });
        }

        // Otherwise, return the matches
        return res.json({
            success: true,
            startDate: parsedDate.toISOString(),
            queueType: queueType || "all",
            summonerPuuid,
            matches,
        });
    } catch (error) {
        console.error("Error with GET /matches/:summonerPuuid/since", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch match data since the specified date. Please try again later.",
        });
    }
});

export default router;
