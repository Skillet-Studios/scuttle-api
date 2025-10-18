import { Router, Request, Response } from "express";
import {
    fetchAllSummonerMatchDataByRange,
    fetchAllSummonerMatchDataSinceDate,
} from "../models/matches.js";
import { respondWithSuccess, respondWithError } from "../utils/responses.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.get("/:summonerPuuid", async (req: Request, res: Response) => {
    try {
        const summonerPuuid = req.params.summonerPuuid;
        const range = parseInt(req.query.range as string, 10) || 7;
        const queueType = (req.query.queueType as string) || "ranked_solo";

        const matches = await fetchAllSummonerMatchDataByRange(
            summonerPuuid,
            range,
            queueType
        );

        if (!matches) {
            return respondWithError(
                res,
                404,
                `No ${queueType} match data found for summoner PUUID '${summonerPuuid}' within the last ${range} day(s)`
            );
        }

        return respondWithSuccess(res, 200, undefined, {
            range,
            queueType,
            summonerPuuid,
            matches,
        });
    } catch (error) {
        logger.error(
            "Routes > matches > Error with GET /:summonerPuuid",
            error
        );
        return respondWithError(
            res,
            500,
            "Failed to fetch match data. Please try again later."
        );
    }
});

router.get("/:summonerPuuid/since", async (req: Request, res: Response) => {
    try {
        const summonerPuuid = req.params.summonerPuuid;
        const { startDate } = req.query;
        const queueType = (req.query.queueType as string) || "ranked_solo";

        if (!startDate) {
            return respondWithError(
                res,
                400,
                "Missing required query parameter: startDate (format: YYYY-MM-DD)"
            );
        }

        const parsedDate = new Date(startDate as string);
        if (isNaN(parsedDate.getTime())) {
            return respondWithError(
                res,
                400,
                "Invalid startDate format. Please use YYYY-MM-DD"
            );
        }

        const matches = await fetchAllSummonerMatchDataSinceDate(
            summonerPuuid,
            parsedDate,
            queueType
        );

        if (!matches) {
            return respondWithError(
                res,
                404,
                `No ${queueType} match data found for summoner PUUID '${summonerPuuid}' since ${parsedDate.toISOString()}`
            );
        }

        return respondWithSuccess(res, 200, undefined, {
            startDate: parsedDate.toISOString(),
            queueType,
            summonerPuuid,
            matches,
        });
    } catch (error) {
        logger.error(
            "Routes > matches > Error with GET /:summonerPuuid/since",
            error
        );
        return respondWithError(
            res,
            500,
            "Failed to fetch match data since the specified date. Please try again later."
        );
    }
});

export default router;
