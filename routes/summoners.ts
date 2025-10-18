import { Router, Request, Response } from "express";
import {
    getNumSummoners,
    getSummonersByGuildId,
    updateCachedTimestamp,
    checkIfCachedWithinRange,
    addSummoner,
    removeSummoner,
    getUniqueSummoners,
} from "../models/summoners.js";

const router = Router();

/**
 * GET /summoners/count
 * Returns the total number of summoners across all guilds.
 */
router.get("/count", async (req: Request, res: Response) => {
    try {
        const totalSummoners = await getNumSummoners();
        res.json(totalSummoners);
    } catch (error) {
        console.error("Error with GET /summoners/count", error);
        res.status(500).json({
            message:
                "Failed to fetch number of summoners. Please try again later.",
        });
    }
});

/**
 * GET /summoners/guild/:guildId
 * Returns all summoners for a specific guild ID.
 */
router.get("/guild/:guildId", async (req: Request, res: Response) => {
    try {
        const summoners = await getSummonersByGuildId(req.params.guildId);
        res.json(summoners);
    } catch (error) {
        console.error("Error with GET /summoners/guild/:guildId", error);
        res.status(500).json({
            message:
                "Failed to fetch summoners by guild ID. Please try again later.",
        });
    }
});

/**
 * POST /summoners/cache/timestamp
 * Expects JSON body: { "name": "...", "puuid": "..." }
 * Updates the summoner's last_cached timestamp in the DB.
 */
router.post("/cache/timestamp", async (req: Request, res: Response) => {
    try {
        const summoner = req.body;
        if (!summoner || !summoner.puuid || !summoner.name) {
            return res.status(400).json({
                message: "Missing required summoner data (name, puuid).",
            });
        }

        const result = await updateCachedTimestamp(summoner);
        return res.json({
            success: true,
            message: "Cached timestamp updated successfully",
            result,
        });
    } catch (error) {
        console.error("Error with POST /summoners/cache/timestamp", error);
        res.status(500).json({
            success: false,
            message:
                "Failed to update cached timestamp. Please try again later.",
        });
    }
});

/**
 * GET /summoners/cache/:summonerId
 * Example usage: /summoners/cache/<PUUID>?range=1&name=VASK3N
 * Checks if the summoner's match data is cached within the specified range (in days).
 */
router.get("/cache/:summonerId", async (req: Request, res: Response) => {
    try {
        // Extract the summonerId (puuid) from route params
        const puuid = req.params.summonerId;
        // Default range to 1 day if not provided
        const range = parseInt(req.query.range as string, 10) || 1;
        // Summoner name is optional; default to 'Unknown'
        const name = (req.query.name as string) || "Unknown";

        // Construct a summoner object
        const summoner = { name, puuid };

        const isCached = await checkIfCachedWithinRange(summoner, range);

        return res.json({
            isCached,
            range,
            message: isCached
                ? `Summoner '${summoner.name}' was cached within the last ${range} day(s).`
                : `Summoner '${summoner.name}' was NOT cached within the last ${range} day(s).`,
        });
    } catch (error) {
        console.error("Error with GET /summoners/cache/:summonerId", error);
        res.status(500).json({
            success: false,
            message: "Failed to check cached timestamp. Please try again later.",
        });
    }
});

/**
 * POST /summoners
 * Expects JSON body: { "summonerRiotId": "GameName #Tag", "guildId": "123456789012345678" }
 *
 * Adds a summoner to a specific guild.
 */
router.post("/", async (req: Request, res: Response) => {
    try {
        const { summonerRiotId, guildId } = req.body;

        // Validate input
        if (!summonerRiotId || !guildId) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: summonerRiotId and guildId.",
            });
        }

        // Call the addSummoner function
        const success = await addSummoner(summonerRiotId, guildId);

        if (success) {
            return res.status(200).json({
                success: true,
                message: `Summoner '${summonerRiotId}' was successfully added to Guild '${guildId}'.`,
            });
        } else {
            return res.status(400).json({
                success: false,
                message: `Failed to add summoner '${summonerRiotId}' to Guild '${guildId}'.`,
            });
        }
    } catch (error) {
        console.error("Error with POST /summoners/add", error);
        res.status(500).json({
            success: false,
            message: "Failed to add summoner to guild. Please try again later.",
        });
    }
});

/**
 * DELETE /summoners
 * Example usage: DELETE /summoners?summonerRiotId=GameName%20%23Tag&guildId=123456789012345678
 *
 * Removes a summoner from a specific guild.
 * Expects query parameters `summonerRiotId` and `guildId`.
 */
router.delete("/", async (req: Request, res: Response) => {
    try {
        const { summonerRiotId, guildId } = req.query;

        // Validate input
        if (!summonerRiotId || !guildId) {
            return res.status(400).json({
                success: false,
                message:
                    "Missing required query parameters: summonerRiotId and guildId.",
            });
        }

        // Call the removeSummoner function
        const success = await removeSummoner(
            summonerRiotId as string,
            guildId as string
        );

        if (success) {
            return res.status(200).json({
                success: true,
                message: `Summoner '${summonerRiotId}' was successfully removed from Guild '${guildId}'.`,
            });
        } else {
            return res.status(400).json({
                success: false,
                message: `Failed to remove summoner '${summonerRiotId}' from Guild '${guildId}'.`,
            });
        }
    } catch (error) {
        console.error("Error with DELETE /summoners", error);
        res.status(500).json({
            success: false,
            message:
                "Failed to remove summoner from guild. Please try again later.",
        });
    }
});

/**
 * GET /summoners/unique
 * Retrieves all unique summoners across all guilds and returns the total count.
 *
 * @returns {Object} An object containing:
 * {
 *   count: Number,
 *   summoners: [{ name: "string", puuid: "string" }]
 * }
 */
router.get("/unique", async (req: Request, res: Response) => {
    try {
        const uniqueSummoners = await getUniqueSummoners();
        res.json({
            count: uniqueSummoners.length,
            summoners: uniqueSummoners,
        });
    } catch (error) {
        console.error("Error with GET /summoners/unique", error);
        res.status(500).json({
            message: "Failed to fetch unique summoners. Please try again later.",
        });
    }
});

export default router;
