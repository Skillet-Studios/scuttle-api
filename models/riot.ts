import axios from "axios";
import { logger } from "../utils/logger.js";

export const regions = [
    "na1",
    "euw1",
    "eun1",
    "kr",
    "jp1",
    "br1",
    "la1",
    "la2",
    "oc1",
    "ph2",
    "ru",
    "sg2",
    "th2",
    "tr1",
    "tw2",
    "vn2",
] as const;

export type Region = (typeof regions)[number];
const API_KEY = process.env.RIOT_API_KEY;

export function checkRiotIdFormat(riotId: string): boolean {
    // Riot IDs should be in format "GameName #TAG"
    // Game names can contain letters, numbers, spaces, and special characters
    // Tags are typically alphanumeric but can have some special chars
    const pattern = /^.+\s#.+$/;

    // Basic validation: must have " #" separator with content on both sides
    if (!pattern.test(riotId)) {
        return false;
    }

    const [gameName, tag] = riotId.split(" #");

    // Ensure neither part is empty or just whitespace
    return gameName.trim().length > 0 && tag.trim().length > 0;
}

export async function fetchSummonerPuuidByRiotId(
    summonerRiotId: string
): Promise<string | null> {
    if (!checkRiotIdFormat(summonerRiotId)) {
        logger.warn(
            `Models > riot > Invalid Riot ID format: "${summonerRiotId}"`
        );
        return null;
    }

    const [gameName, tag] = summonerRiotId.split(" #");
    const region = "americas";

    const encodedGameName = encodeURIComponent(gameName);
    const encodedTag = encodeURIComponent(tag);

    const url = `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodedGameName}/${encodedTag}?api_key=${API_KEY}`;

    try {
        const response = await axios.get<{ puuid?: string }>(url);
        return response.data?.puuid || null;
    } catch (error) {
        logger.error(
            `Models > riot > Error fetching PUUID for Riot ID "${summonerRiotId}"`,
            error
        );
        return null;
    }
}

export async function getSummonerRegion(
    summonerPuuid: string
): Promise<Region | null> {
    for (const region of regions) {
        const encodedPuuid = encodeURIComponent(summonerPuuid);
        const url = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodedPuuid}?api_key=${API_KEY}`;

        try {
            const response = await axios.get(url);
            if (response.data) {
                return region;
            }
        } catch (error: any) {
            if (error.response && error.response.status === 404) {
                continue;
            } else {
                logger.error(
                    `Models > riot > Error fetching summoner data from region "${region}"`
                );
                continue;
            }
        }
    }

    logger.warn(
        `Models > riot > Summoner PUUID "${summonerPuuid}" not found in any known region`
    );
    return null;
}
