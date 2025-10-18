import prisma from "../utils/prisma.js";
import { RankedSoloMatch } from "@prisma/client";

export interface QueueStats {
    totalMatches: number;
    avgKills: number;
    avgDeaths: number;
    avgAssists: number;
    avgKDA: number;
    avgSoloKills: number;
    avgVisionScore: number;
    avgTeamDamagePercentage: number;
    avgKillParticipation: number;
    avgGoldPerMinute: number;
    avgDamagePerMinute: number;
    avgDamageToChampions: number;
    avgEnemyMissingPings: number;
    avgControlWardsPlaced: number;
    abilityUses: number;
    scuttleCrabKills: number;
    gamesSurrendered: number;
}

interface QueueHandler {
    queueId: number;
    fetchMatches(puuid: string, startDateEpoch: number): Promise<any[]>;
    calculateStats(matches: any[]): QueueStats;
}

function calculateRankedSoloStats(matches: RankedSoloMatch[]): QueueStats {
    if (!matches?.length) {
        return {
            totalMatches: 0,
            avgKills: 0,
            avgDeaths: 0,
            avgAssists: 0,
            avgKDA: 0,
            avgSoloKills: 0,
            avgVisionScore: 0,
            avgTeamDamagePercentage: 0,
            avgKillParticipation: 0,
            avgGoldPerMinute: 0,
            avgDamagePerMinute: 0,
            avgDamageToChampions: 0,
            avgEnemyMissingPings: 0,
            avgControlWardsPlaced: 0,
            abilityUses: 0,
            scuttleCrabKills: 0,
            gamesSurrendered: 0,
        };
    }

    const totalMatches = matches.length;
    const stats = matches.reduce(
        (acc, match) => ({
            totalMatches,
            avgKills: acc.avgKills + match.kills,
            avgDeaths: acc.avgDeaths + match.deaths,
            avgAssists: acc.avgAssists + match.assists,
            avgKDA: acc.avgKDA + match.kda,
            avgSoloKills: acc.avgSoloKills + match.solo_kills,
            avgVisionScore: acc.avgVisionScore + match.vision_score,
            avgTeamDamagePercentage:
                acc.avgTeamDamagePercentage + match.team_damage_percentage,
            avgKillParticipation:
                acc.avgKillParticipation + match.kill_participation,
            avgGoldPerMinute: acc.avgGoldPerMinute + match.gold_per_minute,
            avgDamagePerMinute:
                acc.avgDamagePerMinute + match.damage_per_minute,
            avgDamageToChampions:
                acc.avgDamageToChampions + match.damage_to_champions,
            avgEnemyMissingPings:
                acc.avgEnemyMissingPings + match.enemy_missing_pings,
            avgControlWardsPlaced:
                acc.avgControlWardsPlaced + match.control_wards_placed,
            abilityUses: acc.abilityUses + match.ability_uses,
            scuttleCrabKills: acc.scuttleCrabKills + match.scuttle_crab_kills,
            gamesSurrendered:
                acc.gamesSurrendered + (match.game_surrendered ? 1 : 0),
        }),
        {
            totalMatches: 0,
            avgKills: 0,
            avgDeaths: 0,
            avgAssists: 0,
            avgKDA: 0,
            avgSoloKills: 0,
            avgVisionScore: 0,
            avgTeamDamagePercentage: 0,
            avgKillParticipation: 0,
            avgGoldPerMinute: 0,
            avgDamagePerMinute: 0,
            avgDamageToChampions: 0,
            avgEnemyMissingPings: 0,
            avgControlWardsPlaced: 0,
            abilityUses: 0,
            scuttleCrabKills: 0,
            gamesSurrendered: 0,
        }
    );

    const avgFields: (keyof Omit<
        QueueStats,
        "totalMatches" | "abilityUses" | "scuttleCrabKills" | "gamesSurrendered"
    >)[] = [
        "avgKills",
        "avgDeaths",
        "avgAssists",
        "avgKDA",
        "avgSoloKills",
        "avgVisionScore",
        "avgTeamDamagePercentage",
        "avgKillParticipation",
        "avgGoldPerMinute",
        "avgDamagePerMinute",
        "avgDamageToChampions",
        "avgEnemyMissingPings",
        "avgControlWardsPlaced",
    ];

    avgFields.forEach((field) => {
        stats[field] = parseFloat((stats[field] / totalMatches).toFixed(2));
    });

    return stats;
}

const rankedSoloHandler: QueueHandler = {
    queueId: 420,
    async fetchMatches(puuid: string, startDateEpoch: number) {
        return await prisma.rankedSoloMatch.findMany({
            where: {
                summoner_puuid: puuid,
                game_start_timestamp: { gte: BigInt(startDateEpoch) },
            },
        });
    },
    calculateStats: calculateRankedSoloStats,
};

export const QUEUE_HANDLERS: Record<string, QueueHandler> = {
    ranked_solo: rankedSoloHandler,
};

export function getQueueHandler(queueType: string): QueueHandler | null {
    return QUEUE_HANDLERS[queueType] || null;
}
