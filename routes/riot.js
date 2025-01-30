import { Router } from "express";
import {
    fetchSummonerPuuidByRiotId,
    getSummonerRegion
} from "../models/riot.js"; // Adjust the import path as needed

const router = Router();

/**
 * GET /riot/puuid
 * Example usage: /riot/puuid?riotId=GameName%20%23Tag
 *
 * Fetches a summoner's PUUID based on their Riot ID.
 * Expects a query parameter `riotId` in the format "GameName #Tag".
 */
router.get("/puuid", async (req, res) => {
    try {
        const riotId = req.query.riotId;

        // Validate that riotId is provided
        if (!riotId) {
            return res.status(400).json({
                success: false,
                message: "Missing required query parameter: riotId."
            });
        }

        // Fetch the PUUID using the Riot ID
        const puuid = await fetchSummonerPuuidByRiotId(riotId);

        if (puuid) {
            return res.json({
                success: true,
                riotId,
                puuid
            });
        } else {
            return res.status(404).json({
                success: false,
                message: `No PUUID found for Riot ID "${riotId}".`
            });
        }
    } catch (error) {
        console.error("Error with GET /riot/puuid", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch PUUID. Please try again later."
        });
    }
});

/**
 * GET /riot/region
 * Example usage: /riot/region?puuid=some-puuid
 *
 * Determines the region a summoner belongs to based on their PUUID.
 * Expects a query parameter `puuid`.
 */
router.get("/region", async (req, res) => {
    try {
        const puuid = req.query.puuid;

        // Validate that puuid is provided
        if (!puuid) {
            return res.status(400).json({
                success: false,
                message: "Missing required query parameter: puuid."
            });
        }

        // Fetch the region using the PUUID
        const region = await getSummonerRegion(puuid);

        if (region) {
            return res.json({
                success: true,
                puuid,
                region
            });
        } else {
            return res.status(404).json({
                success: false,
                message: `Region not found for PUUID "${puuid}".`
            });
        }
    } catch (error) {
        console.error("Error with GET /riot/region", error);
        res.status(500).json({
            success: false,
            message: "Failed to determine region. Please try again later."
        });
    }
});

export default router;
