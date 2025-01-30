import { Router } from "express";
import { getNumCommandsSent, updateCommandAnalytics } from "../models/commands.js";

/**
 * Express router for "commands" related endpoints.
 */
const router = Router();

/**
 * GET /commands/count
 * Returns the total number of commands sent.
 *
 * Example Request:
 * GET /commands/count
 *
 * Response:
 * 200 OK - A single integer indicating the total commands sent.
 */
router.get("/count", async (req, res) => {
    try {
        const totalCommands = await getNumCommandsSent();
        res.json(totalCommands);
    } catch (error) {
        console.error("Error with GET /commands/count", error);
        res.status(500).json({
            message: "Failed to fetch number of commands sent. Please try again later.",
        });
    }
});

/**
 * POST /commands/analytics/count
 * Expects JSON body: { "command": "command_name" }
 *
 * Updates the analytics count for a specific command.
 */
router.post("/analytics/count", async (req, res) => {
    try {
        const { command } = req.body;

        // Validate input
        if (!command) {
            return res.status(400).json({
                success: false,
                message: "Missing required field: command.",
            });
        }

        // Call the updateCommandAnalytics function
        const success = await updateCommandAnalytics(command);

        if (success) {
            return res.status(200).json({
                success: true,
                message: `Analytics for command '${command}' updated successfully.`,
            });
        } else {
            return res.status(500).json({
                success: false,
                message: `Failed to update analytics for command '${command}'.`,
            });
        }
    } catch (error) {
        console.error("Error with POST /commands/analytics/count", error);
        res.status(500).json({
            success: false,
            message: "Failed to update command analytics. Please try again later.",
        });
    }
});


export default router;
