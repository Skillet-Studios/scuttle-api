import cron from "node-cron";
import { cacheMatchData, deleteMatchesOlderThan } from "../models/matches.js";
import { getAllGuilds } from "../models/guilds.js";

/**
 * Initializes all cron jobs in the application.
 *
 * Call this function after your database is connected,
 * and before or after the Express app starts listening.
 *
 * @example
 * // In app.js or server.js:
 * initCronJobs();
 */
export function initCronJobs() {
    // 1) Every hour, on the hour => fetch and cache matches
    cron.schedule("0 * * * *", async () => {
        console.log("Cron job started: caching match data.");
        try {
            const guilds = await getAllGuilds();
            await cacheMatchData(guilds);
            console.log("Cron job finished: match data caching complete.");
        } catch (error) {
            console.error("Error in cache match data cron job:", error);
        }
    });

    // 2) Every day at 05:00 => delete matches older than 31 days
    cron.schedule("0 5 * * *", async () => {
        console.log("Cron job started: deleting old matches (31 days).");
        try {
            // If you want a dynamic range, you could fetch from an ENV var or config.
            const daysToKeep = 31;
            const deletedCount = await deleteMatchesOlderThan(daysToKeep);
            console.log(
                `Cron job finished: deleted ${deletedCount} matches older than ${daysToKeep} day(s).`
            );
        } catch (error) {
            console.error("Error in delete old matches cron job:", error);
        }
    });
}
