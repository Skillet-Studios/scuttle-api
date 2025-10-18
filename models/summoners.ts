import prisma from "../utils/prisma.js";
import { fetchSummonerPuuidByRiotId, getSummonerRegion } from "./riot.js";
import { logger } from "../utils/logger.js";

export async function getNumSummoners(): Promise<number> {
    try {
        const count = await prisma.guildSummoner.count();
        return count;
    } catch (error) {
        logger.error(
            "Models > summoners > Error fetching total summoners",
            error
        );
        throw new Error("Database query failed");
    }
}

export async function getSummonersByGuildId(guildId: string) {
    try {
        const guildSummoners = await prisma.guildSummoner.findMany({
            where: { guild_id: BigInt(guildId) },
            include: {
                summoner: true,
            },
        });

        return guildSummoners.map((gs) => ({
            name: gs.summoner.name,
            puuid: gs.summoner.puuid,
            region: gs.summoner.region,
        }));
    } catch (error) {
        logger.error(
            "Models > summoners > Error fetching summoners by guild ID",
            error
        );
        throw new Error("Database query failed");
    }
}

export async function updateCachedTimestamp(summoner: {
    name: string;
    puuid: string;
}): Promise<void> {
    try {
        await prisma.summonerCacheLog.create({
            data: {
                summoner_puuid: summoner.puuid,
            },
        });
        logger.debug(
            `Models > summoners > Cache log created for ${summoner.name}`
        );
    } catch (error) {
        logger.error(
            "Models > summoners > Error updating cached timestamp",
            error
        );
        throw error;
    }
}

export async function checkIfCachedWithinRange(
    summoner: { name: string; puuid: string },
    range: number = 1
): Promise<boolean> {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - range);

        const recentLog = await prisma.summonerCacheLog.findFirst({
            where: {
                summoner_puuid: summoner.puuid,
                cached_at: { gte: cutoffDate },
            },
            orderBy: {
                cached_at: "desc",
            },
        });

        return recentLog !== null;
    } catch (error) {
        logger.error(
            "Models > summoners > Error checking cached timestamp range",
            error
        );
        throw new Error("Database query failed");
    }
}

export async function addSummoner(
    summonerRiotId: string,
    guildId: string
): Promise<void> {
    try {
        const puuid = await fetchSummonerPuuidByRiotId(summonerRiotId);
        if (!puuid) {
            throw new Error(`Invalid Riot account: ${summonerRiotId}`);
        }

        const region = await getSummonerRegion(puuid);
        if (!region) {
            throw new Error(
                `Failed to determine region for summoner '${summonerRiotId}'`
            );
        }

        await prisma.$transaction(async (tx) => {
            await tx.summoner.upsert({
                where: { puuid },
                update: {
                    name: summonerRiotId,
                    region: region,
                },
                create: {
                    puuid,
                    name: summonerRiotId,
                    region: region,
                },
            });

            await tx.guildSummoner.createMany({
                data: {
                    guild_id: BigInt(guildId),
                    summoner_puuid: puuid,
                },
                skipDuplicates: true,
            });
        });

        logger.info(
            `Models > summoners > Successfully added summoner '${summonerRiotId}' to Guild ${guildId}`
        );
    } catch (error) {
        logger.error(
            `Models > summoners > Error adding summoner '${summonerRiotId}' to Guild '${guildId}'`,
            error
        );
        throw error;
    }
}

export async function removeSummoner(
    summonerRiotId: string,
    guildId: string
): Promise<void> {
    try {
        const summoner = await prisma.summoner.findFirst({
            where: { name: summonerRiotId },
        });

        if (!summoner) {
            throw new Error(
                `Summoner '${summonerRiotId}' not found in database`
            );
        }

        const result = await prisma.guildSummoner.deleteMany({
            where: {
                guild_id: BigInt(guildId),
                summoner_puuid: summoner.puuid,
            },
        });

        if (result.count === 0) {
            throw new Error(
                `Summoner '${summonerRiotId}' was not associated with Guild ${guildId}`
            );
        }

        logger.info(
            `Models > summoners > Summoner '${summonerRiotId}' removed from Guild ${guildId}`
        );
    } catch (error) {
        logger.error(
            `Models > summoners > Error removing summoner '${summonerRiotId}' from Guild '${guildId}'`,
            error
        );
        throw error;
    }
}

export async function getUniqueSummoners() {
    try {
        const summoners = await prisma.summoner.findMany({
            select: {
                name: true,
                puuid: true,
                region: true,
            },
        });

        return summoners;
    } catch (error) {
        logger.error(
            "Models > summoners > Error fetching unique summoners",
            error
        );
        throw new Error("Database query failed");
    }
}
