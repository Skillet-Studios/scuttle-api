import prisma from "../utils/prisma.js";
import { logger } from "../utils/logger.js";

interface SerializedGuild {
    id: string;
    guild_id: string;
    name: string;
    main_channel_id: string | null;
    created_at: Date;
    updated_at: Date;
}

function serializeGuild(guild: any): SerializedGuild {
    return {
        ...guild,
        guild_id: guild.guild_id.toString(),
        main_channel_id: guild.main_channel_id?.toString() ?? null,
    };
}

export async function getNumGuilds(): Promise<number> {
    try {
        return await prisma.guild.count();
    } catch (error) {
        logger.error("Models > guilds > Error fetching total guilds", error);
        throw new Error("Database query failed");
    }
}

export async function getAllGuilds(): Promise<SerializedGuild[]> {
    try {
        const guilds = await prisma.guild.findMany({
            orderBy: { created_at: "desc" },
        });
        return guilds.map(serializeGuild);
    } catch (error) {
        logger.error("Models > guilds > Error fetching all guilds", error);
        throw new Error("Database query failed");
    }
}

export async function getGuildsWithMainChannel(): Promise<SerializedGuild[]> {
    try {
        const guilds = await prisma.guild.findMany({
            where: {
                main_channel_id: {
                    not: null,
                },
            },
            orderBy: { created_at: "desc" },
        });
        return guilds.map(serializeGuild);
    } catch (error) {
        logger.error("Models > guilds > Error fetching guilds with main channels", error);
        throw new Error("Database query failed");
    }
}

export async function addGuild(
    guildName: string,
    guildId: string
): Promise<void> {
    try {
        const existingGuild = await prisma.guild.findUnique({
            where: { guild_id: BigInt(guildId) },
        });

        if (existingGuild) {
            throw new Error(`Guild with ID '${guildId}' already exists`);
        }

        const guild = await prisma.guild.create({
            data: {
                name: guildName,
                guild_id: BigInt(guildId),
            },
        });

        logger.info(`Models > guilds > Guild '${guildName}' created with id: ${guild.id}`);
    } catch (error) {
        logger.error(`Models > guilds > Error adding guild '${guildName}' (${guildId})`, error);
        throw error;
    }
}

export async function setMainChannel(
    guildId: string,
    channelId: string
): Promise<void> {
    try {
        await prisma.guild.update({
            where: { guild_id: BigInt(guildId) },
            data: { main_channel_id: BigInt(channelId) },
        });

        logger.info(`Models > guilds > Main channel for guild ${guildId} set to ${channelId}`);
    } catch (error) {
        logger.error(`Models > guilds > Error setting main channel for guild '${guildId}'`, error);
        throw error;
    }
}

export async function getMainChannel(guildId: string): Promise<string | null> {
    try {
        const guild = await prisma.guild.findUnique({
            where: { guild_id: BigInt(guildId) },
            select: { main_channel_id: true },
        });

        if (!guild?.main_channel_id) {
            logger.debug(`Models > guilds > Guild ${guildId} not found or has no main channel`);
            return null;
        }

        return guild.main_channel_id.toString();
    } catch (error) {
        logger.error(`Models > guilds > Error retrieving main channel for guild '${guildId}'`, error);
        throw new Error("Database query failed");
    }
}

export async function getGuildById(
    guildId: string
): Promise<SerializedGuild | null> {
    try {
        const guild = await prisma.guild.findUnique({
            where: { guild_id: BigInt(guildId) },
        });

        if (!guild) {
            logger.debug(`Models > guilds > Guild with ID ${guildId} not found`);
            return null;
        }

        return serializeGuild(guild);
    } catch (error) {
        logger.error(`Models > guilds > Error retrieving guild '${guildId}'`, error);
        throw new Error("Database query failed");
    }
}
