import { Router } from "express";
import { getNumGuilds, getAllGuilds } from "../models/guilds.js";

/**
 * Express router for "guilds" related endpoints.
 */
const router = Router();

/**
 * GET /guilds
 * Returns an array of all guild documents.
 *
 * Response:
 * 200 OK - An array of guild objects.
 */
router.get("/", async (req, res) => {
    try {
        const guilds = await getAllGuilds();
        res.json(guilds);
    } catch (error) {
        console.error("Error with GET /guilds", error);
        res.status(500).json({
            message: "Failed to fetch guilds. Please try again later.",
        });
    }
});

/**
 * GET /guilds/count
 * Returns the total number of guilds.
 *
 * Response:
 * 200 OK - A single integer indicating the total guild count.
 */
router.get("/count", async (req, res) => {
    try {
        const numGuilds = await getNumGuilds();
        res.json(numGuilds);
    } catch (error) {
        console.error("Error with GET /guilds/count", error);
        res.status(500).json({
            message: "Failed to fetch number of guilds. Please try again later.",
        });
    }
});

export default router;
