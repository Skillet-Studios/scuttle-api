import prisma from "../utils/prisma.js";
import { fetchSummonerPuuidByRiotId, getSummonerRegion } from "./riot.js";

/**
 * Gets the total number of summoners across all guilds.
 * Note: This counts junction table records, not unique summoners.
 * For unique summoner count, use getUniqueSummoners().length
 *
 * @returns The total count of guild-summoner associations.
 */
export async function getNumSummoners(): Promise<number> {
    try {
        const count = await prisma.guildSummoner.count();
        return count;
    } catch (error) {
        console.error("Error fetching total summoners:", error);
        throw new Error("Database query failed");
    }
}

/**
 * Gets all summoners for a specific guild ID.
 *
 * @param guildId - The guild ID (as a string).
 * @returns An array of summoner objects.
 */
export async function getSummonersByGuildId(guildId: string) {
    try {
        const guildSummoners = await prisma.guildSummoner.findMany({
            where: { guild_id: BigInt(guildId) },
            include: {
                summoner: true,
            },
        });

        // Map to match the old MongoDB structure
        return guildSummoners.map((gs) => ({
            name: gs.summoner.name,
            puuid: gs.summoner.puuid,
            region: gs.summoner.region,
        }));
    } catch (error) {
        console.error("Error fetching summoners by guild ID:", error);
        throw new Error("Database query failed");
    }
}

/**
 * Creates a new cache log entry for a summoner.
 * Adds a timestamp to track when match data was cached for this summoner.
 *
 * @param summoner - Summoner data containing name and PUUID.
 * @returns The result of the operation.
 */
export async function updateCachedTimestamp(summoner: {
    name: string;
    puuid: string;
}) {
    try {
        await prisma.summonerCacheLog.create({
            data: {
                summoner_puuid: summoner.puuid,
            },
        });
        console.log(`✅ Cache log created for ${summoner.name}`);
        return { acknowledged: true };
    } catch (error) {
        console.error("Error updating cached timestamp:", error);
        throw new Error("Database query failed");
    }
}

/**
 * Checks if the summoner's match data has been cached within a given date range (in days).
 *
 * @param summoner - Summoner with name & PUUID.
 * @param range - Number of days to look back from now. Defaults to 1.
 * @returns True if the last_cached date is within [now - range, now], else false.
 */
export async function checkIfCachedWithinRange(
    summoner: { name: string; puuid: string },
    range: number = 1
): Promise<boolean> {
    try {
        // Calculate cutoff time
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - range);

        // Find the most recent cache log entry for this summoner
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
        console.error("Error checking cached timestamp range:", error);
        throw new Error("Database query failed");
    }
}

/**
 * Adds a summoner to a specific Guild.
 *
 * - Validates the Riot ID format and existence.
 * - Retrieves the summoner's PUUID and region.
 * - Creates summoner if doesn't exist, then adds to guild via junction table.
 *
 * @param summonerRiotId - The summoner's Riot ID (e.g., "GameName #Tag").
 * @param guildId - The Discord guild ID to which the summoner should be added.
 * @returns Returns `true` if the summoner was successfully added, else `false`.
 */
export async function addSummoner(
    summonerRiotId: string,
    guildId: string
): Promise<boolean> {
    try {
        // Fetch the PUUID using the Riot ID
        const puuid = await fetchSummonerPuuidByRiotId(summonerRiotId);
        if (!puuid) {
            console.log(
                `Failed to add summoner ${summonerRiotId} to database. Make sure this is a real Riot account.`
            );
            return false;
        }

        // Determine the summoner's region
        const region = await getSummonerRegion(puuid);
        if (!region) {
            console.log(
                `Failed to determine region for summoner '${summonerRiotId}' with PUUID '${puuid}'.`
            );
            return false;
        }

        // Use a transaction to ensure atomicity
        await prisma.$transaction(async (tx) => {
            // Upsert summoner (create if doesn't exist, update if does)
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

            // Create the guild-summoner relationship
            // Use createMany with skipDuplicates to avoid errors if already exists
            await tx.guildSummoner.createMany({
                data: {
                    guild_id: BigInt(guildId),
                    summoner_puuid: puuid,
                },
                skipDuplicates: true,
            });
        });

        console.log(
            `Successfully added summoner '${summonerRiotId}' to Guild with ID ${guildId}.`
        );
        return true;
    } catch (error) {
        console.error(
            `Error adding summoner '${summonerRiotId}' to Guild '${guildId}':`,
            error instanceof Error ? error.message : error
        );
        return false;
    }
}

/**
 * Removes a summoner from a specific Guild.
 *
 * @param summonerRiotId - The summoner's Riot ID (e.g., "GameName #Tag").
 * @param guildId - The Discord guild ID from which the summoner should be removed.
 * @returns Returns `true` if the summoner was successfully removed, else `false`.
 */
export async function removeSummoner(
    summonerRiotId: string,
    guildId: string
): Promise<boolean> {
    try {
        // First find the summoner by name to get their PUUID
        const summoner = await prisma.summoner.findFirst({
            where: { name: summonerRiotId },
        });

        if (!summoner) {
            console.log(`Summoner '${summonerRiotId}' not found in database.`);
            return false;
        }

        // Delete the junction table entry
        const result = await prisma.guildSummoner.deleteMany({
            where: {
                guild_id: BigInt(guildId),
                summoner_puuid: summoner.puuid,
            },
        });

        if (result.count > 0) {
            console.log(
                `Summoner '${summonerRiotId}' was successfully removed from Guild with id ${guildId}`
            );
            return true;
        } else {
            console.log(
                `Summoner '${summonerRiotId}' was not associated with Guild ${guildId}.`
            );
            return false;
        }
    } catch (error) {
        console.error(
            `Error removing summoner '${summonerRiotId}' from Guild '${guildId}':`,
            error instanceof Error ? error.message : error
        );
        return false;
    }
}

/**
 * Retrieves a list of unique summoners across all guilds in the database.
 *
 * @returns Returns an array of unique summoner objects in the format:
 * ```json
 * [
 *   { "name": "SummonerName1", "puuid": "some-puuid-123" },
 *   { "name": "SummonerName2", "puuid": "some-puuid-456" }
 * ]
 * ```
 * @throws {Error} If a database query fails.
 */
export async function getUniqueSummoners() {
    try {
        const summoners = await prisma.summoner.findMany({
            select: {
                name: true,
                puuid: true,
            },
        });

        return summoners;
    } catch (error) {
        console.error("❌ Error fetching unique summoners:", error);
        throw new Error("Database query failed");
    }
}
