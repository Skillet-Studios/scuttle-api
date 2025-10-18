import prisma from "../utils/prisma.js";

/**
 * Retrieves the total count of commands sent from the "command_analytics" table.
 *
 * - Sums up the "times_called" field across all documents.
 * - If no documents exist, returns 0.
 *
 * @returns The total number of commands sent.
 */
export async function getNumCommandsSent(): Promise<number> {
    try {
        const result = await prisma.commandAnalytics.aggregate({
            _sum: {
                times_called: true,
            },
        });

        return result._sum.times_called || 0;
    } catch (error) {
        console.error("Error fetching total commands sent:", error);
        throw new Error("Database query failed");
    }
}

/**
 * Updates the analytics count for a specific command.
 *
 * @param command - The name of the command to update analytics for.
 * @returns Returns `true` if the analytics were successfully updated, else `false`.
 */
export async function updateCommandAnalytics(command: string): Promise<boolean> {
    try {
        await prisma.commandAnalytics.upsert({
            where: {
                command_name: command,
            },
            update: {
                times_called: {
                    increment: 1,
                },
            },
            create: {
                command_name: command,
                times_called: 1,
            },
        });

        console.log(`Command '${command}' analytics updated.`);
        return true;
    } catch (error) {
        console.error(
            `Error updating analytics for command '${command}':`,
            error instanceof Error ? error.message : error
        );
        return false;
    }
}
