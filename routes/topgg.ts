import { Router, Request, Response } from "express";
import { updateStats } from "../models/topgg.js";
import { respondWithSuccess, respondWithError } from "../utils/responses.js";
import { logger } from "../utils/logger.js";

const router = Router();

function validateStatsInput(guildCount: any, shardCount: any) {
    if (guildCount === undefined || shardCount === undefined) {
        return { error: "Missing required fields: guildCount and shardCount" };
    }

    if (typeof guildCount !== "number" || typeof shardCount !== "number") {
        return { error: "guildCount and shardCount must be numbers" };
    }

    if (guildCount < 0 || shardCount < 0) {
        return { error: "guildCount and shardCount must be non-negative" };
    }

    return { guildCount, shardCount };
}

router.put("/stats", async (req: Request, res: Response) => {
    try {
        const { guildCount, shardCount } = req.body;

        const validation = validateStatsInput(guildCount, shardCount);

        if ("error" in validation) {
            return respondWithError(res, 400, validation.error!);
        }

        await updateStats(validation.guildCount, validation.shardCount);

        return respondWithSuccess(
            res,
            200,
            "Successfully updated Top.gg stats",
            {
                guildCount: validation.guildCount,
                shardCount: validation.shardCount,
            }
        );
    } catch (error) {
        logger.error("Routes > topgg > Error with PUT /stats", error);
        return respondWithError(
            res,
            500,
            "Failed to update Top.gg stats. Please try again later."
        );
    }
});

export default router;
