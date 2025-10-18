import dotenv from "dotenv";
import prisma from "../utils/prisma.js";
import { logger } from "../utils/logger.js";

dotenv.config();

async function main() {
    try {
        logger.warn("Scripts > clearCacheLogs > About to delete all records from summoner_cache_logs table");

        const result = await prisma.summonerCacheLog.deleteMany({});

        logger.success(`Scripts > clearCacheLogs > Successfully deleted ${result.count} cache log records`);
        process.exit(0);
    } catch (error) {
        logger.error("Scripts > clearCacheLogs > Error clearing cache logs", error);
        process.exit(1);
    }
}

main();
