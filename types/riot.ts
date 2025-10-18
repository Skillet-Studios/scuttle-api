/**
 * Riot API related types
 */

export interface RiotMatchMetadata {
    dataVersion: string;
    matchId: string;
    participants: string[];
}

export interface RiotParticipantChallenges {
    soloKills?: number;
    visionScore?: number;
    teamDamagePercentage?: number;
    killParticipation?: number;
    goldPerMinute?: number;
    damagePerMinute?: number;
    scuttleCrabKills?: number;
    abilityUses?: number;
    [key: string]: any; // Other challenge fields
}

export interface RiotParticipant {
    puuid: string;
    championId: number;
    championName: string;
    win: boolean;
    kills: number;
    deaths: number;
    assists: number;
    gameEndedInSurrender: boolean;
    totalDamageDealtToChampions: number;
    enemyMissingPings: number;
    controlWardsPlaced: number;
    challenges?: RiotParticipantChallenges;
    [key: string]: any; // Other participant fields
}

export interface RiotMatchInfo {
    endOfGameResult: string;
    gameCreation: number;
    gameDuration: number;
    gameEndTimestamp?: number;
    gameId: number;
    gameMode: string;
    gameName: string;
    gameStartTimestamp: number;
    gameType: string;
    gameVersion: string;
    mapId: number;
    queueId: number;
    participants: RiotParticipant[];
    [key: string]: any; // Other info fields
}

export interface RiotMatchResponse {
    metadata: RiotMatchMetadata;
    info: RiotMatchInfo;
}
