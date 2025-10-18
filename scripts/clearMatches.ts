import dotenv from "dotenv";
import prisma from "../utils/prisma.js";
import { logger } from "../utils/logger.js";

dotenv.config();

async function main() {
    try {
        logger.warn("Scripts > clearMatches > About to delete all matches from ranked_solo_matches table");

        const result = await prisma.rankedSoloMatch.deleteMany({});

        logger.success(`Scripts > clearMatches > Successfully deleted ${result.count} matches`);
        process.exit(0);
    } catch (error) {
        logger.error("Scripts > clearMatches > Error clearing matches", error);
        process.exit(1);
    }
}

main();
