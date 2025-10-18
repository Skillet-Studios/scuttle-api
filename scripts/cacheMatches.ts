import dotenv from "dotenv";
import { cacheMatchData } from "../models/matches.js";
import { logger } from "../utils/logger.js";

dotenv.config();

const RANKED_SOLO_QUEUE_ID = 420;

async function main() {
    try {
        const queueId = process.argv[2] ? parseInt(process.argv[2], 10) : RANKED_SOLO_QUEUE_ID;

        if (isNaN(queueId)) {
            logger.error("Scripts > cacheMatches > Invalid queue ID provided");
            process.exit(1);
        }

        logger.info(`Scripts > cacheMatches > Starting match data caching for queue ID: ${queueId}`);

        await cacheMatchData(queueId);

        logger.success("Scripts > cacheMatches > Match caching completed successfully");
        process.exit(0);
    } catch (error) {
        logger.error("Scripts > cacheMatches > Error during match caching", error);
        process.exit(1);
    }
}

main();
