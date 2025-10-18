import { Router, Request, Response } from "express";
import {
    getNumGuilds,
    getAllGuilds,
    getGuildsWithMainChannel,
    addGuild,
    setMainChannel,
    getMainChannel,
    getGuildById,
} from "../models/guilds.js";
import { respondWithSuccess, respondWithError } from "../utils/responses.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
    try {
        const guilds = await getAllGuilds();
        return respondWithSuccess(res, 200, undefined, guilds);
    } catch (error) {
        logger.error("Routes > guilds > Error with GET /", error);
        return respondWithError(res, 500, "Failed to fetch guilds. Please try again later.");
    }
});

router.get("/count", async (_req: Request, res: Response) => {
    try {
        const numGuilds = await getNumGuilds();
        return respondWithSuccess(res, 200, undefined, { count: numGuilds });
    } catch (error) {
        logger.error("Routes > guilds > Error with GET /count", error);
        return respondWithError(res, 500, "Failed to fetch number of guilds. Please try again later.");
    }
});

router.get("/with-main-channel", async (_req: Request, res: Response) => {
    try {
        const guilds = await getGuildsWithMainChannel();
        return respondWithSuccess(res, 200, undefined, { guilds });
    } catch (error) {
        logger.error("Routes > guilds > Error with GET /with-main-channel", error);
        return respondWithError(res, 500, "Failed to fetch guilds with main channels. Please try again later.");
    }
});

router.post("/", async (req: Request, res: Response) => {
    try {
        const { guildName, guildId } = req.body;

        if (!guildName || !guildId) {
            return respondWithError(res, 400, "Missing required fields: guildName and guildId");
        }

        await addGuild(guildName, guildId);
        return respondWithSuccess(res, 200, `Guild '${guildName}' was successfully added with ID '${guildId}'`);
    } catch (error) {
        logger.error("Routes > guilds > Error with POST /", error);
        return respondWithError(res, 500, "Failed to add guild. Please try again later.");
    }
});

router.post("/channel", async (req: Request, res: Response) => {
    try {
        const { guildId, channelId } = req.body;

        if (!guildId || !channelId) {
            return respondWithError(res, 400, "Missing required fields: guildId and channelId");
        }

        await setMainChannel(guildId, channelId);
        return respondWithSuccess(res, 200, `Main channel for Guild '${guildId}' was successfully set to '${channelId}'`);
    } catch (error) {
        logger.error("Routes > guilds > Error with POST /channel", error);
        return respondWithError(res, 500, "Failed to set main channel. Please try again later.");
    }
});

router.get("/channel", async (req: Request, res: Response) => {
    try {
        const guildId = req.query.guildId as string;

        if (!guildId) {
            return respondWithError(res, 400, "Missing required query parameter: guildId");
        }

        const mainChannelId = await getMainChannel(guildId);

        if (mainChannelId) {
            return respondWithSuccess(res, 200, undefined, { guildId, mainChannelId });
        } else {
            return respondWithError(res, 404, `Main channel not found for Guild ID '${guildId}'`);
        }
    } catch (error) {
        logger.error("Routes > guilds > Error with GET /channel", error);
        return respondWithError(res, 500, "Failed to retrieve main channel. Please try again later.");
    }
});

router.get("/filter", async (req: Request, res: Response) => {
    try {
        const guildId = req.query.guildId as string;

        if (!guildId) {
            return respondWithError(res, 400, "Missing required query parameter: guildId");
        }

        const guildData = await getGuildById(guildId);

        if (guildData) {
            return respondWithSuccess(res, 200, undefined, { guild: guildData });
        } else {
            return respondWithError(res, 404, `Guild with ID '${guildId}' not found`);
        }
    } catch (error) {
        logger.error("Routes > guilds > Error with GET /filter", error);
        return respondWithError(res, 500, "Failed to retrieve guild data. Please try again later.");
    }
});

export default router;
