import { Router, Request, Response } from "express";
import {
    fetchSummonerPuuidByRiotId,
    getSummonerRegion,
} from "../models/riot.js";
import { respondWithSuccess, respondWithError } from "../utils/responses.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.get("/puuid", async (req: Request, res: Response) => {
    try {
        const riotId = req.query.riotId as string | undefined;

        if (!riotId) {
            return respondWithError(res, 400, "Missing required query parameter: riotId");
        }

        const puuid = await fetchSummonerPuuidByRiotId(riotId);

        if (puuid) {
            return respondWithSuccess(res, 200, undefined, { riotId, puuid });
        } else {
            return respondWithError(res, 404, `No PUUID found for Riot ID "${riotId}"`);
        }
    } catch (error) {
        logger.error("Routes > riot > Error with GET /puuid", error);
        return respondWithError(res, 500, "Failed to fetch PUUID. Please try again later.");
    }
});

router.get("/region", async (req: Request, res: Response) => {
    try {
        const puuid = req.query.puuid as string | undefined;

        if (!puuid) {
            return respondWithError(res, 400, "Missing required query parameter: puuid");
        }

        const region = await getSummonerRegion(puuid);

        if (region) {
            return respondWithSuccess(res, 200, undefined, { puuid, region });
        } else {
            return respondWithError(res, 404, `Region not found for PUUID "${puuid}"`);
        }
    } catch (error) {
        logger.error("Routes > riot > Error with GET /region", error);
        return respondWithError(res, 500, "Failed to determine region. Please try again later.");
    }
});

export default router;
