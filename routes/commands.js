import { Router } from "express";
import { getNumCommandsSent } from "../models/commands.js";

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

export default router;
