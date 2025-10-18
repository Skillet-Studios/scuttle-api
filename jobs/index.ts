import cron from "node-cron";
import {
    cacheMatchData,
    deleteMatchesOlderThan,
    deleteMatchesForRemovedSummoners,
} from "../models/matches.js";
import { logger } from "../utils/logger.js";

export function initCronJobs(): void {
    // Every hour, on the hour
    cron.schedule("0 * * * *", async () => {
        logger.info("Cron job started: caching match data for all queues");
        try {
            await cacheMatchData();
            logger.success("Cron job finished: match data caching complete");
        } catch (error) {
            logger.error("Error in cache match data cron job", error);
        }
    });

    // Every day at 05:00
    cron.schedule("0 5 * * *", async () => {
        logger.info("Cron job started: deleting old matches (31 days)");
        try {
            const daysToKeep = 31;
            const deletedCount = await deleteMatchesOlderThan(daysToKeep);
            logger.success(`Cron job finished: deleted ${deletedCount} matches older than ${daysToKeep} day(s)`);
        } catch (error) {
            logger.error("Error in delete old matches cron job", error);
        }
    });

    // Every Sunday at 03:00 AM
    cron.schedule("0 3 * * 0", async () => {
        logger.info("Cron job started: deleting orphaned matches for removed summoners");
        try {
            const deletedCount = await deleteMatchesForRemovedSummoners();
            logger.success(`Cron job finished: deleted ${deletedCount} orphaned matches`);
        } catch (error) {
            logger.error("Error in delete orphaned matches cron job", error);
        }
    });
}
