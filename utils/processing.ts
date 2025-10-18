import { MatchData, ProcessedMatchData } from "../types/matches.js";

const REGION_AREA_MAP: Record<string, "americas" | "asia" | "europe" | "sea"> =
    {
        br1: "americas",
        la1: "americas",
        la2: "americas",
        na1: "americas",
        jp1: "asia",
        kr: "asia",
        euw1: "europe",
        eun1: "europe",
        tr1: "europe",
        ru: "europe",
        oc1: "sea",
        ph2: "sea",
        sg2: "sea",
        th2: "sea",
        tw2: "sea",
        vn2: "sea",
    };

export function getAreaFromRegion(
    region: string
): "americas" | "asia" | "europe" | "sea" | undefined {
    return REGION_AREA_MAP[region];
}

export function processMatchData(
    summonerPuuid: string,
    matchData: MatchData
): ProcessedMatchData {
    const processedMatchData = { ...matchData } as ProcessedMatchData;

    processedMatchData.info.participants =
        processedMatchData.info.participants.filter(
            (participant) => participant.puuid === summonerPuuid
        );

    processedMatchData.summoner_puuid = summonerPuuid;

    return processedMatchData;
}
