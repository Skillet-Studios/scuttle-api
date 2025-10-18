import { Router, Request, Response } from "express";
import { fetchReportByDayRange } from "../models/reports.js";
import { makePretty } from "../models/stats.js";
import { respondWithSuccess, respondWithError } from "../utils/responses.js";
import { logger } from "../utils/logger.js";

const router = Router();

interface ReportQuery {
    guildId?: string;
    range?: string;
    queueType?: string;
}

function validateAndParseParams(query: ReportQuery) {
    const { guildId, range = "7", queueType = "ranked_solo" } = query;

    if (!guildId) {
        return { error: "Missing required query parameter: guildId" };
    }

    const parsedRange = parseInt(range, 10);
    if (isNaN(parsedRange) || parsedRange <= 0) {
        return { error: "Invalid range. It must be a positive integer" };
    }

    return {
        guildId,
        parsedRange,
        queueType,
    };
}

router.get("/", async (req: Request, res: Response) => {
    try {
        const validation = validateAndParseParams(req.query);

        if ("error" in validation) {
            return respondWithError(res, 400, validation.error!);
        }

        const { guildId, parsedRange, queueType } = validation;

        const report = await fetchReportByDayRange(guildId, parsedRange, queueType);

        if (!report) {
            return respondWithError(
                res,
                404,
                "Failed to fetch report. Please ensure the guildId and queueType are correct"
            );
        }

        return respondWithSuccess(res, 200, undefined, {
            guildId,
            range: parsedRange,
            queueType,
            report,
        });
    } catch (error) {
        logger.error("Routes > reports > Error with GET /", error);
        return respondWithError(res, 500, "Failed to fetch report. Please try again later.");
    }
});

router.get("/pretty", async (req: Request, res: Response) => {
    try {
        const validation = validateAndParseParams(req.query);

        if ("error" in validation) {
            return respondWithError(res, 400, validation.error!);
        }

        const { guildId, parsedRange, queueType } = validation;

        const report = await fetchReportByDayRange(guildId, parsedRange, queueType);

        if (!report) {
            return respondWithError(
                res,
                404,
                "Failed to fetch report. Please ensure the guildId and queueType are correct"
            );
        }

        const prettyReport = makePretty(report);

        return respondWithSuccess(res, 200, undefined, {
            guildId,
            range: parsedRange,
            queueType,
            report: prettyReport,
        });
    } catch (error) {
        logger.error("Routes > reports > Error with GET /pretty", error);
        return respondWithError(res, 500, "Failed to fetch pretty report. Please try again later.");
    }
});

export default router;
