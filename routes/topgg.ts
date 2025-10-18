import { Router, Request, Response } from "express";
import { updateStats } from "../models/topgg.js";

const router = Router();

/**
 * PUT /topgg/stats
 *
 * Example usage:
 * PUT /topgg/stats
 * Body:
 * {
 *   "guildCount": 150,
 *   "shardCount": 5
 * }
 *
 * Updates the Top.gg stats for the bot.
 *
 * Body Parameters:
 * - guildCount (number, required): The number of guilds the bot is in.
 * - shardCount (number, required): The number of shards the bot is using.
 */
router.put("/stats", async (req: Request, res: Response) => {
    try {
        const { guildCount, shardCount } = req.body;

        // Input Validation
        if (guildCount === undefined || shardCount === undefined) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: guildCount and shardCount.",
            });
        }

        if (typeof guildCount !== "number" || typeof shardCount !== "number") {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid data types: guildCount and shardCount must be numbers.",
            });
        }

        // Optional: Additional validation (e.g., non-negative numbers)
        if (guildCount < 0 || shardCount < 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid values: guildCount and shardCount must be non-negative.",
            });
        }

        // Call the updateStats function
        await updateStats(guildCount, shardCount);

        // Respond with success
        return res.status(200).json({
            success: true,
            message: "Successfully updated Top.gg stats.",
            guildCount,
            shardCount,
        });
    } catch (error: any) {
        console.error("Error with PUT /topgg/stats:", error);

        // Determine error response based on error type
        if (error.response) {
            // The request was made, and the server responded with a status code outside 2xx
            return res.status(error.response.status).json({
                success: false,
                message: `Top.gg API Error: ${
                    error.response.data.message || "Unknown error."
                }`,
            });
        } else if (error.request) {
            // The request was made, but no response was received
            return res.status(503).json({
                success: false,
                message: "No response from Top.gg API. Please try again later.",
            });
        } else {
            // Something else happened while setting up the request
            return res.status(500).json({
                success: false,
                message:
                    "An unexpected error occurred while updating Top.gg stats.",
            });
        }
    }
});

export default router;
