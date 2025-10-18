import prisma from "../utils/prisma.js";
import { logger } from "../utils/logger.js";
import { CommandInvocationData } from "../types/commands.js";

export async function getNumCommandsSent(): Promise<number> {
    try {
        const count = await prisma.commandInvocation.count();
        return count;
    } catch (error) {
        logger.error("Models > commands > Error fetching total commands sent", error);
        throw new Error("Database query failed");
    }
}

export async function logCommandInvocation(
    data: CommandInvocationData
): Promise<void> {
    try {
        await prisma.commandInvocation.create({
            data: {
                command: data.command,
                discord_user_id: data.discordUserId || null,
                discord_username: data.discordUsername || null,
                guild_id: data.guildId || null,
                guild_name: data.guildName || null,
            },
        });

        logger.debug(`Models > commands > Command invocation logged: ${data.command}`);
    } catch (error) {
        logger.error(
            `Models > commands > Error logging command invocation: ${data.command}`,
            error
        );
        throw error;
    }
}
