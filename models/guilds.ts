import prisma from "../utils/prisma.js";

/**
 * Gets the total number of guilds from the database.
 *
 * @returns The total count of guilds.
 */
export async function getNumGuilds(): Promise<number> {
    try {
        const count = await prisma.guild.count();
        return count;
    } catch (error) {
        console.error("Error fetching total guilds:", error);
        throw new Error("Database query failed");
    }
}

/**
 * Retrieves all guild documents from the database.
 *
 * @returns An array of guild documents with BigInt fields converted to strings.
 */
export async function getAllGuilds() {
    try {
        const guilds = await prisma.guild.findMany({
            orderBy: {
                created_at: "desc",
            },
        });

        // Convert BigInt to string for JSON serialization
        return guilds.map((guild) => ({
            ...guild,
            guild_id: guild.guild_id.toString(),
            main_channel_id: guild.main_channel_id
                ? guild.main_channel_id.toString()
                : null,
        }));
    } catch (error) {
        console.error("Error fetching all guilds:", error);
        throw new Error("Database query failed");
    }
}

/**
 * Adds a new Guild to the database.
 *
 * @param guildName - The name of the guild.
 * @param guildId - The Discord guild ID (as a string).
 * @returns Returns `true` if the guild was successfully added, else `false`.
 */
export async function addGuild(
    guildName: string,
    guildId: string
): Promise<boolean> {
    try {
        // Check if guild_id already exists
        const existingGuild = await prisma.guild.findUnique({
            where: { guild_id: BigInt(guildId) },
        });

        if (existingGuild) {
            console.log(`A guild with the guild_id '${guildId}' already exists.`);
            return false;
        }

        // Create the new guild
        const guild = await prisma.guild.create({
            data: {
                name: guildName,
                guild_id: BigInt(guildId),
            },
        });

        console.log(
            `Guild '${guildName}' was successfully inserted with id: ${guild.id}`
        );
        return true;
    } catch (error) {
        console.error(
            `Error adding guild '${guildName}' with ID '${guildId}':`,
            error instanceof Error ? error.message : error
        );
        return false;
    }
}

/**
 * Sets the main channel for a specific Guild.
 *
 * The main channel is where automatic messages will be sent.
 *
 * @param guildId - The Discord guild ID (as a string).
 * @param channelId - The Discord channel ID to set as the main channel.
 * @returns Returns `true` if the main channel was successfully set, else `false`.
 */
export async function setMainChannel(
    guildId: string,
    channelId: string
): Promise<boolean> {
    try {
        await prisma.guild.update({
            where: { guild_id: BigInt(guildId) },
            data: { main_channel_id: BigInt(channelId) },
        });

        console.log(
            `Main channel for Guild: ${guildId} updated to ${channelId}.`
        );
        return true;
    } catch (error: any) {
        if (error.code === "P2025") {
            // Record not found
            console.log(`Guild with ID ${guildId} not found.`);
            return false;
        }
        console.error(
            `Error setting main channel for Guild '${guildId}':`,
            error.message
        );
        return false;
    }
}

/**
 * Retrieves the main_channel_id for a specific Guild.
 *
 * @param guildId - The Discord guild ID (as a string).
 * @returns Returns the main_channel_id as a string if found, else null.
 */
export async function getMainChannel(guildId: string): Promise<string | null> {
    try {
        const guild = await prisma.guild.findUnique({
            where: { guild_id: BigInt(guildId) },
            select: { main_channel_id: true },
        });

        if (guild && guild.main_channel_id) {
            return guild.main_channel_id.toString();
        }

        console.log(`Guild with ID ${guildId} not found or has no main channel.`);
        return null;
    } catch (error) {
        console.error(
            `Error retrieving main channel for Guild '${guildId}':`,
            error instanceof Error ? error.message : error
        );
        throw new Error("Database query failed");
    }
}

/**
 * Updates the guild count (kept for backward compatibility).
 * Note: With Prisma, we don't need a separate guild_count table.
 * This function is kept for backward compatibility but uses the dynamic count.
 *
 * @param count - The new total number of guilds (ignored in Prisma version).
 * @returns Returns `true` always (no separate count table needed).
 */
export async function updateGuildCount(_count: number): Promise<boolean> {
    try {
        // With Prisma, we don't need a separate guild_count table
        // We can always get the count with prisma.guild.count()
        const actualCount = await getNumGuilds();
        console.log(
            `Guild count is dynamically calculated. Current count: ${actualCount}`
        );
        return true;
    } catch (error) {
        console.error(
            `Error in updateGuildCount:`,
            error instanceof Error ? error.message : error
        );
        return false;
    }
}

/**
 * Retrieves guild data by its Discord guild ID.
 *
 * @param guildId - The Discord guild ID as a string.
 * @returns Returns the guild document if found, else null.
 */
export async function getGuildById(guildId: string) {
    try {
        const guild = await prisma.guild.findUnique({
            where: { guild_id: BigInt(guildId) },
        });

        if (!guild) {
            console.log(`Guild with ID ${guildId} not found.`);
            return null;
        }

        // Convert BigInt to string for JSON serialization
        return {
            ...guild,
            guild_id: guild.guild_id.toString(),
            main_channel_id: guild.main_channel_id
                ? guild.main_channel_id.toString()
                : null,
        };
    } catch (error) {
        console.error(
            `Error retrieving guild with ID '${guildId}':`,
            error instanceof Error ? error.message : error
        );
        throw new Error("Database query failed");
    }
}
