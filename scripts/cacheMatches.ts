import dotenv from "dotenv";
import { cacheMatchData } from "../models/matches.js";
import { logger } from "../utils/logger.js";

dotenv.config();

async function main() {
    try {
        logger.info("Scripts > cacheMatches > Starting match data caching");

        await cacheMatchData();

        logger.success("Scripts > cacheMatches > Match caching completed successfully");
        process.exit(0);
    } catch (error) {
        logger.error("Scripts > cacheMatches > Error during match caching", error);
        process.exit(1);
    }
}

main();
