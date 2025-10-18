import { Router, Request, Response } from "express";
import { fetchRankings } from "../models/rankings.js";
import { makePretty } from "../models/stats.js";
import { respondWithSuccess, respondWithError } from "../utils/responses.js";
import { logger } from "../utils/logger.js";

const router = Router();

interface RankingsQuery {
    guildId?: string;
    startDate?: string;
    limit?: string;
    queueType?: string;
}

function validateAndParseParams(query: RankingsQuery) {
    const { guildId, startDate, limit = "5", queueType = "ranked_solo" } = query;

    if (!guildId || !startDate) {
        return { error: "Missing required query parameters: guildId and startDate" };
    }

    const parsedDate = new Date(startDate);
    if (isNaN(parsedDate.getTime())) {
        return { error: "Invalid startDate format. Please use YYYY-MM-DD" };
    }

    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
        return { error: "Invalid limit. It must be a positive integer" };
    }

    return {
        guildId,
        parsedDate,
        parsedLimit,
        queueType,
    };
}

router.get("/", async (req: Request, res: Response) => {
    try {
        const validation = validateAndParseParams(req.query);

        if ("error" in validation) {
            return respondWithError(res, 400, validation.error!);
        }

        const { guildId, parsedDate, parsedLimit, queueType } = validation;

        const rankings = await fetchRankings(guildId, parsedDate, parsedLimit, queueType);

        if (!rankings) {
            return respondWithError(
                res,
                404,
                "Failed to fetch rankings. Please ensure the guildId and queueType are correct"
            );
        }

        return respondWithSuccess(res, 200, undefined, {
            guildId,
            startDate: parsedDate.toISOString(),
            limit: parsedLimit,
            queueType,
            rankings,
        });
    } catch (error) {
        logger.error("Routes > rankings > Error with GET /", error);
        return respondWithError(res, 500, "Failed to fetch rankings. Please try again later.");
    }
});

router.get("/pretty", async (req: Request, res: Response) => {
    try {
        const validation = validateAndParseParams(req.query);

        if ("error" in validation) {
            return respondWithError(res, 400, validation.error!);
        }

        const { guildId, parsedDate, parsedLimit, queueType } = validation;

        const rankings = await fetchRankings(guildId, parsedDate, parsedLimit, queueType);

        if (!rankings) {
            return respondWithError(
                res,
                404,
                "Failed to fetch rankings. Please ensure the guildId and queueType are correct"
            );
        }

        const prettyRankings = makePretty(rankings);

        return respondWithSuccess(res, 200, undefined, {
            guildId,
            startDate: parsedDate.toISOString(),
            limit: parsedLimit,
            queueType,
            rankings: prettyRankings,
        });
    } catch (error) {
        logger.error("Routes > rankings > Error with GET /pretty", error);
        return respondWithError(res, 500, "Failed to fetch pretty rankings. Please try again later.");
    }
});

export default router;
