import { Router } from "express";
import { getNumGuilds, getAllGuilds, addGuild, setMainChannel, getMainChannel, updateGuildCount } from "../models/guilds.js";

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

/**
 * POST /guilds
 * Expects JSON body: { "guildName": "Guild Name", "guildId": "123456789012345678" }
 *
 * Creates and inserts a new Guild into the database.
 */
router.post("/", async (req, res) => {
    try {
        const { guildName, guildId } = req.body;

        // Validate input
        if (!guildName || !guildId) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: guildName and guildId.",
            });
        }

        // Call the addGuild function
        const success = await addGuild(guildName, guildId);

        if (success) {
            return res.status(200).json({
                success: true,
                message: `Guild '${guildName}' was successfully added with ID '${guildId}'.`,
            });
        } else {
            return res.status(400).json({
                success: false,
                message: `Failed to add Guild '${guildName}' with ID '${guildId}'. It might already exist.`,
            });
        }
    } catch (error) {
        console.error("Error with POST /guilds/add", error);
        res.status(500).json({
            success: false,
            message: "Failed to add guild. Please try again later.",
        });
    }
});

/**
 * POST /guilds/channel
 * Expects JSON body: { "guildId": "123456789012345678", "channelId": "876543210987654321" }
 *
 * Sets the main channel for a specific guild.
 * The main channel is where automatic messages will be sent.
 */
router.post("/channel", async (req, res) => {
    try {
        const { guildId, channelId } = req.body;

        // Validate input
        if (!guildId || !channelId) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: guildId and channelId.",
            });
        }

        // Call the setMainChannel function
        const success = await setMainChannel(guildId, channelId);

        if (success) {
            return res.status(200).json({
                success: true,
                message: `Main channel for Guild '${guildId}' was successfully set to '${channelId}'.`,
            });
        } else {
            return res.status(400).json({
                success: false,
                message: `Failed to set main channel for Guild '${guildId}'.`,
            });
        }
    } catch (error) {
        console.error("Error with POST /guilds/set_main_channel", error);
        res.status(500).json({
            success: false,
            message: "Failed to set main channel. Please try again later.",
        });
    }
});

router.get("/channel", async (req, res) => {
    try {
        const guildId = req.query.guildId;

        // Validate that guildId is provided
        if (!guildId) {
            return res.status(400).json({
                success: false,
                message: "Missing required query parameter: guildId.",
            });
        }

        // Call the getMainChannel function
        const mainChannelId = await getMainChannel(guildId);

        if (mainChannelId) {
            return res.status(200).json({
                success: true,
                guildId,
                mainChannelId,
            });
        } else {
            return res.status(404).json({
                success: false,
                message: `Main channel not found for Guild ID '${guildId}'.`,
            });
        }
    } catch (error) {
        console.error("Error with GET /guilds/main_channel", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve main channel. Please try again later.",
        });
    }
});

/**
 * PUT /guilds/count
 * Expects JSON body: { "count": 150 }
 *
 * Updates the total number of guilds in the database.
 */
router.put("/count", async (req, res) => {
    try {
        const { count } = req.body;

        // Validate input
        if (count === undefined || typeof count !== "number" || count < 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid or missing required field: count. It must be a non-negative number.",
            });
        }

        // Call the updateGuildCount function
        const success = await updateGuildCount(count);

        if (success) {
            return res.status(200).json({
                success: true,
                message: `Guild count successfully updated to ${count}.`,
            });
        } else {
            return res.status(500).json({
                success: false,
                message: "Failed to update guild count. Please try again later.",
            });
        }
    } catch (error) {
        console.error("Error with PUT /guilds/count", error);
        res.status(500).json({
            success: false,
            message: "Failed to update guild count. Please try again later.",
        });
    }
});