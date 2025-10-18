/**
 * Match related types
 */

export interface MatchData {
    metadata?: any;
    info: {
        participants: Array<{ puuid: string; [key: string]: any }>;
        [key: string]: any;
    };
    [key: string]: any;
}

export interface ProcessedMatchData extends MatchData {
    summoner_puuid: string;
}
