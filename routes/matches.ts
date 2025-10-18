import { Router, Request, Response } from "express";
import {
    fetchAllSummonerMatchDataByRange,
    fetchAllSummonerMatchDataSinceDate,
} from "../models/matches.js";

const router = Router();

/**
 * GET /matches/:summonerPuuid
 * Example usage: /matches/<PUUID>?range=7
 *
 * Returns all ranked solo match documents for a summoner within the specified day range.
 * If `range` is not specified, defaults to 7 days.
 */
router.get("/:summonerPuuid", async (req: Request, res: Response) => {
    try {
        // Extract params and query
        const summonerPuuid = req.params.summonerPuuid;
        const range = parseInt(req.query.range as string, 10) || 7;

        const matches = await fetchAllSummonerMatchDataByRange(
            summonerPuuid,
            range
        );

        // If no matches found, return a 404
        if (!matches) {
            return res.status(404).json({
                success: false,
                message: `No ranked solo match data found for summoner PUUID '${summonerPuuid}' within the last ${range} day(s).`,
            });
        }

        // Otherwise, return the matches
        return res.json({
            success: true,
            range,
            queueType: "ranked_solo",
            summonerPuuid,
            matches,
        });
    } catch (error) {
        console.error("Error with GET /matches/:summonerPuuid", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch match data. Please try again later.",
        });
    }
});

/**
 * GET /matches/:summonerPuuid/since
 * Example usage: /matches/<PUUID>/since?startDate=2023-10-01
 *
 * Returns all ranked solo match documents for a summoner from the specified start date until now.
 * Expects a `startDate` query parameter in YYYY-MM-DD format.
 */
router.get("/:summonerPuuid/since", async (req: Request, res: Response) => {
    try {
        // Extract params and query
        const summonerPuuid = req.params.summonerPuuid;
        const { startDate } = req.query;

        // Validate that startDate is provided
        if (!startDate) {
            return res.status(400).json({
                success: false,
                message:
                    "Missing required query parameter: startDate (format: YYYY-MM-DD).",
            });
        }

        // Parse the startDate
        const parsedDate = new Date(startDate as string);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid startDate format. Please use YYYY-MM-DD.",
            });
        }

        const matches = await fetchAllSummonerMatchDataSinceDate(
            summonerPuuid,
            parsedDate
        );

        // If no matches found, return a 404
        if (!matches) {
            return res.status(404).json({
                success: false,
                message: `No ranked solo match data found for summoner PUUID '${summonerPuuid}' since ${parsedDate.toISOString()}.`,
            });
        }

        // Otherwise, return the matches
        return res.json({
            success: true,
            startDate: parsedDate.toISOString(),
            queueType: "ranked_solo",
            summonerPuuid,
            matches,
        });
    } catch (error) {
        console.error("Error with GET /matches/:summonerPuuid/since", error);
        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch match data since the specified date. Please try again later.",
        });
    }
});

export default router;
