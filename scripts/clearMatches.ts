import dotenv from "dotenv";
import prisma from "../utils/prisma.js";
import { logger } from "../utils/logger.js";

dotenv.config();

async function main() {
    try {
        logger.warn("Scripts > clearMatches > About to delete all matches from ranked_solo_matches and arena_matches tables");

        const rankedResult = await prisma.rankedSoloMatch.deleteMany({});
        const arenaResult = await prisma.arenaMatch.deleteMany({});

        const totalDeleted = rankedResult.count + arenaResult.count;

        logger.success(`Scripts > clearMatches > Successfully deleted ${totalDeleted} matches (Ranked: ${rankedResult.count}, Arena: ${arenaResult.count})`);
        process.exit(0);
    } catch (error) {
        logger.error("Scripts > clearMatches > Error clearing matches", error);
        process.exit(1);
    }
}

main();
