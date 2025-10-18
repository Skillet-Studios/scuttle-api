import { Router, Request, Response } from "express";
import { fetchSummonerStats, makePretty } from "../models/stats.js";
import { respondWithSuccess, respondWithError } from "../utils/responses.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.get("/:summonerPuuid", async (req: Request, res: Response) => {
    try {
        const summonerPuuid = req.params.summonerPuuid;
        const range = parseInt(req.query.range as string, 10) || 7;
        const queueType = (req.query.queueType as string) || "ranked_solo";

        const stats = await fetchSummonerStats(summonerPuuid, range, queueType);

        if (!stats) {
            return respondWithError(
                res,
                404,
                `Queue type '${queueType}' not supported or no matches found`
            );
        }

        return respondWithSuccess(res, 200, undefined, {
            range,
            queueType,
            summonerPuuid,
            stats,
        });
    } catch (error) {
        logger.error("Routes > stats > Error with GET /:summonerPuuid", error);
        return respondWithError(res, 500, "Failed to fetch summoner stats. Please try again later.");
    }
});

router.get("/pretty/:summonerPuuid", async (req: Request, res: Response) => {
    try {
        const summonerPuuid = req.params.summonerPuuid;
        const range = parseInt(req.query.range as string, 10) || 7;
        const queueType = (req.query.queueType as string) || "ranked_solo";

        const stats = await fetchSummonerStats(summonerPuuid, range, queueType);

        if (!stats) {
            return respondWithError(
                res,
                404,
                `Queue type '${queueType}' not supported or no matches found`
            );
        }

        const prettyStats = makePretty(stats);

        return respondWithSuccess(res, 200, undefined, {
            range,
            queueType,
            summonerPuuid,
            stats: prettyStats,
        });
    } catch (error) {
        logger.error("Routes > stats > Error with GET /pretty/:summonerPuuid", error);
        return respondWithError(res, 500, "Failed to fetch summoner stats. Please try again later.");
    }
});

export default router;
