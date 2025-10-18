import { Router, Request, Response } from "express";
import { getSummonerPlaytime } from "../models/hours.js";
import { respondWithSuccess, respondWithError } from "../utils/responses.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.get("/:summonerPuuid", async (req: Request, res: Response) => {
    try {
        const { summonerPuuid } = req.params;
        const { queueType = "ranked_solo", range } = req.query;

        if (!range) {
            return respondWithError(res, 400, "Missing required 'range' query parameter");
        }

        const result = await getSummonerPlaytime(
            summonerPuuid,
            Number(range),
            queueType as string
        );

        return respondWithSuccess(res, 200, undefined, {
            summonerPuuid,
            queueType,
            ...result,
        });
    } catch (error) {
        logger.error("Routes > hours > Error in GET /hours", error);
        return respondWithError(
            res,
            500,
            "Failed to fetch playtime data. Please try again later."
        );
    }
});

export default router;
