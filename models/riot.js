import axios from "axios";

/**
 * List of Riot regions.
 */
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
    "vn2"
];

/**
 * Checks if the provided Riot ID follows the format: 'String1 #String2'
 *
 * @param {string} riotId - The Riot ID to validate (e.g., "GameName #Tag").
 * @returns {boolean} - Returns true if the format is correct, false otherwise.
 */
export function checkRiotIdFormat(riotId) {
    const pattern = /^[\w]+(?:\s[\w]+)*\s#[\w]+(?:\s[\w]+)*$/;
    const isValid = pattern.test(riotId);

    if (!isValid) {
        console.log("Failed match.");
    }

    return isValid;
}

/**
 * Fetches a summoner's PUUID using their Riot ID.
 *
 * @param {string} summonerRiotId - The summoner's Riot ID (e.g., "GameName #Tag").
 * @returns {Promise<string|null>} - Resolves to the summoner's PUUID if found, otherwise null.
 */
export async function fetchSummonerPuuidByRiotId(summonerRiotId) {
    if (!checkRiotIdFormat(summonerRiotId)) {
        console.log(`Failed to fetch summoner puuid. "${summonerRiotId}" is not a valid Riot ID.`);
        return null;
    }

    const [gameName, tag] = summonerRiotId.split(" #");
    const region = "americas"; // Riot's Americas platform for account endpoints

    const encodedGameName = encodeURIComponent(gameName);
    const encodedTag = encodeURIComponent(tag);
    const apiKey = process.env.RIOT_API_KEY;

    const url = `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodedGameName}/${encodedTag}?api_key=${apiKey}`;

    try {
        const response = await axios.get(url);
        return response.data?.puuid || null;
    } catch (error) {
        console.error(`Error fetching PUUID for Riot ID "${summonerRiotId}": ${error.message}`);
        return null;
    }
}

/**
 * Determines the region a summoner belongs to by iterating through known regions
 * and attempting to fetch their summoner data.
 *
 * @param {string} summonerPuuid - The summoner's PUUID.
 * @returns {Promise<string|null>} - Resolves to the region string if found, otherwise null.
 */
export async function getSummonerRegion(summonerPuuid) {
    const apiKey = process.env.RIOT_API_KEY;

    for (const region of regions) {
        const encodedPuuid = encodeURIComponent(summonerPuuid);
        const url = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodedPuuid}?api_key=${apiKey}`;

        try {
            const response = await axios.get(url);
            if (response.data) {
                return region;
            }
        } catch (error) {
            if (error.response && error.response.status === 404) {
                // Summoner not found in this region, continue to next
                continue;
            } else {
                console.error(`Error fetching summoner data from region "${region}": ${error.message}`);
                // Continue to next region even if there's an unexpected error
                continue;
            }
        }
    }

    console.log(`Summoner PUUID "${summonerPuuid}" not found in any known region.`);
    return null;
}
