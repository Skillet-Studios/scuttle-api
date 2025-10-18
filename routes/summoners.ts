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
import { respondWithSuccess, respondWithError } from "../utils/responses.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.get("/count", async (_req: Request, res: Response) => {
    try {
        const totalSummoners = await getNumSummoners();
        return respondWithSuccess(res, 200, undefined, {
            count: totalSummoners,
        });
    } catch (error) {
        logger.error("Routes > summoners > Error with GET /count", error);
        return respondWithError(
            res,
            500,
            "Failed to fetch number of summoners. Please try again later."
        );
    }
});

router.get("/guild/:guildId", async (req: Request, res: Response) => {
    try {
        const summoners = await getSummonersByGuildId(req.params.guildId);
        return respondWithSuccess(res, 200, undefined, summoners);
    } catch (error) {
        logger.error(
            "Routes > summoners > Error with GET /guild/:guildId",
            error
        );
        return respondWithError(
            res,
            500,
            "Failed to fetch summoners by guild ID. Please try again later."
        );
    }
});

router.post("/cache/timestamp", async (req: Request, res: Response) => {
    try {
        const summoner = req.body;
        if (!summoner || !summoner.puuid || !summoner.name) {
            return respondWithError(
                res,
                400,
                "Missing required summoner data (name, puuid)"
            );
        }

        await updateCachedTimestamp(summoner);
        return respondWithSuccess(
            res,
            200,
            "Cached timestamp updated successfully"
        );
    } catch (error) {
        logger.error(
            "Routes > summoners > Error with POST /cache/timestamp",
            error
        );
        return respondWithError(
            res,
            500,
            "Failed to update cached timestamp. Please try again later."
        );
    }
});

router.get("/cache/:summonerId", async (req: Request, res: Response) => {
    try {
        const puuid = req.params.summonerId;
        const range = parseInt(req.query.range as string, 10) || 1;
        const name = (req.query.name as string) || "Unknown";

        const summoner = { name, puuid };
        const isCached = await checkIfCachedWithinRange(summoner, range);

        return respondWithSuccess(res, 200, undefined, {
            isCached,
            range,
            message: isCached
                ? `Summoner '${summoner.name}' was cached within the last ${range} day(s).`
                : `Summoner '${summoner.name}' was NOT cached within the last ${range} day(s).`,
        });
    } catch (error) {
        logger.error(
            "Routes > summoners > Error with GET /cache/:summonerId",
            error
        );
        return respondWithError(
            res,
            500,
            "Failed to check cached timestamp. Please try again later."
        );
    }
});

router.post("/", async (req: Request, res: Response) => {
    try {
        const { summonerRiotId, guildId } = req.body;

        if (!summonerRiotId || !guildId) {
            return respondWithError(
                res,
                400,
                "Missing required fields: summonerRiotId and guildId"
            );
        }

        await addSummoner(summonerRiotId, guildId);
        return respondWithSuccess(
            res,
            200,
            `Summoner '${summonerRiotId}' was successfully added to Guild '${guildId}'`
        );
    } catch (error) {
        logger.error("Routes > summoners > Error with POST /", error);
        return respondWithError(
            res,
            500,
            "Failed to add summoner to guild. Please try again later."
        );
    }
});

router.delete("/", async (req: Request, res: Response) => {
    try {
        const { summonerRiotId, guildId } = req.query;

        if (!summonerRiotId || !guildId) {
            return respondWithError(
                res,
                400,
                "Missing required query parameters: summonerRiotId and guildId"
            );
        }

        await removeSummoner(summonerRiotId as string, guildId as string);
        return respondWithSuccess(
            res,
            200,
            `Summoner '${summonerRiotId}' was successfully removed from Guild '${guildId}'`
        );
    } catch (error) {
        logger.error("Routes > summoners > Error with DELETE /", error);
        return respondWithError(
            res,
            500,
            "Failed to remove summoner from guild. Please try again later."
        );
    }
});

router.get("/unique", async (_req: Request, res: Response) => {
    try {
        const uniqueSummoners = await getUniqueSummoners();
        return respondWithSuccess(res, 200, undefined, {
            count: uniqueSummoners.length,
            summoners: uniqueSummoners,
        });
    } catch (error) {
        logger.error("Routes > summoners > Error with GET /unique", error);
        return respondWithError(
            res,
            500,
            "Failed to fetch unique summoners. Please try again later."
        );
    }
});

export default router;
