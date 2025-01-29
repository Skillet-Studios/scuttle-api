/**
 * Determines the "area" based on a given region string.
 * 
 * - Defines arrays of known region codes and maps them to specific area identifiers.
 * - Returns one of: "americas", "asia", "europe", or "sea".
 * - If the region does not match any of these lists, the function returns `undefined`.
 *
 * @param {string} region - The region code (e.g. "na1", "kr", "euw1").
 * @returns {string|undefined} The area name or undefined if not found.
 */
export function getAreaFromRegion(region) {
    // Region lists grouped by area
    const americas = ["br1", "la1", "la2", "na1"];
    const asia = ["jp1", "kr"];
    const europe = ["euw1", "eun1", "tr1", "ru"];
    const sea = ["oc1", "ph2", "sg2", "th2", "tw2", "vn2"];

    // Check which area array contains the region
    if (americas.includes(region)) {
        return "americas";
    } else if (asia.includes(region)) {
        return "asia";
    } else if (europe.includes(region)) {
        return "europe";
    } else if (sea.includes(region)) {
        return "sea";
    }

    // If none of the above, return undefined
    return undefined;
}

/**
 * Removes extra participant data from a match so that each document only retains
 * the relevant participant for the given summoner.
 *
 * - Creates a (shallow) copy of the original match data.
 * - Filters participants to include only the one whose PUUID matches the summonerPuuid.
 * - Adds a top-level `summoner_puuid` field to the returned object.
 *
 * @param {string} summonerPuuid - The PUUID of the summoner to keep in the participants list.
 * @param {Object} matchData - The full match data object, typically with an `info.participants` array.
 * @returns {Object} A processed match data object containing only the matched summoner’s participant data.
 */
export function processMatchData(summonerPuuid, matchData) {
    // Create a shallow copy of matchData
    const processedMatchData = { ...matchData };

    // Filter the participants array to keep only the summoner’s PUUID
    const filteredParticipants = processedMatchData.info.participants.filter(
        (participant) => participant.puuid === summonerPuuid
    );

    // Update the original participants with the filtered list
    processedMatchData.info.participants = filteredParticipants;

    // Add the summoner’s PUUID at the top-level of the data
    processedMatchData.summoner_puuid = summonerPuuid;

    return processedMatchData;
}
