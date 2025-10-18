import { Router, Request, Response } from "express";
import { fetchReportByDayRange } from "../models/reports.js";
import { makePretty } from "../models/stats.js";

const router = Router();

/**
 * GET /reports
 * Example usage: /reports?guildId=123456789012345678&range=7&queueType=ranked_solo
 *
 * Fetches a report for a specific guild within a given range and queue type.
 * The report highlights which summoner has the highest value for each stat.
 *
 * Query Parameters:
 * - guildId (string, required): The Discord guild ID.
 * - range (number, optional): The number of days to look back. Defaults to 7.
 * - queueType (string, optional): The queue type to filter matches. Defaults to "ranked_solo".
 */
router.get("/", async (req: Request, res: Response) => {
    try {
        const { guildId, range = "7", queueType = "ranked_solo" } = req.query;

        // Validate required parameter
        if (!guildId) {
            return res.status(400).json({
                success: false,
                message: "Missing required query parameter: guildId.",
            });
        }

        // Fetch the report
        const report = await fetchReportByDayRange(
            guildId as string,
            Number(range),
            queueType as string
        );

        if (report) {
            return res.status(200).json({
                success: true,
                guildId,
                range: Number(range),
                queueType,
                report,
            });
        } else {
            return res.status(404).json({
                success: false,
                message: `No report found for Guild ID '${guildId}' with queue type '${queueType}'.`,
            });
        }
    } catch (error) {
        console.error("Error with GET /reports", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch report. Please try again later.",
        });
    }
});

/**
 * GET /reports/pretty
 * Example usage: /reports/pretty?guildId=123456789012345678&range=7&queueType=ranked_solo
 *
 * Fetches a report for a specific guild within a given range and queue type,
 * and returns the data in a user-friendly format using the `makePretty` method.
 *
 * Query Parameters:
 * - guildId (string, required): The Discord guild ID.
 * - range (number, optional): The number of days to look back. Defaults to 7.
 * - queueType (string, optional): The queue type to filter matches. Defaults to "ranked_solo".
 */
router.get("/pretty", async (req: Request, res: Response) => {
    try {
        const { guildId, range = "7", queueType = "ranked_solo" } = req.query;

        // Validate required parameter
        if (!guildId) {
            return res.status(400).json({
                success: false,
                message: "Missing required query parameter: guildId.",
            });
        }

        // Validate that range is a positive integer
        const parsedRange = parseInt(range as string, 10);
        if (isNaN(parsedRange) || parsedRange <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid range. It must be a positive integer.",
            });
        }

        // Fetch the report
        const report = await fetchReportByDayRange(
            guildId as string,
            parsedRange,
            queueType as string
        );

        if (report) {
            // Convert to a user-friendly format
            const prettyReport = makePretty(report);

            return res.status(200).json({
                success: true,
                guildId,
                range: parsedRange,
                queueType,
                report: prettyReport,
            });
        } else {
            return res.status(404).json({
                success: false,
                message: `No report found for Guild ID '${guildId}' with queue type '${queueType}'.`,
            });
        }
    } catch (error) {
        console.error("Error with GET /reports/pretty", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch pretty report. Please try again later.",
        });
    }
});

export default router;
