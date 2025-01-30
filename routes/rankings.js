// routes/rankings.js

import { Router } from "express";
import { fetchRankings } from "../models/rankings.js";

const router = Router();

/**
 * GET /rankings
 * Example usage: /rankings?guildId=123456789012345678&startDate=2023-10-01&limit=5&queueType=ranked_solo
 * 
 * Retrieves the top summoners by stat within a specific timeframe for a given guild.
 * 
 * Query Parameters:
 * - guildId (string, required): The Discord guild ID.
 * - startDate (string, required): The start date in YYYY-MM-DD format.
 * - limit (number, optional): The number of top summoners to retrieve per stat. Defaults to 5.
 * - queueType (string, optional): The queue type to filter matches. Defaults to "ranked_solo".
 */
router.get("/", async (req, res) => {
    try {
        const { guildId, startDate, limit = 5, queueType = "ranked_solo" } = req.query;

        // Validate required parameters
        if (!guildId || !startDate) {
            return res.status(400).json({
                success: false,
                message: "Missing required query parameters: guildId and startDate.",
            });
        }

        // Parse startDate
        const parsedDate = new Date(startDate);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid startDate format. Please use YYYY-MM-DD.",
            });
        }

        // Ensure limit is a positive integer
        const parsedLimit = parseInt(limit, 10);
        if (isNaN(parsedLimit) || parsedLimit <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid limit. It must be a positive integer.",
            });
        }

        // Fetch rankings
        const rankings = await fetchRankings(guildId, parsedDate, parsedLimit, queueType);

        if (!rankings) {
            return res.status(404).json({
                success: false,
                message: "Failed to fetch rankings. Please ensure the guildId and queueType are correct.",
            });
        }

        return res.status(200).json({
            success: true,
            guildId,
            startDate: parsedDate.toISOString(),
            limit: parsedLimit,
            queueType,
            rankings,
        });
    } catch (error) {
        console.error("Error with GET /rankings", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch rankings. Please try again later.",
        });
    }
});

export default router;
