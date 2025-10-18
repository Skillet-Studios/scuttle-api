import { Router, Request, Response } from "express";
import {
    getNumCommandsSent,
    logCommandInvocation,
} from "../models/commands.js";
import { respondWithSuccess, respondWithError } from "../utils/responses.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.get("/count", async (_req: Request, res: Response) => {
    try {
        const totalCommands = await getNumCommandsSent();
        return respondWithSuccess(res, 200, undefined, {
            count: totalCommands,
        });
    } catch (error) {
        logger.error("Routes > commands > Error with GET /count", error);
        return respondWithError(
            res,
            500,
            "Failed to fetch number of commands sent. Please try again later."
        );
    }
});

router.post("/log", async (req: Request, res: Response) => {
    try {
        const { command, discordUserId, discordUsername, guildId, guildName } =
            req.body;

        if (!command) {
            return respondWithError(res, 400, "Missing required field: command");
        }

        await logCommandInvocation({
            command,
            discordUserId,
            discordUsername,
            guildId,
            guildName,
        });

        return respondWithSuccess(res, 200, `Command invocation logged: ${command}`);
    } catch (error) {
        logger.error("Routes > commands > Error with POST /log", error);
        return respondWithError(
            res,
            500,
            "Failed to log command invocation. Please try again later."
        );
    }
});

export default router;
