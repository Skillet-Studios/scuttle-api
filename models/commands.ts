import prisma from "../utils/prisma.js";
import { logger } from "../utils/logger.js";
import { CommandInvocationData } from "../types/commands.js";

export async function getNumCommandsSent(): Promise<number> {
    try {
        const count = await prisma.commandInvocation.count();
        return count;
    } catch (error) {
        logger.error("Error fetching total commands sent", error);
        throw new Error("Database query failed");
    }
}

export async function logCommandInvocation(
    data: CommandInvocationData
): Promise<boolean> {
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

        logger.debug(`Command invocation logged: ${data.command}`);
        return true;
    } catch (error) {
        logger.error(
            `Error logging command invocation: ${data.command}`,
            error
        );
        return false;
    }
}
